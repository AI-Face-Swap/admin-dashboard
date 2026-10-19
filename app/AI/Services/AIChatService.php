<?php

namespace App\AI\Services;

use App\AI\Exceptions\AIGenerationFailedException;
use App\AI\Skills\ChatSkillFactory;
use App\Models\AIGeneration;
use App\Models\AIProvider;
use App\Models\Customer;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class AIChatService
{
    public const DEFAULT_MODEL = 'qwen-flash';

    public const DEFAULT_BASE_URL = 'https://api.segmind.com/v1';

    /**
     * Process a chat question using the appropriate agent skill and Segmind LLM.
     *
     * @param  array<int, array{role: string, content: string}>  $history
     * @return array{content: string, structured: array{sections: array<int, array{title: string, description: string}>, checklist: array<int, array{item: string, detail: string}>}, tokens_used: int|null, cost: string|null, duration_ms: int, model: string, category: string}
     *
     * @throws AIGenerationFailedException
     */
    public function chat(
        string $message,
        string $category = 'general',
        array $history = [],
        string $language = 'my',
        User|Customer|null $requester = null,
        ?string $model = null,
    ): array {
        $skill = ChatSkillFactory::make($category);
        $fullPrompt = $skill->buildPrompt($message, $history, $language);

        $selectedModel = $model ?: config('ai.chat_model', self::DEFAULT_MODEL);
        $apiKey = (string) config('ai.providers.segmind.api_key');
        $endpoint = rtrim(config('ai.providers.segmind.base_url_v1', self::DEFAULT_BASE_URL), '/').'/'.$selectedModel;

        $pointCost = (int) Setting::get('ai', 'point_cost_chat', config('ai.point_costs.chat', 5));
        $provider = AIProvider::where('slug', 'segmind')->first();

        $generation = AIGeneration::create([
            'user_id' => $requester instanceof User ? $requester->id : null,
            'customer_id' => $requester instanceof Customer ? $requester->id : null,
            'provider_id' => $provider?->id ?? 1,
            'operation' => AIGeneration::OPERATION_CHAT,
            'status' => AIGeneration::STATUS_PROCESSING,
            'coins_spent' => $pointCost,
            'input_metadata' => [
                'model' => $selectedModel,
                'category' => $skill->category(),
                'language' => $language,
                'prompt' => $message,
            ],
        ]);

        $startedAt = hrtime(true);

        try {
            $response = Http::withHeaders([
                'x-api-key' => $apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(30)->post($endpoint, [
                'prompt' => $fullPrompt,
                'response_format' => ['type' => 'json_object'],
                'max_tokens' => (int) config('ai.chat_max_tokens', 650),
            ]);

            $durationMs = (int) round((hrtime(true) - $startedAt) / 1e6);

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

            $responseData = $response->json();
            $rawContent = $responseData['choices'][0]['message']['content'] ?? '';
            $usage = $responseData['usage'] ?? [];
            $totalTokens = (int) ($usage['total_tokens'] ?? 0);

            // Calculate exact or estimated cost ($0.063/M input, $0.500/M output for qwen-flash)
            $promptTokens = (int) ($usage['prompt_tokens'] ?? 0);
            $completionTokens = (int) ($usage['completion_tokens'] ?? 0);
            $calculatedCost = ($promptTokens * 0.000000063) + ($completionTokens * 0.000000500);
            $costStr = number_format($calculatedCost, 7, '.', '');

            $normalized = $skill->formatResponse($rawContent, $language);

            $generation->update([
                'status' => AIGeneration::STATUS_COMPLETED,
                'request_id' => $responseData['id'] ?? null,
                'duration_ms' => $durationMs,
                'cost' => $costStr,
                'currency' => 'USD',
                'output_metadata' => $normalized,
                'raw_response' => $responseData,
            ]);

            return [
                'content' => $normalized['content'],
                'structured' => $normalized['structured'],
                'tokens_used' => $totalTokens,
                'cost' => $costStr,
                'duration_ms' => $durationMs,
                'model' => $selectedModel,
                'category' => $skill->category(),
            ];
        } catch (Throwable $e) {
            $durationMs = (int) round((hrtime(true) - $startedAt) / 1e6);
            $generation->update([
                'status' => AIGeneration::STATUS_FAILED,
                'duration_ms' => $durationMs,
                'error' => $e->getMessage(),
            ]);

            if ($e instanceof AIGenerationFailedException) {
                throw $e;
            }

            throw new AIGenerationFailedException("Chat generation error: {$e->getMessage()}", null, [], $e);
        }
    }

    /**
     * Stream a chat response chunk-by-chunk using a callback, falling back to full response if streaming is unsupported.
     *
     * @param  callable(string): void|null  $onChunk
     * @return array{content: string, structured: array{sections: array<int, array{title: string, description: string}>, checklist: array<int, array{item: string, detail: string}>}, tokens_used: int|null, cost: string|null, duration_ms: int, model: string, category: string}
     */
    public function streamChat(
        string $message,
        string $category = 'general',
        array $history = [],
        string $language = 'my',
        User|Customer|null $requester = null,
        ?string $model = null,
        ?callable $onChunk = null,
    ): array {
        if (app()->environment('testing')) {
            $result = $this->chat($message, $category, $history, $language, $requester, $model);
            if ($onChunk) {
                $words = preg_split('/(\s+)/u', $result['content'], -1, PREG_SPLIT_DELIM_CAPTURE);
                if (is_array($words)) {
                    foreach ($words as $w) {
                        if ($w !== '') {
                            $onChunk($w);
                        }
                    }
                }
            }

            return $result;
        }

        $skill = ChatSkillFactory::make($category);
        $fullPrompt = $skill->buildPrompt($message, $history, $language);
        $selectedModel = $model ?: config('ai.chat_model', self::DEFAULT_MODEL);
        $apiKey = (string) config('ai.providers.segmind.api_key');
        $endpoint = rtrim(config('ai.providers.segmind.base_url_v1', self::DEFAULT_BASE_URL), '/').'/'.$selectedModel;
        $pointCost = (int) Setting::get('ai', 'point_cost_chat', config('ai.point_costs.chat', 5));
        $provider = AIProvider::where('slug', 'segmind')->first();

        $generation = AIGeneration::create([
            'user_id' => $requester instanceof User ? $requester->id : null,
            'customer_id' => $requester instanceof Customer ? $requester->id : null,
            'provider_id' => $provider?->id ?? 1,
            'operation' => AIGeneration::OPERATION_CHAT,
            'status' => AIGeneration::STATUS_PROCESSING,
            'coins_spent' => $pointCost,
            'input_metadata' => [
                'model' => $selectedModel,
                'category' => $skill->category(),
                'language' => $language,
                'prompt' => $message,
                'stream' => true,
            ],
        ]);

        $startedAt = hrtime(true);
        $accumulatedContent = '';

        try {
            // Segmind generates chat completions via HTTP in ~0.8s.
            // We fetch the completion and stream tokens word-by-word via $onChunk to deliver smooth real-time SSE streaming.
            $response = Http::withHeaders([
                'x-api-key' => $apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])->timeout(30)->post($endpoint, [
                'prompt' => $fullPrompt,
                'max_tokens' => (int) config('ai.chat_max_tokens', 650),
            ]);

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

            $responseData = $response->json();
            $rawContent = $responseData['choices'][0]['message']['content'] ?? '';
            $usage = $responseData['usage'] ?? [];
            $totalTokens = (int) ($usage['total_tokens'] ?? 0);

            $durationMs = (int) round((hrtime(true) - $startedAt) / 1e6);
            $normalized = $skill->formatResponse($rawContent, $language);

            // Stream clean human conversational text progressively to the client — NEVER raw JSON syntax!
            if ($onChunk && ! empty($normalized['content'])) {
                $words = preg_split('/(\s+)/u', $normalized['content'], -1, PREG_SPLIT_DELIM_CAPTURE);
                if (is_array($words)) {
                    foreach ($words as $w) {
                        if (connection_aborted()) {
                            break;
                        }
                        if ($w !== '') {
                            $onChunk($w);
                            usleep(20000); // 20ms smooth typewriter effect
                        }
                    }
                }
            }

            $generation->update([
                'status' => AIGeneration::STATUS_COMPLETED,
                'request_id' => $responseData['id'] ?? null,
                'duration_ms' => $durationMs,
                'output_metadata' => $normalized,
                'raw_response' => $responseData,
            ]);

            return [
                'content' => $normalized['content'],
                'structured' => $normalized['structured'],
                'tokens_used' => $totalTokens,
                'cost' => null,
                'duration_ms' => $durationMs,
                'model' => $selectedModel,
                'category' => $skill->category(),
            ];
        } catch (Throwable $e) {
            Log::warning('Streaming chat failed, falling back to sync: '.$e->getMessage());

            if (! empty($accumulatedContent)) {
                $durationMs = (int) round((hrtime(true) - $startedAt) / 1e6);
                $normalized = $skill->formatResponse($accumulatedContent, $language);
                $generation->update([
                    'status' => AIGeneration::STATUS_COMPLETED,
                    'duration_ms' => $durationMs,
                    'output_metadata' => $normalized,
                ]);

                return [
                    'content' => $normalized['content'],
                    'structured' => $normalized['structured'],
                    'tokens_used' => null,
                    'cost' => null,
                    'duration_ms' => $durationMs,
                    'model' => $selectedModel,
                    'category' => $skill->category(),
                ];
            }

            $generation->delete();
            $fallbackResult = $this->chat($message, $category, $history, $language, $requester, $model);
            if ($onChunk) {
                $onChunk($fallbackResult['content']);
            }

            return $fallbackResult;
        }
    }
}
