<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AIGeneration;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerGenerationController extends Controller
{
    /**
     * List the authenticated customer's generations.
     *
     * Returns paginated generations with optional status/type filters.
     * Also includes summary stats (total, completed, processing, failed).
     */
    public function index(Request $request): JsonResponse
    {
        /** @var Customer $customer */
        $customer = $request->user();

        $validated = $request->validate([
            'status' => ['nullable', 'string', 'in:queued,processing,completed,failed'],
            'type' => ['nullable', 'string', 'in:image-generation,image-editing,face-swap,video-face-swap,image-to-video'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $baseQuery = AIGeneration::where('customer_id', $customer->id)
            ->where('operation', '!=', AIGeneration::OPERATION_CHAT);

        $query = (clone $baseQuery)
            ->with(['provider:id,name,slug', 'template:id,name,slug,type,thumbnail_path,cost'])
            ->when($validated['status'] ?? null, function ($q, $status) {
                if ($status === 'processing') {
                    return $q->whereIn('status', ['queued', 'processing']);
                }

                return $q->where('status', $status);
            })
            ->when($validated['type'] ?? null, function ($q, $type) {
                if ($type === AIGeneration::OPERATION_IMAGE) {
                    return $q->whereIn('operation', [
                        AIGeneration::OPERATION_IMAGE,
                        AIGeneration::OPERATION_IMAGE_EDIT,
                    ]);
                }

                if ($type === AIGeneration::OPERATION_VIDEO_FACE_SWAP) {
                    return $q->whereIn('operation', [
                        AIGeneration::OPERATION_VIDEO_FACE_SWAP,
                        AIGeneration::OPERATION_IMAGE_TO_VIDEO,
                    ]);
                }

                return $q->where('operation', $type);
            })
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc');

        $paginator = $query->paginate($validated['per_page'] ?? 12)->withQueryString();

        // Map output_metadata to output for frontend consumption
        $generations = $paginator->getCollection()->map(fn (AIGeneration $gen) => [
            'id' => $gen->id,
            'operation' => $gen->operation,
            'status' => $gen->status,
            'request_id' => $gen->request_id,
            'cost' => $gen->cost,
            'currency' => $gen->currency,
            'duration_ms' => $gen->duration_ms,
            'output' => $gen->output_metadata ?? [],
            'error' => $gen->error,
            'provider' => $gen->provider,
            'template' => $gen->template,
            'created_at' => $gen->created_at,
            'updated_at' => $gen->updated_at,
        ]);

        // Summary stats (excluding chat)
        $stats = [
            'total' => (clone $baseQuery)->count(),
            'completed' => (clone $baseQuery)->where('status', 'completed')->count(),
            'processing' => (clone $baseQuery)->whereIn('status', ['queued', 'processing'])->count(),
            'failed' => (clone $baseQuery)->where('status', 'failed')->count(),
        ];

        return response()->json([
            'generations' => [
                'data' => $generations,
                'meta' => [
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                ],
                'links' => [
                    'first' => $paginator->url(1),
                    'last' => $paginator->url($paginator->lastPage()),
                    'prev' => $paginator->previousPageUrl(),
                    'next' => $paginator->nextPageUrl(),
                ],
            ],
            'stats' => $stats,
        ]);
    }
}
