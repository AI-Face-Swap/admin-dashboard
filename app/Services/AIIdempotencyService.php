<?php

namespace App\Services;

use App\Models\AIGeneration;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AIIdempotencyService
{
    /**
     * Check if a generation with this idempotency token already exists.
     * Returns a JsonResponse (either duplicate result or 409 Conflict) if existing,
     * or null if the request should proceed to create a new generation.
     *
     * @param  array<string, mixed>  $currentPayload
     */
    public static function check(
        User|Customer|null $requester,
        ?string $token,
        string $operation,
        array $currentPayload
    ): ?JsonResponse {
        if (empty($token) || ! ($requester instanceof Customer || $requester instanceof User)) {
            return null;
        }

        $query = AIGeneration::where('client_idempotency_token', $token);

        if ($requester instanceof Customer) {
            $query->where('customer_id', $requester->id);
        } else {
            $query->where('user_id', $requester->id);
        }

        $existing = $query->first();

        if (! $existing) {
            return null;
        }

        // Check for payload conflict
        if ($existing->operation !== $operation || self::hasPayloadConflict($existing->input_metadata ?? [], $currentPayload)) {
            return response()->json([
                'status' => 'conflict',
                'message' => 'Idempotency token was already used with a different request payload.',
            ], 409);
        }

        // Return existing generation without re-deducting points
        $statusCode = in_array($existing->status, [AIGeneration::STATUS_QUEUED, AIGeneration::STATUS_PROCESSING], true)
            ? 202
            : 200;

        $pointsRemaining = $requester instanceof Customer ? $requester->points : null;

        return response()->json([
            'status' => $existing->status,
            'generation' => [
                'id' => $existing->id,
                'request_id' => $existing->request_id,
                'operation' => $existing->operation,
                'status' => $existing->status,
                'cost' => $existing->cost,
                'currency' => $existing->currency,
                'duration_ms' => $existing->duration_ms,
                'output' => $existing->output_metadata ?? [],
                'points_spent' => $existing->points_spent,
                'points_remaining' => $pointsRemaining,
            ],
            'idempotency' => [
                'duplicate' => true,
                'message' => 'This request has already been processed. Returning existing generation.',
            ],
        ], $statusCode);
    }

    /**
     * Compare existing input metadata with the current request payload.
     * Returns true if there is a meaningful conflict.
     *
     * @param  array<string, mixed>  $existing
     * @param  array<string, mixed>  $current
     */
    private static function hasPayloadConflict(array $existing, array $current): bool
    {
        $keysToCompare = [
            'prompt',
            'model',
            'model_name',
            'template_id',
            'source_image',
            'target_video',
            'target_image',
            'image',
            'image_url',
            'resolution',
            'aspect_ratio',
            'width',
            'height',
        ];

        foreach ($keysToCompare as $key) {
            $existingVal = $existing[$key] ?? null;
            $currentVal = $current[$key] ?? null;

            if ($existingVal !== null && $currentVal !== null && (string) $existingVal !== (string) $currentVal) {
                return true;
            }
        }

        return false;
    }
}
