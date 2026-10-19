<?php

namespace App\Http\Controllers\Api;

use App\Events\AIGenerationUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\FaceSwapRequest;
use App\Jobs\ProcessFaceSwap;
use App\Models\AIGeneration;
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

class AIFaceSwapController extends Controller
{

    /**
     * Swap a face onto a target image.
     *
     * Upload a face image (or provide a URL) and a target image (or template slug).
     * The AI will swap the face onto the target.
     *
     * **Cost:** Depends on the template (free templates cost 0 points).
     *
     * **How it works:**
     * 1. Provide `face_image` (file) OR `face_image_url` (string)
     * 2. Provide `template_slug` (string) OR `target_image_url` (string)
     * 3. Get back a completed generation with the swapped image
     *
     * @response 200 {"status": "completed", "generation": {"id": 1, "operation": "face-swap", "output": ["https://..."], "points_spent": 5, "points_remaining": 95}}
     * @response 402 {"message": "Not enough points — top up to continue."}
     */
    public function store(FaceSwapRequest $request): JsonResponse
    {
        $faceUrl = $this->faceUrl($request);

        $template = null;
        $templateCost = 0;

        if ($request->filled('template_slug')) {
            $template = Template::where('slug', $request->string('template_slug'))
                ->where('is_active', true)
                ->where('type', 'image')
                ->first()
                ?? throw new ModelNotFoundException('Image template not found.');

            $targetUrl = $template->file_url;
            $templateCost = $template->effective_cost;
        } else {
            $targetUrl = $request->string('target_image_url')->toString();
        }

        $requester = $request->user();
        $idempotencyToken = $request->string('client_idempotency_token')->toString() ?: null;

        $payload = [
            'source_image' => $faceUrl,
            'target_image' => $targetUrl,
            'template_id' => $template?->id,
        ];

        // Check for existing generation with the same idempotency token
        if ($idempotencyResponse = AIIdempotencyService::check(
            $requester,
            $idempotencyToken,
            AIGeneration::OPERATION_FACE_SWAP,
            $payload
        )) {
            return $idempotencyResponse;
        }

        if ($requester instanceof Customer) {
            $this->authorizeCustomerPoints($requester, $templateCost);
        }

        $provider = AIProvider::where('slug', 'segmind')->first();

        $generation = AIGeneration::create([
            'user_id' => $requester instanceof User ? $requester->id : null,
            'customer_id' => $requester instanceof Customer ? $requester->id : null,
            'provider_id' => $provider?->id ?? 1,
            'template_id' => $template?->id,
            'operation' => AIGeneration::OPERATION_FACE_SWAP,
            'status' => AIGeneration::STATUS_QUEUED,
            'input_metadata' => $payload,
            'client_idempotency_token' => $idempotencyToken,
        ]);

        if ($requester instanceof Customer && $templateCost > 0) {
            $requester->spendPoints($templateCost, "Face swap ({$generation->id})", "gen_{$generation->id}_deduct");
            $generation->update(['points_spent' => $templateCost]);
        }

        event(new AIGenerationUpdated($generation));

        ProcessFaceSwap::dispatch(
            generationId: $generation->id,
            payload: $payload,
            templateId: $template?->id,
            customerId: $requester instanceof Customer ? $requester->id : null,
            pointCost: $templateCost,
        );

        return response()->json([
            'status' => 'queued',
            'generation' => [
                'id' => $generation->id,
                'operation' => $generation->operation,
                'status' => $generation->status,
                'points_spent' => $generation->points_spent,
                'points_remaining' => $requester instanceof Customer ? $requester->points : null,
                'message' => 'Face swap job dispatched. Poll /api/v1/ai/generations/'.$generation->id.' for status.',
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
     * Resolve the face image to a public URL (uploading it if needed).
     */
    private function faceUrl(FaceSwapRequest $request): string
    {
        if ($request->hasFile('face_image')) {
            /** @var UploadedFile $face */
            $face = $request->file('face_image');

            $path = $face->storeAs(
                'faces',
                Str::uuid().'.'.$face->getClientOriginalExtension(),
                'spaces',
            );

            if ($path === false) {
                throw new RuntimeException('Failed to store the face image.');
            }

            return Storage::disk('spaces')->url($path);
        }

        return $request->string('face_image_url')->toString();
    }
}
