<?php

use App\Models\Customer;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config([
        'services.frontend.url' => 'http://frontend.test',
        'services.apple.client_id' => 'com.htut.web',
        'services.apple.client_ids' => ['com.htut.web', 'com.htut.ios'],
        'services.apple.redirect' => 'http://backend.test/api/v1/auth/apple/callback',
    ]);
});

function fakeAppleKeysAndToken(array $claims = []): string
{
    $key = openssl_pkey_new([
        'private_key_bits' => 2048,
        'private_key_type' => OPENSSL_KEYTYPE_RSA,
    ]);

    openssl_pkey_export($key, $privateKey);

    $details = openssl_pkey_get_details($key);

    $kid = 'apple-test-key';
    $token = JWT::encode(array_merge([
        'iss' => 'https://appleid.apple.com',
        'aud' => 'com.htut.web',
        'sub' => 'apple-user-123',
        'email' => 'apple@example.com',
        'email_verified' => true,
        'iat' => time(),
        'exp' => time() + 3600,
    ], $claims), $privateKey, 'RS256', $kid);

    Http::fake([
        'https://appleid.apple.com/auth/keys' => Http::response([
            'keys' => [[
                'kty' => 'RSA',
                'kid' => $kid,
                'alg' => 'RS256',
                'use' => 'sig',
                'n' => base64UrlEncode($details['rsa']['n']),
                'e' => base64UrlEncode($details['rsa']['e']),
            ]],
        ]),
    ]);

    return $token;
}

function base64UrlEncode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

test('customer can start the apple web redirect flow', function () {
    $response = $this->get('/api/v1/auth/apple/redirect');

    $response->assertRedirect();

    $location = $response->headers->get('Location');

    expect($location)->toStartWith('https://appleid.apple.com/auth/authorize?')
        ->and($location)->toContain('client_id=com.htut.web')
        ->and($location)->toContain('redirect_uri=http%3A%2F%2Fbackend.test%2Fapi%2Fv1%2Fauth%2Fapple%2Fcallback')
        ->and($location)->toContain('response_type=code%20id_token')
        ->and($location)->toContain('response_mode=form_post');
});

test('apple web callback creates customer and redirects to frontend with token', function () {
    $identityToken = fakeAppleKeysAndToken([
        'sub' => 'apple-web-123',
        'email' => 'apple-web@example.com',
    ]);

    $response = $this->post('/api/v1/auth/apple/callback', [
        'id_token' => $identityToken,
        'user' => json_encode([
            'name' => [
                'firstName' => 'Apple',
                'lastName' => 'Customer',
            ],
            'email' => 'apple-web@example.com',
        ]),
    ]);

    $response->assertRedirect();

    $location = $response->headers->get('Location');

    expect($location)->toStartWith('http://frontend.test/auth/callback?token=');

    $customer = Customer::where('email', 'apple-web@example.com')->first();

    expect($customer)->not->toBeNull()
        ->and($customer->name)->toBe('Apple Customer')
        ->and($customer->password)->toBeNull()
        ->and($customer->auth_provider)->toBe('apple')
        ->and($customer->auth_provider_id)->toBe('apple-web-123')
        ->and($customer->coins)->toBe(100)
        ->and($customer->hasVerifiedEmail())->toBeTrue()
        ->and($customer->tokens()->count())->toBe(1);
});

test('apple web callback links an existing email password customer', function () {
    $customer = Customer::factory()->unverified()->create([
        'email' => 'existing-apple@example.com',
        'password' => 'password123',
        'auth_provider' => null,
        'auth_provider_id' => null,
    ]);

    $identityToken = fakeAppleKeysAndToken([
        'sub' => 'apple-existing-123',
        'email' => 'existing-apple@example.com',
    ]);

    $this->post('/api/v1/auth/apple/callback', [
        'id_token' => $identityToken,
    ])->assertRedirect();

    $customer->refresh();

    expect(Customer::where('email', 'existing-apple@example.com')->count())->toBe(1)
        ->and($customer->auth_provider)->toBe('apple')
        ->and($customer->auth_provider_id)->toBe('apple-existing-123')
        ->and($customer->password)->not->toBeNull()
        ->and($customer->hasVerifiedEmail())->toBeTrue()
        ->and($customer->tokens()->count())->toBe(1);
});

test('mobile apple login verifies identity token and returns customer token', function () {
    $identityToken = fakeAppleKeysAndToken([
        'aud' => 'com.htut.ios',
        'sub' => 'apple-mobile-123',
        'email' => 'apple-mobile@example.com',
    ]);

    $response = $this->postJson('/api/v1/auth/apple/mobile', [
        'identity_token' => $identityToken,
        'name' => 'Mobile Apple',
    ]);

    $response->assertOk()
        ->assertJsonStructure(['customer', 'token'])
        ->assertJsonPath('customer.email', 'apple-mobile@example.com');

    $customer = Customer::where('email', 'apple-mobile@example.com')->first();

    expect($customer)->not->toBeNull()
        ->and($customer->name)->toBe('Mobile Apple')
        ->and($customer->auth_provider)->toBe('apple')
        ->and($customer->auth_provider_id)->toBe('apple-mobile-123')
        ->and($customer->tokens()->count())->toBe(1);
});

test('mobile apple login rejects invalid token audience', function () {
    $identityToken = fakeAppleKeysAndToken([
        'aud' => 'com.other.app',
        'sub' => 'apple-mobile-123',
        'email' => 'apple-mobile@example.com',
    ]);

    $this->postJson('/api/v1/auth/apple/mobile', [
        'identity_token' => $identityToken,
    ])->assertUnauthorized();
});
