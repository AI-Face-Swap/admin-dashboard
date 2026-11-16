<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class VideoThumbnailExtractor
{
    /**
     * Extract a single JPEG frame from a local video file and store it on the target disk.
     */
    public function fromLocalFile(string $localVideoPath, string $disk, string $directory = 'templates/thumbnails'): ?string
    {
        if (! is_file($localVideoPath)) {
            return null;
        }

        $tempThumb = tempnam(sys_get_temp_dir(), 'vthumb_');
        if ($tempThumb === false) {
            return null;
        }

        $thumbFile = $tempThumb.'.jpg';
        @unlink($tempThumb);

        try {
            $extracted = $this->runFfmpeg($localVideoPath, $thumbFile, '00:00:00.500')
                || $this->runFfmpeg($localVideoPath, $thumbFile, '00:00:00');

            if (! $extracted || ! is_file($thumbFile) || filesize($thumbFile) === 0) {
                return null;
            }

            $storedPath = trim($directory, '/').'/'.Str::uuid().'.jpg';
            $stream = fopen($thumbFile, 'rb');
            if ($stream === false) {
                return null;
            }

            try {
                Storage::disk($disk)->put($storedPath, $stream, 'public');
            } finally {
                if (is_resource($stream)) {
                    fclose($stream);
                }
            }

            return $storedPath;
        } catch (Throwable $e) {
            Log::warning('VideoThumbnailExtractor failed: '.$e->getMessage());

            return null;
        } finally {
            @unlink($thumbFile);
        }
    }

    /**
     * Extract a single JPEG frame from a video stored on a Laravel filesystem disk.
     */
    public function fromDisk(string $storagePath, string $disk, string $directory = 'templates/thumbnails'): ?string
    {
        if ($storagePath === '' || ! Storage::disk($disk)->exists($storagePath)) {
            return null;
        }

        $extension = pathinfo($storagePath, PATHINFO_EXTENSION) ?: 'mp4';
        $tempBase = tempnam(sys_get_temp_dir(), 'vsrc_');
        if ($tempBase === false) {
            return null;
        }

        $tempVideo = $tempBase.'.'.$extension;
        @unlink($tempBase);

        try {
            $readStream = Storage::disk($disk)->readStream($storagePath);
            if ($readStream === null) {
                return null;
            }

            $writeStream = fopen($tempVideo, 'wb');
            if ($writeStream === false) {
                if (is_resource($readStream)) {
                    fclose($readStream);
                }

                return null;
            }

            try {
                stream_copy_to_stream($readStream, $writeStream);
            } finally {
                if (is_resource($readStream)) {
                    fclose($readStream);
                }
                fclose($writeStream);
            }

            return $this->fromLocalFile($tempVideo, $disk, $directory);
        } catch (Throwable $e) {
            Log::warning('VideoThumbnailExtractor::fromDisk failed: '.$e->getMessage());

            return null;
        } finally {
            @unlink($tempVideo);
        }
    }

    private function runFfmpeg(string $inputPath, string $outputPath, string $seek): bool
    {
        $result = Process::timeout(30)->run([
            'ffmpeg',
            '-y',
            '-ss',
            $seek,
            '-i',
            $inputPath,
            '-frames:v',
            '1',
            '-q:v',
            '2',
            $outputPath,
        ]);

        return $result->successful() && is_file($outputPath) && filesize($outputPath) > 0;
    }
}
