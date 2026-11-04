<?php

namespace Tests\Feature;

use App\Models\Customer;
use Database\Seeders\AIProviderSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImageToVideoApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(AIProviderSeeder::class);

        Storage::fake('spaces');
    }

    public function test_image_to_video_creates_generation(): void
    {
        \Illuminate\Support\Facades\Queue::fake();

        $customer = Customer::factory()->create(['coins' => 200]);
        \Illuminate\Support\Facades\Cache::put("customer_points_{$customer->central_auth_uuid}", 200, 30);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-to-video', [
                'prompt' => 'A superhero flying over a city',
                'image_url' => 'https://example.com/image.jpg',
                'model' => 'kling-o1-reference-image-to-video',
                'resolution' => '1080p',
                'aspect_ratio' => '16:9',
            ]);

        $response->assertStatus(202)->assertJsonStructure([
            'status',
            'generation' => [
                'id', 'operation', 'status',
            ],
        ]);
        $response->assertJsonPath('status', 'queued')
            ->assertJsonPath('generation.status', 'queued');

        \Illuminate\Support\Facades\Queue::assertPushed(\App\Jobs\ProcessImageToVideo::class);
    }

    public function test_image_to_video_dispatches_queued_job(): void
    {
        \Illuminate\Support\Facades\Queue::fake();

        $customer = Customer::factory()->create(['coins' => 200]);
        \Illuminate\Support\Facades\Cache::put("customer_points_{$customer->central_auth_uuid}", 200, 30);

        Http::fake([
            '*/api/v1/s2s/points*' => Http::response(['success' => true, 'points' => 180], 200),
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-to-video', [
                'prompt' => 'A spaceship warp driving through stars',
                'image_url' => 'https://example.com/image.jpg',
                'client_idempotency_token' => 'tok_async_i2v_123',
            ]);

        $response->assertStatus(202)
            ->assertJsonPath('status', 'queued')
            ->assertJsonPath('generation.status', 'queued');

        \Illuminate\Support\Facades\Queue::assertPushed(\App\Jobs\ProcessImageToVideo::class);

        // Repeated request with same token returns idempotent duplicate without re-dispatching
        $duplicateResponse = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-to-video', [
                'prompt' => 'A spaceship warp driving through stars',
                'image_url' => 'https://example.com/image.jpg',
                'client_idempotency_token' => 'tok_async_i2v_123',
            ]);

        $duplicateResponse->assertStatus(202)
            ->assertJsonPath('idempotency.duplicate', true);
    }

    public function test_validation_rejects_invalid_resolution_and_aspect_ratio(): void
    {
        $customer = Customer::factory()->create();

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-to-video', [
                'prompt' => 'Test',
                'image_url' => 'https://example.com/image.jpg',
                'resolution' => '4k', // invalid
                'aspect_ratio' => '21:9', // invalid
            ]);

        $response->assertUnprocessable()->assertJsonValidationErrors(['resolution', 'aspect_ratio']);
    }

    public function test_insufficient_coins_returns_402(): void
    {
        $customer = Customer::factory()->create();
        \Illuminate\Support\Facades\Cache::put("customer_points_{$customer->central_auth_uuid}", 10, 30);

        // 1080p requires 30 coins by default
        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-to-video', [
                'prompt' => 'A beautiful landscape',
                'image_url' => 'https://example.com/image.jpg',
                'resolution' => '1080p',
            ]);

        $response->assertStatus(402);
    }

    public function test_accepts_file_upload_instead_of_url(): void
    {
        \Illuminate\Support\Facades\Queue::fake();

        $customer = Customer::factory()->create(['coins' => 200]);
        \Illuminate\Support\Facades\Cache::put("customer_points_{$customer->central_auth_uuid}", 200, 30);

        $file = UploadedFile::fake()->image('test.jpg');

        $response = $this->actingAs($customer, 'sanctum')
            ->post('/api/v1/ai/image-to-video', [
                'prompt' => 'A cat in space',
                'image' => $file,
            ]);

        $response->assertStatus(202);
        \Illuminate\Support\Facades\Queue::assertPushed(\App\Jobs\ProcessImageToVideo::class);
    }

    public function test_seedance_defaults_to_reference_images_and_supports_first_frame_url(): void
    {
        \Illuminate\Support\Facades\Queue::fake();

        $customer = Customer::factory()->create(['coins' => 200]);
        \Illuminate\Support\Facades\Cache::put("customer_points_{$customer->central_auth_uuid}", 200, 30);

        // 1. Default mode -> reference_images
        $defaultResponse = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-to-video', [
                'prompt' => 'Tokusatsu hero fighting',
                'image_url' => 'https://example.com/char.jpg',
                'model' => 'seedance-2.5',
            ]);

        $defaultResponse->assertStatus(202);
        $gen1 = \App\Models\AIGeneration::findOrFail($defaultResponse->json('generation.id'));
        $this->assertSame('reference', $gen1->input_metadata['image_mode'] ?? null);
        $this->assertSame(['https://example.com/char.jpg'], $gen1->input_metadata['reference_images'] ?? null);
        $this->assertArrayNotHasKey('first_frame_url', $gen1->input_metadata);

        // 2. Explicit first_frame_url mode -> first_frame_url
        $firstFrameResponse = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-to-video', [
                'prompt' => 'Tokusatsu hero starting pose',
                'image_url' => 'https://example.com/char.jpg',
                'model' => 'seedance-2.5',
                'image_mode' => 'first_frame_url',
            ]);

        $firstFrameResponse->assertStatus(202);
        $gen2 = \App\Models\AIGeneration::findOrFail($firstFrameResponse->json('generation.id'));
        $this->assertSame('first_frame_url', $gen2->input_metadata['image_mode'] ?? null);
        $this->assertSame('https://example.com/char.jpg', $gen2->input_metadata['first_frame_url'] ?? null);
        $this->assertArrayNotHasKey('reference_images', $gen2->input_metadata);
    }

    public function test_all_six_image_to_video_models_build_valid_model_specific_payloads(): void
    {
        \Illuminate\Support\Facades\Queue::fake();

        $customer = Customer::factory()->create(['coins' => 500]);
        \Illuminate\Support\Facades\Cache::put("customer_points_{$customer->central_auth_uuid}", 500, 30);

        // 1. wan-2.2-i2v-flash (clamps 1080p -> 720p, sets image)
        $resWan22 = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/ai/image-to-video', [
            'prompt' => 'Gentle wind blowing',
            'image_url' => 'https://example.com/wan22.jpg',
            'model' => 'wan-2.2-i2v-flash',
            'resolution' => '1080p',
        ])->assertStatus(202);
        $genWan22 = \App\Models\AIGeneration::findOrFail($resWan22->json('generation.id'));
        $this->assertSame('https://example.com/wan22.jpg', $genWan22->input_metadata['image']);
        $this->assertSame('720p', $genWan22->input_metadata['resolution']);

        // 2. kling-o1-reference-image-to-video (sets image_urls, prepends @Image1, integer duration)
        $resKling = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/ai/image-to-video', [
            'prompt' => 'Hero walking forward',
            'image_url' => 'https://example.com/kling.jpg',
            'model' => 'kling-o1-reference-image-to-video',
            'duration' => '10s',
        ])->assertStatus(202);
        $genKling = \App\Models\AIGeneration::findOrFail($resKling->json('generation.id'));
        $this->assertSame(['https://example.com/kling.jpg'], $genKling->input_metadata['image_urls']);
        $this->assertStringContainsString('@Image1', $genKling->input_metadata['prompt']);
        $this->assertSame(10, $genKling->input_metadata['duration']);

        // 3. seedance-2.5 (sets reference_images, appends @Image 1, integer duration)
        $resSeedance = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/ai/image-to-video', [
            'prompt' => 'Dancer spinning',
            'image_url' => 'https://example.com/seedance.jpg',
            'model' => 'seedance-2.5',
            'duration' => '5s',
        ])->assertStatus(202);
        $genSeedance = \App\Models\AIGeneration::findOrFail($resSeedance->json('generation.id'));
        $this->assertSame(['https://example.com/seedance.jpg'], $genSeedance->input_metadata['reference_images']);
        $this->assertStringContainsString('@Image 1', $genSeedance->input_metadata['prompt']);
        $this->assertSame(5, $genSeedance->input_metadata['duration']);

        // 4. wan3.0-video-prime (uppercase resolution 1080P, integer duration)
        $resWan3 = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/ai/image-to-video', [
            'prompt' => 'Ocean waves crashing',
            'image_url' => 'https://example.com/wan3.jpg',
            'model' => 'wan3.0-video-prime',
            'resolution' => '1080p',
            'duration' => '5s',
        ])->assertStatus(202);
        $genWan3 = \App\Models\AIGeneration::findOrFail($resWan3->json('generation.id'));
        $this->assertSame('1080P', $genWan3->input_metadata['resolution']);
        $this->assertSame(5, $genWan3->input_metadata['duration']);

        // 5. ltx-2.5-pro (clamps duration to 6/8/10, aspect_ratio to 16:9 or 9:16)
        $resLtx = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/ai/image-to-video', [
            'prompt' => 'Cinematic camera dolly',
            'image_url' => 'https://example.com/ltx.jpg',
            'model' => 'ltx-2.5-pro',
            'duration' => '5s',
            'aspect_ratio' => '1:1',
        ])->assertStatus(202);
        $genLtx = \App\Models\AIGeneration::findOrFail($resLtx->json('generation.id'));
        $this->assertSame(6, $genLtx->input_metadata['duration']);
        $this->assertSame('16:9', $genLtx->input_metadata['aspect_ratio']);

        // 6. minimax-h3-max-reference-to-video (sets reference_images, maps 720p/1080p -> 768P, sets ratio)
        $resMinimax = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/ai/image-to-video', [
            'prompt' => 'Model walking on runway',
            'image_url' => 'https://example.com/minimax.jpg',
            'model' => 'minimax-h3-max-reference-to-video',
            'resolution' => '1080p',
        ])->assertStatus(202);
        $genMinimax = \App\Models\AIGeneration::findOrFail($resMinimax->json('generation.id'));
        $this->assertSame(['https://example.com/minimax.jpg'], $genMinimax->input_metadata['reference_images']);
        $this->assertSame('768P', $genMinimax->input_metadata['resolution']);
        $this->assertSame('16:9', $genMinimax->input_metadata['ratio']);
    }

    public function test_seedance_2_0_and_fast_support_multimodal_references_and_last_frame(): void
    {
        \Illuminate\Support\Facades\Queue::fake();

        $customer = Customer::factory()->create(['coins' => 500]);
        \Illuminate\Support\Facades\Cache::put("customer_points_{$customer->central_auth_uuid}", 500, 30);

        // 1. seedance-2.0-fast in Reference mode with reference_video_url and reference_audio_url
        $resFastRef = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/ai/image-to-video', [
            'prompt' => 'Martial arts hero executing kick',
            'image_url' => 'https://example.com/hero.jpg',
            'model' => 'seedance-2.0-fast',
            'image_mode' => 'reference',
            'reference_video_url' => 'https://example.com/motion.mp4',
            'reference_audio_url' => 'https://example.com/sfx.mp3',
            'duration' => '8s',
            'bitrate_mode' => 'high',
            'generate_audio' => 'true',
            'auto_resize' => 'true',
            'seed' => -1,
        ])->assertStatus(202);

        $genFastRef = \App\Models\AIGeneration::findOrFail($resFastRef->json('generation.id'));
        $this->assertSame(['https://example.com/hero.jpg'], $genFastRef->input_metadata['reference_images']);
        $this->assertSame(['https://example.com/motion.mp4'], $genFastRef->input_metadata['reference_videos']);
        $this->assertSame(['https://example.com/sfx.mp3'], $genFastRef->input_metadata['reference_audios']);
        $this->assertStringContainsString('@Image 1', $genFastRef->input_metadata['prompt']);
        $this->assertStringContainsString('@Video 1', $genFastRef->input_metadata['prompt']);
        $this->assertStringContainsString('@Audio 1', $genFastRef->input_metadata['prompt']);
        $this->assertSame(8, $genFastRef->input_metadata['duration']);
        $this->assertSame('high', $genFastRef->input_metadata['bitrate_mode']);
        $this->assertSame(-1, $genFastRef->input_metadata['seed']);

        // 2. seedance-2.0 in first_frame_url mode with last_frame_url
        $resStandardFrames = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/ai/image-to-video', [
            'prompt' => 'Smooth transition from day to night',
            'image_url' => 'https://example.com/first.jpg',
            'last_frame_url' => 'https://example.com/last.jpg',
            'model' => 'seedance-2.0',
            'image_mode' => 'first_frame_url',
            'duration' => '12s',
        ])->assertStatus(202);

        $genFrames = \App\Models\AIGeneration::findOrFail($resStandardFrames->json('generation.id'));
        $this->assertSame('https://example.com/first.jpg', $genFrames->input_metadata['first_frame_url']);
        $this->assertSame('https://example.com/last.jpg', $genFrames->input_metadata['last_frame_url']);
        $this->assertArrayNotHasKey('reference_images', $genFrames->input_metadata);
        $this->assertSame(12, $genFrames->input_metadata['duration']);
    }
}
