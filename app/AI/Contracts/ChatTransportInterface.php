<?php

namespace App\AI\Contracts;

use App\AI\DTOs\ChatCompletionResult;
use App\AI\Exceptions\AIGenerationFailedException;

interface ChatTransportInterface
{
    /**
     * The `ai_providers.slug` identifier for this transport.
     */
    public function providerSlug(): string;

    /**
     * Execute a chat completion request against the upstream provider.
     *
     * @throws AIGenerationFailedException
     */
    public function complete(
        string $model,
        string $fullPrompt,
        ?string $systemPrompt = null,
        ?string $userPrompt = null,
        ?string $imageUrl = null,
        ?string $responseType = null,
    ): ChatCompletionResult;
}
