<?php

use App\AI\DTOs\GenerationRequest;
use App\AI\Exceptions\AIGenerationFailedException;
use App\AI\Exceptions\AIGenerationTimeoutException;
use App\AI\Exceptions\UnknownProviderException;
use App\AI\Exceptions\UnsupportedOperationException;
use App\AI\Factories\AIProviderFactory;
use App\AI\Providers\Segmind\SegmindProvider;
use App\AI\Services\AIService;
use App\Models\AIGeneration;
use App\Models\AIProvider;
use App\Models\Template;
use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

function segmindProvider(array $operations = ['face-swap' => 'faceswap-v5'], string $storageDisk = 'spaces'): SegmindProvider
{
    return new SegmindProvider(
        baseUrl: 'https://api.segmind.com/v2',
        operations: $operations,
        apiKey: 'test-api-key',
        storageDisk: $storageDisk,
        pollTimeoutSeconds: 5,
        pollIntervalSeconds: 0,
    );
}

function fakeSegmindSuccess(string $output, array $metrics = ['inference_time' => 1.2, 'cost' => 0.05]): void
{
    Http::fake([
        'https://api.segmind.com/v2/faceswap-v5' => Http::response([
            'request_id' => 'req-123',
            'status_url' => 'https://api.segmind.com/v2/requests/req-123/status',
            'response_url' => 'https://api.segmind.com/v2/requests/req-123',
        ]),
        'https://api.segmind.com/v2/requests/req-123/status' => Http::response(['status' => 'COMPLETED']),
        'https://api.segmind.com/v2/requests/req-123' => Http::response([
            'status' => 'COMPLETED',
            'metrics' => $metrics,
            'output' => $output,
        ]),
    ]);
}

test('the factory resolves segmind from the database', function () {
    AIProvider::factory()->create();

    $provider = (new AIProviderFactory)->make('segmind');

    expect($provider)->toBeInstanceOf(SegmindProvider::class)
        ->and($provider->name())->toBe('segmind')
        ->and($provider->supports('face-swap'))->toBeTrue()
        ->and($provider->supports('image'))->toBeFalse();
});

test('the factory throws for an unknown provider', function () {
    (new AIProviderFactory)->make('replicate');
})->throws(UnknownProviderException::class);

test('face swap submits, polls, and normalizes a URL output', function () {
    fakeSegmindSuccess('https://cdn.example.com/result.png');

    $response = segmindProvider()->faceSwap(new GenerationRequest('face-swap', [
        'source_image' => 'https://example.com/face.jpg',
        'target_image' => 'https://example.com/target.jpg',
    ]));

    expect($response->provider)->toBe('segmind')
        ->and($response->operation)->toBe('face-swap')
        ->and($response->requestId)->toBe('req-123')
        ->and($response->status)->toBe('completed')
        ->and($response->durationMs)->toBe(1200)
        ->and($response->output)->toBe(['https://cdn.example.com/result.png'])
        ->and($response->cost)->toBe('0.05')
        ->and($response->currency)->toBe('USD');

    Http::assertSent(function (Request $request) {
        return $request->url() === 'https://api.segmind.com/v2/faceswap-v5'
            && $request->hasHeader('x-api-key', 'test-api-key');
    });
});

test('cost stays null when the provider does not report one', function () {
    fakeSegmindSuccess('https://cdn.example.com/result.png', metrics: ['inference_time' => 1.2]);

    $response = segmindProvider()->faceSwap(new GenerationRequest('face-swap', []));

    expect($response->cost)->toBeNull()
        ->and($response->currency)->toBeNull();
});

test('face swap decodes a base64 data-uri output and stores it on the disk', function () {
    Storage::fake('spaces', ['url' => 'https://bucket.example.com']);

    fakeSegmindSuccess('data:image/png;base64,'.base64_encode('fake-png-bytes'));

    $response = segmindProvider(storageDisk: 'spaces')->faceSwap(new GenerationRequest('face-swap', []));

    expect($response->output)->toHaveCount(1)
        ->and($response->output[0])->toStartWith('https://bucket.example.com/generations/')
        ->and($response->output[0])->toEndWith('.png');

    $path = 'generations/'.basename(parse_url($response->output[0], PHP_URL_PATH));
    Storage::disk('spaces')->assertExists($path);
    expect(Storage::disk('spaces')->get($path))->toBe('fake-png-bytes');
});

test('face swap decodes a raw base64 output', function () {
    Storage::fake('spaces', ['url' => 'https://bucket.example.com']);

    fakeSegmindSuccess(base64_encode('raw-bytes'));

    $response = segmindProvider(storageDisk: 'spaces')->faceSwap(new GenerationRequest('face-swap', []));

    expect($response->output[0])->toStartWith('https://bucket.example.com/generations/');
});

