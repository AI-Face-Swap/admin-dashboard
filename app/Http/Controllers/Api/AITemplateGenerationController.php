<?php

namespace App\Http\Controllers\Api;

use App\Events\AIGenerationUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\TemplateGenerationRequest;
use App\Jobs\ProcessFaceSwap;
use App\Jobs\ProcessImageEdit;
use App\Jobs\ProcessImageGeneration;
use App\Jobs\ProcessImageToVideo;
use App\Jobs\ProcessVideoFaceSwap;
use App\Models\AIGeneration;
use App\Models\AIModel;
use App\Models\AIProvider;
use App\Models\Customer;
use App\Models\Template;
use App\Models\User;
use App\Services\AIIdempotencyService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class AITemplateGenerationController extends Controller
{
    /**
     * Generate AI media using a template slug.
     *
     * Automatically routes to the right AI operation, provider, and model
     * (`image-to-video`, `image-editing`, `video-face-swap`, `face-swap`, or `image-generation`)
     * based on the template's configured `generation_type`, `ai_model`, `prompt`,
     * `reference_video_path`, `reference_images`, and `parameters`.
     */
    public function store(TemplateGenerationRequest $request, ?string $slug = null): JsonResponse
    {
        $templateSlug = $slug ?: $request->string('template_slug')->toString();

        $template = Template::with(['generationType', 'aiModel.generationType'])
            ->where('slug', $templateSlug)
            ->where('is_active', true)
            ->first()
            ?? throw new ModelNotFoundException('Template not found.');

        $aiModel = $template->aiModel
            ?? ($template->model
                ? AIModel::with('generationType')->where('model_name', $template->model)->first()
                : null);

        $genTypeSlug = $aiModel?->generationType?->slug
            ?? $template->generationType?->slug
            ?? ($template->type === Template::TYPE_VIDEO ? 'video-faceswap' : 'image-faceswap');

        $operation = match ($genTypeSlug) {
            'image-to-video', 'text-to-video' => AIGeneration::OPERATION_IMAGE_TO_VIDEO,
            'image-editing', 'image-edit' => AIGeneration::OPERATION_IMAGE_EDIT,
            'text-to-image', 'image-generation' => AIGeneration::OPERATION_IMAGE,
            'video-faceswap', 'video-face-swap' => AIGeneration::OPERATION_VIDEO_FACE_SWAP,
            default => AIGeneration::OPERATION_FACE_SWAP,
        };

        $modelSlug = $aiModel?->model_name ?? $template->model;
        $providerSlug = $aiModel?->provider_name ?? 'segmind';

        $userImageUrl = $this->resolveUserImageUrl($request);
        $payload = $this->buildPayloadForOperation($operation, $modelSlug, $template, $userImageUrl);

        $requester = $request->user();
        $idempotencyToken = $request->string('client_idempotency_token')->toString() ?: null;

        if ($idempotencyResponse = AIIdempotencyService::check(
            $requester,
            $idempotencyToken,
            $operation,
            $payload,
        )) {
            return $idempotencyResponse;
        }

        $pointCost = $template->effective_cost;

        if ($requester instanceof Customer) {
            $this->authorizeCustomerPoints($requester, $pointCost);
        }

        $provider = AIProvider::where('slug', $providerSlug)->first()
            ?? AIProvider::where('slug', 'segmind')->first();

        $generation = AIGeneration::create([
            'user_id' => $requester instanceof User ? $requester->id : null,
            'customer_id' => $requester instanceof Customer ? $requester->id : null,
            'provider_id' => $provider?->id ?? 1,
            'template_id' => $template->id,
            'operation' => $operation,
            'status' => AIGeneration::STATUS_QUEUED,
            'input_metadata' => $payload,
            'client_idempotency_token' => $idempotencyToken,
        ]);

        if ($requester instanceof Customer && $pointCost > 0) {
            $requester->spendPoints($pointCost, "Template generation ({$template->name} #{$generation->id})", "gen_{$generation->id}_deduct");
            $generation->update([
                'points_spent' => $pointCost,
                'coins_spent' => $pointCost,
            ]);
        }

        event(new AIGenerationUpdated($generation));

        $customerId = $requester instanceof Customer ? $requester->id : null;

        match ($operation) {
            AIGeneration::OPERATION_IMAGE_TO_VIDEO => ProcessImageToVideo::dispatch(
                generationId: $generation->id,
                payload: $payload,
                customerId: $customerId,
                pointCost: $pointCost,
                model: $modelSlug,
                templateId: $template->id,
                provider: $providerSlug,
            ),
            AIGeneration::OPERATION_IMAGE_EDIT => ProcessImageEdit::dispatch(
                generationId: $generation->id,
                payload: $payload,
                customerId: $customerId,
                pointCost: $pointCost,
                model: $modelSlug,
                templateId: $template->id,
                provider: $providerSlug,
            ),
            AIGeneration::OPERATION_IMAGE => ProcessImageGeneration::dispatch(
                generationId: $generation->id,
                payload: $payload,
                customerId: $customerId,
                pointCost: $pointCost,
                model: $modelSlug,
                templateId: $template->id,
                provider: $providerSlug,
            ),
            AIGeneration::OPERATION_VIDEO_FACE_SWAP => ProcessVideoFaceSwap::dispatch(
                generationId: $generation->id,
                payload: $payload,
                templateId: $template->id,
                customerId: $customerId,
                pointCost: $pointCost,
            ),
            default => ProcessFaceSwap::dispatch(
                generationId: $generation->id,
                payload: $payload,
                templateId: $template->id,
                customerId: $customerId,
                pointCost: $pointCost,
            ),
        };

        return response()->json([
            'status' => 'queued',
            'generation' => [
                'id' => $generation->id,
                'operation' => $generation->operation,
                'model' => $modelSlug,
                'template_id' => $template->id,
                'status' => $generation->status,
                'points_spent' => $generation->points_spent,
                'points_remaining' => $requester instanceof Customer ? $requester->points : null,
                'message' => 'Template generation job dispatched. Poll /api/v1/ai/generations/'.$generation->id.' for status.',
            ],
        ], 202);
    }

    /**
     * Build the provider payload based on the template's operation, AI model, and stored parameters.
     *
     * @return array<string, mixed>
     */
    private function buildPayloadForOperation(
        string $operation,
        ?string $modelSlug,
        Template $template,
        ?string $userImageUrl,
    ): array {
        $params = is_array($template->parameters) ? $template->parameters : [];

        return match ($operation) {
            AIGeneration::OPERATION_IMAGE_TO_VIDEO => $this->buildImageToVideoPayload(
                $modelSlug ?: 'seedance-2.0-fast',
                $template,
                $userImageUrl,
                $params,
            ),
            AIGeneration::OPERATION_IMAGE_EDIT => $this->buildImageEditPayload(
                $modelSlug ?: 'flux-kontext-dev',
                $template,
                $userImageUrl,
                $params,
            ),
            AIGeneration::OPERATION_IMAGE => array_filter([
                ...$params,
                'model' => $modelSlug ?: 'seedream-v5-lite-text-to-image',
                'prompt' => $template->prompt ?: ($params['prompt'] ?? ''),
                'negative_prompt' => $template->negative_prompt ?: ($params['negative_prompt'] ?? null),
                'aspect_ratio' => $template->aspect_ratio ?: ($params['aspect_ratio'] ?? null),
                'resolution' => $template->resolution ?: ($params['resolution'] ?? null),
                'seed' => $template->seed !== null && $template->seed !== '' ? (int) $template->seed : ($params['seed'] ?? null),
                'template_id' => $template->id,
            ], fn ($v) => $v !== null && $v !== ''),
            AIGeneration::OPERATION_VIDEO_FACE_SWAP => [
                ...$params,
                'source_image' => $userImageUrl,
                'target_video' => $template->reference_video_url ?: $template->file_url,
                'model_name' => ($modelSlug && $modelSlug !== 'video-face-swap')
                    ? $modelSlug
                    : ($params['model_name'] ?? 'hyperswap_1b'),
                'face_detector_score' => (float) ($params['face_detector_score'] ?? 0.5),
                'target_face_index' => (int) ($params['target_face_index'] ?? 0),
                'template_id' => $template->id,
            ],
            default => [
                ...$params,
                'source_image' => $userImageUrl,
                'target_image' => $template->file_url,
                'model' => $modelSlug ?: 'face-swap',
                'template_id' => $template->id,
            ],
        };
    }

    /**
     * Build the Image-to-Video payload for Seedance, Kling, MiniMax, Wan, LTX, or future models.
     *
     * Only sends the user's uploaded image as the reference/input image, and only includes
     * `reference_videos` when a reference video was explicitly stored on the template.
     *
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    private function buildImageToVideoPayload(
        string $model,
        Template $template,
        ?string $userImageUrl,
        array $params,
    ): array {
        $prompt = $template->prompt ?: ($params['prompt'] ?? 'Animate this reference smoothly and naturally.');
        $negativePrompt = $template->negative_prompt ?: ($params['negative_prompt'] ?? null);
        $resolution = $template->resolution ?: ($params['resolution'] ?? '720p');
        $aspectRatio = $template->aspect_ratio ?: ($params['aspect_ratio'] ?? '16:9');
        $seed = $template->seed !== null && $template->seed !== ''
            ? (int) $template->seed
            : (int) ($params['seed'] ?? -1);
        $durationInt = (int) preg_replace('/[^0-9]/', '', (string) ($params['duration'] ?? '5')) ?: 5;

        $refImages = $userImageUrl ? [$userImageUrl] : [];

        // Only send reference_videos when the template actually has an explicit reference video
        $refVideos = [];
        if ($template->reference_video_url) {
            $refVideos = [$template->reference_video_url];
        } elseif (! empty($params['reference_videos']) && is_array($params['reference_videos'])) {
            $refVideos = array_values(array_filter($params['reference_videos']));
        } elseif (! empty($params['video_url']) && is_string($params['video_url'])) {
            $refVideos = [$params['video_url']];
        }

        if ($model === 'kling-o3-video2video-edit') {
            $sourceVideoUrl = $refVideos[0] ?? $template->file_url;
            $mode = strtolower((string) ($params['mode'] ?? ($resolution === '1080p' ? 'pro' : 'std')));
            $keepAudio = isset($params['keep_audio'])
                ? filter_var($params['keep_audio'], FILTER_VALIDATE_BOOLEAN)
                : (isset($params['keep_original_sound'])
                    ? filter_var($params['keep_original_sound'], FILTER_VALIDATE_BOOLEAN)
                    : true);
            $finalPrompt = $prompt;
            $elements = [];
            if ($userImageUrl) {
                $elements[] = ['frontal_image_url' => $userImageUrl];
                if (! preg_match('/@Element\s*1\b/i', $finalPrompt)) {
                    $finalPrompt = rtrim($finalPrompt).' @Element1';
                }
            }

            return array_filter([
                'model' => $model,
                'prompt' => $finalPrompt,
                'video_url' => $sourceVideoUrl,
                'mode' => in_array($mode, ['std', 'pro'], true) ? $mode : 'pro',
                'duration' => (string) max(3, min(15, $durationInt)),
                'aspect_ratio' => in_array($aspectRatio, ['16:9', '9:16', '1:1'], true) ? $aspectRatio : '9:16',
                'keep_audio' => $keepAudio,
                'elements' => ! empty($elements) ? $elements : null,
            ], fn ($v) => $v !== null && $v !== '');
        }

        if ($model === 'kling-4-video-edit') {
            $sourceVideoUrl = $refVideos[0] ?? $template->file_url;
            $finalPrompt = $prompt;
            if ($userImageUrl && ! preg_match('/@Image\s*1\b/i', $finalPrompt)) {
                $finalPrompt = rtrim($finalPrompt).' @Image1';
            }

            return array_filter([
                'model' => $model,
                'video' => $sourceVideoUrl,
                'prompt' => $finalPrompt,
                'reference_images' => ! empty($refImages) ? $refImages : null,
                'duration' => max(3, min(30, $durationInt)),
                'resolution' => strtolower($resolution) === '1080p' ? '1080p' : '720p',
                'aspect_ratio' => in_array($aspectRatio, ['adaptive', '16:9', '9:16', '1:1', '21:9'], true) ? $aspectRatio : 'adaptive',
            ], fn ($v) => $v !== null && $v !== '');
        }

        if (in_array($model, [
            'kling-2.6-standard-motion-control',
            'kling-2.6-pro-motion-control',
            'kling-3-motion-control-standard',
            'kling-3-motion-control-pro',
        ], true)) {
            $drivingVideoUrl = $refVideos[0] ?? $template->file_url;
            $orientation = (string) ($params['character_orientation'] ?? 'video');
            $keepSound = isset($params['keep_original_sound'])
                ? filter_var($params['keep_original_sound'], FILTER_VALIDATE_BOOLEAN)
                : (isset($params['generate_audio'])
                    ? filter_var($params['generate_audio'], FILTER_VALIDATE_BOOLEAN)
                    : true);

            return array_filter([
                'model' => $model,
                'prompt' => $prompt,
                'image_url' => $userImageUrl,
                'video_url' => $drivingVideoUrl,
                'character_orientation' => in_array($orientation, ['video', 'image'], true) ? $orientation : 'video',
                'keep_original_sound' => $keepSound,
            ], fn ($v) => $v !== null && $v !== '');
        }

        if (in_array($model, ['seedance-2.0', 'seedance-2.0-fast', 'seedance-2.5'], true)) {
            $imageMode = (string) ($params['image_mode'] ?? 'reference');

            $payload = [
                'model' => $model,
                'prompt' => $prompt,
                'resolution' => $resolution,
                'aspect_ratio' => $aspectRatio,
                'duration' => max(4, min(15, $durationInt)),
                'generate_audio' => isset($params['generate_audio'])
                    ? filter_var($params['generate_audio'], FILTER_VALIDATE_BOOLEAN)
                    : false,
                'bitrate_mode' => (string) ($params['bitrate_mode'] ?? 'standard'),
                'auto_resize' => isset($params['auto_resize'])
                    ? filter_var($params['auto_resize'], FILTER_VALIDATE_BOOLEAN)
                    : true,
                'prompt_extend' => isset($params['prompt_extend'])
                    ? filter_var($params['prompt_extend'], FILTER_VALIDATE_BOOLEAN)
                    : true,
                'seed' => $seed,
                'image_mode' => $imageMode,
            ];

            if (! empty($negativePrompt)) {
                $payload['negative_prompt'] = $negativePrompt;
            }

            if ($imageMode === 'first_frame_url' && $userImageUrl) {
                $payload['first_frame_url'] = $userImageUrl;
                if (! empty($params['last_frame_url'])) {
                    $payload['last_frame_url'] = $params['last_frame_url'];
                }
            } elseif (! empty($refImages)) {
                $payload['reference_images'] = $refImages;
            }

            if (! empty($refVideos)) {
                $payload['reference_videos'] = $refVideos;
            }

            if ($template->reference_audio_url) {
                $payload['reference_audios'] = [$template->reference_audio_url];
            } elseif (! empty($params['reference_audios']) && is_array($params['reference_audios'])) {
                $payload['reference_audios'] = array_values(array_filter($params['reference_audios']));
            }

            return $payload;
        }

        if ($model === 'kling-o1-reference-image-to-video') {
            return [
                'model' => $model,
                'prompt' => $prompt,
                'image_urls' => $refImages,
                'aspect_ratio' => $aspectRatio,
                'duration' => $durationInt >= 10 ? 10 : 5,
            ];
        }

        if ($model === 'minimax-h3-max-reference-to-video') {
            return [
                'model' => $model,
                'prompt' => $prompt,
                'reference_images' => $refImages,
                'duration' => $durationInt >= 10 ? 10 : 6,
                'resolution' => $resolution,
                'ratio' => $aspectRatio,
            ];
        }

        return array_filter([
            ...$params,
            'model' => $model,
            'image' => $userImageUrl,
            'prompt' => $prompt,
            'negative_prompt' => $negativePrompt,
            'resolution' => $resolution,
            'aspect_ratio' => $aspectRatio,
            'duration' => $durationInt,
            'seed' => $seed >= 0 ? $seed : null,
        ], fn ($v) => $v !== null && $v !== '');
    }

    /**
     * Build the Image-Editing payload for P-Image-Edit, Flux Kontext, Multi-Image Kontext, Seedream, GPT, Kling, etc.
     *
     * Only sends the customer's uploaded image (`$userImageUrl`) as the input image, never the template's output preview image.
     *
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    private function buildImageEditPayload(
        string $model,
        Template $template,
        ?string $userImageUrl,
        array $params,
    ): array {
        $prompt = $template->prompt ?: ($params['prompt'] ?? 'Apply the template style to the subject.');
        $aspectRatio = $template->aspect_ratio ?: ($params['aspect_ratio'] ?? '1:1');
        $seed = $template->seed !== null && $template->seed !== ''
            ? (int) $template->seed
            : ($params['seed'] ?? null);

        $refImages = $userImageUrl ? [$userImageUrl] : [];

        $base = array_filter([
            ...$params,
            'model' => $model,
            'prompt' => $prompt,
            'aspect_ratio' => $aspectRatio,
            'seed' => $seed !== null ? (int) $seed : null,
        ], fn ($v) => $v !== null && $v !== '');

        return match ($model) {
            'p-image-edit', 'gpt-image-1.5-edit', 'nano-banana-pro' => [
                ...$base,
                'image_urls' => $refImages,
            ],
            'seedream-v5-lite-image-to-image' => [
                ...$base,
                'image_input' => $refImages,
            ],
            'multi-image-kontext-max' => [
                ...$base,
                'input_image_1' => $userImageUrl,
            ],
            'kling-3-image2image' => [
                ...$base,
                'image_url' => $userImageUrl,
            ],
            'ideogram-4.5-edit', 'bria-extract-object' => [
                ...$base,
                'image' => $userImageUrl,
            ],
            default => [
                ...$base,
                'input_image' => $userImageUrl,
            ],
        };
    }

    /**
     * Reject the request when the customer cannot afford the cost.
     */
    private function authorizeCustomerPoints(Customer $customer, int $cost): void
    {
        if ($cost > 0 && ! $customer->hasEnoughPoints($cost)) {
            abort(402, 'Not enough points — top up to continue.');
        }
    }

    /**
     * Resolve the uploaded user image (or URL) to a public Spaces URL.
     */
    private function resolveUserImageUrl(TemplateGenerationRequest $request): ?string
    {
        $file = $request->file('image') ?? $request->file('face_image');

        if ($file instanceof UploadedFile) {
            $path = $file->storeAs(
                'inputs/template-gen',
                Str::uuid().'.'.$file->getClientOriginalExtension(),
                'spaces',
            );

            if ($path === false) {
                throw new RuntimeException('Failed to store the uploaded image.');
            }

            return Storage::disk('spaces')->url($path);
        }

        if ($request->filled('image_url')) {
            return $request->string('image_url')->toString();
        }

        if ($request->filled('face_image_url')) {
            return $request->string('face_image_url')->toString();
        }

        return null;
    }
}
