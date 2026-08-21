<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AIGeneration;
use Illuminate\Http\JsonResponse;

class AIGenerationStatusController extends Controller
{
    /**
     * Get the current status of a generation.
     *
     * Poll this endpoint to check if a queued generation (e.g. video face-swap)
     * has completed. For synchronous operations (face-swap, image generation),
     * the result is already in the initial response.
     *
     * **Status values:** `queued` → `processing` → `completed` | `failed`
     *
     * @response 200 {"id": 18, "operation": "video-face-swap", "status": "completed", "output": ["https://..."], "cost": "0.0650", "duration_ms": 52529}
     */
    public function show(AIGeneration $generation): JsonResponse
    {
        $generation->load(['provider:id,name,slug', 'template:id,name,slug,type']);

        return response()->json([
            'id' => $generation->id,
            'operation' => $generation->operation,
            'status' => $generation->status,
            'request_id' => $generation->request_id,
            'cost' => $generation->cost,
            'currency' => $generation->currency,
            'duration_ms' => $generation->duration_ms,
            'output' => $generation->output_metadata ?? [],
            'error' => $generation->error,
            'provider' => $generation->provider,
            'template' => $generation->template,
            'created_at' => $generation->created_at,
            'updated_at' => $generation->updated_at,
        ]);
    }
}
