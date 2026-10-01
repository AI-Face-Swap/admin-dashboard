<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CentralAuthPackageService
{
    public const CACHE_KEY = 'central_auth_packages_htut_ai';
    public const CACHE_TTL_SECONDS = 300; // 5 minutes

    /**
     * Retrieve packages for HTUT AI from HTUT Central Auth SSO.
     * Returns mapped package list with dynamic pricing and feature entitlements.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getPackages(bool $forceRefresh = false): array
    {
        if ($forceRefresh) {
            Cache::forget(self::CACHE_KEY);
        }

        $cached = Cache::get(self::CACHE_KEY);
        if ($cached !== null) {
            return $cached;
        }

        $centralAuthUrl = rtrim(config('services.htut_central_auth.url', 'http://localhost:8000'), '/');
        $projectId = config('services.htut_central_auth.project_id', 'htut_ai');
        $projectSecret = config('services.htut_central_auth.project_secret', 'sec_htut_ai_dev_secret_2026');

        try {
            $response = Http::withHeaders([
                'X-Project-Id' => $projectId,
                'X-Project-Secret' => $projectSecret,
                'Accept' => 'application/json',
            ])
            ->timeout(5)
            ->get("{$centralAuthUrl}/api/v1/s2s/projects/{$projectId}/packages");

            if ($response->successful()) {
                $json = $response->json();
                $packages = $json['packages'] ?? [];

                if (! empty($packages) && is_array($packages)) {
                    $result = array_map(function ($pkg) {
                        $metadata = (array) ($pkg['metadata'] ?? []);
                        $price = (int) ($pkg['price'] ?? 0);
                        $discount = (int) ($metadata['discount_percent'] ?? 0);
                        $originalPrice = $discount > 0 && $price > 0
                            ? (int) round($price / (1 - $discount / 100))
                            : $price;

                        return [
                            'id' => $pkg['id'],
                            'name' => $pkg['name'],
                            'slug' => $pkg['slug'],
                            'description' => $pkg['description'] ?? null,
                            'image_url' => $pkg['image_url'] ?? null,
                            'price' => $price,
                            'original_price' => $originalPrice,
                            'discount_percent' => $discount,
                            'currency' => $pkg['currency'] ?? 'MMK',
                            'duration' => (int) ($pkg['duration'] ?? 1),
                            'duration_unit' => $pkg['duration_unit'] ?? 'months',
                            'metadata' => $metadata,
                            'features' => array_map(function ($f) {
                                return [
                                    'key' => $f['key'] ?? '',
                                    'name' => $f['name'] ?? $f['key'] ?? '',
                                    'duration' => $f['duration'] ?? null,
                                    'duration_unit' => $f['duration_unit'] ?? null,
                                ];
                            }, (array) ($pkg['features'] ?? [])),
                            'is_popular' => (bool) ($metadata['popular'] ?? false),
                            'source' => 'central_auth',
                        ];
                    }, $packages);

                    Cache::put(self::CACHE_KEY, $result, self::CACHE_TTL_SECONDS);

                    return $result;
                }
            } else {
                Log::warning('Central Auth package fetch error: ' . $response->body());
            }
        } catch (\Throwable $e) {
            Log::warning('Central Auth package fetch exception: ' . $e->getMessage());
        }

        // Reliable fallback if Central Auth S2S is temporarily unreachable
        return self::fallbackPackages();
    }

    /**
     * Fallback standard packages
     */
    public static function fallbackPackages(): array
    {
        return [
            [
                'id' => 6,
                'name' => 'HTUT AI Pro Monthly',
                'slug' => 'htut-ai-pro-monthly',
                'description' => 'Advanced AI assistant with GPT-4 streaming, intelligent search, and monthly credits.',
                'image_url' => 'https://imagesbucket.sgp1.digitaloceanspaces.com/packages/5lARcTEfiyGMMXzd0phTLmBq9PX0VkDj.png',
                'price' => 15000,
                'original_price' => 15000,
                'discount_percent' => 0,
                'currency' => 'MMK',
                'duration' => 1,
                'duration_unit' => 'months',
                'metadata' => ['credits' => 500, 'popular' => true],
                'features' => [
                    ['key' => 'ai_credits_500', 'name' => '500 AI Monthly Credits'],
                    ['key' => 'gpt4_streaming', 'name' => 'GPT-4 Streaming Assistant'],
                    ['key' => 'priority_ai_queue', 'name' => 'Priority Neural Processing'],
                ],
                'is_popular' => true,
                'source' => 'fallback',
            ],
            [
                'id' => 7,
                'name' => 'HTUT All-Access Pass',
                'slug' => 'htut-all-access-pass',
                'description' => 'Unified multi-project pass: full VVIP9 VIP membership combined with HTUT AI Pro.',
                'image_url' => null,
                'price' => 30000,
                'original_price' => 37500,
                'discount_percent' => 20,
                'currency' => 'MMK',
                'duration' => 1,
                'duration_unit' => 'months',
                'metadata' => ['bundle' => true, 'discount_percent' => 20],
                'features' => [
                    ['key' => 'ai_credits_500', 'name' => '500 AI Monthly Credits'],
                    ['key' => 'gpt4_streaming', 'name' => 'GPT-4 Streaming Assistant'],
                    ['key' => 'priority_ai_queue', 'name' => 'Priority Neural Processing'],
                    ['key' => 'vvip9_vip', 'name' => 'Full VVIP9 VIP Smart NFC Card'],
                ],
                'is_popular' => false,
                'source' => 'fallback',
            ],
        ];
    }
}
