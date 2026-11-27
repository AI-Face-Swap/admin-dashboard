<?php

namespace App\Services\Rag;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use RuntimeException;

/**
 * Turns text into a dense vector using an OpenAI-compatible /embeddings API
 * (e.g. Cloudflare Workers AI @cf/baai/bge-m3) or Hugging Face Inference API.
 */
class EmbeddingClient
{
    public const DRIVER_OPENAI = 'openai';

    public const DRIVER_HUGGING_FACE = 'huggingface';

    public const HUGGING_FACE_URL = 'https://router.huggingface.co/hf-inference/models/%s/pipeline/feature-extraction';

    /**
     * @return list<float>
     */
    public function embed(string $text): array
    {
        $config = config('services.rag.embedding');

        if (! is_array($config) || blank($config['model'] ?? null)) {
            throw new InvalidArgumentException('RAG embedding model is not configured (RAG_EMBEDDING_MODEL).');
        }

        $embedding = match ($config['driver'] ?? self::DRIVER_OPENAI) {
            self::DRIVER_OPENAI => $this->embedWithOpenAi($text, $config),
            self::DRIVER_HUGGING_FACE => $this->embedWithHuggingFace($text, $config),
            default => throw new InvalidArgumentException("Unknown embedding driver [{$config['driver']}]."),
        };

        if (! is_array($embedding) || $embedding === [] || ! is_numeric($embedding[0] ?? null)) {
            throw new RuntimeException('The embeddings API returned no embedding.');
        }

        return array_map(floatval(...), $embedding);
    }

    /**
     * @param  array{url?: ?string, key?: ?string, model?: ?string}  $config
     */
    private function embedWithOpenAi(string $text, array $config): mixed
    {
        $baseUrl = rtrim((string) ($config['url'] ?? ''), '/');
        if ($baseUrl === '') {
            throw new InvalidArgumentException('RAG embedding URL is not configured (RAG_EMBEDDING_URL).');
        }

        return $this->request($config)
            ->baseUrl($baseUrl)
            ->post('/embeddings', [
                'model' => $config['model'],
                'input' => $text,
            ])
            ->throw()
            ->json('data.0.embedding');
    }

    /**
     * @param  array{url?: ?string, key?: ?string, model?: ?string}  $config
     */
    private function embedWithHuggingFace(string $text, array $config): mixed
    {
        $url = filled($config['url'] ?? null)
            ? (string) $config['url']
            : sprintf(self::HUGGING_FACE_URL, (string) $config['model']);

        $embedding = $this->request($config)
            ->post($url, ['inputs' => $text])
            ->throw()
            ->json();

        return is_array($embedding[0] ?? null) ? $embedding[0] : $embedding;
    }

    /**
     * @param  array{key?: ?string}  $config
     */
    private function request(array $config): PendingRequest
    {
        return Http::withToken((string) ($config['key'] ?? ''))
            ->connectTimeout(5)
            ->timeout(30)
            ->acceptJson();
    }
}
