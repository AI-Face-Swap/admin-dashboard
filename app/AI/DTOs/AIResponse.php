<?php

namespace App\AI\DTOs;

/**
 * A normalized provider response. All providers return this shape so the
 * rest of the app never depends on provider-specific payloads.
 */
final readonly class AIResponse
{
    /**
     * @param  list<string>  $output  Persistent public URLs of the generated media
     * @param  array<string, mixed>|null  $usage  Token/credit usage reported by the provider
     * @param  array<string, mixed>|null  $rawResponse  The original provider response
     */
    public function __construct(
        public string $provider,
        public string $operation,
        public ?string $model = null,
        public ?string $requestId = null,
        public string $status = 'completed',
        public ?int $durationMs = null,
        /** @var list<string> */
        public array $output = [],
        public ?array $usage = null,
        public ?string $cost = null,
        public ?string $currency = null,
        public ?array $rawResponse = null,
    ) {}
}
