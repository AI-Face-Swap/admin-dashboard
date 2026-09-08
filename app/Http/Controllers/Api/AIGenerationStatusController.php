<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AIGeneration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\Customer;
use App\Models\User;

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
        // Check if generation is stuck and mark as failed
        if (in_array($generation->status, [AIGeneration::STATUS_QUEUED, AIGeneration::STATUS_PROCESSING])) {
            $timeout = AIGeneration::TIMEOUT_MINUTES;
            if ($generation->created_at->diffInMinutes(now()) > $timeout) {
                $generation->update([
                    'status' => AIGeneration::STATUS_FAILED,
                    'error' => "Generation timed out after {$timeout} minutes — request abandoned or server disconnected.",
                ]);
            }
        }

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

    /**
     * Delete an AI generation and its stored output file.
     *
     * Customers can delete their own generations.
     * Admins can delete any generation.
     */
    public function destroy(AIGeneration $generation, Request $request)
    {
        $user = $request->user();
        
        $isOwner = $user instanceof Customer && $generation->customer_id === $user->id;
        $isAdmin = $user instanceof User; // Assuming User model is the Admin model

        if (!$isOwner && !$isAdmin) {
            abort(403, 'Unauthorized to delete this generation.');
        }

        // Delete output files from DO Spaces if they exist
        if (!empty($generation->output_metadata) && is_array($generation->output_metadata)) {
            foreach ($generation->output_metadata as $sourceUrl) {
                if (is_string($sourceUrl)) {
                    if (filter_var($sourceUrl, FILTER_VALIDATE_URL)) {
                        $sourcePath = ltrim(parse_url($sourceUrl, PHP_URL_PATH), '/');
                    } else {
                        $sourcePath = ltrim($sourceUrl, '/');
                    }

                    if (Storage::disk('spaces')->exists($sourcePath)) {
                        Storage::disk('spaces')->delete($sourcePath);
                    }
                }
            }
        }

        $generation->delete();

                if ($request->wantsJson() && !$request->hasHeader('X-Inertia')) {
            return response()->json(['message' => 'Generation deleted successfully.']);
        }
        
        return back()->with('success', 'Generation deleted successfully.');
    }
}