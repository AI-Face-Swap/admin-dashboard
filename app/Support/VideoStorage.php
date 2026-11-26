<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class VideoStorage
{
    public const DISK = 'r2';

    public const FALLBACK_DISK = 'spaces';

    public const PREFIX = 'htut-ai';

    /**
     * Resolve the active disk for video uploads (R2 when configured, otherwise DO Spaces).
     */
    public static function disk(): string
    {
        $r2Bucket = config('filesystems.disks.r2.bucket');
        $r2Key = config('filesystems.disks.r2.key');

        if (! empty($r2Bucket) && ! empty($r2Key)) {
            return self::DISK;
        }

        return self::FALLBACK_DISK;
    }

    /**
     * Build a storage directory path prefixed with `htut-ai/` when using R2.
     */
    public static function directory(string $directory, ?string $disk = null): string
    {
        $targetDisk = $disk ?? self::disk();
        $cleanDir = trim($directory, '/');

        if ($targetDisk === self::DISK) {
            if ($cleanDir === '' || $cleanDir === self::PREFIX || str_starts_with($cleanDir, self::PREFIX.'/')) {
                return $cleanDir ?: self::PREFIX;
            }

            return self::PREFIX.'/'.$cleanDir;
        }

        return $cleanDir;
    }

    /**
     * Store an uploaded video file on R2 (with fallback to Spaces) and return path, url, and disk.
     *
     * @return array{path: string, url: string, disk: string}
     */
    public static function storeUploadedFile(UploadedFile $file, string $directory): array
    {
        $disk = self::disk();
        $extension = strtolower($file->getClientOriginalExtension() ?: 'mp4');
        $filename = Str::uuid().'.'.$extension;
        $targetDir = self::directory($directory, $disk);

        $options = $disk === self::DISK ? [] : ['visibility' => 'public'];
        $path = Storage::disk($disk)->putFileAs($targetDir, $file, $filename, $options);

        if ($path === false) {
            throw new RuntimeException("Failed to upload video to {$disk} storage.");
        }

        return [
            'path' => $path,
            'url' => Storage::disk($disk)->url($path),
            'disk' => $disk,
        ];
    }

    /**
     * Store raw video bytes on R2 (with fallback to Spaces) and return path, url, and disk.
     *
     * @return array{path: string, url: string, disk: string}
     */
    public static function putContents(string $directory, string $filename, string $contents): array
    {
        $disk = self::disk();
        $targetDir = self::directory($directory, $disk);
        $path = $targetDir !== '' ? $targetDir.'/'.ltrim($filename, '/') : ltrim($filename, '/');

        $options = $disk === self::DISK ? [] : 'public';
        $stored = Storage::disk($disk)->put($path, $contents, $options);

        if (! $stored) {
            throw new RuntimeException("Failed to write video bytes to {$disk} storage.");
        }

        return [
            'path' => $path,
            'url' => Storage::disk($disk)->url($path),
            'disk' => $disk,
        ];
    }

    /**
     * Determine whether a file extension represents a video.
     */
    public static function isVideoExtension(?string $extension): bool
    {
        if (! $extension) {
            return false;
        }

        return in_array(strtolower(ltrim($extension, '.')), ['mp4', 'mov', 'webm', 'avi', 'm4v', 'mkv'], true);
    }

    /**
     * Determine whether a MIME type represents a video.
     */
    public static function isVideoMime(?string $mime): bool
    {
        if (! $mime) {
            return false;
        }

        return str_starts_with(strtolower($mime), 'video/');
    }

    /**
     * Resolve which disk (`r2` or `spaces`) and relative path correspond to a URL or stored path.
     *
     * @return array{disk: string, path: string}
     */
    public static function resolveDiskAndPath(string $urlOrPath): array
    {
        $trimmed = trim($urlOrPath);

        if (filter_var($trimmed, FILTER_VALIDATE_URL)) {
            $path = ltrim((string) parse_url($trimmed, PHP_URL_PATH), '/');
            $r2Url = rtrim((string) config('filesystems.disks.r2.url', ''), '/');
            $r2Host = $r2Url !== '' ? (string) parse_url($r2Url, PHP_URL_HOST) : '';
            $urlHost = (string) parse_url($trimmed, PHP_URL_HOST);

            if (($r2Host !== '' && strcasecmp($urlHost, $r2Host) === 0) || str_contains($urlHost, 'r2.cloudflarestorage.com') || str_contains($urlHost, '.r2.dev')) {
                return ['disk' => self::DISK, 'path' => $path];
            }

            return ['disk' => self::FALLBACK_DISK, 'path' => $path];
        }

        $path = ltrim($trimmed, '/');
        if (str_starts_with($path, self::PREFIX.'/')) {
            return ['disk' => self::DISK, 'path' => $path];
        }

        return ['disk' => self::FALLBACK_DISK, 'path' => $path];
    }

    /**
     * Locate a file across R2 and Spaces, checking the resolved disk first.
     *
     * @return array{disk: string, path: string}|null
     */
    public static function findOnDisks(string $urlOrPath): ?array
    {
        $resolved = self::resolveDiskAndPath($urlOrPath);
        $primaryDisk = $resolved['disk'];
        $path = $resolved['path'];

        if ($path === '') {
            return null;
        }

        $candidatePaths = [$path];
        if (str_starts_with($path, 'storage/')) {
            $candidatePaths[] = substr($path, 8);
        }

        $disksToCheck = [$primaryDisk];
        $secondaryDisk = $primaryDisk === self::DISK ? self::FALLBACK_DISK : self::DISK;
        if ($secondaryDisk !== self::DISK || ! empty(config('filesystems.disks.r2.bucket'))) {
            $disksToCheck[] = $secondaryDisk;
        }

        foreach ($disksToCheck as $disk) {
            if ($disk === self::DISK && empty(config('filesystems.disks.r2.bucket'))) {
                continue;
            }
            foreach ($candidatePaths as $candidate) {
                if (Storage::disk($disk)->exists($candidate)) {
                    return ['disk' => $disk, 'path' => $candidate];
                }
            }
        }

        return null;
    }

    /**
     * Delete a file from whichever disk (`r2` or `spaces`) it resides on.
     */
    public static function deleteUrlOrPath(?string $urlOrPath): bool
    {
        if (! $urlOrPath) {
            return false;
        }

        $found = self::findOnDisks($urlOrPath);
        if (! $found) {
            return false;
        }

        return Storage::disk($found['disk'])->delete($found['path']);
    }
}
