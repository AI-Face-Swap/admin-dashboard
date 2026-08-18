<?php

use App\Models\AIGeneration;
use App\Models\AIProvider;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

/**
 * Regression: the admin dashboard calls /api/v1/ai/face-swap from the
 * browser with the session cookie (no Bearer token). This only works when
 * Sanctum's EnsureFrontendRequestsAreStateful middleware is registered on
 * the api group — otherwise the session is never started on API requests
 * and the endpoint answers 401 {"message":"Unauthenticated."}.
 *
 * The default test session driver (array) shares its store across the whole
 * test run, which would mask this bug — so this test uses the database
 * driver + a real Referer header + the actual session cookie, exactly like
 * a browser request.
 */
beforeEach(function () {
    Storage::fake('spaces', ['url' => 'https://bucket.example.com']);
    AIProvider::factory()->create();

    $this->admin = User::factory()->create();
});

test('admin session cookie authenticates the shared API without a token', function () {
    fakeFaceSwapApi();

    config(['session.driver' => 'database']);

    $login = $this->post(route('login.store'), [
        'email' => $this->admin->email,
        'password' => 'password',
    ]);

    $cookieName = config('session.cookie');
    $sessionCookie = $login->getCookie($cookieName, decrypt: false);

    expect($sessionCookie)->not->toBeNull();

    $response = $this->withUnencryptedCookies([
        $cookieName => $sessionCookie->getValue(),
    ])->withServerVariables([
        'HTTP_REFERER' => 'http://127.0.0.1:8000/admin/ai',
    ])->postJson('/api/v1/ai/face-swap', [
        'face_image_url' => 'https://example.com/face.jpg',
        'target_image_url' => 'https://example.com/target.jpg',
    ]);

    $response->assertOk()
        ->assertJsonPath('status', 'completed')
        ->assertJsonPath('generation.request_id', 'req-api-1');

    $generation = AIGeneration::first();

    expect($generation)->not->toBeNull()
        ->and($generation->user_id)->toBe($this->admin->id)
        ->and($generation->customer_id)->toBeNull();
});

test('api middleware group registers the Sanctum stateful middleware', function () {
    $this->get('/up');

    $groups = app('router')->getMiddlewareGroups();

    expect($groups['api'] ?? [])->toContain(EnsureFrontendRequestsAreStateful::class);
});

test('guest hitting the shared API still gets 401', function () {
    $this->postJson('/api/v1/ai/face-swap', [
        'face_image_url' => 'https://example.com/face.jpg',
        'target_image_url' => 'https://example.com/target.jpg',
    ])->assertUnauthorized()
        ->assertJson(['message' => 'Unauthenticated.']);
});
