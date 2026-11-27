<?php

namespace App\AI\Transports;

use App\AI\Contracts\ChatTransportInterface;
use App\AI\DTOs\ChatCompletionResult;
use App\AI\Exceptions\AIGenerationFailedException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * OpenAI-compatible chat transport for OpenCode Go (used by Astrology RAG chat).
 */
class OpenCodeChatTransport implements ChatTransportInterface
{
    public const SLUG = 'opencode-go';

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
        $config = config('ai.providers.opencode_go', []);
        $baseUrl = rtrim((string) ($config['base_url'] ?? config('services.rag.chat.url', '')), '/');
        $apiKey = (string) ($config['api_key'] ?? config('services.rag.chat.key', ''));
        $sessionHeader = (string) ($config['session_header'] ?? config('services.rag.chat.session_header', ''));

        if ($baseUrl === '' || $apiKey === '') {
            throw new AIGenerationFailedException(
                'OpenCode Go chat provider is not configured (RAG_CHAT_URL / RAG_CHAT_API_KEY).'
            );
        }

        $headers = $sessionHeader !== ''
            ? [$sessionHeader => 'ses_'.Str::ulid()]
            : [];

        $messages = [];
        if ($systemPrompt !== null && trim($systemPrompt) !== '') {
            $messages[] = ['role' => 'system', 'content' => $systemPrompt];
            $messages[] = ['role' => 'user', 'content' => $userPrompt !== null && trim($userPrompt) !== '' ? $userPrompt : $fullPrompt];
        } else {
            $messages[] = ['role' => 'user', 'content' => $fullPrompt];
        }

        $payload = [
            'model' => $model,
            'messages' => $messages,
            'response_format' => ['type' => 'json_object'],
        ];

        $response = Http::baseUrl($baseUrl)
            ->withToken($apiKey)
            ->withUserAgent(Str::slug((string) config('app.name', 'htut-ai')).'-rag/1.0')
            ->withHeaders($headers)
            ->connectTimeout(5)
            ->timeout(120)
            ->acceptJson()
            ->post('/chat/completions', $payload);

        if (! $response->successful()) {
            $errorBody = $response->json() ?? $response->body();
            Log::error('OpenCode Go LLM Chat request failed', [
                'status' => $response->status(),
                'base_url' => $baseUrl,
                'model' => $model,
                'error' => $errorBody,
            ]);

            throw new AIGenerationFailedException(
                "OpenCode Go LLM request failed with HTTP {$response->status()}: ".json_encode($errorBody),
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
            costUsd: $this->calculateCostUsd($promptTokens, $completionTokens),
            rawResponse: is_array($responseData) ? $responseData : [],
        );
    }

    protected function calculateCostUsd(int $promptTokens, int $completionTokens): string
    {
        // OpenCode Go flat/subscription tier — record estimated token cost if applicable, else 0.0000000
        $inputRate = (float) config('ai.providers.opencode_go.input_cost_per_token', 0.0);
        $outputRate = (float) config('ai.providers.opencode_go.output_cost_per_token', 0.0);
        $calculatedCost = ($promptTokens * $inputRate) + ($completionTokens * $outputRate);

        return number_format($calculatedCost, 7, '.', '');
    }
}
