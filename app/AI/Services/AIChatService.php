<?php

namespace App\AI\Services;

use App\AI\Exceptions\AIGenerationFailedException;
use App\AI\Factories\ChatTransportFactory;
use App\AI\Skills\AstrologySkill;
use App\AI\Skills\ChatSkillFactory;
use App\AI\Transports\OpenCodeChatTransport;
use App\Models\AIGeneration;
use App\Models\AIModel;
use App\Models\AIProvider;
use App\Models\Customer;
use App\Models\Setting;
use App\Models\User;
use App\Services\Rag\RagContextRetriever;
use Throwable;

class AIChatService
{
    public const MODEL_DEEPSEEK_CHAT = 'deepseek-chat';

    public const MODEL_DEEPSEEK_REASONER = 'deepseek-reasoner';

    public const MODEL_DEEPSEEK_V4_1_FLASH = 'deepseek-v4.1-flash';

    public const MODEL_QWEN_FLASH = 'qwen-flash';

    public const MODEL_QWEN3_VL_FLASH = 'qwen3-vl-flash';

    public const DEFAULT_MODEL = self::MODEL_DEEPSEEK_CHAT;

    /**
     * @var array<int, string>
     */
    public const SUPPORTED_MODELS = [
        self::MODEL_DEEPSEEK_CHAT,
        self::MODEL_DEEPSEEK_REASONER,
        self::MODEL_DEEPSEEK_V4_1_FLASH,
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
        'astrology' => self::MODEL_DEEPSEEK_V4_1_FLASH,
    ];

    public const DEFAULT_BASE_URL = 'https://api.segmind.com/v1';

    private readonly ChatTransportFactory $transportFactory;

    private readonly RagContextRetriever $ragRetriever;

    public function __construct(
        ?ChatTransportFactory $transportFactory = null,
        ?RagContextRetriever $ragRetriever = null,
    ) {
        $this->transportFactory = $transportFactory ?? app(ChatTransportFactory::class);
        $this->ragRetriever = $ragRetriever ?? app(RagContextRetriever::class);
    }

