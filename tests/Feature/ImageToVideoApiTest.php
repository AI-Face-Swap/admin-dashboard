<?php

namespace Tests\Feature;

use App\Jobs\ProcessImageToVideo;
use App\Models\AIGeneration;
use App\Models\Customer;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\AIProviderSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
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
        Queue::fake();

        $customer = Customer::factory()->create(['coins' => 200]);
        Cache::put("customer_points_{$customer->central_auth_uuid}", 200, 30);

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

        Queue::assertPushed(ProcessImageToVideo::class);
    }

    public function test_image_to_video_dispatches_queued_job(): void
    {
        Queue::fake();

        $customer = Customer::factory()->create(['coins' => 200]);
        Cache::put("customer_points_{$customer->central_auth_uuid}", 200, 30);

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

        Queue::assertPushed(ProcessImageToVideo::class);

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
        Cache::put("customer_points_{$customer->central_auth_uuid}", 10, 30);

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
        Queue::fake();

        $customer = Customer::factory()->create(['coins' => 200]);
        Cache::put("customer_points_{$customer->central_auth_uuid}", 200, 30);

        $file = UploadedFile::fake()->image('test.jpg');

        $response = $this->actingAs($customer, 'sanctum')
            ->post('/api/v1/ai/image-to-video', [
                'prompt' => 'A cat in space',
                'image' => $file,
            ]);

        $response->assertStatus(202);
        Queue::assertPushed(ProcessImageToVideo::class);
    }

    public function test_seedance_defaults_to_reference_images_and_supports_first_frame_url(): void
    {
        Queue::fake();

        $customer = Customer::factory()->create(['coins' => 200]);
        Cache::put("customer_points_{$customer->central_auth_uuid}", 200, 30);

        // 1. Default mode -> reference_images
        $defaultResponse = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-to-video', [
                'prompt' => 'Tokusatsu hero fighting',
                'image_url' => 'https://example.com/char.jpg',
                'model' => 'seedance-2.5',
            ]);

        $defaultResponse->assertStatus(202);
        $gen1 = AIGeneration::findOrFail($defaultResponse->json('generation.id'));
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
        $gen2 = AIGeneration::findOrFail($firstFrameResponse->json('generation.id'));
        $this->assertSame('first_frame_url', $gen2->input_metadata['image_mode'] ?? null);
        $this->assertSame('https://example.com/char.jpg', $gen2->input_metadata['first_frame_url'] ?? null);
        $this->assertArrayNotHasKey('reference_images', $gen2->input_metadata);
    }

    public function test_all_six_image_to_video_models_build_valid_model_specific_payloads(): void
    {
        Queue::fake();

        $customer = Customer::factory()->create(['coins' => 500]);
        Cache::put("customer_points_{$customer->central_auth_uuid}", 500, 30);

        // 1. wan-2.2-i2v-flash (clamps 1080p -> 720p, sets image)
        $resWan22 = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/ai/image-to-video', [
            'prompt' => 'Gentle wind blowing',
            'image_url' => 'https://example.com/wan22.jpg',
            'model' => 'wan-2.2-i2v-flash',
            'resolution' => '1080p',
        ])->assertStatus(202);
        $genWan22 = AIGeneration::findOrFail($resWan22->json('generation.id'));
        $this->assertSame('https://example.com/wan22.jpg', $genWan22->input_metadata['image']);
        $this->assertSame('720p', $genWan22->input_metadata['resolution']);

        // 2. kling-o1-reference-image-to-video (sets image_urls, prepends @Image1, integer duration)
        $resKling = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/ai/image-to-video', [
            'prompt' => 'Hero walking forward',
            'image_url' => 'https://example.com/kling.jpg',
            'model' => 'kling-o1-reference-image-to-video',
            'duration' => '10s',
        ])->assertStatus(202);
        $genKling = AIGeneration::findOrFail($resKling->json('generation.id'));
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
        $genSeedance = AIGeneration::findOrFail($resSeedance->json('generation.id'));
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
        $genWan3 = AIGeneration::findOrFail($resWan3->json('generation.id'));
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
        $genLtx = AIGeneration::findOrFail($resLtx->json('generation.id'));
        $this->assertSame(6, $genLtx->input_metadata['duration']);
        $this->assertSame('16:9', $genLtx->input_metadata['aspect_ratio']);

        // 6. minimax-h3-max-reference-to-video (sets reference_images, maps 720p/1080p -> 768P, sets ratio)
        $resMinimax = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/ai/image-to-video', [
            'prompt' => 'Model walking on runway',
            'image_url' => 'https://example.com/minimax.jpg',
            'model' => 'minimax-h3-max-reference-to-video',
            'resolution' => '1080p',
        ])->assertStatus(202);
        $genMinimax = AIGeneration::findOrFail($resMinimax->json('generation.id'));
        $this->assertSame(['https://example.com/minimax.jpg'], $genMinimax->input_metadata['reference_images']);
        $this->assertSame('768P', $genMinimax->input_metadata['resolution']);
        $this->assertSame('16:9', $genMinimax->input_metadata['ratio']);
    }

    public function test_seedance_2_0_and_fast_support_multimodal_references_and_last_frame(): void
    {
        Queue::fake();

        $customer = Customer::factory()->create(['coins' => 500]);
        Cache::put("customer_points_{$customer->central_auth_uuid}", 500, 30);

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

        $genFastRef = AIGeneration::findOrFail($resFastRef->json('generation.id'));
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

        $genFrames = AIGeneration::findOrFail($resStandardFrames->json('generation.id'));
        $this->assertSame('https://example.com/first.jpg', $genFrames->input_metadata['first_frame_url']);
        $this->assertSame('https://example.com/last.jpg', $genFrames->input_metadata['last_frame_url']);
        $this->assertArrayNotHasKey('reference_images', $genFrames->input_metadata);
        $this->assertSame(12, $genFrames->input_metadata['duration']);
    }

    public function test_admin_user_can_generate_image_to_video_without_points_via_admin_and_api_routes(): void
    {
        Queue::fake();

        $admin = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $admin->roles()->attach(Role::where('slug', 'super-admin')->firstOrFail());

        // 1. Via /admin/ai/image-to-video web route (session auth)
        $resAdmin = $this->actingAs($admin, 'web')->postJson('/admin/ai/image-to-video', [
            'prompt' => 'Admin testing martial arts scene',
            'image_url' => 'https://example.com/admin-ref.jpg',
            'model' => 'seedance-2.0',
            'image_mode' => 'reference',
            'resolution' => '1080p',
            'duration' => '6s',
        ]);

        $resAdmin->assertStatus(202)
            ->assertJsonPath('status', 'queued');

        $genId = $resAdmin->json('generation.id');
        $this->assertNotNull($genId);

        // Admin can also poll status via /admin/ai/generations/{id}
        $this->actingAs($admin, 'web')
            ->getJson("/admin/ai/generations/{$genId}")
            ->assertStatus(200)
            ->assertJsonPath('id', $genId);

        // 2. Via /api/v1/ai/image-to-video from any host/port with Referer
        $this->actingAs($admin, 'web')
            ->withHeaders(['Referer' => 'http://127.0.0.1:8001/admin/ai'])
            ->postJson('/api/v1/ai/image-to-video', [
                'prompt' => 'Admin testing via API route',
                'image_url' => 'https://example.com/admin-ref.jpg',
                'model' => 'seedance-2.0-fast',
            ])
            ->assertStatus(202);
    }

    public function test_kling_motion_control_models_build_valid_payloads(): void
    {
        Queue::fake();

        $customer = Customer::factory()->create(['points' => 500, 'coins' => 500]);

        foreach ([
            'kling-2.6-standard-motion-control',
            'kling-2.6-pro-motion-control',
            'kling-3-motion-control-standard',
            'kling-3-motion-control-pro',
        ] as $modelName) {
            $res = $this->actingAs($customer, 'sanctum')
                ->postJson('/api/v1/ai/image-to-video', [
                    'model' => $modelName,
                    'image_url' => 'https://example.com/dancer.jpg',
                    'video_url' => 'https://example.com/moonwalk.mp4',
                    'character_orientation' => 'video',
                    'keep_original_sound' => 'true',
                ])
                ->assertStatus(202);

            $gen = AIGeneration::findOrFail($res->json('generation.id'));
            $meta = $gen->input_metadata;

            $this->assertSame($modelName, $meta['model']);
            $this->assertSame('https://example.com/dancer.jpg', $meta['image_url']);
            $this->assertSame('https://example.com/moonwalk.mp4', $meta['video_url']);
            $this->assertSame('video', $meta['character_orientation']);
            $this->assertTrue($meta['keep_original_sound']);
        }
    }

    public function test_kling_video_edit_models_build_valid_multi_character_payloads(): void
    {
        Queue::fake();

        $customer = Customer::factory()->create(['points' => 500, 'coins' => 500]);
        Cache::put("customer_points_{$customer->central_auth_uuid}", 500, 30);

        // 1. kling-o3-video2video-edit with 2 character elements (@Element1 & @Element2)
        $resO3 = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-to-video', [
                'model' => 'kling-o3-video2video-edit',
                'video_url' => 'https://example.com/kitchen-skit.mp4',
                'image_url' => 'https://example.com/woman.jpg',
                'second_image_url' => 'https://example.com/man.jpg',
                'prompt' => 'Change the woman in pink to @Element1 and change the man in black to @Element2.',
                'mode' => 'std',
                'duration' => 10,
                'aspect_ratio' => '9:16',
                'keep_audio' => true,
            ])
            ->assertStatus(202);

        $genO3 = AIGeneration::findOrFail($resO3->json('generation.id'));
        $metaO3 = $genO3->input_metadata;

        $this->assertSame('kling-o3-video2video-edit', $metaO3['model']);
        $this->assertSame('https://example.com/kitchen-skit.mp4', $metaO3['video_url']);
        $this->assertSame('std', $metaO3['mode']);
        $this->assertSame('10', $metaO3['duration']);
        $this->assertSame('9:16', $metaO3['aspect_ratio']);
        $this->assertTrue($metaO3['keep_audio']);
        $this->assertSame([
            [
                'frontal_image_url' => 'https://example.com/woman.jpg',
                'reference_image_urls' => ['https://example.com/woman.jpg'],
            ],
            [
                'frontal_image_url' => 'https://example.com/man.jpg',
                'reference_image_urls' => ['https://example.com/man.jpg'],
            ],
        ], $metaO3['elements']);

        // 2. kling-4-video-edit with 2 reference images (@Image1 & @Image2)
        $resK4 = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-to-video', [
                'model' => 'kling-4-video-edit',
                'video_url' => 'https://example.com/kitchen-skit.mp4',
                'image_url' => 'https://example.com/woman.jpg',
                'second_image_url' => 'https://example.com/man.jpg',
                'prompt' => 'Change the woman in pink to @Image1 and change the man in black to @Image2.',
                'duration' => '15s',
                'resolution' => '720p',
                'aspect_ratio' => 'adaptive',
            ])
            ->assertStatus(202);

        $genK4 = AIGeneration::findOrFail($resK4->json('generation.id'));
        $metaK4 = $genK4->input_metadata;

        $this->assertSame('kling-4-video-edit', $metaK4['model']);
        $this->assertSame('https://example.com/kitchen-skit.mp4', $metaK4['video']);
        $this->assertSame(15, $metaK4['duration']);
        $this->assertSame('720p', $metaK4['resolution']);
        $this->assertSame('adaptive', $metaK4['aspect_ratio']);
        $this->assertSame([
            'https://example.com/woman.jpg',
            'https://example.com/man.jpg',
        ], $metaK4['reference_images']);
    }

    public function test_seedance_supports_multiple_ordered_reference_images(): void
    {
        Queue::fake();
        Storage::fake('spaces');

        $admin = User::factory()->create([
            'email_verified_at' => now(),
        ]);
        $admin->roles()->attach(Role::where('slug', 'super-admin')->firstOrFail());

        $res = $this->actingAs($admin, 'web')->post('/admin/ai/image-to-video', [
            'model' => 'seedance-2.0',
            'image_mode' => 'reference',
            'image' => UploadedFile::fake()->image('char1.jpg', 800, 1000),
            'extra_image_urls' => [
                0 => 'https://example.com/ref-2-style.jpg',
                2 => 'https://example.com/ref-4-bg.jpg',
            ],
            'extra_image_files' => [
                1 => UploadedFile::fake()->image('char3.jpg', 800, 1000),
                3 => UploadedFile::fake()->image('prop5.jpg', 800, 1000),
            ],
            'prompt' => 'Cinematic shot of @Image 1 talking to @Image 3 inside @Image 4.',
            'duration' => '5s',
            'resolution' => '720p',
            'aspect_ratio' => '16:9',
        ]);

        $res->assertStatus(202)
            ->assertJsonPath('status', 'queued');

        $gen = AIGeneration::findOrFail($res->json('generation.id'));
        $meta = $gen->input_metadata;

        $this->assertCount(5, $meta['reference_images']);
        $this->assertSame('https://example.com/ref-2-style.jpg', $meta['reference_images'][1]);
        $this->assertSame('https://example.com/ref-4-bg.jpg', $meta['reference_images'][3]);
        $this->assertStringContainsString('@Image 2', $meta['prompt']);
        $this->assertStringContainsString('@Image 5', $meta['prompt']);
    }
}
