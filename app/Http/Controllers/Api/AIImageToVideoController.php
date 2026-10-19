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
            if (! empty($durKey) && ! empty($aiModel->duration_costs[$durKey])) {
                $cost = (int) $aiModel->duration_costs[$durKey];
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

        $payload = [
            'prompt' => $request->string('prompt')->toString(),
            'image' => $imageUrl,
            'model' => $modelName,
        ];

        if ($request->filled('negative_prompt')) {
            $payload['negative_prompt'] = $request->string('negative_prompt')->toString();
        }

        if ($request->filled('resolution')) {
            $payload['resolution'] = $request->string('resolution')->toString();
        } else {
            $payload['resolution'] = '720p';
        }

        if ($request->filled('aspect_ratio')) {
            $payload['aspect_ratio'] = $request->string('aspect_ratio')->toString();
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
        ]);

        $model = $request->string('model', 'kling-o1-reference-image-to-video')->toString();
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

        return $request->string('image_url')->toString();
    }
}
