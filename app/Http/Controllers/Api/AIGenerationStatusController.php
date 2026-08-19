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
     * Used by the admin page to poll for completion of queued jobs
     * (e.g. video face-swap).
     */
    public function show(AIGeneration $generation): JsonResponse
    {
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
            'created_at' => $generation->created_at,
            'updated_at' => $generation->updated_at,
        ]);
    }
}
