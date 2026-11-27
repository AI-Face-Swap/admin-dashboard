<?php

namespace App\Services\Rag;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Read-only vector search over Open WebUI's pgvector `document_chunk` table.
 */
class VectorSearch
{
    public const CONNECTION = 'openwebui';

    public const TABLE = 'document_chunk';

    /**
     * Find the chunks closest to the embedding by exact cosine distance.
     *
     * Uses a materialized CTE so Postgres compares every chunk in the target
     * collection without ivfflat index pre-filtering dropping matches.
     *
     * @param  list<float>  $embedding
     * @return Collection<int, array{id: string, text: string, metadata: array<string, mixed>, score: float}>
     */
    public function search(array $embedding, string $collection, int $limit = 10): Collection
    {
        $table = self::TABLE;

        $rows = $this->connection()->select(<<<SQL
            with collection_chunks as materialized (
                select id, text, vmetadata, vector <=> ?::vector as distance
                from {$table}
                where collection_name = ?
            )
            select id, text, vmetadata, 1 - distance as score
            from collection_chunks
            order by distance
            limit ?
            SQL, [$this->toVectorLiteral($embedding), $collection, $limit]);

        return collect($rows)
            ->map(fn (object $row): array => [
                'id' => (string) $row->id,
                'text' => (string) $row->text,
                'metadata' => json_decode((string) $row->vmetadata, true) ?: [],
                'score' => (float) $row->score,
            ]);
    }

    /**
     * List the collections stored in the pgvector table with their chunk counts.
     *
     * @return Collection<int, array{collection: string, chunks: int}>
     */
    public function collections(): Collection
    {
        return $this->connection()
            ->table(self::TABLE)
            ->select('collection_name')
            ->selectRaw('count(*) as chunks')
            ->groupBy('collection_name')
            ->orderBy('collection_name')
            ->get()
            ->map(fn (object $row): array => [
                'collection' => (string) $row->collection_name,
                'chunks' => (int) $row->chunks,
            ]);
    }

    /**
     * Zero-pad shorter embeddings to Open WebUI's fixed vector column length.
     * Zero padding preserves cosine distance.
     *
     * @param  list<float>  $embedding
     */
    private function toVectorLiteral(array $embedding): string
    {
        $length = (int) config('services.rag.vector_length', 1536);

        if (count($embedding) > $length) {
            throw new InvalidArgumentException(sprintf(
                'The embedding has %d dimensions but the vector column holds %d. Check RAG_EMBEDDING_MODEL and RAG_VECTOR_LENGTH.',
                count($embedding),
                $length,
            ));
        }

        return '['.implode(',', array_pad($embedding, $length, 0.0)).']';
    }

    private function connection(): ConnectionInterface
    {
        return DB::connection(self::CONNECTION);
    }
}
