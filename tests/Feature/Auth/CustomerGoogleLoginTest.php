<?php

use App\Models\Customer;
use Illuminate\Support\Facades\Http;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Symfony\Component\HttpFoundation\RedirectResponse;

beforeEach(function () {
    config([
        'services.frontend.url' => 'http://frontend.test',
        'services.google.client_id' => 'google-client-id',
        'services.google.client_secret' => 'google-secret',
        'services.google.redirect' => 'http://backend.test/api/v1/auth/google/callback',
    ]);
});

test('customer can start the google web redirect flow', function () {
    $driver = Mockery::mock();

    Socialite::shouldReceive('driver')
        ->once()
        ->with('google')
        ->andReturn($driver);

    $driver->shouldReceive('stateless')
        ->once()
        ->andReturnSelf();

    $driver->shouldReceive('redirect')
        ->once()
        ->andReturn(new RedirectResponse('https://accounts.google.com/oauth'));

    $this->get('/api/v1/auth/google/redirect')
        ->assertRedirect('https://accounts.google.com/oauth');
});

test('google web callback creates customer and redirects to frontend with token', function () {
    $driver = Mockery::mock();

    Socialite::shouldReceive('driver')
        ->once()
        ->with('google')
        ->andReturn($driver);

    $driver->shouldReceive('stateless')
        ->once()
        ->andReturnSelf();

    $driver->shouldReceive('user')
        ->once()
        ->andReturn(SocialiteUser::fake([
            'id' => 'google-123',
            'name' => 'Google Customer',
            'email' => 'google@example.com',
            'avatar' => 'https://example.com/avatar.png',
        ]));

    $response = $this->get('/api/v1/auth/google/callback');

    $response->assertRedirect();

    $location = $response->headers->get('Location');

    expect($location)->toStartWith('http://frontend.test/auth/callback?token=');

    $customer = Customer::where('email', 'google@example.com')->first();

    expect($customer)->not->toBeNull()
        ->and($customer->password)->toBeNull()
        ->and($customer->auth_provider)->toBe('google')
        ->and($customer->auth_provider_id)->toBe('google-123')
        ->and($customer->avatar)->toBe('https://example.com/avatar.png')
        ->and($customer->coins)->toBe(100)
        ->and($customer->hasVerifiedEmail())->toBeTrue()
        ->and($customer->last_active_at)->not->toBeNull()
        ->and($customer->tokens()->count())->toBe(1);
});

test('google web callback links an existing email password customer', function () {
    $customer = Customer::factory()->unverified()->create([
        'email' => 'existing@example.com',
        'password' => 'password123',
        'auth_provider' => null,
        'auth_provider_id' => null,
    ]);

    $driver = Mockery::mock();

    Socialite::shouldReceive('driver')
        ->once()
        ->with('google')
        ->andReturn($driver);

    $driver->shouldReceive('stateless')
        ->once()
        ->andReturnSelf();

    $driver->shouldReceive('user')
        ->once()
        ->andReturn(SocialiteUser::fake([
            'id' => 'google-existing',
            'name' => 'Existing Customer',
            'email' => 'existing@example.com',
            'avatar' => null,
        ]));

    $this->get('/api/v1/auth/google/callback')->assertRedirect();

    $customer->refresh();

    expect(Customer::where('email', 'existing@example.com')->count())->toBe(1)
        ->and($customer->auth_provider)->toBe('google')
        ->and($customer->auth_provider_id)->toBe('google-existing')
        ->and($customer->password)->not->toBeNull()
        ->and($customer->hasVerifiedEmail())->toBeTrue()
        ->and($customer->tokens()->count())->toBe(1);
});

test('mobile google login verifies id token and returns customer token', function () {
    Http::fake([
        'https://oauth2.googleapis.com/tokeninfo*' => Http::response([
            'sub' => 'google-mobile-123',
            'aud' => 'google-client-id',
            'email' => 'mobile@example.com',
            'email_verified' => 'true',
            'name' => 'Mobile Customer',
            'picture' => 'https://example.com/mobile.png',
        ]),
    ]);

    $response = $this->postJson('/api/v1/auth/google/mobile', [
        'id_token' => 'google-id-token',
    ]);

    $response->assertOk()
        ->assertJsonStructure(['customer', 'token'])
        ->assertJsonPath('customer.email', 'mobile@example.com');

    $customer = Customer::where('email', 'mobile@example.com')->first();

    expect($customer)->not->toBeNull()
        ->and($customer->auth_provider)->toBe('google')
        ->and($customer->auth_provider_id)->toBe('google-mobile-123')
        ->and($customer->tokens()->count())->toBe(1);
});

test('mobile google login rejects invalid token audience', function () {
    Http::fake([
        'https://oauth2.googleapis.com/tokeninfo*' => Http::response([
            'sub' => 'google-mobile-123',
            'aud' => 'wrong-client-id',
            'email' => 'mobile@example.com',
            'email_verified' => 'true',
        ]),
    ]);

    $this->postJson('/api/v1/auth/google/mobile', [
        'id_token' => 'google-id-token',
    ])->assertUnauthorized();
});
