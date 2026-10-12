<?php

namespace App\Http\Controllers\Api;

use App\AI\DTOs\GenerationRequest;
use App\AI\Services\AIService;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\FaceSwapRequest;
use App\Models\Customer;
use App\Models\Template;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class AIFaceSwapController extends Controller
{
    public function __construct(
        private readonly AIService $aiService,
    ) {}

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

        if ($requester instanceof Customer) {
            $this->authorizeCustomerPoints($requester, $templateCost);
        }

        $generation = $this->aiService->faceSwap(
            new GenerationRequest(
                operation: 'face-swap',
                payload: [
                    'source_image' => $faceUrl,
                    'target_image' => $targetUrl,
                ],
                templateId: $template?->id,
            ),
            $requester,
        );

        if ($requester instanceof Customer && $generation->status === 'completed') {
            $requester->spendPoints($templateCost, "Face swap ({$generation->id})", $generation->request_id);
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
