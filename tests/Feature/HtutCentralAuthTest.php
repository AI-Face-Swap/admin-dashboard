<?php

use App\Models\Customer;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

it('generates state and redirects to central auth', function () {
    $response = $this->get('/v1/auth/htut/redirect');

    $response->assertStatus(302);
    $targetUrl = $response->headers->get('Location');

    expect($targetUrl)->toContain('social-login')
        ->toContain('project=htut_ai')
        ->toContain('state=');
});

it('fails callback with invalid state', function () {
    $response = $this->get('/v1/auth/htut/callback?state=invalid_state&code=test_code');

    $response->assertStatus(302);
    $targetUrl = $response->headers->get('Location');
    expect($targetUrl)->toContain('error=State+expired+or+invalid');
});

it('exchanges code via s2s and creates customer with sanctum token', function () {
    $state = 'test_state_12345';
    Cache::put("htut_state_{$state}", true, 300);

    Http::fake([
        '*/api/v1/s2s/token-exchange' => Http::response([
            'customer' => [
                'uuid' => 'c89139ab-1111-4444-8888-123456789abc',
                'name' => 'Ko Htut Test User',
                'email' => 'kohtut_ai_test@htut.com',
                'phone' => '09123456789',
                'avatar_url' => 'https://example.com/avatar.jpg',
            ],
            'entitlements' => [
                'tier' => 'pro',
                'features' => ['priority_ai_queue', 'ai_credits_500'],
                'is_active' => true,
            ],
        ], 200),
    ]);

    $response = $this->get("/v1/auth/htut/callback?state={$state}&code=valid_auth_code");

    $response->assertStatus(302);
    $targetUrl = $response->headers->get('Location');

    expect($targetUrl)->toContain('/auth/callback?token=');

    $customer = Customer::where('central_auth_uuid', 'c89139ab-1111-4444-8888-123456789abc')->first();
    expect($customer)->not->toBeNull();
    expect($customer->name)->toBe('Ko Htut Test User');
    expect($customer->email)->toBe('kohtut_ai_test@htut.com');
    expect($customer->customer_type)->toBe(Customer::TYPE_PREMIUM);
});

it('updates customer subscription and coins via webhook', function () {
    $customer = Customer::create([
        'central_auth_uuid' => 'c89139ab-2222-4444-8888-999999999abc',
        'name' => 'Existing Customer',
        'email' => 'existing_customer@htut.com',
        'customer_type' => Customer::TYPE_FREE,
        'coins' => 100,
    ]);

    $secret = config('services.htut_central_auth.project_secret');

    $payload = [
        'event' => 'customer.entitlements.updated',
        'central_auth_uuid' => $customer->central_auth_uuid,
        'data' => [
            'tier' => 'pro',
            'features' => ['ai_credits_500', 'priority_ai_queue'],
            'is_active' => true,
        ],
    ];

    $response = $this->withHeaders([
        'X-Project-Secret' => $secret,
    ])->postJson('/v1/htut/customer/sync', $payload);

    $response->assertStatus(200);
    $response->assertJson([
        'success' => true,
        'customer_type' => 'premium',
        'coins' => 500,
    ]);

    $customer->refresh();
    expect($customer->customer_type)->toBe(Customer::TYPE_PREMIUM);
    expect($customer->coins)->toBe(500);
});

it('gives 100 coins and 1-week expiry on first SSO login', function () {
    $now = Carbon::parse('2026-10-01 12:00:00');
    Carbon::setTestNow($now);

    $state = 'test_state_coin_trial';
    Cache::put("htut_state_{$state}", true, 300);

    Http::fake([
        '*/api/v1/s2s/token-exchange' => Http::response([
            'customer' => [
                'uuid' => 'new_trial_user_uuid',
                'name' => 'Trial User',
                'email' => 'trial@example.com',
            ],
            'project_access' => [
                'project_id' => 'htut_ai',
                'expired_at' => $now->copy()->addDays(7)->toIso8601String(),
                'is_expired' => false,
            ],
            'entitlements' => [
                'tier' => 'free',
                'features' => [],
                'is_active' => true,
            ],
        ], 200),
    ]);

    $response = $this->get("/v1/auth/htut/callback?state={$state}&code=test_code_trial");
    $response->assertStatus(302);

    $customer = Customer::where('central_auth_uuid', 'new_trial_user_uuid')->first();
    expect($customer)->not->toBeNull();
    expect($customer->coins)->toBe(100);
    expect($customer->expired_at->format('Y-m-d H:i:s'))->toBe($now->copy()->addDays(7)->format('Y-m-d H:i:s'));

    // Within the 1-week window: customer still has 100 coins
    $now = $now->copy()->addDays(6);
    Carbon::setTestNow($now);
    expect($customer->hasEnoughCoins(10))->toBeTrue();
    expect($customer->fresh()->coins)->toBe(100);

    // After 1 week: SSO access expires and coins are automatically reset to 0
    $now = $now->copy()->addDays(2); // 8 days total
    Carbon::setTestNow($now);
    expect($customer->hasEnoughCoins(10))->toBeFalse();
    expect($customer->fresh()->coins)->toBe(0);
});

it('resets coins to 0 via artisan command when 1-week trial expires', function () {
    $customer = Customer::create([
        'central_auth_uuid' => 'expired_cmd_user',
        'name' => 'Expired User',
        'email' => 'expired_cmd@example.com',
        'customer_type' => Customer::TYPE_FREE,
        'coins' => 100,
        'expired_at' => now()->subDay(),
    ]);

    $this->artisan('customers:expire-coins')->assertSuccessful();

    expect($customer->fresh()->coins)->toBe(0);
});

