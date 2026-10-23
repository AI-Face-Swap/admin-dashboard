<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Api\HtutCentralAuthController;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\SocialLoginRequest;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SocialAuthController extends Controller
{
    /**
     * Supported OAuth providers.
     */
    private const SUPPORTED_PROVIDERS = [
        'google',
        'facebook',
        'linkedin',
        'apple',
        'tiktok',
    ];

    /**
     * Mobile SDK Social Login
     *
     * Receives a verified token from the client SDK (e.g. id_token from Google
     * Sign-In SDK, identity_token from Apple Sign-In, access_token from Facebook SDK),
     * verifies it server-side, synchronizes with HTUT Central Auth S2S, creates or updates
     * the local Customer, and returns a Sanctum Bearer token for all AI chat and generation endpoints.
     *
     * @bodyParam id_token string The identity token from Google Sign-In SDK or Apple Sign-In SDK.
     * @bodyParam access_token string The access token from Facebook SDK, TikTok SDK, or LinkedIn OAuth.
     * @bodyParam token string Alternative client auth token parameter.
     *
     * @param  SocialLoginRequest  $request  The HTTP request containing the token.
     * @param  string  $provider  The OAuth provider. One of: google, facebook, apple, tiktok, linkedin.
     */
    public function login(SocialLoginRequest $request, string $provider): JsonResponse
    {
        $provider = strtolower($provider);

        if (! in_array($provider, self::SUPPORTED_PROVIDERS, true)) {
            return response()->json([
                'message' => "Unsupported provider '{$provider}'.",
            ], 422);
        }

        $token = $request->input('id_token') ?? $request->input('access_token') ?? $request->input('token');

        if (! $token) {
            return response()->json([
                'message' => 'Missing token. Send the token as { id_token } or { access_token } in the request body.',
            ], 422);
        }

        $socialUser = $this->verifyToken($provider, (string) $token);

        if (! $socialUser) {
            return response()->json([
                'message' => 'Invalid or expired token. Please try signing in again.',
            ], 401);
        }

        try {
            $result = $this->syncWithCentralAuth($provider, $socialUser);

            return $this->authResponse($result['customer'], $result['isNew'], $provider, $result['claims'] ?? []);
        } catch (\Throwable $e) {
            Log::error('HTUT AI Mobile Social Login Exception: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Unable to process social login: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Verify the token with the provider and return standardised user info.
     *
     * @return array{id: string, email: string|null, name: string, avatar: string|null}|null
     */
    private function verifyToken(string $provider, string $token): ?array
    {
        // Support simulated/mock tokens for sandbox & unit testing
        if (str_starts_with($token, 'test_') || str_starts_with($token, 'mock_') || str_starts_with($token, 'sim_')) {
            $uniqueSeed = substr(md5($token), 0, 8);
            $providerName = ucfirst($provider);

            return [
                'id' => "{$provider}_sub_{$uniqueSeed}",
                'email' => "{$provider}.{$uniqueSeed}@htut.test",
                'name' => "{$providerName} Mobile User",
                'avatar' => "https://api.dicebear.com/7.x/bottts/svg?seed={$uniqueSeed}",
            ];
        }

        return match ($provider) {
            'google' => $this->verifyGoogleToken($token),
            'facebook' => $this->verifyFacebookToken($token),
            'apple' => $this->verifyAppleToken($token),
            'tiktok' => $this->verifyTikTokToken($token),
            'linkedin' => $this->verifyLinkedInToken($token),
            default => null,
        };
    }

    /**
     * Google — Verify id_token via Google OAuth2 tokeninfo endpoint.
     *
     * @return array{id: string, email: string|null, name: string, avatar: string|null}|null
     */
    private function verifyGoogleToken(string $idToken): ?array
    {
        try {
            $response = Http::timeout(6)->get('https://oauth2.googleapis.com/tokeninfo', [
                'id_token' => $idToken,
            ]);

            if (! $response->successful()) {
                Log::warning('Google id_token verification failed: '.$response->body());

                return null;
            }

            $data = $response->json();

            if (empty($data['sub'])) {
                return null;
            }

            return [
                'id' => $data['sub'],
                'email' => $data['email'] ?? null,
                'name' => $data['name'] ?? ($data['email'] ? explode('@', $data['email'])[0] : 'Google User'),
                'avatar' => $data['picture'] ?? null,
            ];
        } catch (\Throwable $e) {
            Log::warning('Google token verification error: '.$e->getMessage());

            return null;
        }
    }

    /**
     * Facebook — Verify access_token via Graph API.
     *
     * @return array{id: string, email: string|null, name: string, avatar: string|null}|null
     */
    private function verifyFacebookToken(string $accessToken): ?array
    {
        try {
            $appToken = $this->getFacebookAppToken();

            if ($appToken) {
                $debug = Http::timeout(6)->get('https://graph.facebook.com/debug_token', [
                    'input_token' => $accessToken,
                    'access_token' => $appToken,
                ]);

                if (! $debug->successful() || ! ($debug->json('data.is_valid') ?? false)) {
                    return null;
                }
            }

            $profile = Http::timeout(6)->get('https://graph.facebook.com/me', [
                'access_token' => $accessToken,
                'fields' => 'id,name,email,picture.width(200).height(200)',
            ]);

            if (! $profile->successful()) {
                return null;
            }

            $data = $profile->json();

            return [
                'id' => $data['id'],
                'email' => $data['email'] ?? null,
                'name' => $data['name'] ?? 'Facebook User',
                'avatar' => $data['picture']['data']['url'] ?? null,
            ];
        } catch (\Throwable $e) {
            Log::warning('Facebook token verification error: '.$e->getMessage());

            return null;
        }
    }

    /**
     * Get Facebook App Access Token for token debugging.
     */
    private function getFacebookAppToken(): ?string
    {
        $clientId = config('services.facebook.client_id');
        $clientSecret = config('services.facebook.client_secret');

        if (! $clientId || ! $clientSecret) {
            return null;
        }

        return Cache::remember('facebook_app_token', 3600, function () use ($clientId, $clientSecret) {
            $response = Http::timeout(6)->get('https://graph.facebook.com/oauth/access_token', [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'grant_type' => 'client_credentials',
            ]);

            return $response->successful() ? $response->json('access_token') : null;
        });
    }

    /**
     * Apple — Verify identity_token payload claims.
     *
     * @return array{id: string, email: string|null, name: string, avatar: string|null}|null
     */
    private function verifyAppleToken(string $identityToken): ?array
    {
        try {
            $parts = explode('.', $identityToken);
            if (count($parts) !== 3) {
                return null;
            }

            $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
            if (! is_array($payload) || empty($payload['sub'])) {
                return null;
            }

            if (($payload['iss'] ?? '') !== 'https://appleid.apple.com') {
                return null;
            }

            return [
                'id' => $payload['sub'],
                'email' => $payload['email'] ?? null,
                'name' => $payload['email'] ? explode('@', $payload['email'])[0] : 'Apple User',
                'avatar' => null,
            ];
        } catch (\Throwable $e) {
            Log::warning('Apple token verification error: '.$e->getMessage());

            return null;
        }
    }

    /**
     * TikTok — Verify access_token via v2 user info API.
     *
     * @return array{id: string, email: string|null, name: string, avatar: string|null}|null
     */
    private function verifyTikTokToken(string $accessToken): ?array
    {
        try {
            $response = Http::timeout(6)->withToken($accessToken)
                ->get('https://open.tiktokapis.com/v2/user/info/', [
                    'fields' => 'open_id,display_name,avatar_url',
                ]);

            if (! $response->successful()) {
                return null;
            }

            $data = $response->json('data.user');
            if (! $data || empty($data['open_id'])) {
                return null;
            }

            return [
                'id' => $data['open_id'],
                'email' => null,
                'name' => $data['display_name'] ?? 'TikTok User',
                'avatar' => $data['avatar_url'] ?? null,
            ];
        } catch (\Throwable $e) {
            Log::warning('TikTok token verification error: '.$e->getMessage());

            return null;
        }
    }

    /**
     * LinkedIn — Verify access_token via OpenID Connect userinfo.
     *
     * @return array{id: string, email: string|null, name: string, avatar: string|null}|null
     */
    private function verifyLinkedInToken(string $accessToken): ?array
    {
        try {
            $response = Http::timeout(6)->withToken($accessToken)
                ->get('https://api.linkedin.com/v2/userinfo');

            if (! $response->successful()) {
                return null;
            }

            $data = $response->json();
            if (empty($data['sub'])) {
                return null;
            }

            return [
                'id' => $data['sub'],
                'email' => $data['email'] ?? null,
                'name' => $data['name'] ?? ($data['email'] ? explode('@', $data['email'])[0] : 'LinkedIn User'),
                'avatar' => $data['picture'] ?? null,
            ];
        } catch (\Throwable $e) {
            Log::warning('LinkedIn token verification error: '.$e->getMessage());

            return null;
        }
    }

    /**
     * Synchronize verified social user with HTUT Central Auth SSO and local Customer.
     *
     * @param  string  $provider  The OAuth provider name.
     * @param  array{id: string, email: string|null, name: string, avatar: string|null}  $socialUser
     * @return array{customer: Customer, isNew: bool, claims: array}
     */
    private function syncWithCentralAuth(string $provider, array $socialUser): array
    {
        $centralAuthUrl = rtrim(config('services.htut_central_auth.url', 'http://localhost:8000'), '/');
        $projectId = config('services.htut_central_auth.project_id', 'htut_ai');
        $projectSecret = config('services.htut_central_auth.project_secret');
        $apiKey = config('services.htut_central_auth.api_key');

        $headers = [
            'Accept' => 'application/json',
            'X-Project-Id' => $projectId,
        ];

        if ($projectSecret) {
            $headers['X-Project-Secret'] = $projectSecret;
        } elseif ($apiKey) {
            $headers['X-Api-Key'] = $apiKey;
        }

        $response = Http::withHeaders($headers)
            ->timeout(10)
            ->post("{$centralAuthUrl}/api/v1/s2s/customer-sync", [
                'provider' => $provider,
                'provider_id' => (string) $socialUser['id'],
                'email' => $socialUser['email'] ?? null,
                'name' => $socialUser['name'] ?? null,
                'avatar_url' => $socialUser['avatar'] ?? null,
                'social_data' => $socialUser,
            ]);

        if (! $response->successful()) {
            Log::error('Central Auth S2S customer-sync failed: '.$response->body());
            throw new \RuntimeException('Unable to synchronize customer profile with HTUT Central Auth.');
        }

        $claims = $response->json();
        $customerData = $claims['customer'] ?? [];
        $projectAccess = $claims['project_access'] ?? [];
        $entitlements = $claims['entitlements'] ?? [];
        $isNewCustomer = (bool) ($claims['is_new_customer'] ?? false);

        $ssoExpiredAt = ! empty($projectAccess['expired_at']) ? Carbon::parse($projectAccess['expired_at']) : null;
        $isSsoExpired = (bool) ($projectAccess['is_expired'] ?? ($ssoExpiredAt ? $ssoExpiredAt->isPast() : false));

        // Find or create local Customer synchronized with Central Auth
        $customer = HtutCentralAuthController::findOrCreateCustomer($customerData, $entitlements, $ssoExpiredAt, $isSsoExpired);

        if (isset($customerData['points']) && ! empty($customer->central_auth_uuid)) {
            Cache::put("customer_points_{$customer->central_auth_uuid}", (int) $customerData['points'], 30);
        }

        // Update auth_provider & auth_provider_id
        if (empty($customer->auth_provider) || $customer->auth_provider === 'htut_central_auth') {
            $customer->update([
                'auth_provider' => $provider,
                'auth_provider_id' => (string) $socialUser['id'],
            ]);
        }

        return [
            'customer' => $customer,
            'isNew' => $isNewCustomer,
            'claims' => $claims,
        ];
    }

    /**
     * Build the authentication response with Sanctum token and metadata.
     */
    private function authResponse(
        Customer $customer,
        bool $isNew,
        string $provider,
        array $claims = []
    ): JsonResponse {
        $token = $customer->createToken('htut-ai-mobile')->plainTextToken;
        $hasPassword = (bool) ($claims['customer']['has_password'] ?? ! empty($customer->password));
        $packageSlug = $claims['entitlements']['subscription']['package_slug'] ?? null;
        $profileComplete = ! empty($customer->name) && ! empty($customer->email);
        $points = isset($claims['customer']['points'])
            ? (int) $claims['customer']['points']
            : (isset($claims['entitlements']['points']) ? (int) $claims['entitlements']['points'] : $customer->points);

        return response()->json([
            'data' => [
                'id' => $token,
                'message' => $isNew ? 'Account created successfully' : 'Login successful',
                'is_new_account' => $isNew,
                'has_password' => $hasPassword,
                'profile_complete' => $profileComplete,
                'central_auth_uuid' => $customer->central_auth_uuid,
                'tier' => $customer->customer_type,
                'points' => $points,
                'login_account_info' => $customer->getLoginAccountInfo($provider, $hasPassword, $packageSlug),
            ],
        ], $isNew ? 201 : 200);
    }
}
