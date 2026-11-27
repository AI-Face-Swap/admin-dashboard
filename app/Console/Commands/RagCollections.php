<?php

namespace App\Console\Commands;

use App\Services\Rag\VectorSearch;
use Illuminate\Console\Command;

class RagCollections extends Command
{
    protected $signature = 'rag:collections';

    protected $description = 'List Open WebUI collections stored in the pgvector database';

    public function handle(VectorSearch $vectorSearch): int
    {
        $collections = $vectorSearch->collections();

        if ($collections->isEmpty()) {
            $this->warn('No collections found in the document_chunk table.');

            return self::SUCCESS;
        }

        $this->table(
            ['Collection', 'Chunks'],
            $collections->map(fn (array $row): array => [$row['collection'], $row['chunks']])->all(),
        );

        return self::SUCCESS;
    }
}
