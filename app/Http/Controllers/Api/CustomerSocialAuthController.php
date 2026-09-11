<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AppleMobileLoginRequest;
use App\Http\Requests\Api\GoogleMobileLoginRequest;
use App\Models\Customer;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Throwable;

class CustomerSocialAuthController extends Controller
{
    /**
     * Redirect a web customer to Google OAuth.
     */
    public function redirectToGoogle(): RedirectResponse
    {
        /** @var \Laravel\Socialite\Two\AbstractProvider $driver */
        $driver = Socialite::driver('google');
        return $driver->stateless()->redirect();
    }

    /**
     * Handle Google's web OAuth callback and send the customer back to frontend.
     */
    public function handleGoogleCallback(): RedirectResponse
    {
        try {
            /** @var \Laravel\Socialite\Two\AbstractProvider $driver */
            $driver = Socialite::driver('google');
            $googleUser = $driver->stateless()->user();

            $customer = $this->findOrCreateSocialCustomer('google', [
                'provider_id' => (string) $googleUser->getId(),
                'name' => $googleUser->getName() ?: $googleUser->getNickname() ?: 'Google User',
                'email' => $googleUser->getEmail(),
                'avatar' => $googleUser->getAvatar(),
            ]);

            $token = $customer->createToken('google-web')->plainTextToken;

            return redirect()->away($this->frontendCallbackUrl([
                'token' => $token,
            ]));
        } catch (Throwable) {
            return redirect()->away($this->frontendCallbackUrl([
                'error' => 'google_login_failed',
            ]));
        }
    }

    /**
     * Verify a native mobile Google ID token and issue a Sanctum token.
     */
    public function mobileGoogleLogin(GoogleMobileLoginRequest $request): JsonResponse
    {
        $payload = $this->verifyGoogleIdToken($request->string('id_token')->toString());

        $customer = $this->findOrCreateSocialCustomer('google', [
            'provider_id' => (string) $payload['sub'],
            'name' => $payload['name'] ?? $payload['email'],
            'email' => $payload['email'],
            'avatar' => $payload['picture'] ?? null,
        ]);

        $token = $customer->createToken('google-mobile')->plainTextToken;

        return response()->json([
            'customer' => $customer,
            'token' => $token,
        ]);
    }

    /**
     * Redirect a web customer to Apple OAuth.
     */
    public function redirectToApple(): RedirectResponse
    {
        $query = http_build_query([
            'client_id' => config('services.apple.client_id'),
            'redirect_uri' => config('services.apple.redirect'),
            'response_type' => 'code id_token',
            'response_mode' => 'form_post',
            'scope' => 'name email',
        ], '', '&', PHP_QUERY_RFC3986);

        return redirect()->away('https://appleid.apple.com/auth/authorize?'.$query);
    }

    /**
     * Handle Apple's web OAuth callback and send the customer back to frontend.
     */
    public function handleAppleCallback(Request $request): RedirectResponse
    {
        try {
            abort_if($request->filled('error'), 401, (string) $request->input('error'));

            $payload = $this->verifyAppleIdentityToken($request->string('id_token')->toString());
            $appleUser = $this->appleUserFromRequest($request);

            $customer = $this->findOrCreateSocialCustomer('apple', [
                'provider_id' => (string) $payload['sub'],
                'name' => $appleUser['name'] ?? $payload['email'] ?? 'Apple User',
                'email' => $payload['email'] ?? $appleUser['email'] ?? null,
                'avatar' => null,
            ]);

            $token = $customer->createToken('apple-web')->plainTextToken;

            return redirect()->away($this->frontendCallbackUrl([
                'token' => $token,
            ]));
        } catch (Throwable) {
            return redirect()->away($this->frontendCallbackUrl([
                'error' => 'apple_login_failed',
            ]));
        }
    }

    /**
     * Verify a native mobile Apple identity token and issue a Sanctum token.
     */
    public function mobileAppleLogin(AppleMobileLoginRequest $request): JsonResponse
    {
        $payload = $this->verifyAppleIdentityToken($request->string('identity_token')->toString());
        $requestName = $request->string('name')->toString();
        $requestEmail = $request->string('email')->toString();

        $customer = $this->findOrCreateSocialCustomer('apple', [
            'provider_id' => (string) $payload['sub'],
            'name' => $requestName ?: ($payload['email'] ?? 'Apple User'),
            'email' => $payload['email'] ?? ($requestEmail ?: null),
            'avatar' => null,
        ]);

        $token = $customer->createToken('apple-mobile')->plainTextToken;

        return response()->json([
            'customer' => $customer,
            'token' => $token,
        ]);
    }

