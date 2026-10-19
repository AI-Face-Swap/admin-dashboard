<?php

namespace App\Jobs;

use App\AI\DTOs\GenerationRequest;
use App\AI\Services\AIService;
use App\Events\AIGenerationUpdated;
use App\Models\AIGeneration;
use App\Models\Customer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Process a video face-swap generation in the background.
 *
 * Video generation takes 5+ minutes, so it cannot run synchronously
 * in an HTTP request. This job wraps AIService::execute() and updates
 * the generation row on completion or failure.
 */
class ProcessVideoFaceSwap implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 1;

    /**
     * The number of seconds to wait before retrying the job.
     */
    public int $backoff = 30;

    /**
     * Create a new job instance.
     *
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        private readonly int $generationId,
        private readonly array $payload,
        private readonly ?int $templateId = null,
        private readonly ?int $customerId = null,
        private readonly int $pointCost = 0,
        private readonly int $coinCost = 0,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(AIService $aiService): void
    {
        $generation = AIGeneration::find($this->generationId);

        if (! $generation) {
            Log::error("ProcessVideoFaceSwap: generation {$this->generationId} not found.");

            return;
        }

        $generation->update([
            'status' => AIGeneration::STATUS_PROCESSING,
            'submission_state' => AIGeneration::SUBMISSION_SUBMITTING,
            'submitted_at' => now(),
        ]);

        event(new AIGenerationUpdated($generation));

        $requester = $this->customerId
            ? Customer::find($this->customerId)
            : null;

        try {
            $result = $aiService->execute(
                new GenerationRequest(
                    operation: 'video-face-swap',
                    payload: $this->payload,
                    model: $this->payload['model_name'] ?? null,
                    templateId: $this->templateId,
                ),
                $requester,
                $generation,
            );

            $generation->update([
                'submission_state' => AIGeneration::SUBMISSION_SUBMITTED,
            ]);

            // Deduct points on successful completion if not already deducted upfront
            $cost = $this->pointCost > 0 ? $this->pointCost : $this->coinCost;
            if ($requester instanceof Customer && $cost > 0 && ($generation->points_spent ?? 0) <= 0 && $result->status === 'completed') {
                $requester->spendPoints($cost, "Video face swap ({$generation->id})", "gen_{$generation->id}_deduct");
                $generation->update(['points_spent' => $cost]);
            }

            event(new AIGenerationUpdated($generation->fresh()));
        } catch (\Throwable $exception) {
            Log::error("ProcessVideoFaceSwap failed for generation {$this->generationId}: {$exception->getMessage()}");

            $generation->update([
                'status' => AIGeneration::STATUS_FAILED,
                'error' => $exception->getMessage(),
            ]);

            // Durably refund points if already spent
            $generation->refundPointsOnce("Refund for failed video face-swap ({$generation->id})");

            event(new AIGenerationUpdated($generation->fresh()));

            throw $exception;
        }
    }
}
