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
 * Process a face swap generation in the background.
 */
class ProcessFaceSwap implements ShouldQueue
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
    ) {}

    /**
     * Execute the job.
     */
    public function handle(AIService $aiService): void
    {
        $generation = AIGeneration::find($this->generationId);

        if (! $generation) {
            Log::error("ProcessFaceSwap: generation {$this->generationId} not found.");

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
                    operation: AIGeneration::OPERATION_FACE_SWAP,
                    payload: [
                        'source_image' => $this->payload['source_image'],
                        'target_image' => $this->payload['target_image'],
                    ],
                    templateId: $this->templateId,
                ),
                $requester,
                $generation,
            );

            $generation->update([
                'submission_state' => AIGeneration::SUBMISSION_SUBMITTED,
            ]);

            // Deduct points on successful completion if not already deducted upfront
            if ($requester instanceof Customer && $this->pointCost > 0 && ($generation->points_spent ?? 0) <= 0 && $result->status === 'completed') {
                $requester->spendPoints($this->pointCost, "Face swap ({$generation->id})", "gen_{$generation->id}_deduct");
                $generation->update(['points_spent' => $this->pointCost]);
            }

            event(new AIGenerationUpdated($generation->fresh()));
        } catch (\Throwable $exception) {
            Log::error("ProcessFaceSwap failed for generation {$this->generationId}: {$exception->getMessage()}");

            $generation->update([
                'status' => AIGeneration::STATUS_FAILED,
                'error' => $exception->getMessage(),
            ]);

            // Durably refund points if already spent
            $generation->refundPointsOnce("Refund for failed face swap ({$generation->id})");

            event(new AIGenerationUpdated($generation->fresh()));

            throw $exception;
        }
    }
}
