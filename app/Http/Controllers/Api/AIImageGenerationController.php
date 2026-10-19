<?php

namespace App\Http\Controllers\Api;

use App\Events\AIGenerationUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ImageGenerationRequest;
use App\Jobs\ProcessImageGeneration;
use App\Models\AIGeneration;
use App\Models\AIModel;
use App\Models\AIProvider;
use App\Models\Customer;
use App\Models\Setting;
use App\Models\User;
use App\Services\AIIdempotencyService;
use Illuminate\Http\JsonResponse;

class AIImageGenerationController extends Controller
{

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
        $idempotencyToken = $request->string('client_idempotency_token')->toString() ?: null;

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

        // Check for existing generation with the same idempotency token
        if ($idempotencyResponse = AIIdempotencyService::check(
            $requester,
            $idempotencyToken,
            AIGeneration::OPERATION_IMAGE,
            $payload
        )) {
            return $idempotencyResponse;
        }

        $aiModel = null;
        if (! empty($modelName)) {
            $aiModel = AIModel::where('model_name', $modelName)->where('is_active', true)->first();
        }
        $templateCost = $aiModel?->point_cost ?? (int) Setting::get('ai', 'point_cost_image_generation', Setting::get('ai', 'coin_cost_image_generation', config('ai.point_costs.image_generation', config('ai.coin_costs.image_generation', 5))));

        if ($requester instanceof Customer) {
            $this->authorizeCustomerPoints($requester, $templateCost);
        }

        $model = $request->string('model', 'seedream-v5-lite-text-to-image')->toString();
        $provider = AIProvider::where('slug', 'segmind')->first();

        $generation = AIGeneration::create([
            'user_id' => $requester instanceof User ? $requester->id : null,
            'customer_id' => $requester instanceof Customer ? $requester->id : null,
            'provider_id' => $provider?->id ?? 1,
            'operation' => AIGeneration::OPERATION_IMAGE,
            'status' => AIGeneration::STATUS_QUEUED,
            'input_metadata' => $payload,
            'client_idempotency_token' => $idempotencyToken,
        ]);

        if ($requester instanceof Customer && $templateCost > 0) {
            $requester->spendPoints($templateCost, "Image generation ({$generation->id})", "gen_{$generation->id}_deduct");
            $generation->update(['points_spent' => $templateCost]);
        }

        event(new AIGenerationUpdated($generation));

        ProcessImageGeneration::dispatch(
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
                'message' => 'Image generation job dispatched. Poll /api/v1/ai/generations/'.$generation->id.' for status.',
            ],
        ], 202);
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
