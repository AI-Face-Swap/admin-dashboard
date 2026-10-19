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
 * Process an image edit generation in the background.
 */
class ProcessImageEdit implements ShouldQueue
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
        private readonly ?int $customerId = null,
        private readonly int $pointCost = 0,
        private readonly ?string $model = null,
    ) {}

    /**
     * Execute the job.
     */
    public function handle(AIService $aiService): void
    {
        $generation = AIGeneration::find($this->generationId);

        if (! $generation) {
            Log::error("ProcessImageEdit: generation {$this->generationId} not found.");

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
                    operation: AIGeneration::OPERATION_IMAGE_EDIT,
                    payload: $this->payload,
                    model: $this->model,
                ),
                $requester,
                $generation,
            );

            $generation->update([
                'submission_state' => AIGeneration::SUBMISSION_SUBMITTED,
            ]);

            // Deduct points on successful completion if not already deducted upfront
            if ($requester instanceof Customer && $this->pointCost > 0 && ($generation->points_spent ?? 0) <= 0 && $result->status === 'completed') {
                $requester->spendPoints($this->pointCost, "Image editing ({$generation->id})", "gen_{$generation->id}_deduct");
                $generation->update(['points_spent' => $this->pointCost]);
            }

            event(new AIGenerationUpdated($generation->fresh()));
        } catch (\Throwable $exception) {
            Log::error("ProcessImageEdit failed for generation {$this->generationId}: {$exception->getMessage()}");

            $generation->update([
                'status' => AIGeneration::STATUS_FAILED,
                'error' => $exception->getMessage(),
            ]);

            // Durably refund points if already spent
            $generation->refundPointsOnce("Refund for failed image editing ({$generation->id})");

            event(new AIGenerationUpdated($generation->fresh()));

            throw $exception;
        }
    }
}
