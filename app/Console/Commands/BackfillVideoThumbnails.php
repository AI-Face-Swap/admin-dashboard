<?php

namespace App\Console\Commands;

use App\Models\AIGeneration;
use App\Services\VideoThumbnailService;
use Illuminate\Console\Command;

class BackfillVideoThumbnails extends Command
{
    protected $signature = 'app:backfill-video-thumbnails {--limit=100 : Maximum records to process}';

    protected $description = 'Generate and store thumbnails for existing completed video generations';

    public function handle(VideoThumbnailService $thumbnailService): int
    {
        $limit = max(1, (int) $this->option('limit'));

        $generations = AIGeneration::query()
            ->where('status', AIGeneration::STATUS_COMPLETED)
            ->whereIn('operation', [
                AIGeneration::OPERATION_VIDEO_FACE_SWAP,
                AIGeneration::OPERATION_IMAGE_TO_VIDEO,
            ])
            ->whereNull('thumbnail_path')
            ->latest('id')
            ->limit($limit)
            ->get();

        if ($generations->isEmpty()) {
            $this->info('No completed video generations need thumbnails.');

            return self::SUCCESS;
        }

        $ok = 0;
        $fail = 0;

        foreach ($generations as $generation) {
            if ($thumbnailService->generateForGeneration($generation)) {
                $ok++;
                $this->line("Generated thumbnail for #{$generation->id}");
            } else {
                $fail++;
                $this->warn("Skipped/failed for #{$generation->id}");
            }
        }

        $this->info("Done. Success: {$ok}, Failed/Skipped: {$fail}");

        return self::SUCCESS;
    }
}
