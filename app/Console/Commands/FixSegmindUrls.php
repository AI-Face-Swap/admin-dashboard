<?php

namespace App\Console\Commands;

use App\Models\AIGeneration;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FixSegmindUrls extends Command
{
    protected $signature = 'fix:segmind-urls';

    protected $description = 'Download Segmind URLs and store to our DigitalOcean Spaces';

    public function handle(): int
    {
        $generations = AIGeneration::where('status', 'completed')
            ->whereNotNull('output_metadata')
            ->get();

        $fixed = 0;
        $failed = 0;
        $skipped = 0;

        foreach ($generations as $generation) {
            $output = $generation->output_metadata;

            if (! is_array($output) || empty($output)) {
                $skipped++;

                continue;
            }

            // Check if URL is already ours (not Segmind)
            $url = $output['url'] ?? null;

            if (! $url) {
                // Check if it's an array of URLs
                if (isset($output[0])) {
                    $url = $output[0];
                }
            }

            if (! $url) {
                $skipped++;

                continue;
            }

            // Skip if already our URL
            if (! str_contains($url, 'segmind.com')) {
                $skipped++;

                continue;
            }

            $this->line("Fixing generation #{$generation->id}: {$url}");

            try {
                $response = Http::timeout(60)->get($url);

                if (! $response->successful()) {
                    $this->error("  Failed to download: HTTP {$response->status()}");
                    $failed++;

                    continue;
                }

                $body = $response->body();
                $contentType = $response->header('Content-Type') ?? '';

                $extension = match (true) {
                    str_contains($contentType, 'image/png') => 'png',
                    str_contains($contentType, 'image/jpeg') => 'jpg',
                    str_contains($contentType, 'image/webp') => 'webp',
                    str_contains($contentType, 'video/mp4') => 'mp4',
                    default => 'bin',
                };

                $path = 'generations/'.Str::uuid().'.'.$extension;

                Storage::disk('spaces')->put($path, $body, 'public');

                $newUrl = Storage::disk('spaces')->url($path);

                // Update the output_metadata
                if (isset($output['url'])) {
                    $output['url'] = $newUrl;
                } elseif (isset($output[0])) {
                    $output[0] = $newUrl;
                }

                $generation->update(['output_metadata' => $output]);

                $this->info("  ✓ Stored to: {$newUrl}");
                $fixed++;

            } catch (\Exception $e) {
                $this->error("  Error: {$e->getMessage()}");
                $failed++;
            }
        }

        $this->newLine();
        $this->info("Done! Fixed: {$fixed}, Failed: {$failed}, Skipped: {$skipped}");

        return Command::SUCCESS;
    }
}
