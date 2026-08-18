<?php

namespace App\AI\DTOs;

use App\AI\Contracts\AIProviderInterface;

/**
 * A normalized request for a single AI generation.
 */
final readonly class GenerationRequest
{
    /**
     * @param  array<string, mixed>  $payload  Provider-specific parameters
     */
    public function __construct(
        public string $operation,
        public array $payload = [],
        public ?string $model = null,
        public ?int $templateId = null,
        public string $provider = 'segmind',
    ) {}

    /**
     * Whether the given provider can handle this request.
     */
    public function isSupportedBy(AIProviderInterface $provider): bool
    {
        return $provider->supports($this->operation);
    }
}
