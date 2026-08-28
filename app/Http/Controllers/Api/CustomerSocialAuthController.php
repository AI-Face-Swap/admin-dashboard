<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\GoogleMobileLoginRequest;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;

class CustomerSocialAuthController extends Controller
{
    /**
     * Redirect a web customer to Google OAuth.
     */
    public function redirectToGoogle(): RedirectResponse
    {
        return Socialite::driver('google')
            ->stateless()
            ->redirect();
    }

    /**
     * Handle Google's web OAuth callback and send the customer back to frontend.
     */
    public function handleGoogleCallback(): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')
                ->stateless()
                ->user();

            $customer = $this->findOrCreateGoogleCustomer([
                'provider_id' => (string) $googleUser->getId(),
                'name' => $googleUser->getName() ?: $googleUser->getNickname() ?: 'Google User',
                'email' => $googleUser->getEmail(),
                'avatar' => $googleUser->getAvatar(),
            ]);

            $token = $customer->createToken('google-web')->plainTextToken;

            return redirect()->away($this->frontendCallbackUrl([
                'token' => $token,
            ]));
        } catch (\Throwable) {
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

        $customer = $this->findOrCreateGoogleCustomer([
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
     * @param  array{provider_id: string, name: string, email: string|null, avatar: string|null}  $googleUser
     */
    private function findOrCreateGoogleCustomer(array $googleUser): Customer
    {
        abort_if(blank($googleUser['email']), 422, 'Google account did not provide an email address.');

        $customer = Customer::where('auth_provider', 'google')
            ->where('auth_provider_id', $googleUser['provider_id'])
            ->first();

        $customer ??= Customer::where('email', $googleUser['email'])->first();

        if (! $customer) {
            $customer = Customer::create([
                'name' => $googleUser['name'],
                'email' => $googleUser['email'],
                'password' => null,
                'avatar' => $googleUser['avatar'],
                'auth_provider' => 'google',
                'auth_provider_id' => $googleUser['provider_id'],
                'email_verified_at' => now(),
                'last_active_at' => now(),
            ]);

            return $customer->refresh();
        }

        $customer->forceFill([
            'name' => $customer->name ?: $googleUser['name'],
            'avatar' => $googleUser['avatar'] ?: $customer->avatar,
            'auth_provider' => 'google',
            'auth_provider_id' => $googleUser['provider_id'],
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
     * @param  array<string, string>  $query
     */
    private function frontendCallbackUrl(array $query): string
    {
        $frontendUrl = rtrim((string) config('services.frontend.url'), '/');

        return $frontendUrl.'/auth/callback?'.http_build_query($query);
    }
}
