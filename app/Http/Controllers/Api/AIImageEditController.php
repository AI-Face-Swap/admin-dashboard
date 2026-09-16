<?php

namespace App\Http\Controllers\Api;

use App\AI\DTOs\GenerationRequest;
use App\AI\Exceptions\AIGenerationFailedException;
use App\AI\Exceptions\AIGenerationTimeoutException;
use App\AI\Services\AIService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ImageEditRequest;
use App\Models\AIModel;
use App\Models\Customer;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class AIImageEditController extends Controller
{
    public function __construct(
        private readonly AIService $aiService,
    ) {}

    /**
     * Edit an image using AI models.
     *
     * @response 200 {"status": "completed", "generation": {"id": 1, "operation": "image-editing", "output": ["https://..."], "coins_spent": 10, "coins_remaining": 90}}
     * @response 402 {"message": "Not enough coins — top up to continue."}
     * @response 422 {"status": "failed", "message": "Segmind generation failed: ..."}
     */
    public function store(ImageEditRequest $request): JsonResponse
    {
        $requester = $request->user();
        $model = $request->string('model')->toString();

        $aiModel = AIModel::where('model_name', $model)->where('is_active', true)->first();
        $coinCost = $aiModel?->coin_cost ?? (int) Setting::get('ai', 'coin_cost_image_edit', config('ai.coin_costs.image_edit', 10));

        if ($aiModel && ! empty($aiModel->resolution_costs)) {
            $resKey = $request->string('size')->toString()
                ?: $request->string('quality')->toString()
                ?: $request->string('resolution')->toString()
                ?: $request->string('output_resolution')->toString();

            if (! empty($resKey) && isset($aiModel->resolution_costs[$resKey])) {
                $coinCost = (int) $aiModel->resolution_costs[$resKey];
            }
        }

        if ($requester instanceof Customer) {
            $this->authorizeCustomerCoins($requester, $coinCost);
        }

        $payload = $this->buildPayload($request, $model);

        try {
            $generation = $this->aiService->editImage(
                new GenerationRequest(
                    operation: 'image-editing',
                    payload: $payload,
                    model: $model,
                ),
                $requester,
            );

            if ($requester instanceof Customer && $generation->status === 'completed') {
                $requester->spendCoins($coinCost);
                $generation->update(['coins_spent' => $coinCost]);
            }

            return response()->json([
                'status' => $generation->status,
                'generation' => [
                    'id' => $generation->id,
                    'request_id' => $generation->request_id,
                    'operation' => $generation->operation,
                    'status' => $generation->status,
                    'cost' => $generation->cost,
                    'currency' => $generation->currency,
                    'duration_ms' => $generation->duration_ms,
                    'output' => $generation->output_metadata ?? [],
                    'coins_spent' => $requester instanceof Customer ? $coinCost : null,
                    'coins_remaining' => $requester instanceof Customer ? $requester->fresh()->coins : null,
                ],
            ]);
        } catch (AIGenerationFailedException $e) {
            return response()->json([
                'status' => 'failed',
                'message' => $e->getMessage(),
            ], 422);
        } catch (AIGenerationTimeoutException $e) {
            return response()->json([
                'status' => 'failed',
                'message' => $e->getMessage(),
            ], 408);
        }
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
        }

        return $payload;
    }

    /**
     * Authorize customer has enough coins.
     */
    private function authorizeCustomerCoins(Customer $customer, int $cost): void
    {
        if ($cost > 0 && ! $customer->hasEnoughCoins($cost)) {
            abort(402, 'Not enough coins — top up to continue.');
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
