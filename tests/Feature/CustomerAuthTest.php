<?php

use App\Models\AIGeneration;
use App\Models\AIProvider;
use App\Models\ApiRequestLog;
use App\Models\Customer;
use App\Models\Template;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;

beforeEach(function () {
    Storage::fake('spaces', ['url' => 'https://bucket.example.com']);
    AIProvider::factory()->create();
});

function fakeCustomerFaceSwap(): void
{
    Http::fake([
        'https://api.segmind.com/v2/faceswap-v5' => Http::response([
            'request_id' => 'req-customer-1',
            'status_url' => 'https://api.segmind.com/v2/requests/req-customer-1/status',
            'response_url' => 'https://api.segmind.com/v2/requests/req-customer-1',
        ]),
        'https://api.segmind.com/v2/requests/req-customer-1/status' => Http::response(['status' => 'COMPLETED']),
        'https://api.segmind.com/v2/requests/req-customer-1' => Http::response([
            'status' => 'COMPLETED',
            'metrics' => ['inference_time' => 2.0, 'cost' => 0.05],
            'output' => 'https://images.segmind.com/generations/result.jpeg',
        ]),
    ]);
}

test('a customer can register and receives a token with 100 coins', function () {
    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('customer.email', 'john@example.com')
        ->assertJsonPath('customer.customer_type', 'free')
        ->assertJsonPath('customer.coins', 100)
        ->assertJsonStructure(['customer', 'token']);

    $customer = Customer::where('email', 'john@example.com')->first();

    expect($customer)->not->toBeNull()
        ->and($customer->isFree())->toBeTrue()
        ->and($customer->coins)->toBe(100)
        ->and($customer->tokens)->toHaveCount(1);
});

test('registering with a duplicate email is rejected', function () {
    Customer::factory()->create(['email' => 'john@example.com']);

    $this->postJson('/api/v1/auth/register', [
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ])->assertStatus(422);
});

test('a customer can log in and use the token on me', function () {
    Customer::factory()->create([
        'email' => 'john@example.com',
        'password' => 'password123',
    ]);

    $login = $this->postJson('/api/v1/auth/login', [
        'email' => 'john@example.com',
        'password' => 'password123',
    ]);

    $login->assertOk()
        ->assertJsonStructure(['customer', 'token']);

    $token = $login->json('token');

    $this->withToken($token)
        ->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('customer.email', 'john@example.com');
});

test('login with wrong credentials is rejected', function () {
    Customer::factory()->create([
        'email' => 'john@example.com',
        'password' => 'password123',
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'john@example.com',
        'password' => 'wrong-password',
    ])->assertStatus(422);
});

test('logout revokes the current token', function () {
    $customer = Customer::factory()->create();
    $token = $customer->createToken('test')->plainTextToken;

    $this->withToken($token)
        ->postJson('/api/v1/auth/logout')
        ->assertOk();

    expect(PersonalAccessToken::count())->toBe(0)
        ->and(PersonalAccessToken::findToken($token))->toBeNull();
});

test('a revoked token is rejected with 401', function () {
    $customer = Customer::factory()->create();
    $token = $customer->createToken('test')->plainTextToken;
    $customer->tokens()->delete();

    $this->withToken($token)
        ->getJson('/api/v1/auth/me')
        ->assertStatus(401);
});

test('an invalid token is rejected with 401', function () {
    $this->withToken('invalid-token')
        ->getJson('/api/v1/auth/me')
        ->assertStatus(401);
});

test('a customer can call face swap with a token and coins are deducted', function () {
    fakeCustomerFaceSwap();

    $template = Template::create([
        'name' => 'Superman Suit',
        'type' => 'image',
        'file_path' => 'templates/superman.jpg',
        'cost' => 20,
    ]);

    $customer = Customer::factory()->create(['coins' => 100]);
    $token = $customer->createToken('test')->plainTextToken;

    $this->withToken($token)->postJson('/api/v1/ai/face-swap', [
        'face_image' => UploadedFile::fake()->image('face.jpg'),
        'template_slug' => $template->slug,
    ])->assertOk()
        ->assertJsonPath('generation.coins_spent', 20)
        ->assertJsonPath('generation.coins_remaining', 80);

    $generation = AIGeneration::first();

    expect($generation->customer_id)->toBe($customer->id)
        ->and($generation->user_id)->toBeNull()
        ->and($generation->template_id)->toBe($template->id)
        ->and($customer->fresh()->coins)->toBe(80);

    $log = ApiRequestLog::first();
    expect($log->customer_id)->toBe($customer->id)
        ->and($log->user_id)->toBeNull();
});

test('a customer without enough coins gets 402 and no generation is made', function () {
    fakeCustomerFaceSwap();

    $template = Template::create([
        'name' => 'Premium Suit',
        'type' => 'image',
        'file_path' => 'templates/premium.jpg',
        'cost' => 50,
    ]);

    $customer = Customer::factory()->create(['coins' => 10]);
    $token = $customer->createToken('test')->plainTextToken;

    $this->withToken($token)->postJson('/api/v1/ai/face-swap', [
        'face_image_url' => 'https://example.com/face.jpg',
        'template_slug' => $template->slug,
    ])->assertStatus(402);

    expect(AIGeneration::count())->toBe(0)
        ->and($customer->fresh()->coins)->toBe(10);
});

test('coins are not deducted when the generation fails', function () {
    Http::fake([
        'https://api.segmind.com/v2/faceswap-v5' => Http::response([
            'request_id' => 'req-fail-1',
            'status_url' => 'https://api.segmind.com/v2/requests/req-fail-1/status',
            'response_url' => 'https://api.segmind.com/v2/requests/req-fail-1',
        ]),
        'https://api.segmind.com/v2/requests/req-fail-1/status' => Http::response(
            ['status' => 'FAILED', 'error' => 'Content blocked by RAI'],
            422,
        ),
    ]);

    $template = Template::create([
        'name' => 'Superman Suit',
        'type' => 'image',
        'file_path' => 'templates/superman.jpg',
        'cost' => 20,
    ]);

    $customer = Customer::factory()->create(['coins' => 100]);
    $token = $customer->createToken('test')->plainTextToken;

    $this->withToken($token)->postJson('/api/v1/ai/face-swap', [
        'face_image_url' => 'https://example.com/face.jpg',
        'template_slug' => $template->slug,
    ])->assertStatus(500);

    expect($customer->fresh()->coins)->toBe(100);
});
