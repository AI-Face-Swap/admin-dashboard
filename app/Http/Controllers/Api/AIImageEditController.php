<?php

namespace App\Http\Controllers\Api;

use App\Events\AIGenerationUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ImageEditRequest;
use App\Jobs\ProcessImageEdit;
use App\Models\AIGeneration;
use App\Models\AIModel;
use App\Models\AIProvider;
use App\Models\Customer;
use App\Models\Setting;
use App\Models\User;
use App\Services\AIIdempotencyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class AIImageEditController extends Controller
{

    /**
     * Edit an image using AI models.
     *
     * @response 200 {"status": "completed", "generation": {"id": 1, "operation": "image-editing", "output": ["https://..."], "points_spent": 10, "points_remaining": 90}}
     * @response 402 {"message": "Not enough points — top up to continue."}
     * @response 422 {"status": "failed", "message": "Segmind generation failed: ..."}
     */
    public function store(ImageEditRequest $request): JsonResponse
    {
        $requester = $request->user();
        $model = $request->string('model')->toString();
        $idempotencyToken = $request->string('client_idempotency_token');

        $payload = $this->buildPayload($request, $model);

        // Check for existing generation with the same idempotency token
        if ($idempotencyResponse = AIIdempotencyService::check(
            $requester,
            $idempotencyToken ?: null,
            AIGeneration::OPERATION_IMAGE_EDIT,
            $payload
        )) {
            return $idempotencyResponse;
        }

        $aiModel = AIModel::where('model_name', $model)->where('is_active', true)->first();
        $pointCost = $aiModel?->point_cost ?? (int) Setting::get('ai', 'point_cost_image_edit', Setting::get('ai', 'coin_cost_image_edit', config('ai.point_costs.image_edit', config('ai.coin_costs.image_edit', 10))));

        if ($aiModel && ! empty($aiModel->resolution_costs)) {
            $resKey = $request->string('size')->toString()
                ?: $request->string('quality')->toString()
                ?: $request->string('resolution')->toString()
                ?: $request->string('output_resolution')->toString();

            if (! empty($resKey) && isset($aiModel->resolution_costs[$resKey])) {
                $pointCost = (int) $aiModel->resolution_costs[$resKey];
            }
        }

        if ($requester instanceof Customer) {
            $this->authorizeCustomerPoints($requester, $pointCost);
        }

        $provider = AIProvider::where('slug', 'segmind')->first();

        $generation = AIGeneration::create([
            'user_id' => $requester instanceof User ? $requester->id : null,
            'customer_id' => $requester instanceof Customer ? $requester->id : null,
            'provider_id' => $provider?->id ?? 1,
            'operation' => AIGeneration::OPERATION_IMAGE_EDIT,
            'status' => AIGeneration::STATUS_QUEUED,
            'input_metadata' => $payload,
            'client_idempotency_token' => $idempotencyToken ?: null,
        ]);

        if ($requester instanceof Customer && $pointCost > 0) {
            $requester->spendPoints($pointCost, "Image editing ({$generation->id})", "gen_{$generation->id}_deduct");
            $generation->update(['points_spent' => $pointCost]);
        }

        event(new AIGenerationUpdated($generation));

        ProcessImageEdit::dispatch(
            generationId: $generation->id,
            payload: $payload,
            customerId: $requester instanceof Customer ? $requester->id : null,
            pointCost: $pointCost,
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
                'message' => 'Image editing job dispatched. Poll /api/v1/ai/generations/'.$generation->id.' for status.',
            ],
        ], 202);
    }

    /**
     * Build the request payload tailored to the chosen model.
     *
     * @return array<string, mixed>
     */
    private function buildPayload(ImageEditRequest $request, string $model): array
    {
        $payload = [
            'prompt' => $request->string('prompt')->toString(),
        ];

        if ($request->filled('seed')) {
            $payload['seed'] = $request->integer('seed');
        }

        switch ($model) {
            case 'multi-image-kontext-max':
                $payload['input_image_1'] = $this->resolveImageUrl($request, 'input_image_1');
                $payload['input_image_2'] = $this->resolveImageUrl($request, 'input_image_2');
                $payload['aspect_ratio'] = $request->string('aspect_ratio', '1:1')->toString();
                $payload['output_format'] = $request->string('output_format', 'jpg')->toString();
                $payload['safety_tolerance'] = $request->filled('safety_tolerance')
                    ? $request->integer('safety_tolerance')
                    : 1;
                break;

            case 'flux-kontext-dev':
                $payload['input_image'] = $this->resolveImageUrl($request, 'input_image') ?: $this->resolveImageUrl($request, 'input_image_1');
                $payload['aspect_ratio'] = $request->string('aspect_ratio', 'match_input_image')->toString();
                $payload['guidance'] = $request->filled('guidance') ? $request->float('guidance') : 7;
                $payload['num_inference_steps'] = $request->filled('num_inference_steps') ? $request->integer('num_inference_steps') : 35;
                $payload['output_format'] = $request->string('output_format', 'png')->toString();
                $payload['output_quality'] = $request->filled('output_quality') ? $request->integer('output_quality') : 90;
                $payload['disable_safety_checker'] = $request->has('disable_safety_checker')
                    ? $request->boolean('disable_safety_checker')
                    : false;
                break;

            case 'seedream-v5-lite-image-to-image':
                $payload['image_input'] = $this->resolveImageArray($request);
                $payload['aspect_ratio'] = $request->string('aspect_ratio', '16:9')->toString();
                $payload['size'] = $request->string('size', '3K')->toString();
                $payload['max_images'] = $request->filled('max_images') ? $request->integer('max_images') : 1;
                $payload['optimize_prompt'] = $request->string('optimize_prompt', 'fast')->toString();
                $payload['watermark'] = $request->has('watermark') ? $request->boolean('watermark') : false;
                break;

            case 'gpt-image-1.5-edit':
                $payload['image_urls'] = $this->resolveImageArray($request);
                $payload['size'] = $request->string('size', 'auto')->toString();
                $payload['quality'] = $request->string('quality', 'high')->toString();
                $payload['background'] = $request->string('background', 'opaque')->toString();
                $payload['output_compression'] = $request->filled('output_compression') ? $request->integer('output_compression') : 100;
                $payload['output_format'] = $request->string('output_format', 'png')->toString();
                $payload['moderation'] = $request->string('moderation', 'auto')->toString();
                break;

            case 'kling-3-image2image':
                $img = $this->resolveImageUrl($request, 'image_url')
                    ?: ($this->resolveImageUrl($request, 'input_image') ?: $this->resolveImageUrl($request, 'input_image_1'));
                $payload['image_url'] = $img;
                $payload['resolution'] = $request->string('resolution', '1K')->toString();
                $payload['aspect_ratio'] = $request->string('aspect_ratio', '16:9')->toString();
                $payload['output_format'] = $request->string('output_format', 'png')->toString();
                break;

            case 'nano-banana-pro':
                $payload['image_urls'] = $this->resolveImageArray($request);
                if ($request->filled('system_prompt')) {
                    $payload['system_prompt'] = $request->string('system_prompt')->toString();
                }
                $payload['aspect_ratio'] = $request->string('aspect_ratio', '1:1')->toString();
                $payload['output_resolution'] = $request->string('output_resolution', '4K')->toString();
                $payload['output_format'] = $request->string('output_format', 'jpg')->toString();
                $payload['response_modalities'] = $request->string('response_modalities', 'TEXT_AND_IMAGE')->toString();
                break;

            case 'ideogram-4.5-edit':
                $img = $this->resolveImageUrl($request, 'image_url')
                    ?: ($this->resolveImageUrl($request, 'input_image') ?: $this->resolveImageUrl($request, 'input_image_1'));
                $payload['image'] = $img;
                $payload['quality'] = $request->string('quality', 'medium')->toString();
                if ($request->hasFile('mask') || $request->filled('mask_url') || $request->filled('mask')) {
                    $payload['mask'] = $this->resolveImageUrl($request, 'mask');
                }
                break;

            case 'bria-extract-object':
                $img = $this->resolveImageUrl($request, 'image_url')
                    ?: ($this->resolveImageUrl($request, 'input_image') ?: $this->resolveImageUrl($request, 'input_image_1'));
                $payload['image'] = $img;
                break;
        }

        return $payload;
    }

    /**
     * Authorize customer has enough points.
     */
    private function authorizeCustomerPoints(Customer $customer, int $cost): void
    {
        if ($cost > 0 && ! $customer->hasEnoughPoints($cost)) {
            abort(402, 'Not enough points — top up to continue.');
        }
    }

    /**
     * Resolve image URL from uploaded file or direct URL.
     */
    private function resolveImageUrl(ImageEditRequest $request, string $field): string
    {
        if ($request->hasFile($field)) {
            /** @var UploadedFile $file */
            $file = $request->file($field);

            $path = $file->storeAs(
                'input-images',
                Str::uuid().'.'.$file->getClientOriginalExtension(),
                'spaces',
            );

            if ($path === false) {
                throw new RuntimeException("Failed to store the {$field} file.");
            }

            return Storage::disk('spaces')->url($path);
        }

        $urlField = "{$field}_url";
        if ($request->filled($urlField)) {
            return $request->string($urlField)->toString();
        }

        if ($request->filled($field) && is_string($request->input($field))) {
            return $request->string($field)->toString();
        }

        return '';
    }

    /**
     * Resolve a list of image URLs from array or multiple input fields.
     *
     * @return list<string>
     */
    private function resolveImageArray(ImageEditRequest $request): array
    {
        $urls = [];

        if ($request->filled('image_input') && is_array($request->input('image_input'))) {
            $urls = array_merge($urls, $request->input('image_input'));
        }
        if ($request->filled('image_urls') && is_array($request->input('image_urls'))) {
            $urls = array_merge($urls, $request->input('image_urls'));
        }

        if (empty($urls)) {
            $url1 = $this->resolveImageUrl($request, 'input_image_1')
                ?: ($this->resolveImageUrl($request, 'input_image') ?: $this->resolveImageUrl($request, 'image_url'));

            if (! empty($url1)) {
                $urls[] = $url1;
            }

            $url2 = $this->resolveImageUrl($request, 'input_image_2');
            if (! empty($url2)) {
                $urls[] = $url2;
            }
        }

        return array_values(array_filter($urls));
    }
}
