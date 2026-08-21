<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\VideoFaceSwapRequest;
use App\Jobs\ProcessVideoFaceSwap;
use App\Models\AIGeneration;
use App\Models\AIProvider;
use App\Models\Customer;
use App\Models\Template;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class AIVideoFaceSwapController extends Controller
{
    /**
     * Submit a video face-swap generation (queued).
     *
     * Swaps a face in a video. This is an **async operation** — the request
     * returns immediately with a generation ID. Poll `/ai/generations/{id}`
     * to check status.
     *
     * **Cost:** Depends on the template (video templates typically cost more).
     *
     * **Processing time:** 30 seconds to 5+ minutes depending on video length.
     *
     * @response 202 {"status": "queued", "generation": {"id": 18, "operation": "video-face-swap", "message": "Video face-swap job dispatched. Poll /api/v1/ai/generations/18 for status."}}
     * @response 402 {"message": "Not enough coins — top up to continue."}
     */
    public function store(VideoFaceSwapRequest $request): JsonResponse
    {
        $faceUrl = $this->faceUrl($request);

        $template = null;
        $templateCost = 0;

        if ($request->filled('template_slug')) {
            $template = Template::where('slug', $request->string('template_slug'))
                ->where('is_active', true)
                ->where('type', 'video')
                ->first()
                ?? throw new ModelNotFoundException('Video template not found.');

            $targetUrl = $template->file_url;
            $templateCost = $template->cost;
        } else {
            $targetUrl = $request->string('target_video_url')->toString();
        }

        $requester = $request->user();

        if ($requester instanceof Customer) {
            $this->authorizeCustomerCoins($requester, $templateCost);
        }

        // Build the payload for the provider.
        $payload = [
            'source_image' => $faceUrl,
            'target_video' => $targetUrl,
            'model_name' => $request->string('model_name', 'hyperswap_1b')->toString(),
            'face_detector_score' => $request->float('face_detector_score', 0.5),
            'target_face_index' => $request->integer('target_face_index', 0),
        ];

        // Create the generation row (status: queued).
        $generation = AIGeneration::create([
            'user_id' => $requester instanceof User ? $requester->id : null,
            'customer_id' => $requester instanceof Customer ? $requester->id : null,
            'provider_id' => AIProvider::where('slug', 'segmind')->firstOrFail()->id,
            'template_id' => $template?->id,
            'operation' => AIGeneration::OPERATION_VIDEO_FACE_SWAP,
            'status' => AIGeneration::STATUS_QUEUED,
            'input_metadata' => $payload,
        ]);

        // Dispatch the queued job.
        ProcessVideoFaceSwap::dispatch(
            generationId: $generation->id,
            payload: $payload,
            templateId: $template?->id,
            customerId: $requester instanceof Customer ? $requester->id : null,
            coinCost: $templateCost,
        );

        return response()->json([
            'status' => 'queued',
            'generation' => [
                'id' => $generation->id,
                'operation' => $generation->operation,
                'status' => $generation->status,
                'message' => 'Video face-swap job dispatched. Poll /api/v1/ai/generations/'.$generation->id.' for status.',
            ],
        ], 202);
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
    private function faceUrl(VideoFaceSwapRequest $request): string
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
