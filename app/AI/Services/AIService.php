<?php

namespace App\AI\Services;

use App\AI\Contracts\AIProviderInterface;
use App\AI\DTOs\AIResponse;
use App\AI\DTOs\GenerationRequest;
use App\AI\Exceptions\AIGenerationFailedException;
use App\AI\Exceptions\AIGenerationTimeoutException;
use App\AI\Exceptions\UnknownProviderException;
use App\AI\Exceptions\UnsupportedOperationException;
use App\AI\Factories\AIProviderFactory;
use App\Models\AIGeneration;
use App\Models\AIProvider;
use App\Models\User;
use Throwable;

/**
 * The only class the rest of the app talks to for AI work.
 *
 * Queue-compatible by design: providers are stateless HTTP clients and
 * `execute()` is a single self-contained method, so a future queued job
 * (video face swap takes 5+ minutes) can wrap it without changes here.
 */
class AIService
{
    public function __construct(
        private readonly AIProviderFactory $factory,
    ) {}

    /**
     * Swap a face (face-swap operation, end-to-end).
     */
    public function faceSwap(GenerationRequest $request, ?User $requester = null): AIGeneration
    {
        return $this->execute($request, $requester);
    }

    /**
     * Execute a generation end-to-end: create the row, call the provider,
     * persist the outcome, and rethrow failures as typed exceptions.
     *
     * @throws UnknownProviderException
     * @throws UnsupportedOperationException
     * @throws AIGenerationFailedException
     * @throws AIGenerationTimeoutException
     */
    public function execute(GenerationRequest $request, ?User $requester = null): AIGeneration
    {
        $provider = $this->factory->make($request->provider);

        $providerModel = AIProvider::where('slug', $request->provider)->firstOrFail();

        $generation = AIGeneration::create([
            'user_id' => $requester?->id,
            'provider_id' => $providerModel->id,
            'template_id' => $request->templateId,
            'operation' => $request->operation,
            'status' => AIGeneration::STATUS_QUEUED,
            'input_metadata' => $request->payload,
        ]);

        $startedAt = hrtime(true);

        try {
            $response = $this->run($provider, $request);

            $generation->update([
                'status' => AIGeneration::STATUS_COMPLETED,
                'request_id' => $response->requestId,
                'duration_ms' => $response->durationMs ?? (int) round((hrtime(true) - $startedAt) / 1e6),
                'cost' => $response->cost,
                'currency' => $response->currency,
                'output_metadata' => $response->output,
                'raw_response' => $response->rawResponse,
            ]);
        } catch (AIGenerationTimeoutException $exception) {
            $generation->update([
                'status' => AIGeneration::STATUS_FAILED,
                'request_id' => $exception->requestId,
                'error' => $exception->getMessage(),
            ]);

            throw $exception;
        } catch (AIGenerationFailedException $exception) {
            $generation->update([
                'status' => AIGeneration::STATUS_FAILED,
                'request_id' => $exception->requestId,
                'raw_response' => $exception->statusBody,
                'error' => $exception->getMessage(),
            ]);

            throw $exception;
        } catch (Throwable $exception) {
            $generation->update([
                'status' => AIGeneration::STATUS_FAILED,
                'error' => $exception->getMessage(),
            ]);

            throw $exception;
        }

        return $generation->fresh();
    }

    /**
     * Dispatch the request to the provider's matching operation method.
     */
    private function run(AIProviderInterface $provider, GenerationRequest $request): AIResponse
    {
        if (! $request->isSupportedBy($provider)) {
            throw new UnsupportedOperationException(
                "Provider {$provider->name()} does not support operation {$request->operation}.",
            );
        }

        return match ($request->operation) {
            AIGeneration::OPERATION_FACE_SWAP => $provider->faceSwap($request),
            AIGeneration::OPERATION_IMAGE => $provider->generateImage($request),
            AIGeneration::OPERATION_VIDEO_FACE_SWAP => $provider->videoFaceSwap($request),
            default => throw new UnsupportedOperationException("Unknown operation: {$request->operation}"),
        };
    }
}
