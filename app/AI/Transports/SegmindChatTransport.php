<?php

namespace App\AI\Transports;

use App\AI\Contracts\ChatTransportInterface;
use App\AI\DTOs\ChatCompletionResult;
use App\AI\Exceptions\AIGenerationFailedException;
use App\AI\Services\AIChatService;
use App\AI\Skills\AstrologySkill;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SegmindChatTransport implements ChatTransportInterface
{
    public const SLUG = 'segmind';

    public const DEFAULT_BASE_URL = 'https://api.segmind.com/v1';

    public function providerSlug(): string
    {
        return self::SLUG;
    }

    public function complete(
        string $model,
        string $fullPrompt,
        ?string $systemPrompt = null,
        ?string $userPrompt = null,
        ?string $imageUrl = null,
        ?string $responseType = null,
    ): ChatCompletionResult {
        $apiKey = (string) config('ai.providers.segmind.api_key');
        $endpoint = rtrim((string) config('ai.providers.segmind.base_url_v1', self::DEFAULT_BASE_URL), '/').'/'.$model;

        $payload = $this->buildPayload($model, $fullPrompt, $imageUrl, $responseType);

        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'Accept-Encoding' => 'identity',
        ])->withOptions([
            'decode_content' => false,
        ])->timeout(90)->post($endpoint, $payload);

        if (! $response->successful()) {
            $errorBody = $response->json() ?? $response->body();
            Log::error('Segmind LLM Chat request failed', [
                'status' => $response->status(),
                'endpoint' => $endpoint,
                'error' => $errorBody,
            ]);

            throw new AIGenerationFailedException(
                "Segmind LLM request failed with HTTP {$response->status()}: ".json_encode($errorBody),
                null,
                is_array($errorBody) ? $errorBody : ['body' => $errorBody],
            );
        }

        $responseData = $response->json() ?? [];
        $rawContent = (string) ($responseData['choices'][0]['message']['content'] ?? '');
        $usage = $responseData['usage'] ?? [];
        $promptTokens = (int) ($usage['prompt_tokens'] ?? 0);
        $completionTokens = (int) ($usage['completion_tokens'] ?? 0);
        $totalTokens = (int) ($usage['total_tokens'] ?? ($promptTokens + $completionTokens));

        return new ChatCompletionResult(
            rawContent: $rawContent,
            requestId: $responseData['id'] ?? null,
            promptTokens: $promptTokens,
            completionTokens: $completionTokens,
            totalTokens: $totalTokens,
            costUsd: $this->calculateCostUsd($model, $promptTokens, $completionTokens),
            rawResponse: is_array($responseData) ? $responseData : [],
        );
    }

    /**
     * @return array<string, mixed>
     */
    protected function buildPayload(
        string $selectedModel,
        string $fullPrompt,
        ?string $imageUrl = null,
        ?string $responseType = null,
    ): array {
        $payload = [
            'prompt' => $fullPrompt,
            'response_format' => ['type' => 'json_object'],
        ];

        if (in_array($selectedModel, [AIChatService::MODEL_QWEN_FLASH, AIChatService::MODEL_QWEN3_VL_FLASH], true)) {
            $defaultMaxTokens = (int) config('ai.chat_max_tokens', 650);
            $payload['max_tokens'] = match ($responseType) {
                AstrologySkill::TYPE_SHORT => min($defaultMaxTokens, 350),
                AstrologySkill::TYPE_LONG => max($defaultMaxTokens, 1500),
                default => $defaultMaxTokens,
            };
            if ($imageUrl) {
                $payload['image'] = $imageUrl;
            }
        }

        return $payload;
    }

    protected function calculateCostUsd(string $selectedModel, int $promptTokens, int $completionTokens): string
    {
        [$inputRatePerToken, $outputRatePerToken] = match ($selectedModel) {
            AIChatService::MODEL_DEEPSEEK_CHAT => [0.0000018, 0.0000018],
            AIChatService::MODEL_DEEPSEEK_REASONER => [0.0000160, 0.0000160],
            default => [0.000000063, 0.000000500],
        };

        $calculatedCost = ($promptTokens * $inputRatePerToken) + ($completionTokens * $outputRatePerToken);

        return number_format($calculatedCost, 7, '.', '');
    }
}
