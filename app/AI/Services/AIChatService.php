<?php

namespace App\AI\Services;

use App\AI\Exceptions\AIGenerationFailedException;
use App\AI\Skills\ChatSkillFactory;
use App\Models\AIGeneration;
use App\Models\AIModel;
use App\Models\AIProvider;
use App\Models\Customer;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class AIChatService
{
    public const MODEL_DEEPSEEK_CHAT = 'deepseek-chat';

    public const MODEL_DEEPSEEK_REASONER = 'deepseek-reasoner';

    public const MODEL_QWEN_FLASH = 'qwen-flash';

    public const MODEL_QWEN3_VL_FLASH = 'qwen3-vl-flash';

    public const DEFAULT_MODEL = self::MODEL_DEEPSEEK_CHAT;

    /**
     * @var array<int, string>
     */
    public const SUPPORTED_MODELS = [
        self::MODEL_DEEPSEEK_CHAT,
        self::MODEL_DEEPSEEK_REASONER,
        self::MODEL_QWEN_FLASH,
        self::MODEL_QWEN3_VL_FLASH,
    ];

    /**
     * Default model mapping per chat category.
     *
     * @var array<string, string>
     */
    public const CATEGORY_DEFAULT_MODELS = [
        'general' => self::MODEL_DEEPSEEK_CHAT,
        'health' => self::MODEL_DEEPSEEK_REASONER,
        'education' => self::MODEL_DEEPSEEK_REASONER,
    ];

    public const DEFAULT_BASE_URL = 'https://api.segmind.com/v1';

    /**
     * Resolve which chat model to use given the category, optional explicit model override, and optional image URL.
     */
    public function resolveModel(string $category = 'general', ?string $requestedModel = null, ?string $imageUrl = null): string
    {
        $normalizedCategory = strtolower(trim($category)) ?: 'general';
        $normalizedModel = $requestedModel ? strtolower(trim($requestedModel)) : null;

        // If an image is attached, automatically use the multimodal vision model unless another vision model was specified
        if (! empty($imageUrl)) {
            return self::MODEL_QWEN3_VL_FLASH;
        }

        // If caller explicitly requested a supported chat model, honor it
        if ($normalizedModel && in_array($normalizedModel, self::SUPPORTED_MODELS, true)) {
            return $normalizedModel;
        }

        // Category-based default routing:
        // general -> deepseek-chat
        // health / education -> deepseek-reasoner
        return self::CATEGORY_DEFAULT_MODELS[$normalizedCategory] ?? self::DEFAULT_MODEL;
    }

    /**
     * Return all available chat models and category defaults.
     *
     * @return array{
     *   models: array<int, array{
     *     id: int|null,
     *     name: string,
     *     model_name: string,
     *     type: string,
     *     provider_name: string,
     *     point_cost: int,
     *     is_default: bool,
     *     supports_vision: bool,
     *     supports_reasoning: bool,
     *     default_categories: array<int, string>,
     *     docs_link: string,
     *     description: string
     *   }>,
     *   category_defaults: array<string, string>
     * }
     */
    public function availableModels(): array
    {
        $defaultPointCost = (int) Setting::get('ai', 'point_cost_chat', config('ai.point_costs.chat', 5));

        $catalog = [
            self::MODEL_DEEPSEEK_CHAT => [
                'name' => 'DeepSeek Chat (V3)',
                'model_name' => self::MODEL_DEEPSEEK_CHAT,
                'type' => 'chat',
                'provider_name' => 'segmind',
                'point_cost' => $defaultPointCost,
                'is_default' => true,
                'supports_vision' => false,
                'supports_reasoning' => false,
                'default_categories' => ['general'],
                'docs_link' => 'https://www.segmind.com/models/deepseek-chat',
                'description' => 'DeepSeek V3 671B MoE model optimized for fast, natural general conversation.',
            ],
            self::MODEL_DEEPSEEK_REASONER => [
                'name' => 'DeepSeek Reasoner (R1)',
                'model_name' => self::MODEL_DEEPSEEK_REASONER,
                'type' => 'chat',
                'provider_name' => 'segmind',
                'point_cost' => $defaultPointCost,
                'is_default' => false,
                'supports_vision' => false,
                'supports_reasoning' => true,
                'default_categories' => ['health', 'education'],
                'docs_link' => 'https://www.segmind.com/models/deepseek-reasoner',
                'description' => 'DeepSeek R1 671B reasoning model with step-by-step chain-of-thought for healthcare and education.',
            ],
            self::MODEL_QWEN_FLASH => [
                'name' => 'Qwen Flash',
                'model_name' => self::MODEL_QWEN_FLASH,
                'type' => 'chat',
                'provider_name' => 'segmind',
                'point_cost' => $defaultPointCost,
                'is_default' => false,
                'supports_vision' => false,
                'supports_reasoning' => false,
                'default_categories' => [],
                'docs_link' => 'https://www.segmind.com/models/qwen-flash',
                'description' => 'Ultra-low-latency text model for rapid conversational responses.',
            ],
            self::MODEL_QWEN3_VL_FLASH => [
                'name' => 'Qwen3 VL Flash (Vision)',
                'model_name' => self::MODEL_QWEN3_VL_FLASH,
                'type' => 'chat',
                'provider_name' => 'segmind',
                'point_cost' => $defaultPointCost,
                'is_default' => false,
                'supports_vision' => true,
                'supports_reasoning' => false,
                'default_categories' => [],
                'docs_link' => 'https://www.segmind.com/models/qwen3-vl-flash',
                'description' => 'Multimodal vision-language chat model used when analyzing uploaded images.',
            ],
        ];

        try {
            $dbModels = AIModel::query()
                ->whereIn('model_name', array_keys($catalog))
                ->get()
                ->keyBy('model_name');
        } catch (Throwable) {
            $dbModels = collect();
        }

        $models = [];
        foreach ($catalog as $slug => $meta) {
            /** @var AIModel|null $dbModel */
            $dbModel = $dbModels->get($slug);
            if ($dbModel && ! $dbModel->is_active) {
                continue;
            }

            $models[] = [
                'id' => $dbModel?->id,
                'name' => $dbModel?->name ?: $meta['name'],
                'model_name' => $slug,
                'type' => 'chat',
                'provider_name' => $dbModel?->provider_name ?: $meta['provider_name'],
                'point_cost' => $dbModel ? (int) $dbModel->point_cost : $meta['point_cost'],
                'is_default' => $dbModel ? (bool) $dbModel->is_default : $meta['is_default'],
                'supports_vision' => $meta['supports_vision'],
                'supports_reasoning' => $meta['supports_reasoning'],
                'default_categories' => $meta['default_categories'],
                'docs_link' => $dbModel?->docs_link ?: $meta['docs_link'],
                'description' => $dbModel?->description ?: $meta['description'],
            ];
        }

        return [
            'models' => $models,
            'category_defaults' => self::CATEGORY_DEFAULT_MODELS,
        ];
    }

    /**
     * Build the request payload tailored to the selected Segmind LLM endpoint.
     *
     * @return array<string, mixed>
     */
    protected function buildModelPayload(string $selectedModel, string $fullPrompt, ?string $imageUrl = null): array
    {
        $payload = [
            'prompt' => $fullPrompt,
            'response_format' => ['type' => 'json_object'],
        ];

        // Qwen models support max_tokens and image input; DeepSeek models strictly accept prompt + response_format
        if (in_array($selectedModel, [self::MODEL_QWEN_FLASH, self::MODEL_QWEN3_VL_FLASH], true)) {
            $payload['max_tokens'] = (int) config('ai.chat_max_tokens', 650);
            if ($imageUrl) {
                $payload['image'] = $imageUrl;
            }
        }

        return $payload;
    }

    /**
     * Calculate estimated USD token cost based on the selected model's Segmind token rates.
     */
    protected function calculateCostUsd(string $selectedModel, int $promptTokens, int $completionTokens): string
    {
        [$inputRatePerToken, $outputRatePerToken] = match ($selectedModel) {
            self::MODEL_DEEPSEEK_CHAT => [0.0000018, 0.0000018],      // $1.80 / 1M input & output
            self::MODEL_DEEPSEEK_REASONER => [0.0000160, 0.0000160],  // $16.00 / 1M input & output
            default => [0.000000063, 0.000000500],                    // $0.063 / 1M input, $0.50 / 1M output
        };

        $calculatedCost = ($promptTokens * $inputRatePerToken) + ($completionTokens * $outputRatePerToken);

        return number_format($calculatedCost, 7, '.', '');
    }

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
        ?string $imageUrl = null,
    ): array {
        $sanitizedMessage = mb_substr(trim($message), 0, 5000);
        $skill = ChatSkillFactory::make($category);
        $fullPrompt = $skill->buildPrompt($sanitizedMessage, $history, $language);

        $selectedModel = $this->resolveModel($skill->category(), $model, $imageUrl);

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
                'prompt' => $sanitizedMessage,
                'image_url' => $imageUrl,
            ],
        ]);

        $startedAt = hrtime(true);

        try {
            $payload = $this->buildModelPayload($selectedModel, $fullPrompt, $imageUrl);

            $response = Http::withHeaders([
                'x-api-key' => $apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'Accept-Encoding' => 'identity',
            ])->withOptions([
                'decode_content' => false,
            ])->timeout(90)->post($endpoint, $payload);

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
            $promptTokens = (int) ($usage['prompt_tokens'] ?? 0);
            $completionTokens = (int) ($usage['completion_tokens'] ?? 0);

            $costStr = $this->calculateCostUsd($selectedModel, $promptTokens, $completionTokens);
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
        ?string $imageUrl = null,
    ): array {
        $sanitizedMessage = mb_substr(trim($message), 0, 5000);

        if (app()->environment('testing')) {
            $result = $this->chat($sanitizedMessage, $category, $history, $language, $requester, $model, $imageUrl);
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
        $fullPrompt = $skill->buildPrompt($sanitizedMessage, $history, $language);

        $selectedModel = $this->resolveModel($skill->category(), $model, $imageUrl);

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
                'prompt' => $sanitizedMessage,
                'image_url' => $imageUrl,
                'stream' => true,
            ],
        ]);

        $startedAt = hrtime(true);
        $accumulatedContent = '';

        try {
            $payload = $this->buildModelPayload($selectedModel, $fullPrompt, $imageUrl);

            // Segmind generates chat completions via HTTP synchronously.
            // We fetch the completion and stream tokens word-by-word via $onChunk to deliver smooth real-time SSE streaming.
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

            $responseData = $response->json();
            $rawContent = $responseData['choices'][0]['message']['content'] ?? '';
            $usage = $responseData['usage'] ?? [];
            $totalTokens = (int) ($usage['total_tokens'] ?? 0);
            $promptTokens = (int) ($usage['prompt_tokens'] ?? 0);
            $completionTokens = (int) ($usage['completion_tokens'] ?? 0);
            $costStr = $this->calculateCostUsd($selectedModel, $promptTokens, $completionTokens);

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
            $fallbackResult = $this->chat($sanitizedMessage, $category, $history, $language, $requester, $model, $imageUrl);
            if ($onChunk) {
                $onChunk($fallbackResult['content']);
            }

            return $fallbackResult;
        }
    }
}
