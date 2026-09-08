<?php

namespace App\Http\Controllers\Api;

use App\AI\DTOs\GenerationRequest;
use App\AI\Exceptions\AIGenerationFailedException;
use App\AI\Exceptions\AIGenerationTimeoutException;
use App\AI\Services\AIService;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class AIImageToVideoController extends Controller
{
    public function __construct(
        private readonly AIService $aiService,
    ) {}

    /**
     * Generate a video from an image using Wan 2.2 I2V Flash.
     *
     * Uses Segmind's Wan Image-to-Video model to generate short,
     * coherent videos from a single reference image plus a text prompt.
     *
     * **Cost:** 20 coins per generation (configurable in admin settings).
     *
     * **Parameters:**
     * - `prompt` (required): Vividly describe motion, camera behavior, atmosphere.
     * - `image` (required): Upload image file OR provide `image_url`.
     * - `image_url` (required if no `image`): Base image URL.
     * - `negative_prompt` (optional): Exclude unwanted elements.
     * - `resolution` (optional): "480p" ($0.075) or "720p" ($0.18, default).
     * - `prompt_extend` (optional, default true): Auto-enhance prompt for richer detail.
     * - `seed` (optional): Lock randomness for reproducible outputs.
     * - `watermark` (optional): Add "AI Generated" tag.
     *
     * @response 200 {"status": "completed", "generation": {"id": 1, "operation": "image-to-video", "output": ["https://...mp4"], "coins_spent": 20, "coins_remaining": 80}}
     * @response 402 {"message": "Not enough coins — top up to continue."}
     * @response 422 {"status": "failed", "message": "Segmind generation failed: ..."}
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'prompt' => 'required|string|max:2000',
            'image' => 'required_without:image_url|file|image|max:10240',
            'image_url' => 'required_without:image|url',
            'negative_prompt' => 'nullable|string|max:1000',
            'model' => 'nullable|string|in:seedance-2.5,wan2.7-r2v,kling-o1-reference-image-to-video',
            'aspect_ratio' => 'nullable|string|in:1:1,9:16,16:9,4:3,3:4',
            'resolution' => 'nullable|string|in:480p,720p,1080p',
            'prompt_extend' => 'nullable|string|in:true,false,0,1',
            'seed' => 'nullable|integer|min:0',
            'watermark' => 'nullable|string|in:true,false,0,1',
        ]);

        $requester = $request->user();

        // Determine cost based on resolution
        $resolution = $request->string('resolution', '720p')->toString();
        $costKey = match ($resolution) {
            '480p' => 'coin_cost_image_to_video_480p',
            '1080p' => 'coin_cost_image_to_video_1080p',
            default => 'coin_cost_image_to_video_720p',
        };
        $configKey = match ($resolution) {
            '480p' => 'ai.coin_costs.image_to_video_480p',
            '1080p' => 'ai.coin_costs.image_to_video_1080p',
            default => 'ai.coin_costs.image_to_video_720p',
        };
        $defaultCost = match ($resolution) {
            '480p' => 10,
            '1080p' => 30,
            default => 20,
        };
        $templateCost = (int) Setting::get('ai', $costKey, config($configKey, $defaultCost));

        if ($requester instanceof Customer) {
            $this->authorizeCustomerCoins($requester, $templateCost);
        }

        // Resolve image URL (upload file or use provided URL)
        $imageUrl = $this->imageUrl($request);

        $payload = [
            'prompt' => $request->string('prompt')->toString(),
            'image' => $imageUrl,
            // 'duration' => 10, // Default duration in seconds
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

        Log::info('Image-to-video request', [
            'customer_id' => $requester?->id,
            'image_url' => $imageUrl,
        ]);

        $model = $request->string('model', 'kling-o1-reference-image-to-video')->toString();

        try {
            $generation = $this->aiService->imageToVideo(
                new GenerationRequest(
                    operation: 'image-to-video',
                    payload: $payload,
                    model: $model,
                ),
                $requester,
            );

            if ($requester instanceof Customer && $generation->status === 'completed') {
                $requester->spendCoins($templateCost);
                // Save coins spent to generation record
                $generation->update(['coins_spent' => $templateCost]);
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
                    'coins_spent' => $requester instanceof Customer ? $templateCost : null,
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
     * Reject the request when the customer cannot afford the coin cost.
     */
    private function authorizeCustomerCoins(Customer $customer, int $cost): void
    {
        if ($cost > 0 && ! $customer->hasEnoughCoins($cost)) {
            abort(402, 'Not enough coins — top up to continue.');
        }
    }

    /**
     * Resolve the image to a public URL (upload it if needed).
     */
    private function imageUrl(Request $request): string
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
