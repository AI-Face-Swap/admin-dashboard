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
     * Swap a face onto a target image or template.
     *
     * This is the single shared endpoint — the admin dashboard (session)
     * and the mobile app (Sanctum token) both call this. No duplicate AI
     * logic anywhere.
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
            $templateCost = $template->cost;
        } else {
            $targetUrl = $request->string('target_image_url')->toString();
        }

        $requester = $request->user();

        if ($requester instanceof Customer) {
            $this->authorizeCustomerCoins($requester, $templateCost);
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
            $requester->spendCoins($templateCost);
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
