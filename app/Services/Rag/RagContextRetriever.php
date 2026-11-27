<?php

namespace App\Services\Rag;

use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Retrieves relevant knowledge-base chunks for a question and formats them
 * into XML <context> blocks for LLM prompt injection.
 *
 * Intentionally propagates exceptions (no silent fallback) so upstream RAG
 * or pgvector errors are visible to callers and monitoring.
 */
class RagContextRetriever
{
    public function __construct(
        private readonly EmbeddingClient $embeddings,
        private readonly VectorSearch $vectorSearch,
    ) {}

    /**
     * @param  array<int, array{role: string, content: string}>  $history
     * @return array{
     *     collection: string,
     *     context: string,
     *     sources: list<array{id: string, name: string, score: float, excerpt: string}>,
     *     chunks: Collection<int, array{id: string, text: string, metadata: array<string, mixed>, score: float}>,
     *     duration_ms: int
     * }
     */
    public function retrieve(
        string $question,
        array $history = [],
        ?string $collection = null,
        ?int $limit = null,
    ): array {
        $collection ??= (string) config('services.rag.collection');

        if (blank($collection)) {
            throw new InvalidArgumentException('No RAG collection configured. Set RAG_COLLECTION in environment.');
        }

        $startedAt = hrtime(true);
        $queryText = $this->buildSearchQuery($question, $history);

        $embedding = $this->embeddings->embed($queryText);
        $chunks = $this->vectorSearch->search(
            $embedding,
            $collection,
            $limit ?? (int) config('services.rag.top_k', 10),
        );

        $durationMs = (int) round((hrtime(true) - $startedAt) / 1e6);

        return [
            'collection' => $collection,
            'context' => $this->formatContextXml($chunks),
            'sources' => $chunks
                ->map(fn (array $chunk): array => [
                    'id' => $chunk['id'],
                    'name' => (string) ($chunk['metadata']['name'] ?? $chunk['metadata']['source'] ?? 'document'),
                    'score' => round($chunk['score'], 4),
                    'excerpt' => Str::limit(Str::squish($chunk['text']), 240),
                ])
                ->values()
                ->all(),
            'chunks' => $chunks,
            'duration_ms' => $durationMs,
        ];
    }

    /**
     * For short follow-up questions (e.g. "အချစ်ရေးကော?"), prepend the latest
     * user turn so the embedding retains subject context (birth day/year/sign).
     *
     * @param  array<int, array{role: string, content: string}>  $history
     */
    private function buildSearchQuery(string $question, array $history): string
    {
        $cleanQuestion = trim($question);

        if (mb_strlen($cleanQuestion) >= 60 || $history === []) {
            return $cleanQuestion;
        }

        $previousUserMessages = array_values(array_filter(
            $history,
            fn (array $msg): bool => ($msg['role'] ?? '') === 'user' && trim((string) ($msg['content'] ?? '')) !== ''
        ));

        if ($previousUserMessages === []) {
            return $cleanQuestion;
        }

        $lastUserMessage = mb_substr(trim((string) end($previousUserMessages)['content']), 0, 300);

        return "{$lastUserMessage}\n{$cleanQuestion}";
    }

    /**
     * @param  Collection<int, array{id: string, text: string, metadata: array<string, mixed>, score: float}>  $chunks
     */
    private function formatContextXml(Collection $chunks): string
    {
        if ($chunks->isEmpty()) {
            return '';
        }

        $maxChunkChars = max(200, (int) config('services.rag.max_chunk_chars', 1500));

        return $chunks
            ->values()
            ->map(function (array $chunk, int $index) use ($maxChunkChars): string {
                $name = (string) ($chunk['metadata']['name'] ?? $chunk['metadata']['source'] ?? 'document');
                $text = mb_substr(trim($chunk['text']), 0, $maxChunkChars);

                return sprintf(
                    "<source id=\"%d\" name=\"%s\">\n%s\n</source>",
                    $index + 1,
                    e($name),
                    $text,
                );
            })
            ->implode("\n\n");
    }
}