test('a failed status throws and carries the error detail', function () {
    Http::fake([
        'https://api.segmind.com/v2/faceswap-v5' => Http::response([
            'request_id' => 'req-123',
            'status_url' => 'https://api.segmind.com/v2/requests/req-123/status',
            'response_url' => 'https://api.segmind.com/v2/requests/req-123',
        ]),
        'https://api.segmind.com/v2/requests/req-123/status' => Http::response(
            ['status' => 'FAILED', 'error' => 'Content blocked by RAI'],
            422,
        ),
    ]);

    segmindProvider()->faceSwap(new GenerationRequest('face-swap', []));
})->throws(AIGenerationFailedException::class, 'Content blocked by RAI');

test('polling times out after the deadline', function () {
    Http::fake([
        'https://api.segmind.com/v2/faceswap-v5' => Http::response([
            'request_id' => 'req-123',
            'status_url' => 'https://api.segmind.com/v2/requests/req-123/status',
            'response_url' => 'https://api.segmind.com/v2/requests/req-123',
        ]),
        'https://api.segmind.com/v2/requests/req-123/status' => Http::response(['status' => 'PROCESSING']),
    ]);

    segmindProvider()->faceSwap(new GenerationRequest('face-swap', []));
})->throws(AIGenerationTimeoutException::class);

test('generate image and video face swap are stubs for now', function () {
    $provider = segmindProvider();

    $provider->generateImage(new GenerationRequest('image', []));
})->throws(UnsupportedOperationException::class);

test('the ai service persists a completed generation with the reported cost', function () {
    AIProvider::factory()->create();
    fakeSegmindSuccess('https://cdn.example.com/result.png');

    $service = app(AIService::class);
    $generation = $service->faceSwap(new GenerationRequest('face-swap', [
        'source_image' => 'https://example.com/face.jpg',
        'target_image' => 'https://example.com/target.jpg',
    ]));

    expect($generation)->toBeInstanceOf(AIGeneration::class)
        ->and($generation->status)->toBe('completed')
        ->and($generation->operation)->toBe('face-swap')
        ->and($generation->request_id)->toBe('req-123')
        ->and($generation->duration_ms)->toBe(1200)
        ->and($generation->cost)->toBe('0.0500')
        ->and($generation->currency)->toBe('USD')
        ->and($generation->output_metadata)->toBe(['https://cdn.example.com/result.png'])
        ->and($generation->raw_response['status'])->toBe('COMPLETED')
        ->and($generation->user_id)->toBeNull();
});

test('the ai service keeps cost null when the provider does not report it', function () {
    AIProvider::factory()->create();
    fakeSegmindSuccess('https://cdn.example.com/result.png', metrics: ['inference_time' => 1.2]);

    $generation = app(AIService::class)->faceSwap(new GenerationRequest('face-swap', []));

    expect($generation->cost)->toBeNull()
        ->and($generation->currency)->toBeNull();
});

test('the ai service attaches the requester and template', function () {
    AIProvider::factory()->create();
    fakeSegmindSuccess('https://cdn.example.com/result.png');

    $user = User::factory()->create();
    $template = Template::create([
        'name' => 'Superman Suit',
        'type' => 'image',
        'file_path' => 'templates/superman.jpg',
    ]);

    $generation = app(AIService::class)->faceSwap(
        new GenerationRequest('face-swap', [], templateId: $template->id),
        $user,
    );

    expect($generation->user_id)->toBe($user->id)
        ->and($generation->template_id)->toBe($template->id);
});

test('the ai service marks the row failed and rethrows on provider failure', function () {
    AIProvider::factory()->create();

    Http::fake([
        'https://api.segmind.com/v2/faceswap-v5' => Http::response([
            'request_id' => 'req-123',
            'status_url' => 'https://api.segmind.com/v2/requests/req-123/status',
            'response_url' => 'https://api.segmind.com/v2/requests/req-123',
        ]),
        'https://api.segmind.com/v2/requests/req-123/status' => Http::response(
            ['status' => 'FAILED', 'error' => 'Content blocked by RAI'],
            422,
        ),
    ]);

    try {
        app(AIService::class)->faceSwap(new GenerationRequest('face-swap', []));
        $this->fail('Expected AIGenerationFailedException');
    } catch (AIGenerationFailedException) {
        // expected
    }

    $generation = AIGeneration::first();

    expect($generation->status)->toBe('failed')
        ->and($generation->request_id)->toBe('req-123')
        ->and($generation->error)->toContain('Content blocked by RAI')
        ->and($generation->raw_response['status'])->toBe('FAILED');
});
