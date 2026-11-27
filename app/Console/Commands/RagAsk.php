<?php

namespace App\Console\Commands;

use App\Services\Rag\RagContextRetriever;
use Illuminate\Console\Command;

class RagAsk extends Command
{
    protected $signature = 'rag:ask
        {question : The question to search in the Open WebUI knowledge base}
        {--collection= : Open WebUI knowledge base collection ID (defaults to RAG_COLLECTION)}
        {--top= : Number of chunks to retrieve (defaults to RAG_TOP_K)}';

    protected $description = 'Inspect RAG vector retrieval results from Open WebUI pgvector';

    public function handle(RagContextRetriever $retriever): int
    {
        $top = $this->option('top');

        $result = $retriever->retrieve(
            question: (string) $this->argument('question'),
            collection: $this->option('collection') ?: null,
            limit: $top === null ? null : (int) $top,
        );

        $this->info("Collection: {$result['collection']} ({$result['duration_ms']}ms)");

        if ($result['sources'] === []) {
            $this->warn('No matching chunks found.');

            return self::SUCCESS;
        }

        $this->table(
            ['#', 'Score', 'Source', 'Excerpt'],
            array_map(
                fn (array $source, int $i): array => [
                    $i + 1,
                    number_format($source['score'], 4),
                    $source['name'],
                    $source['excerpt'],
                ],
                $result['sources'],
                array_keys($result['sources']),
            ),
        );

        return self::SUCCESS;
    }
}
