<?php

namespace App\Services;

use App\Models\Customer;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CentralAuthPointService
{
    public static function getHeaders(): array
    {
        $projectId = config('services.htut_central_auth.project_id', 'htut_ai');
        $projectSecret = config('services.htut_central_auth.project_secret');
        $apiKey = config('services.htut_central_auth.api_key');

        $headers = [
            'Accept' => 'application/json',
            'X-Project-Id' => $projectId,
        ];

        if (! empty($projectSecret)) {
            $headers['X-Project-Secret'] = $projectSecret;
        } elseif (! empty($apiKey)) {
            $headers['X-Api-Key'] = $apiKey;
        }

        return $headers;
    }

    public static function getBaseUrl(): string
    {
        return rtrim(config('services.htut_central_auth.url', 'http://localhost:8000'), '/');
    }

    /**
     * Ensure Customer is registered in Central Auth and return central_auth_uuid.
     */
    public static function ensureCentralAuthUuid(Customer $customer): ?string
    {
        if (! empty($customer->central_auth_uuid)) {
            return $customer->central_auth_uuid;
        }

        try {
            $url = self::getBaseUrl().'/api/v1/s2s/customer-sync';
            $response = Http::withHeaders(self::getHeaders())->timeout(5)->post($url, [
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
            ]);

            if ($response->successful()) {
                $uuid = $response->json('customer.uuid');
                if ($uuid) {
                    $customer->update(['central_auth_uuid' => $uuid]);
                    $points = (int) ($response->json('customer.points') ?? 10);
                    Cache::put("customer_points_{$uuid}", $points, 30);

                    return $uuid;
                }
            }
        } catch (\Throwable $e) {
            Log::warning("Failed to auto-sync customer {$customer->id} with Central Auth: ".$e->getMessage());
        }

        return null;
    }

    /**
     * Get Customer Point Balance from Central Auth
     */
    public static function getPoints(string $centralAuthUuid): int
    {
        if (empty($centralAuthUuid)) {
            return 0;
        }

        try {
            $url = self::getBaseUrl()."/api/v1/s2s/points/{$centralAuthUuid}";
            $response = Http::withHeaders(self::getHeaders())->timeout(5)->get($url);

            if ($response->successful()) {
                $points = (int) ($response->json('points') ?? 0);
                // Cache briefly for 30 seconds to speed up UI requests
                Cache::put("customer_points_{$centralAuthUuid}", $points, 30);

                return $points;
            }
        } catch (\Throwable $e) {
            Log::warning("Failed to fetch points from Central Auth for {$centralAuthUuid}: ".$e->getMessage());
        }

        return (int) Cache::get("customer_points_{$centralAuthUuid}", 0);
    }

    /**
     * Atomically Deduct Points on Central Auth via S2S
     */
    public static function deductPoints(
        string $centralAuthUuid,
        int $amount,
        string $description,
        ?string $referenceId = null,
        array $metadata = []
    ): array {
        if (empty($centralAuthUuid) || $amount <= 0) {
            return [
                'success' => false,
                'message' => 'Invalid point deduction parameters.',
                'points' => 0,
            ];
        }

        try {
            $url = self::getBaseUrl().'/api/v1/s2s/points/deduct';
            $payload = [
                'central_auth_uuid' => $centralAuthUuid,
                'amount' => $amount,
                'description' => $description,
                'reference_id' => $referenceId,
                'metadata' => $metadata,
            ];

            $response = Http::withHeaders(self::getHeaders())->timeout(8)->post($url, $payload);
            $data = $response->json();

            if ($response->successful() && ($data['success'] ?? false)) {
                $newBalance = (int) ($data['points'] ?? 0);
                Cache::put("customer_points_{$centralAuthUuid}", $newBalance, 30);

                return [
                    'success' => true,
                    'points' => $newBalance,
                    'deducted' => $amount,
                ];
            }

            return [
                'success' => false,
                'message' => $data['message'] ?? 'Insufficient points balance.',
                'points' => (int) ($data['points'] ?? 0),
                'required' => $amount,
            ];
        } catch (\Throwable $e) {
            Log::error("Central Auth point deduction exception for {$centralAuthUuid}: ".$e->getMessage());

            return [
                'success' => false,
                'message' => 'Central Auth point service error: '.$e->getMessage(),
                'points' => 0,
            ];
        }
    }

    /**
     * Atomically Add Points to Central Auth via S2S (e.g. after package purchase)
     */
    public static function addPoints(
        string $centralAuthUuid,
        int $amount,
        string $description,
        ?string $referenceId = null,
        array $metadata = []
    ): array {
        if (empty($centralAuthUuid) || $amount <= 0) {
            return [
                'success' => false,
                'message' => 'Invalid parameters for adding points.',
                'points' => 0,
            ];
        }

        try {
            $url = self::getBaseUrl().'/api/v1/s2s/points/add';
            $payload = [
                'central_auth_uuid' => $centralAuthUuid,
                'amount' => $amount,
                'description' => $description,
                'reference_id' => $referenceId,
                'metadata' => $metadata,
            ];

            $response = Http::withHeaders(self::getHeaders())->timeout(8)->post($url, $payload);
            $data = $response->json();

            if ($response->successful() && ($data['success'] ?? false)) {
                $newBalance = (int) ($data['points'] ?? 0);
                Cache::put("customer_points_{$centralAuthUuid}", $newBalance, 30);

                return [
                    'success' => true,
                    'points' => $newBalance,
                    'added' => $amount,
                ];
            }

            return [
                'success' => false,
                'message' => $data['message'] ?? 'Failed to credit points on Central Auth.',
                'points' => 0,
            ];
        } catch (\Throwable $e) {
            Log::error("Central Auth add points exception for {$centralAuthUuid}: ".$e->getMessage());

            return [
                'success' => false,
                'message' => 'Central Auth point service error: '.$e->getMessage(),
                'points' => 0,
            ];
        }
    }

    /**
     * Get Customer Point Transactions from Central Auth
     */
    public static function getTransactions(string $centralAuthUuid, int $perPage = 20, int $page = 1): array
    {
        if (empty($centralAuthUuid)) {
            return ['data' => [], 'total' => 0];
        }

        try {
            $url = self::getBaseUrl()."/api/v1/s2s/points/{$centralAuthUuid}/transactions";
            $response = Http::withHeaders(self::getHeaders())->timeout(8)->get($url, [
                'per_page' => $perPage,
                'page' => $page,
            ]);

            if ($response->successful()) {
                return $response->json('transactions') ?? ['data' => [], 'total' => 0];
            }
        } catch (\Throwable $e) {
            Log::warning("Failed to fetch point transactions from Central Auth for {$centralAuthUuid}: ".$e->getMessage());
        }

        return ['data' => [], 'total' => 0];
    }
}
