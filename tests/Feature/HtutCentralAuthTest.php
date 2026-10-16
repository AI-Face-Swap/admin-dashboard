<?php

use App\Models\Customer;
use Illuminate\Http\UploadedFile;
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
    ]);

    $customer->refresh();
    expect($customer->customer_type)->toBe(Customer::TYPE_PREMIUM);
});

it('gives 1-week expiry on first SSO login', function () {
    $now = Carbon::parse('2026-10-01 12:00:00');
    Carbon::setTestNow($now);

    $state = 'test_state_coin_trial';
    Cache::put("htut_state_{$state}", true, 86400 * 30);
    Cache::put('customer_points_new_trial_user_uuid', 100, 86400 * 30);

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
    expect($customer->points)->toBe(100);
    expect($customer->expired_at->format('Y-m-d H:i:s'))->toBe($now->copy()->addDays(7)->format('Y-m-d H:i:s'));

    // Within the 1-week window: customer still has 100 points
    $now = $now->copy()->addDays(6);
    Carbon::setTestNow($now);
    expect($customer->hasEnoughPoints(10))->toBeTrue();
    expect($customer->fresh()->points)->toBe(100);

    // After 1 week: SSO access expires
    $now = $now->copy()->addDays(2); // 8 days total
    Carbon::setTestNow($now);
    expect($customer->fresh()->expired_at->isPast())->toBeTrue();
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

it('uploads and updates customer avatar to spaces disk', function () {
    Storage::fake('spaces');

    $customer = Customer::create([
        'name' => 'Avatar Test User',
        'email' => 'avatar_test@example.com',
        'customer_type' => Customer::TYPE_FREE,
        'coins' => 100,
    ]);

    $file = UploadedFile::fake()->image('my_avatar.png', 200, 200);

    $response = $this->actingAs($customer, 'sanctum')
        ->postJson('/api/v1/customer/avatar', [
            'avatar' => $file,
        ]);

    $response->assertSuccessful();
    $avatarUrl = $response->json('avatar');
    expect($avatarUrl)->toContain('avatars/');
    expect($customer->fresh()->avatar)->toBe($avatarUrl);
});

it('fetches payment packages list for htut_ai', function () {
    Http::fake([
        '*/api/v1/s2s/projects/htut_ai/packages' => Http::response([
            'status' => 'success',
            'total' => 1,
            'packages' => [
                [
                    'id' => 6,
                    'name' => 'HTUT AI Pro Monthly',
                    'slug' => 'htut-ai-pro-monthly',
                    'price' => 15000,
                    'currency' => 'MMK',
                    'duration' => 1,
                    'duration_unit' => 'months',
                    'features' => [
                        ['key' => 'ai_credits_500', 'name' => '500 AI Monthly Credits'],
                    ],
                ],
            ],
        ], 200),
    ]);

    $response = $this->getJson('/api/v1/packages?refresh=1');
    $response->assertSuccessful();
    expect($response->json('status'))->toBe('success');
    expect($response->json('packages'))->toBeArray()->not->toBeEmpty();
    expect($response->json('packages.0.slug'))->toBe('htut-ai-pro-monthly');
});

it('initiates package checkout session for authenticated customer with KBZPay', function () {
    Http::fake([
        '*/api/merchant/kbzpay/precreate-payment' => Http::response([
            'merchant_order_id' => '2026100199999',
            'payment_url' => 'https://wap.kbzpay.com/pgw/pwa/?test=1',
        ], 200),
    ]);

    $customer = Customer::create([
        'central_auth_uuid' => 'checkout_test_user_uuid',
        'name' => 'Checkout Tester',
        'email' => 'checkout_test@example.com',
        'customer_type' => Customer::TYPE_FREE,
        'coins' => 100,
    ]);

    $response = $this->actingAs($customer, 'sanctum')
        ->postJson('/api/v1/packages/checkout', [
            'package_slug' => 'htut-ai-pro-monthly',
            'payment_method' => 'kbzpay',
        ]);

    $response->assertSuccessful();
    expect($response->json('status'))->toBe('success');
    expect($response->json('checkout_url'))->toContain('walmae.net/kbzpay/checkout?url=');
    expect($response->json('order_reference'))->toBe('2026100199999');
});

it('initiates package checkout session for authenticated customer with MMQR', function () {
    Http::fake([
        '*/api/merchant/mmqr/precreate-payment' => Http::response([
            'merchant_order_id' => '2026100188888',
            'qr_code' => '00020101021226480015com.mmqrpay...',
            'mmqr_logo' => 'https://cp.walmae.net/mmqrLogo.jpg',
        ], 200),
    ]);

    $customer = Customer::create([
        'central_auth_uuid' => 'checkout_test_user_mmqr_uuid',
        'name' => 'Checkout MMQR Tester',
        'email' => 'checkout_mmqr@example.com',
        'customer_type' => Customer::TYPE_FREE,
        'coins' => 100,
    ]);

    $response = $this->actingAs($customer, 'sanctum')
        ->postJson('/api/v1/packages/checkout', [
            'package_slug' => 'htut-ai-pro-monthly',
            'payment_method' => 'mmqr',
        ]);

    $response->assertSuccessful();
    expect($response->json('status'))->toBe('success');
    expect($response->json('order_reference'))->toBe('2026100188888');
    expect($response->json('qr_code'))->toBe('00020101021226480015com.mmqrpay...');
    expect($response->json('receiver_name'))->toBe('WalMae Traders');
});

it('rejects package cache-clear webhook with invalid credentials', function () {
    $response = $this->postJson('/v1/htut/packages/cache-clear', [], [
        'X-Project-Secret' => 'wrong_secret',
    ]);

    $response->assertStatus(401);
    expect($response->json('message'))->toBe('Unauthorized S2S credentials.');
});

it('clears and refreshes package cache via S2S webhook with valid secret', function () {
    config([
        'services.htut_central_auth.project_secret' => 'test_s2s_secret_key',
        'services.htut_central_auth.project_id' => 'htut_ai',
        'services.htut_central_auth.url' => 'http://central-auth.test',
    ]);

    Http::fake([
        'http://central-auth.test/api/v1/s2s/projects/htut_ai/packages' => Http::response([
            'status' => 'success',
            'packages' => [
                [
                    'id' => 10,
                    'name' => 'HTUT AI Enterprise',
                    'slug' => 'htut-ai-enterprise',
                    'price' => 50000,
                    'currency' => 'MMK',
                    'duration' => 1,
                    'duration_unit' => 'months',
                    'features' => [],
                ],
            ],
        ], 200),
    ]);

    $response = $this->postJson('/v1/htut/packages/cache-clear', [
        'event' => 'packages.updated',
    ], [
        'X-Project-Secret' => 'test_s2s_secret_key',
    ]);

    $response->assertSuccessful();
    expect($response->json('success'))->toBe(true);
    expect($response->json('packages_count'))->toBe(1);
});

it('logs in mobile customer via POST /v1/auth/google/login with id_token and syncs to Central Auth', function () {
    Http::fake([
        '*/api/v1/s2s/customer-sync' => Http::response([
            'customer' => [
                'uuid' => 'c89139ab-google-4444-8888-123456789abc',
                'name' => 'Mobile Google User',
                'email' => 'google_mobile@example.com',
                'phone' => null,
                'avatar_url' => 'https://lh3.googleusercontent.com/avatar.jpg',
                'status' => 'active',
                'has_password' => false,
                'points' => 150,
            ],
            'project_access' => [
                'project_id' => 'htut_ai',
                'status' => 'active',
                'expired_at' => now()->addMonth()->toIso8601String(),
                'is_expired' => false,
            ],
            'entitlements' => [
                'tier' => 'pro',
                'features' => ['priority_ai_queue', 'ai_credits_500'],
                'is_active' => true,
            ],
            'is_new_customer' => true,
        ], 200),
    ]);

    $response = $this->postJson('/v1/auth/google/login', [
        'id_token' => 'mock_google_id_token_12345',
    ]);

    $response->assertStatus(201);
    $response->assertJson([
        'success' => true,
        'token_type' => 'Bearer',
        'data' => [
            'is_new_account' => true,
            'central_auth_uuid' => 'c89139ab-google-4444-8888-123456789abc',
            'tier' => 'premium',
        ],
        'customer' => [
            'name' => 'Mobile Google User',
            'email' => 'google_mobile@example.com',
            'customer_type' => 'premium',
        ],
    ]);

    expect($response->json('token'))->not->toBeEmpty();
    expect($response->json('data.id'))->toBe($response->json('token'));

    $customer = Customer::where('central_auth_uuid', 'c89139ab-google-4444-8888-123456789abc')->first();
    expect($customer)->not->toBeNull();
    expect($customer->email)->toBe('google_mobile@example.com');
    expect($customer->customer_type)->toBe(Customer::TYPE_PREMIUM);
});

it('rejects mobile social login with unsupported provider', function () {
    $response = $this->postJson('/v1/auth/twitter/login', [
        'id_token' => 'any_token',
    ]);

    $response->assertStatus(422);
    $response->assertJson([
        'success' => false,
        'message' => "Unsupported provider 'twitter'.",
    ]);
});

it('rejects mobile social login when token is missing', function () {
    $response = $this->postJson('/v1/auth/google/login', []);

    $response->assertStatus(422);
    $response->assertJson([
        'success' => false,
        'message' => 'Missing token. Send the token as { id_token } or { access_token } in the request body.',
    ]);
});

it('authenticates mobile app via POST /v1/auth/htut/callback with code exchange', function () {
    Http::fake([
        '*/api/v1/s2s/token-exchange' => Http::response([
            'customer' => [
                'uuid' => 'c89139ab-mobile-4444-8888-123456789abc',
                'name' => 'Mobile App User',
                'email' => 'mobile_user@htut.com',
                'phone' => '09987654321',
                'avatar_url' => 'https://example.com/mobile-avatar.jpg',
            ],
            'entitlements' => [
                'tier' => 'vip',
                'features' => ['priority_ai_queue', 'ai_credits_500'],
                'is_active' => true,
            ],
            'project_access' => [
                'expired_at' => now()->addMonth()->toIso8601String(),
                'is_expired' => false,
            ],
        ], 200),
    ]);

    $response = $this->postJson('/v1/auth/htut/callback', [
        'code' => 'mobile_auth_code_123',
        'redirect_uri' => 'htutai://auth/callback',
        'code_verifier' => 'test_verifier_string_456',
    ]);

    $response->assertSuccessful();
    $response->assertJson([
        'success' => true,
        'token_type' => 'Bearer',
        'customer' => [
            'name' => 'Mobile App User',
            'email' => 'mobile_user@htut.com',
            'customer_type' => 'premium',
        ],
    ]);

    expect($response->json('token'))->not->toBeEmpty();

    $customer = Customer::where('central_auth_uuid', 'c89139ab-mobile-4444-8888-123456789abc')->first();
    expect($customer)->not->toBeNull();
    expect($customer->name)->toBe('Mobile App User');
    expect($customer->customer_type)->toBe(Customer::TYPE_PREMIUM);
});

it('fails mobile callback when required parameters are missing', function () {
    $response = $this->postJson('/v1/auth/htut/callback', []);
    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['code', 'redirect_uri']);
});
