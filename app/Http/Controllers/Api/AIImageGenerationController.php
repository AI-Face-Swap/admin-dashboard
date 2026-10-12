<?php

namespace App\Http\Controllers\Api;

use App\AI\DTOs\GenerationRequest;
use App\AI\Exceptions\AIGenerationFailedException;
use App\AI\Exceptions\AIGenerationTimeoutException;
use App\AI\Services\AIService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ImageGenerationRequest;
use App\Models\AIModel;
use App\Models\Customer;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class AIImageGenerationController extends Controller
{
    public function __construct(
        private readonly AIService $aiService,
    ) {}

    /**
     * Generate an image from a text prompt.
     *
     * **Cost:** 5 points per generation (configurable in admin settings).
     *
     * **Available models:**
     * - `seedream-v5-lite-text-to-image` — Fast, affordable (default)
     * - `nano-banana-2-lite` — Google's fastest (~4 sec)
     * - `qwen-image-3` — Best for legible in-image text
     *
     * @response 200 {"status": "completed", "generation": {"id": 1, "operation": "image-generation", "output": ["https://..."], "points_spent": 5, "points_remaining": 95}}
     * @response 402 {"message": "Not enough points — top up to continue."}
     * @response 422 {"status": "failed", "message": "Segmind generation failed: ..."}
     */
    public function store(ImageGenerationRequest $request): JsonResponse
    {
        $requester = $request->user();
        $modelName = $request->string('model')->toString();

        $aiModel = null;
        if (! empty($modelName)) {
            $aiModel = AIModel::where('model_name', $modelName)->where('is_active', true)->first();
        }
        $templateCost = $aiModel?->point_cost ?? (int) Setting::get('ai', 'point_cost_image_generation', Setting::get('ai', 'coin_cost_image_generation', config('ai.point_costs.image_generation', config('ai.coin_costs.image_generation', 5))));

        if ($requester instanceof Customer) {
            $this->authorizeCustomerPoints($requester, $templateCost);
        }

        $payload = [
            'prompt' => $request->string('prompt')->toString(),
        ];

        if ($request->filled('negative_prompt')) {
            $payload['negative_prompt'] = $request->string('negative_prompt')->toString();
        }

        if ($request->filled('model')) {
            $payload['model'] = $request->string('model')->toString();
        }

        if ($request->filled('width')) {
            $payload['width'] = $request->integer('width');
        }

        if ($request->filled('height')) {
            $payload['height'] = $request->integer('height');
        }

        if ($request->filled('seed')) {
            $payload['seed'] = $request->integer('seed');
        }

        if ($request->filled('image_format')) {
            $payload['image_format'] = $request->string('image_format')->toString();
        }

        if ($request->filled('quality')) {
            $payload['quality'] = $request->integer('quality');
        }

        try {
            $generation = $this->aiService->generateImage(
                new GenerationRequest(
                    operation: 'image-generation',
                    payload: $payload,
                    model: $request->string('model', 'seedream-v5-lite-text-to-image')->toString(),
                ),
                $requester,
            );

            if ($requester instanceof Customer && $generation->status === 'completed') {
                $requester->spendPoints($templateCost, "Image generation ({$generation->id})", $generation->request_id);
                // Save points spent to generation record
                $generation->update(['points_spent' => $templateCost]);
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
                    'points_spent' => $requester instanceof Customer ? $templateCost : null,
                    'points_remaining' => $requester instanceof Customer ? $requester->points : null,
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
     * Reject the request when the customer cannot afford the cost.
     */
    private function authorizeCustomerPoints(Customer $customer, int $cost): void
    {
        if ($cost > 0 && ! $customer->hasEnoughPoints($cost)) {
            abort(402, 'Not enough points — top up to continue.');
        }
    }
}
