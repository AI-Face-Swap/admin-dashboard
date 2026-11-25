<?php

namespace App\Services;

use App\Models\AIGeneration;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

class VideoThumbnailService
{
    /**
     * Extract a JPEG thumbnail from a completed video generation and upload it to Spaces.
     */
    public function generateForGeneration(AIGeneration $generation): ?string
    {
        $videoUrl = $generation->output_url;
        if (! $videoUrl || ! $generation->isVideoOperation()) {
            return null;
        }

        $tmpFile = tempnam(sys_get_temp_dir(), 'gen_thumb_').'.jpg';

        try {
            $extracted = $this->extractFrame($videoUrl, $tmpFile, '00:00:00.500')
                || $this->extractFrame($videoUrl, $tmpFile, '00:00:00');

            if (! $extracted || ! file_exists($tmpFile) || filesize($tmpFile) === 0) {
                return null;
            }

            $storagePath = "generations/thumbnails/{$generation->id}.jpg";
            $contents = file_get_contents($tmpFile);
            if ($contents === false) {
                return null;
            }

            Storage::disk('spaces')->put($storagePath, $contents, 'public');

            $generation->updateQuietly([
                'thumbnail_path' => $storagePath,
            ]);

            return $storagePath;
        } catch (\Throwable $e) {
            Log::warning('Failed to generate video thumbnail', [
                'generation_id' => $generation->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        } finally {
            @unlink($tmpFile);
        }
    }

    private function extractFrame(string $videoUrl, string $outputPath, string $seek): bool
    {
        $result = Process::timeout(30)->run([
            'ffmpeg',
            '-y',
            '-ss',
            $seek,
            '-i',
            $videoUrl,
            '-frames:v',
            '1',
            '-q:v',
            '3',
            $outputPath,
        ]);

        return $result->successful() && file_exists($outputPath) && filesize($outputPath) > 0;
    }
}