    /**
     * Resolve which chat model to use given the category, optional explicit model override, and optional image URL.
     */
    public function resolveModel(string $category = 'general', ?string $requestedModel = null, ?string $imageUrl = null): string
    {
        $normalizedCategory = strtolower(trim($category)) ?: 'general';
        $normalizedModel = $requestedModel ? strtolower(trim($requestedModel)) : null;

        // If an image is attached, automatically use the multimodal vision model
        if (! empty($imageUrl)) {
            return self::MODEL_QWEN3_VL_FLASH;
        }

        // Astrology text chat always uses the configured OpenCode Go RAG model
        if ($normalizedCategory === 'astrology') {
            return (string) config('ai.providers.opencode_go.model', self::MODEL_DEEPSEEK_V4_1_FLASH);
        }

        // If caller explicitly requested a supported chat model, honor it
        if ($normalizedModel && in_array($normalizedModel, self::SUPPORTED_MODELS, true)) {
            return $normalizedModel;
        }

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
            self::MODEL_DEEPSEEK_V4_1_FLASH => [
                'name' => 'DeepSeek V4.1 Flash (OpenCode Go RAG)',
                'model_name' => self::MODEL_DEEPSEEK_V4_1_FLASH,
                'type' => 'chat',
                'provider_name' => OpenCodeChatTransport::SLUG,
                'point_cost' => $defaultPointCost,
                'is_default' => false,
                'supports_vision' => false,
                'supports_reasoning' => false,
                'default_categories' => ['astrology'],
                'docs_link' => 'https://opencode.ai',
                'description' => 'OpenCode Go DeepSeek V4.1 Flash powered by HTUT Astrology RAG knowledge base.',
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
     * Resolve point cost for a chat request based on category and optional response type.
     */
    public function resolvePointCost(string $category = 'general', ?string $responseType = null): int
    {
        $normalizedCategory = strtolower(trim($category)) ?: 'general';

        if ($normalizedCategory === 'astrology') {
            $type = AstrologySkill::normalizeResponseType($responseType);
            $defaultCost = match ($type) {
                AstrologySkill::TYPE_SHORT => 3,
                AstrologySkill::TYPE_LONG => 10,
                default => 5,
            };

            return (int) Setting::get(
                'ai',
                "point_cost_astrology_{$type}",
                config("ai.point_costs.astrology_{$type}", $defaultCost)
            );
        }

        return (int) Setting::get('ai', 'point_cost_chat', config('ai.point_costs.chat', 5));
    }

    /**
     * Process a chat question synchronously.
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
        ?string $responseType = null,
    ): array {
        return $this->executeCompletion(
            message: $message,
            category: $category,
            history: $history,
            language: $language,
            requester: $requester,
            model: $model,
            imageUrl: $imageUrl,
            responseType: $responseType,
            onChunk: null,
            stream: false,
        );
    }

    /**
     * Stream a chat response chunk-by-chunk using a callback.
     * Errors are propagated directly without silent provider fallback.
     *
     * @param  array<int, array{role: string, content: string}>  $history
     * @param  callable(string): void|null  $onChunk
     * @return array{content: string, structured: array{sections: array<int, array{title: string, description: string}>, checklist: array<int, array{item: string, detail: string}>}, tokens_used: int|null, cost: string|null, duration_ms: int, model: string, category: string}
     *
     * @throws AIGenerationFailedException
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
        ?string $responseType = null,
    ): array {
        return $this->executeCompletion(
            message: $message,
            category: $category,
            history: $history,
            language: $language,
            requester: $requester,
            model: $model,
            imageUrl: $imageUrl,
            responseType: $responseType,
            onChunk: $onChunk,
            stream: true,
        );
    }

    /**
     * Unified chat execution pipeline shared by sync and streaming endpoints.
     *
     * @param  array<int, array{role: string, content: string}>  $history
     * @param  callable(string): void|null  $onChunk
     * @return array{content: string, structured: array{sections: array<int, array{title: string, description: string}>, checklist: array<int, array{item: string, detail: string}>}, tokens_used: int|null, cost: string|null, duration_ms: int, model: string, category: string}
     *
     * @throws AIGenerationFailedException
     */
    private function executeCompletion(
        string $message,
        string $category,
        array $history,
        string $language,
        User|Customer|null $requester,
        ?string $model,
        ?string $imageUrl,
        ?string $responseType,
        ?callable $onChunk,
        bool $stream,
    ): array {
        $sanitizedMessage = mb_substr(trim($message), 0, 5000);
        $skill = ChatSkillFactory::make($category);
        $resolvedResponseType = $skill->category() === 'astrology'
            ? AstrologySkill::normalizeResponseType($responseType)
            : null;

        $transport = $this->transportFactory->forCategory($skill->category(), $imageUrl);
        $usesRag = $transport instanceof OpenCodeChatTransport;
        $selectedModel = $this->resolveModel($skill->category(), $model, $imageUrl);
        $pointCost = $this->resolvePointCost($skill->category(), $resolvedResponseType);

        $provider = AIProvider::query()->where('slug', $transport->providerSlug())->first();
        if (! $provider && $transport->providerSlug() !== 'segmind') {
            $provider = AIProvider::query()->where('slug', 'segmind')->first();
        }

        $inputMetadata = [
            'provider' => $transport->providerSlug(),
            'model' => $selectedModel,
            'category' => $skill->category(),
            'response_type' => $resolvedResponseType,
            'language' => $language,
            'prompt' => $sanitizedMessage,
            'image_url' => $imageUrl,
            'rag_enabled' => $usesRag,
        ];
        if ($stream) {
            $inputMetadata['stream'] = true;
        }

        $generation = AIGeneration::create([
            'user_id' => $requester instanceof User ? $requester->id : null,
            'customer_id' => $requester instanceof Customer ? $requester->id : null,
            'provider_id' => $provider?->id ?? 1,
            'operation' => AIGeneration::OPERATION_CHAT,
            'status' => AIGeneration::STATUS_PROCESSING,
            'coins_spent' => $pointCost,
            'input_metadata' => $inputMetadata,
        ]);

        $startedAt = hrtime(true);

        try {
            $ragContext = null;
            $ragMetadata = null;

            if ($usesRag) {
                $ragResult = $this->ragRetriever->retrieve($sanitizedMessage, $history);
                $ragContext = $ragResult['context'];
                $ragMetadata = [
                    'collection' => $ragResult['collection'],
                    'duration_ms' => $ragResult['duration_ms'],
                    'sources_count' => count($ragResult['sources']),
                    'sources' => $ragResult['sources'],
                ];
            }

            $fullPrompt = $skill->buildPrompt(
                userMessage: $sanitizedMessage,
                history: $history,
                language: $language,
                responseType: $resolvedResponseType,
                ragContext: $ragContext,
            );

            $completion = $transport->complete(
                model: $selectedModel,
                fullPrompt: $fullPrompt,
                imageUrl: $imageUrl,
                responseType: $resolvedResponseType,
            );

            $durationMs = (int) round((hrtime(true) - $startedAt) / 1e6);
            $normalized = $skill->formatResponse($completion->rawContent, $language);

            if ($onChunk && ! empty($normalized['content'])) {
                $this->emitChunks($normalized['content'], $onChunk);
            }

            $outputMetadata = $normalized;
            if ($ragMetadata !== null) {
                $outputMetadata['rag'] = $ragMetadata;
            }

            $generation->update([
                'status' => AIGeneration::STATUS_COMPLETED,
                'request_id' => $completion->requestId,
                'duration_ms' => $durationMs,
                'cost' => $completion->costUsd,
                'currency' => 'USD',
                'output_metadata' => $outputMetadata,
                'raw_response' => $completion->rawResponse,
            ]);

            return [
                'content' => $normalized['content'],
                'structured' => $normalized['structured'],
                'rag_sources' => $ragMetadata['sources'] ?? [],
                'tokens_used' => $completion->totalTokens,
                'cost' => $completion->costUsd,
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
     * Stream clean conversational text word-by-word to the SSE callback.
     *
     * @param  callable(string): void  $onChunk
     */
    private function emitChunks(string $content, callable $onChunk): void
    {
        $words = preg_split('/(\s+)/u', $content, -1, PREG_SPLIT_DELIM_CAPTURE);
        if (! is_array($words)) {
            return;
        }

        $isTesting = app()->environment('testing');

        foreach ($words as $word) {
            if (! $isTesting && connection_aborted()) {
                break;
            }
            if ($word !== '') {
                $onChunk($word);
                if (! $isTesting) {
                    usleep(20000);
                }
            }
        }
    }
}
