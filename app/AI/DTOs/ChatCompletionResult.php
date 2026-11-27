<?php

namespace App\AI\DTOs;

final readonly class ChatCompletionResult
{
    /**
     * @param  array<string, mixed>  $rawResponse
     */
    public function __construct(
        public string $rawContent,
        public ?string $requestId,
        public int $promptTokens,
        public int $completionTokens,
        public int $totalTokens,
        public string $costUsd,
        public array $rawResponse,
    ) {}
}
