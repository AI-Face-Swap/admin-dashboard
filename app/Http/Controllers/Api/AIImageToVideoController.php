<?php

namespace App\Http\Controllers\Api;

use App\Events\AIGenerationUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ImageToVideoRequest;
use App\Jobs\ProcessImageToVideo;
use App\Models\AIGeneration;
use App\Models\AIModel;
use App\Models\AIProvider;
use App\Models\Customer;
use App\Models\Setting;
use App\Models\User;
use App\Services\AIIdempotencyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class AIImageToVideoController extends Controller
{
    public function store(ImageToVideoRequest $request): JsonResponse
    {
        $requester = $request->user();
        $resolution = $request->string('resolution', '720p')->toString();
        $modelName = $request->string('model', 'wan-2.2-i2v-flash')->toString();
        $idempotencyToken = $request->string('client_idempotency_token')->toString() ?: null;

        $aiModel = AIModel::where('model_name', $modelName)->where('is_active', true)->first();

        if ($aiModel) {
            $cost = $aiModel->point_cost;
            if (! empty($aiModel->resolution_costs[$resolution])) {
                $cost = (int) $aiModel->resolution_costs[$resolution];
            }
            $durKey = $request->string('duration')->toString();
            $durDigits = preg_replace('/\D+/', '', $durKey);
            $durWithSuffix = $durDigits !== '' ? "{$durDigits}s" : '';
            if (! empty($durKey) && ! empty($aiModel->duration_costs[$durKey])) {
                $cost = (int) $aiModel->duration_costs[$durKey];
            } elseif ($durWithSuffix !== '' && ! empty($aiModel->duration_costs[$durWithSuffix])) {
                $cost = (int) $aiModel->duration_costs[$durWithSuffix];
            }
            $templateCost = $cost;
        } else {
            $costKey = match ($resolution) {
                '480p' => 'point_cost_image_to_video_480p',
                '1080p' => 'point_cost_image_to_video_1080p',
                default => 'point_cost_image_to_video_720p',
            };
            $legacyCostKey = match ($resolution) {
                '480p' => 'coin_cost_image_to_video_480p',
                '1080p' => 'coin_cost_image_to_video_1080p',
                default => 'coin_cost_image_to_video_720p',
            };
            $configKey = match ($resolution) {
                '480p' => 'ai.point_costs.image_to_video_480p',
                '1080p' => 'ai.point_costs.image_to_video_1080p',
                default => 'ai.point_costs.image_to_video_720p',
            };
            $defaultCost = match ($resolution) {
                '480p' => 10,
                '1080p' => 30,
                default => 20,
            };
            $templateCost = (int) Setting::get('ai', $costKey, Setting::get('ai', $legacyCostKey, config($configKey, config(str_replace('point_costs', 'coin_costs', $configKey), $defaultCost))));
        }

        // Resolve image URL (upload file or use provided URL)
        $imageUrl = $this->imageUrl($request);
        $payload = $this->buildPayload($request, $modelName, $imageUrl);

        // Check for existing generation with the same idempotency token
        if ($idempotencyResponse = AIIdempotencyService::check(
            $requester,
            $idempotencyToken,
            AIGeneration::OPERATION_IMAGE_TO_VIDEO,
            $payload
        )) {
            return $idempotencyResponse;
        }

        if ($requester instanceof Customer) {
            $this->authorizeCustomerPoints($requester, $templateCost);
        }

        Log::info('Image-to-video request', [
            'customer_id' => $requester?->id,
            'image_url' => $imageUrl,
            'model' => $modelName,
        ]);

        $model = $modelName;
        $provider = AIProvider::where('slug', 'segmind')->first();

        $generation = AIGeneration::create([
            'user_id' => $requester instanceof User ? $requester->id : null,
            'customer_id' => $requester instanceof Customer ? $requester->id : null,
            'provider_id' => $provider?->id ?? 1,
            'operation' => AIGeneration::OPERATION_IMAGE_TO_VIDEO,
            'status' => AIGeneration::STATUS_QUEUED,
            'input_metadata' => $payload,
            'client_idempotency_token' => $idempotencyToken,
        ]);

        if ($requester instanceof Customer && $templateCost > 0) {
            $requester->spendPoints($templateCost, "Video generation ({$generation->id})", "gen_{$generation->id}_deduct");
            $generation->update(['points_spent' => $templateCost]);
        }

        event(new AIGenerationUpdated($generation));

        ProcessImageToVideo::dispatch(
            generationId: $generation->id,
            payload: $payload,
            customerId: $requester instanceof Customer ? $requester->id : null,
            pointCost: $templateCost,
            model: $model,
        );

        return response()->json([
            'status' => 'queued',
            'generation' => [
                'id' => $generation->id,
                'operation' => $generation->operation,
                'status' => $generation->status,
                'points_spent' => $generation->points_spent,
                'points_remaining' => $requester instanceof Customer ? $requester->points : null,
                'message' => 'Image-to-video job dispatched. Poll /api/v1/ai/generations/'.$generation->id.' for status.',
            ],
        ], 202);
    }

    /**
     * Build the request payload tailored to the chosen model and image mode.
     *
     * @return array<string, mixed>
     */
    private function buildPayload(ImageToVideoRequest $request, string $modelName, string $imageUrl): array
    {
        $rawMode = $request->string('image_mode', 'reference')->toString() ?: 'reference';
        $imageMode = $rawMode === 'first_frame_url' ? 'first_frame_url' : 'reference';
        $prompt = $request->string('prompt')->toString();
        $resolution = $request->string('resolution', '720p')->toString() ?: '720p';
        $aspectRatio = $request->string('aspect_ratio', '16:9')->toString() ?: '16:9';
        $rawDuration = $request->string('duration')->toString();
        $durationInt = $rawDuration !== '' ? (int) preg_replace('/\D+/', '', $rawDuration) : null;

        $secondImageUrl = $this->resolveOptionalMediaUrl($request, 'second_image', 'second_image_url', 'input-images');
        $orderedExtraUrls = $this->resolveExtraOrderedImageUrls($request);
        $extraRefImages = is_array($request->input('reference_images'))
            ? array_values(array_filter($request->input('reference_images'), 'is_string'))
            : [];
        $allCharacterImages = array_values(array_unique(array_filter(array_merge(
            [$imageUrl, $secondImageUrl],
            $orderedExtraUrls,
            $extraRefImages,
        ))));

        $lastFrameUrl = $this->resolveOptionalMediaUrl($request, 'last_frame_image', 'last_frame_url', 'input-images');
        $referenceVideoUrl = $this->resolveOptionalMediaUrl($request, 'reference_video', 'reference_video_url', 'input-videos');
        if ($referenceVideoUrl === '' && $request->filled('video_url')) {
            $referenceVideoUrl = $request->string('video_url')->toString();
        }
        if ($referenceVideoUrl === '' && is_array($request->input('reference_videos')) && ! empty($request->input('reference_videos')[0])) {
            $referenceVideoUrl = (string) $request->input('reference_videos')[0];
        }
        $referenceAudioUrl = $this->resolveOptionalMediaUrl($request, 'reference_audio', 'reference_audio_url', 'input-audios');

        $payload = [
            'prompt' => $prompt,
            'image' => $imageUrl,
            'image_mode' => $imageMode,
            'model' => $modelName,
            'resolution' => $resolution,
        ];

        switch ($modelName) {
            case 'kling-o3-video2video-edit':
                $mode = $request->filled('mode')
                    ? strtolower($request->string('mode')->toString())
                    : (strtolower($resolution) === '1080p' ? 'pro' : 'std');
                $keepAudio = $request->has('keep_audio')
                    ? $request->boolean('keep_audio')
                    : ($request->has('keep_original_sound')
                        ? $request->boolean('keep_original_sound')
                        : true);
                $durClamped = $durationInt ? max(3, min(15, $durationInt)) : 5;

                $payload['video_url'] = $referenceVideoUrl;
                $payload['mode'] = in_array($mode, ['std', 'pro'], true) ? $mode : 'pro';
                $payload['duration'] = (string) $durClamped;
                $payload['aspect_ratio'] = in_array($aspectRatio, ['16:9', '9:16', '1:1'], true)
                    ? $aspectRatio
                    : '9:16';
                $payload['keep_audio'] = $keepAudio;

                if (! empty($allCharacterImages)) {
                    $usesImageTagOnly = preg_match('/@Image\s*\d+\b/i', $payload['prompt'])
                        && ! preg_match('/@Element\s*\d+\b/i', $payload['prompt']);

                    if ($usesImageTagOnly) {
                        $payload['image_urls'] = array_slice($allCharacterImages, 0, 4);
                    } else {
                        // Kling O3 V2V Edit caps elements+images at 4 when using a video,
                        // and KlingV3ImageElementInput requires both frontal_image_url and
                        // at least 1 URL in reference_image_urls per element.
                        $elementsSlice = array_slice($allCharacterImages, 0, 4);
                        $payload['elements'] = array_map(
                            static fn (string $url): array => [
                                'frontal_image_url' => $url,
                                'reference_image_urls' => [$url],
                            ],
                            $elementsSlice,
                        );
                        foreach ($elementsSlice as $idx => $_url) {
                            $num = $idx + 1;
                            if (! preg_match("/@Element\s*{$num}\b/i", $payload['prompt'])) {
                                $payload['prompt'] = rtrim($payload['prompt'])." @Element{$num}";
                            }
                        }
                    }
                } elseif (is_array($request->input('elements')) && ! empty($request->input('elements'))) {
                    $normalizedElements = [];
                    foreach (array_slice($request->input('elements'), 0, 4) as $el) {
                        if (! is_array($el) || empty($el['frontal_image_url']) || ! is_string($el['frontal_image_url'])) {
                            continue;
                        }
                        $refUrls = ! empty($el['reference_image_urls']) && is_array($el['reference_image_urls'])
                            ? array_values(array_filter($el['reference_image_urls'], 'is_string'))
                            : [];
                        $normalizedElements[] = [
                            'frontal_image_url' => $el['frontal_image_url'],
                            'reference_image_urls' => ! empty($refUrls) ? array_slice($refUrls, 0, 3) : [$el['frontal_image_url']],
                        ];
                    }
                    if (! empty($normalizedElements)) {
                        $payload['elements'] = $normalizedElements;
                    }
                }
                break;

            case 'kling-4-video-edit':
                $payload['video'] = $referenceVideoUrl;
                $payload['duration'] = $durationInt ? max(3, min(30, $durationInt)) : 5;
                $payload['resolution'] = strtolower($resolution) === '1080p' ? '1080p' : '720p';
                $payload['aspect_ratio'] = in_array($aspectRatio, ['adaptive', '16:9', '9:16', '1:1', '21:9'], true)
                    ? $aspectRatio
                    : 'adaptive';

                if (! empty($allCharacterImages)) {
                    $imagesSlice = array_slice($allCharacterImages, 0, 10);
                    $payload['reference_images'] = $imagesSlice;
                    foreach ($imagesSlice as $idx => $_url) {
                        $num = $idx + 1;
                        if (! preg_match("/@Image\s*{$num}\b/i", $payload['prompt'])) {
                            $payload['prompt'] = rtrim($payload['prompt'])." @Image{$num}";
                        }
                    }
                }
                break;

            case 'kling-2.6-standard-motion-control':
            case 'kling-2.6-pro-motion-control':
            case 'kling-3-motion-control-standard':
            case 'kling-3-motion-control-pro':
                $orientation = $request->string('character_orientation', 'video')->toString();
                $keepOriginalSound = $request->has('keep_original_sound')
                    ? $request->boolean('keep_original_sound')
                    : ($request->has('generate_audio') ? $request->boolean('generate_audio') : true);

                $payload['image_url'] = $imageUrl;
                if ($referenceVideoUrl !== '') {
                    $payload['video_url'] = $referenceVideoUrl;
                }
                $payload['character_orientation'] = in_array($orientation, ['video', 'image'], true)
                    ? $orientation
                    : 'video';
                $payload['keep_original_sound'] = $keepOriginalSound;

                if ($prompt === '' && in_array($modelName, ['kling-2.6-standard-motion-control', 'kling-2.6-pro-motion-control'], true)) {
                    $payload['prompt'] = 'Perform the reference video motion naturally with high visual fidelity.';
                }
                break;

            case 'seedance-2.0':
            case 'seedance-2.0-fast':
            case 'seedance-2.5':
                if ($imageMode === 'first_frame_url') {
                    $payload['first_frame_url'] = $imageUrl;
                    if ($lastFrameUrl !== '') {
                        $payload['last_frame_url'] = $lastFrameUrl;
                    }
                } else {
                    $seedanceImages = array_slice($allCharacterImages, 0, 9);
                    $payload['reference_images'] = $seedanceImages;
                    foreach ($seedanceImages as $idx => $_url) {
                        $num = $idx + 1;
                        if (! preg_match("/@?Image\s*{$num}\b/i", $payload['prompt'])) {
                            $payload['prompt'] = rtrim($payload['prompt'])." @Image {$num}";
                        }
                    }
                    if ($referenceVideoUrl !== '') {
                        $payload['reference_videos'] = [$referenceVideoUrl];
                        if (! preg_match('/@?Video\s*1\b/i', $payload['prompt'])) {
                            $payload['prompt'] = rtrim($payload['prompt']).' @Video 1';
                        }
                    }
                    if ($referenceAudioUrl !== '') {
                        $payload['reference_audios'] = [$referenceAudioUrl];
                        if (! preg_match('/@?Audio\s*1\b/i', $payload['prompt'])) {
                            $payload['prompt'] = rtrim($payload['prompt']).' @Audio 1';
                        }
                    }
                }
                $payload['resolution'] = in_array(strtolower($resolution), ['480p', '720p', '1080p'], true)
                    ? strtolower($resolution)
                    : '720p';
                $payload['aspect_ratio'] = $aspectRatio;
                $allowedDurations = [4, 5, 6, 8, 10, 12, 15];
                $payload['duration'] = ($durationInt && in_array($durationInt, $allowedDurations, true)) ? $durationInt : 5;
                $payload['generate_audio'] = $request->has('generate_audio') ? $request->boolean('generate_audio') : true;
                $payload['bitrate_mode'] = $request->string('bitrate_mode', 'standard')->toString() ?: 'standard';
                $payload['auto_resize'] = $request->has('auto_resize') ? $request->boolean('auto_resize') : true;
                break;

            case 'kling-o1-reference-image-to-video':
                if ($imageMode === 'first_frame_url') {
                    $payload['first_frame_url'] = $imageUrl;
                }
                $payload['image_urls'] = [$imageUrl];
                if (! preg_match('/@Image\s*1\b/i', $prompt)) {
                    $payload['prompt'] = '@Image1 '.$prompt;
                }
                $payload['aspect_ratio'] = in_array($aspectRatio, ['16:9', '9:16', '1:1'], true) ? $aspectRatio : '16:9';
                $payload['duration'] = ($durationInt && in_array($durationInt, [5, 10], true)) ? $durationInt : 5;
                break;

            case 'minimax-h3-max-reference-to-video':
                if ($imageMode === 'first_frame_url') {
                    $payload['first_frame_url'] = $imageUrl;
                    $payload['first_frame_image'] = $imageUrl;
                }
                $payload['reference_images'] = [$imageUrl];
                $payload['resolution'] = strtolower($resolution) === '480p' ? '480P' : '768P';
                $payload['ratio'] = $aspectRatio;
                $payload['aspect_ratio'] = $aspectRatio;
                $payload['duration'] = ($durationInt && $durationInt >= 5 && $durationInt <= 15) ? $durationInt : 6;
                break;

            case 'wan-2.2-i2v-flash':
                if ($imageMode === 'first_frame_url') {
                    $payload['first_frame_url'] = $imageUrl;
                }
                $payload['resolution'] = strtolower($resolution) === '480p' ? '480p' : '720p';
                if ($request->filled('aspect_ratio')) {
                    $payload['aspect_ratio'] = $aspectRatio;
                }
                break;

            case 'wan3.0-video-prime':
                if ($imageMode === 'first_frame_url') {
                    $payload['first_frame_url'] = $imageUrl;
                }
                $payload['resolution'] = strtoupper(
                    in_array(strtolower($resolution), ['480p', '720p', '1080p'], true) ? $resolution : '720p'
                );
                $payload['aspect_ratio'] = $aspectRatio;
                $payload['duration'] = ($durationInt && in_array($durationInt, [5, 10], true)) ? $durationInt : 5;
                break;

            case 'ltx-2.5-pro':
                if ($imageMode === 'first_frame_url') {
                    $payload['first_frame_url'] = $imageUrl;
                }
                $payload['aspect_ratio'] = in_array($aspectRatio, ['16:9', '9:16'], true) ? $aspectRatio : '16:9';
                $payload['duration'] = ($durationInt && in_array($durationInt, [6, 8, 10], true)) ? $durationInt : 6;
                break;

            default:
                if ($imageMode === 'first_frame_url') {
                    $payload['first_frame_url'] = $imageUrl;
                } else {
                    $payload['reference_images'] = [$imageUrl];
                }
                break;
        }

        if ($request->filled('negative_prompt')) {
            $payload['negative_prompt'] = $request->string('negative_prompt')->toString();
        }

        if ($request->has('prompt_extend')) {
            $payload['prompt_extend'] = $request->boolean('prompt_extend');
        } else {
            $payload['prompt_extend'] = true;
        }

        if ($request->filled('seed')) {
            $payload['seed'] = $request->integer('seed');
        }

        if ($request->has('watermark')) {
            $payload['watermark'] = $request->boolean('watermark');
        }

        return $payload;
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
     * Resolve the image to a public URL (upload it if needed).
     */
    private function imageUrl(ImageToVideoRequest $request): string
    {
        if ($request->hasFile('image')) {
            /** @var UploadedFile $image */
            $image = $request->file('image');

            $path = $image->storeAs(
                'input-images',
                Str::uuid().'.'.$image->getClientOriginalExtension(),
                'spaces',
            );

            if ($path === false) {
                throw new RuntimeException('Failed to store the input image.');
            }

            return Storage::disk('spaces')->url($path);
        }

        $directUrl = $request->string('image_url')->toString();
        if ($directUrl !== '') {
            return $directUrl;
        }

        $refImages = $request->input('reference_images');
        if (is_array($refImages) && ! empty($refImages[0]) && is_string($refImages[0])) {
            return $refImages[0];
        }

        return '';
    }

    /**
     * Resolve indexed extra reference image uploads and URLs while preserving slot order.
     *
     * @return list<string>
     */
    private function resolveExtraOrderedImageUrls(ImageToVideoRequest $request): array
    {
        $files = $request->file('extra_image_files', []);
        $urls = $request->input('extra_image_urls', []);

        if (! is_array($files)) {
            $files = [];
        }
        if (! is_array($urls)) {
            $urls = [];
        }

        $indices = array_values(array_unique(array_merge(array_keys($files), array_keys($urls))));
        sort($indices, SORT_NUMERIC);

        $resolved = [];
        foreach (array_slice($indices, 0, 8) as $slot) {
            if (isset($files[$slot]) && $files[$slot] instanceof UploadedFile) {
                $file = $files[$slot];
                $path = $file->storeAs(
                    'input-images',
                    Str::uuid().'.'.$file->getClientOriginalExtension(),
                    'spaces',
                );
                if ($path === false) {
                    throw new RuntimeException('Failed to store extra reference image.');
                }
                $resolved[] = Storage::disk('spaces')->url($path);
            } elseif (isset($urls[$slot]) && is_string($urls[$slot]) && trim($urls[$slot]) !== '') {
                $resolved[] = trim($urls[$slot]);
            }
        }

        return $resolved;
    }

    /**
     * Resolve an optional media file upload or fallback URL string.
     */
    private function resolveOptionalMediaUrl(
        ImageToVideoRequest $request,
        string $fileField,
        string $urlField,
        string $directory,
    ): string {
        if ($request->hasFile($fileField)) {
            /** @var UploadedFile $file */
            $file = $request->file($fileField);

            $path = $file->storeAs(
                $directory,
                Str::uuid().'.'.$file->getClientOriginalExtension(),
                'spaces',
            );

            if ($path === false) {
                throw new RuntimeException("Failed to store the {$fileField} file.");
            }

            return Storage::disk('spaces')->url($path);
        }

        if ($request->filled($urlField)) {
            return $request->string($urlField)->toString();
        }

        return '';
    }
}
