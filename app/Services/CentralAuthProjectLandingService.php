<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CentralAuthProjectLandingService
{
    public const CACHE_KEY = 'central_auth_project_landings_htut_ai';

    public const CACHE_TTL_SECONDS = 300; // 5 minutes

    /**
     * Retrieve active HTUT Ecosystem project landings from HTUT Central Auth SSO.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function getProjectLandings(bool $forceRefresh = false, bool $includeSelf = true): array
    {
        $cacheKey = self::CACHE_KEY.($includeSelf ? '_all' : '_others');

        if ($forceRefresh) {
            Cache::forget(self::CACHE_KEY.'_all');
            Cache::forget(self::CACHE_KEY.'_others');
        }

        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return $cached;
        }

        $centralAuthUrl = rtrim(config('services.htut_central_auth.url', 'http://localhost:8000'), '/');
        $projectId = config('services.htut_central_auth.project_id', 'htut_ai');
        $projectSecret = config('services.htut_central_auth.project_secret', 'sec_htut_ai_dev_secret_2026');
        $apiKey = config('services.htut_central_auth.api_key');

        $headers = [
            'X-Project-Id' => $projectId,
            'Accept' => 'application/json',
        ];

        if ($projectSecret) {
            $headers['X-Project-Secret'] = $projectSecret;
        } elseif ($apiKey) {
            $headers['X-Api-Key'] = $apiKey;
        }

        try {
            $response = Http::withHeaders($headers)
                ->timeout(6)
                ->get("{$centralAuthUrl}/api/v1/s2s/project-landings", [
                    'include_self' => $includeSelf ? '1' : '0',
                ]);

            if ($response->successful()) {
                $json = $response->json();
                $landings = $json['project_landings'] ?? $json['data'] ?? [];

                if (is_array($landings)) {
                    $normalized = array_values(array_map([self::class, 'normalizeLanding'], $landings));
                    Cache::put($cacheKey, $normalized, self::CACHE_TTL_SECONDS);

                    return $normalized;
                }
            } else {
                Log::warning('Central Auth project landings fetch error: '.$response->body());
            }
        } catch (\Throwable $e) {
            Log::warning('Central Auth project landings fetch exception: '.$e->getMessage());
        }

        return [];
    }

    /**
     * Retrieve a single project landing detail by project_id slug or landing ID.
     *
     * @return array<string, mixed>|null
     */
    public static function getProjectLandingDetail(string $identifier): ?array
    {
        $centralAuthUrl = rtrim(config('services.htut_central_auth.url', 'http://localhost:8000'), '/');
        $projectId = config('services.htut_central_auth.project_id', 'htut_ai');
        $projectSecret = config('services.htut_central_auth.project_secret', 'sec_htut_ai_dev_secret_2026');
        $apiKey = config('services.htut_central_auth.api_key');

        $headers = [
            'X-Project-Id' => $projectId,
            'Accept' => 'application/json',
        ];

        if ($projectSecret) {
            $headers['X-Project-Secret'] = $projectSecret;
        } elseif ($apiKey) {
            $headers['X-Api-Key'] = $apiKey;
        }

        try {
            $response = Http::withHeaders($headers)
                ->timeout(6)
                ->get("{$centralAuthUrl}/api/v1/s2s/project-landings/".urlencode($identifier));

            if ($response->successful()) {
                $json = $response->json();
                $landing = $json['project_landing'] ?? $json['data'] ?? null;

                if (is_array($landing)) {
                    return self::normalizeLanding($landing);
                }
            }
        } catch (\Throwable $e) {
            Log::warning("Central Auth project landing detail [{$identifier}] fetch exception: ".$e->getMessage());
        }

        // Fallback: search inside cached project landings
        foreach (self::getProjectLandings(false, true) as $item) {
            if (
                (string) ($item['id'] ?? '') === $identifier ||
                (string) ($item['project_id'] ?? '') === $identifier ||
                (string) ($item['project_slug'] ?? '') === $identifier
            ) {
                return $item;
            }
        }

        return null;
    }

    /**
     * Normalize a single project landing array from Central Auth.
     *
     * @param  array<string, mixed>  $landing
     * @return array<string, mixed>
     */
    private static function normalizeLanding(array $landing): array
    {
        $logoUrl = $landing['logo_url'] ?? $landing['logo'] ?? null;
        $bannerUrl = $landing['banner_url'] ?? $landing['banner'] ?? null;
        $playStoreUrl = $landing['play_store_url'] ?? $landing['play_store'] ?? null;
        $appStoreUrl = $landing['app_store_url'] ?? $landing['app_store'] ?? null;
        $websiteUrl = $landing['website_url'] ?? $landing['website'] ?? null;

        return [
            'id' => $landing['id'] ?? null,
            'project_id' => $landing['project_id'] ?? $landing['project_slug'] ?? null,
            'project_slug' => $landing['project_slug'] ?? $landing['project_id'] ?? null,
            'project_name' => $landing['project_name'] ?? $landing['title'] ?? null,
            'logo' => $logoUrl,
            'logo_url' => $logoUrl,
            'banner' => $bannerUrl,
            'banner_url' => $bannerUrl,
            'title' => $landing['title'] ?? $landing['project_name'] ?? '',
            'description' => $landing['description'] ?? null,
            'play_store' => $playStoreUrl,
            'play_store_url' => $playStoreUrl,
            'app_store' => $appStoreUrl,
            'app_store_url' => $appStoreUrl,
            'direct_link' => $landing['direct_link'] ?? null,
            'website' => $websiteUrl,
            'website_url' => $websiteUrl,
            'benefit' => is_array($landing['benefit'] ?? null) ? array_values($landing['benefit']) : [],
            'ordering' => (int) ($landing['ordering'] ?? 0),
            'updated_at' => $landing['updated_at'] ?? null,
        ];
    }
}
