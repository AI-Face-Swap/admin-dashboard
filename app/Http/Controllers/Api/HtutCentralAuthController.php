<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\CentralAuthPackageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class HtutCentralAuthController extends Controller
{
    /**
     * Initiate OAuth flow from HTUT AI.
     * Generates CSRF state and redirects browser to HTUT Central Auth SSO.
     */
    public function redirect(Request $request): RedirectResponse
    {
        $state = Str::random(40);
        Cache::put("htut_state_{$state}", true, 300);

        $centralAuthUrl = rtrim(config('services.htut_central_auth.url', 'http://localhost:8000'), '/');
        $projectId = config('services.htut_central_auth.project_id', 'htut_ai');
        $redirectUri = config('services.htut_central_auth.redirect_uri', 'http://localhost:8001/v1/auth/htut/callback');

        $params = [
            'project' => $projectId,
            'redirect_uri' => $redirectUri,
            'state' => $state,
        ];

        if ($request->filled('prompt')) {
            $params['prompt'] = $request->query('prompt');
        }

        $query = http_build_query($params);

        return redirect()->away("{$centralAuthUrl}/social-login?{$query}");
    }

    /**
     * Receive authorization code from Central Auth, exchange via S2S, sync Customer, and redirect to Frontend.
     */
    public function callback(Request $request): RedirectResponse
    {
        $frontendUrl = rtrim(config('services.frontend.url', env('FRONTEND_URL', 'http://localhost:5173')), '/');
        $state = $request->query('state');
        $code = $request->query('code');
        $error = $request->query('error');

        if ($error) {
            Log::warning('HTUT Central Auth Callback returned error: ' . $error);
            return redirect("{$frontendUrl}/auth/callback?error=" . urlencode($error));
        }

        if (empty($state) || ! Cache::pull("htut_state_{$state}")) {
            Log::warning('HTUT Central Auth: Invalid or expired state token.');
            return redirect("{$frontendUrl}/auth/callback?error=State+expired+or+invalid");
        }

        if (empty($code)) {
            Log::warning('HTUT Central Auth: Missing authorization code.');
            return redirect("{$frontendUrl}/auth/callback?error=Authorization+code+missing");
        }

        // Perform S2S Token Exchange with Central Auth
        $centralAuthUrl = rtrim(config('services.htut_central_auth.url', 'http://localhost:8000'), '/');
        $projectId = config('services.htut_central_auth.project_id', 'htut_ai');
        $projectSecret = config('services.htut_central_auth.project_secret');
        $apiKey = config('services.htut_central_auth.api_key');
        $redirectUri = config('services.htut_central_auth.redirect_uri', 'http://localhost:8001/v1/auth/htut/callback');

        $headers = [
            'Accept' => 'application/json',
            'X-Project-Id' => $projectId,
        ];

        if ($projectSecret) {
            $headers['X-Project-Secret'] = $projectSecret;
        } elseif ($apiKey) {
            $headers['X-Api-Key'] = $apiKey;
        }

        try {
            $response = Http::withHeaders($headers)
                ->timeout(8)
                ->post("{$centralAuthUrl}/api/v1/s2s/token-exchange", [
                    'code' => $code,
                    'redirect_uri' => $redirectUri,
                ]);

            if (! $response->successful()) {
                Log::error('HTUT Central Auth S2S token-exchange failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return redirect("{$frontendUrl}/auth/callback?error=Token+exchange+failed");
            }

            $claims = $response->json();
            $customerData = $claims['customer'] ?? [];
            $entitlements = $claims['entitlements'] ?? [];
            $projectAccess = $claims['project_access'] ?? [];

            $ssoExpiredAt = ! empty($projectAccess['expired_at']) ? Carbon::parse($projectAccess['expired_at']) : null;
            $isSsoExpired = (bool) ($projectAccess['is_expired'] ?? ($ssoExpiredAt ? $ssoExpiredAt->isPast() : false));

            $customer = $this->findOrCreateCustomer($customerData, $entitlements, $ssoExpiredAt, $isSsoExpired);

            // Generate Sanctum Bearer Token for frontend session
            $token = $customer->createToken('htut-central-auth')->plainTextToken;

            return redirect("{$frontendUrl}/auth/callback?token={$token}");

        } catch (\Throwable $e) {
            Log::error('HTUT Central Auth Callback Exception: ' . $e->getMessage());
            return redirect("{$frontendUrl}/auth/callback?error=Server+error+during+authentication");
        }
    }

    /**
     * S2S Webhook: Invalidate and refresh Central Auth package catalog cache
     */
    public function clearPackageCache(Request $request): JsonResponse
    {
        if ($request->input('event') === 'customer.entitlements.updated') {
            return $this->syncCustomerWebhook($request);
        }

        $expectedSecret = (string) config('services.htut_central_auth.project_secret');
        $expectedApiKey = (string) config('services.htut_central_auth.api_key');

        $providedSecret = $request->header('X-Project-Secret') ?? $request->input('project_secret');
        $providedApiKey = $request->header('X-Api-Key') ?? $request->input('api_key');

        $authorized = false;
        if (! empty($expectedSecret) && ! empty($providedSecret) && hash_equals($expectedSecret, (string) $providedSecret)) {
            $authorized = true;
        }
        if (! empty($expectedApiKey) && ! empty($providedApiKey) && hash_equals($expectedApiKey, (string) $providedApiKey)) {
            $authorized = true;
        }

        if (! $authorized) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized S2S credentials.',
            ], 401);
        }

        // Force refresh packages from Central Auth
        $packages = CentralAuthPackageService::getPackages(forceRefresh: true);

        return response()->json([
            'success' => true,
            'message' => 'Central Auth package cache cleared and refreshed successfully.',
            'packages_count' => count($packages),
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * S2S Webhook: Invalidate & update customer local account on subscription/entitlement changes.
     */
    public function syncCustomerWebhook(Request $request): JsonResponse
    {
        $expectedSecret = (string) config('services.htut_central_auth.project_secret');
        $expectedApiKey = (string) config('services.htut_central_auth.api_key');

        $providedSecret = $request->header('X-Project-Secret') ?? $request->input('project_secret');
        $providedApiKey = $request->header('X-Api-Key') ?? $request->input('api_key');
        $signatureHeader = $request->header('X-HTUT-Signature');

        $authorized = false;
        if (! empty($expectedSecret) && ! empty($providedSecret) && hash_equals($expectedSecret, (string) $providedSecret)) {
            $authorized = true;
        }
        if (! empty($expectedApiKey) && ! empty($providedApiKey) && hash_equals($expectedApiKey, (string) $providedApiKey)) {
            $authorized = true;
        }
        if (! empty($expectedSecret) && ! empty($signatureHeader)) {
            $rawContent = $request->getContent();
            $expectedSignature = 'sha256=' . hash_hmac('sha256', $rawContent, $expectedSecret);
            if (hash_equals($expectedSignature, (string) $signatureHeader)) {
                $authorized = true;
            }
        }

        if (! $authorized) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized S2S webhook credentials.',
            ], 401);
        }

        $uuid = $request->input('central_auth_uuid') ?? $request->input('data.central_auth_uuid');
        if (empty($uuid)) {
            return response()->json([
                'success' => false,
                'message' => 'Missing central_auth_uuid in payload.',
            ], 422);
        }

        $entitlements = (array) ($request->input('data') ?? []);
        $customerInfo = (array) ($entitlements['customer'] ?? $request->input('customer') ?? []);

        $customer = Customer::where('central_auth_uuid', $uuid)->first();

        $email = $customerInfo['email'] ?? null;
        $phone = $customerInfo['phone'] ?? null;

        if (! $customer && $email) {
            $customer = Customer::where('email', $email)->first();
            if ($customer) {
                $customer->update(['central_auth_uuid' => $uuid]);
            }
        }

        if (! $customer && $phone) {
            $customer = Customer::where('phone', $phone)->first();
            if ($customer) {
                $customer->update(['central_auth_uuid' => $uuid]);
            }
        }

        if (! $customer) {
            Log::warning("HTUT AI Customer sync webhook: Customer not found for Central UUID {$uuid}");
            return response()->json([
                'success' => false,
                'message' => "Customer not found for Central Auth UUID {$uuid}.",
            ], 404);
        }

        // Apply entitlements (tier, active subscription, coins)
        $tier = strtolower((string) ($entitlements['tier'] ?? ''));
        $features = (array) ($entitlements['features'] ?? []);
        $isActive = (bool) ($entitlements['is_active'] ?? true);
        $subscription = (array) ($entitlements['subscription'] ?? []);
        $subExpiresAt = ! empty($subscription['expires_at']) ? Carbon::parse($subscription['expires_at']) : null;
        $isSubExpired = (bool) ($subscription['is_expired'] ?? ($subExpiresAt ? $subExpiresAt->isPast() : false));

        $isPremium = in_array($tier, ['pro', 'premium', 'business', 'vip'], true)
            || in_array('priority_ai_queue', $features, true)
            || in_array('ai_credits_500', $features, true);

        $updates = [];
        if ($isPremium && $isActive) {
            $updates['customer_type'] = Customer::TYPE_PREMIUM;
            if ($subExpiresAt) {
                $updates['expired_at'] = $subExpiresAt;
            }
            // If customer has 500 AI credits entitlement and currently has lower, award bonus credits
            if (in_array('ai_credits_500', $features, true) && $customer->coins < 500) {
                $updates['coins'] = 500;
            }
        } else {
            $updates['customer_type'] = Customer::TYPE_FREE;
            if ($subExpiresAt) {
                $updates['expired_at'] = $subExpiresAt;
            }
            // If trial / subscription is expired, reset coins to 0
            if ($isSubExpired || ($subExpiresAt && $subExpiresAt->isPast()) || ($customer->expired_at && $customer->expired_at->isPast())) {
                $updates['coins'] = 0;
            }
        }

        if (! empty($customerInfo['name'])) {
            $updates['name'] = $customerInfo['name'];
        }
        if (! empty($customerInfo['avatar']) || ! empty($customerInfo['avatar_url'])) {
            $updates['avatar'] = $customerInfo['avatar_url'] ?? $customerInfo['avatar'];
        }

        if (! empty($updates)) {
            $customer->update($updates);
            $customer->refresh();
        }

        return response()->json([
            'success' => true,
            'message' => 'Customer synchronized successfully.',
            'customer_id' => $customer->id,
            'customer_type' => $customer->customer_type,
            'coins' => $customer->coins,
        ]);
    }

    /**
     * Find or create local Customer record based on Central Auth payload.
     */
    protected function findOrCreateCustomer(
        array $customerData,
        array $entitlements,
        ?Carbon $ssoExpiredAt = null,
        bool $isSsoExpired = false
    ): Customer {
        $uuid = $customerData['uuid'] ?? null;
        $email = $customerData['email'] ?? null;
        $phone = $customerData['phone'] ?? null;
        $name = $customerData['name'] ?? ($email ? explode('@', $email)[0] : 'HTUT AI User');
        $avatar = $customerData['avatar_url'] ?? $customerData['avatar'] ?? null;

        $customer = null;

        // 1. Match by central_auth_uuid
        if ($uuid) {
            $customer = Customer::where('central_auth_uuid', $uuid)->first();
        }

        // 2. Match by email
        if (! $customer && $email) {
            $customer = Customer::where('email', $email)->first();
            if ($customer && $uuid) {
                $customer->update(['central_auth_uuid' => $uuid]);
            }
        }

        // 3. Match by phone
        if (! $customer && $phone) {
            $customer = Customer::where('phone', $phone)->first();
            if ($customer && $uuid) {
                $customer->update(['central_auth_uuid' => $uuid]);
            }
        }

        // 4. Create new customer if not found
        if (! $customer) {
            $effectiveEmail = $email ?? ($uuid ? "{$uuid}@central.htut.com" : 'user_' . Str::random(8) . '@central.htut.com');
            $trialExpiry = $ssoExpiredAt ?? now()->addDays(7);

            $customer = Customer::create([
                'central_auth_uuid' => $uuid,
                'name' => $name,
                'email' => $effectiveEmail,
                'phone' => $phone,
                'avatar' => $avatar,
                'auth_provider' => 'htut_central_auth',
                'auth_provider_id' => $uuid,
                'customer_type' => Customer::TYPE_FREE,
                'expired_at' => $trialExpiry,
                'coins' => 100, // free starter coins for 1 week
                'email_verified_at' => now(),
            ]);
        } else {
            // Update existing customer profile
            $updates = [];
            if ($avatar && $customer->avatar !== $avatar) {
                $updates['avatar'] = $avatar;
            }
            if ($phone && ! $customer->phone) {
                $updates['phone'] = $phone;
            }
            if ($ssoExpiredAt && $customer->expired_at?->toIso8601String() !== $ssoExpiredAt->toIso8601String()) {
                $updates['expired_at'] = $ssoExpiredAt;
            }
            if (! empty($updates)) {
                $customer->update($updates);
            }
        }

        // Apply entitlements (tier & features)
        $tier = strtolower((string) ($entitlements['tier'] ?? ''));
        $features = (array) ($entitlements['features'] ?? []);
        $isActive = (bool) ($entitlements['is_active'] ?? true);

        if ($isActive && (in_array($tier, ['pro', 'premium', 'business', 'vip'], true) || in_array('ai_credits_500', $features, true))) {
            if ($customer->customer_type !== Customer::TYPE_PREMIUM) {
                $customer->update(['customer_type' => Customer::TYPE_PREMIUM]);
            }
        } else {
            // Free plan: evaluate SSO project access trial expiration
            $customer->syncCoinExpiry($isSsoExpired, $ssoExpiredAt);
        }

        return $customer;
    }
}
