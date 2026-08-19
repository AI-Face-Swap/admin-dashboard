<?php

namespace App\Jobs;

use App\AI\DTOs\GenerationRequest;
use App\AI\Services\AIService;
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
     */
    public function __construct(
        private readonly int $generationId,
        private readonly array $payload,
        private readonly ?int $templateId = null,
        private readonly ?int $customerId = null,
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

        $generation->update(['status' => AIGeneration::STATUS_PROCESSING]);

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

            // Deduct coins on successful completion.
            if ($requester instanceof Customer && $this->coinCost > 0 && $result->status === 'completed') {
                $requester->spendCoins($this->coinCost);
            }
        } catch (\Throwable $exception) {
            Log::error("ProcessVideoFaceSwap failed for generation {$this->generationId}: {$exception->getMessage()}");

            $generation->update([
                'status' => AIGeneration::STATUS_FAILED,
                'error' => $exception->getMessage(),
            ]);

            throw $exception;
        }
    }
}