    /**
     * @param  array{provider_id: string, name: string, email: string|null, avatar: string|null}  $providerUser
     */
    private function findOrCreateSocialCustomer(string $provider, array $providerUser): Customer
    {
        abort_if(blank($providerUser['provider_id']), 422, ucfirst($provider).' account did not provide a user id.');

        $customer = Customer::where('auth_provider', $provider)
            ->where('auth_provider_id', $providerUser['provider_id'])
            ->first();

        if (! $customer && filled($providerUser['email'])) {
            $customer = Customer::where('email', $providerUser['email'])->first();
        }

        abort_if(! $customer && blank($providerUser['email']), 422, ucfirst($provider).' account did not provide an email address.');

        if (! $customer) {
            $customer = Customer::create([
                'name' => $providerUser['name'],
                'email' => $providerUser['email'],
                'password' => null,
                'avatar' => $providerUser['avatar'],
                'auth_provider' => $provider,
                'auth_provider_id' => $providerUser['provider_id'],
                'email_verified_at' => now(),
                'last_active_at' => now(),
            ]);

            return $customer->refresh();
        }

        $customer->forceFill([
            'name' => $customer->name ?: $providerUser['name'],
            'avatar' => $providerUser['avatar'] ?: $customer->avatar,
            'auth_provider' => $provider,
            'auth_provider_id' => $providerUser['provider_id'],
            'email_verified_at' => $customer->email_verified_at ?: now(),
            'last_active_at' => now(),
        ])->save();

        return $customer->refresh();
    }

    /**
     * @return array{sub: string, aud: string, email: string, email_verified?: bool|string, name?: string, picture?: string}
     */
    private function verifyGoogleIdToken(string $idToken): array
    {
        $response = Http::acceptJson()->get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $idToken,
        ]);

        abort_if($response->failed(), 401, 'Invalid Google ID token.');

        $payload = $response->json();
        $clientId = config('services.google.client_id');

        abort_if(($payload['aud'] ?? null) !== $clientId, 401, 'Google ID token audience is invalid.');
        abort_if(blank($payload['sub'] ?? null), 401, 'Google ID token subject is missing.');
        abort_if(blank($payload['email'] ?? null), 422, 'Google account did not provide an email address.');

        $emailVerified = $payload['email_verified'] ?? false;
        abort_if(! in_array($emailVerified, [true, 'true', '1', 1], true), 403, 'Google email is not verified.');

        return $payload;
    }

    /**
     * @return array{sub: string, iss: string, aud: string, email?: string}
     */
    private function verifyAppleIdentityToken(string $identityToken): array
    {
        try {
            $keysResponse = Http::acceptJson()->get('https://appleid.apple.com/auth/keys');

            abort_if($keysResponse->failed(), 401, 'Could not verify Apple identity token.');

            $keys = JWK::parseKeySet($keysResponse->json(), 'RS256');
            $payload = (array) JWT::decode($identityToken, $keys);
        } catch (Throwable) {
            abort(401, 'Invalid Apple identity token.');
        }

        $allowedAudiences = config('services.apple.client_ids', []);

        abort_if(($payload['iss'] ?? null) !== 'https://appleid.apple.com', 401, 'Apple identity token issuer is invalid.');
        abort_if(! in_array($payload['aud'] ?? null, $allowedAudiences, true), 401, 'Apple identity token audience is invalid.');
        abort_if(blank($payload['sub'] ?? null), 401, 'Apple identity token subject is missing.');

        /** @var array{sub: string, iss: string, aud: string, email?: string} $payload */
        return $payload;
    }

    /**
     * @return array{name?: string, email?: string}
     */
    private function appleUserFromRequest(Request $request): array
    {
        if (! $request->filled('user')) {
            return [];
        }

        $user = json_decode($request->string('user')->toString(), true);

        if (! is_array($user)) {
            return [];
        }

        $firstName = $user['name']['firstName'] ?? '';
        $lastName = $user['name']['lastName'] ?? '';
        $name = trim($firstName.' '.$lastName);

        return array_filter([
            'name' => $name ?: null,
            'email' => $user['email'] ?? null,
        ]);
    }

    /**
     * @param  array<string, string>  $query
     */
    private function frontendCallbackUrl(array $query): string
    {
        $frontendUrl = rtrim((string) config('services.frontend.url'), '/');

        return $frontendUrl.'/auth/callback?'.http_build_query($query);
    }
}
