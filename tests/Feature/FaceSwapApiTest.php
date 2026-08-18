<?php

use App\Models\AIGeneration;
use App\Models\AIProvider;
use App\Models\ApiRequestLog;
use App\Models\Template;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

function fakeFaceSwapApi(): void
{
    Http::fake([
        'https://api.segmind.com/v2/faceswap-v5' => Http::response([
            'request_id' => 'req-api-1',
            'status_url' => 'https://api.segmind.com/v2/requests/req-api-1/status',
            'response_url' => 'https://api.segmind.com/v2/requests/req-api-1',
        ]),
        'https://api.segmind.com/v2/requests/req-api-1/status' => Http::response(['status' => 'COMPLETED']),
        'https://api.segmind.com/v2/requests/req-api-1' => Http::response([
            'status' => 'COMPLETED',
            'metrics' => ['inference_time' => 2.0, 'cost' => 0.05],
            'output' => 'https://images.segmind.com/generations/result.jpeg',
        ]),
    ]);
}

beforeEach(function () {
    Storage::fake('spaces', ['url' => 'https://bucket.example.com']);
    AIProvider::factory()->create();

    $this->user = User::factory()->create();
    $this->actingAs($this->user);
});

test('face swap with an uploaded face and a template completes', function () {
    fakeFaceSwapApi();

    Template::create([
        'name' => 'Superman Suit',
        'type' => 'image',
        'file_path' => 'templates/superman.jpg',
    ]);

    $response = $this->postJson('/api/v1/ai/face-swap', [
        'face_image' => UploadedFile::fake()->image('face.jpg'),
        'template_slug' => 'superman-suit',
    ]);

    $response->assertOk()
        ->assertJsonPath('status', 'completed')
        ->assertJsonPath('generation.request_id', 'req-api-1')
        ->assertJsonPath('generation.cost', '0.0500')
        ->assertJsonPath('generation.currency', 'USD')
        ->assertJsonPath('generation.output.0', 'https://images.segmind.com/generations/result.jpeg');

    $generation = AIGeneration::first();

    expect($generation)->not->toBeNull()
        ->and($generation->status)->toBe('completed')
        ->and($generation->user_id)->toBe($this->user->id)
        ->and($generation->template_id)->not->toBeNull()
        ->and($generation->input_metadata['source_image'])->toStartWith('https://bucket.example.com/faces/')
        ->and($generation->input_metadata['target_image'])->toContain('templates/superman.jpg');

    $facePath = 'faces/'.basename($generation->input_metadata['source_image']);
    Storage::disk('spaces')->assertExists($facePath);
});

test('face swap with urls only completes', function () {
    fakeFaceSwapApi();

    $this->postJson('/api/v1/ai/face-swap', [
        'face_image_url' => 'https://example.com/face.jpg',
        'target_image_url' => 'https://example.com/target.jpg',
    ])->assertOk()
        ->assertJsonPath('generation.request_id', 'req-api-1');
});

test('validation requires exactly one face source and one target', function () {
    $this->postJson('/api/v1/ai/face-swap', [
        'face_image_url' => 'https://example.com/face.jpg',
        'target_image_url' => 'https://example.com/target.jpg',
        'template_slug' => 'superman-suit',
    ])->assertStatus(422);

    $this->postJson('/api/v1/ai/face-swap', [
        'target_image_url' => 'https://example.com/target.jpg',
    ])->assertStatus(422);

    $this->postJson('/api/v1/ai/face-swap', [
        'face_image_url' => 'https://example.com/face.jpg',
    ])->assertStatus(422);
});

test('an unknown template slug returns 404', function () {
    fakeFaceSwapApi();

    $this->postJson('/api/v1/ai/face-swap', [
        'face_image_url' => 'https://example.com/face.jpg',
        'template_slug' => 'does-not-exist',
    ])->assertNotFound();
});

test('guests get 401 on the api', function () {
    auth()->logout();

    $this->postJson('/api/v1/ai/face-swap', [
        'face_image_url' => 'https://example.com/face.jpg',
        'target_image_url' => 'https://example.com/target.jpg',
    ])->assertStatus(401);
});

test('every api request is logged with headers, body, and duration', function () {
    fakeFaceSwapApi();

    $this->postJson('/api/v1/ai/face-swap', [
        'face_image_url' => 'https://example.com/face.jpg',
        'target_image_url' => 'https://example.com/target.jpg',
    ])->assertOk();

    $log = ApiRequestLog::first();

    expect($log)->not->toBeNull()
        ->and($log->method)->toBe('POST')
        ->and($log->path)->toBe('api/v1/ai/face-swap')
        ->and($log->response_status)->toBe(200)
        ->and($log->duration_ms)->not->toBeNull()
        ->and($log->request_body['face_image_url'])->toBe('https://example.com/face.jpg')
        ->and($log->response_body['status'])->toBe('completed')
        ->and($log->response_headers)->not->toBeEmpty()
        ->and($log->request_headers)->not->toHaveKey('authorization')
        ->and($log->request_headers)->not->toHaveKey('cookie')
        ->and($log->user_id)->toBe($this->user->id);
});

test('failed api requests are logged too', function () {
    $this->postJson('/api/v1/ai/face-swap', [
        'face_image_url' => 'https://example.com/face.jpg',
    ])->assertStatus(422);

    $log = ApiRequestLog::first();

    expect($log->response_status)->toBe(422)
        ->and($log->response_body['errors'])->not->toBeEmpty();
});
