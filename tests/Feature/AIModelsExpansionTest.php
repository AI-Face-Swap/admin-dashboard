<?php

namespace Tests\Feature;

use App\Models\Customer;
use Database\Seeders\AIModelSeeder;
use Database\Seeders\AIProviderSeeder;
use Database\Seeders\GenerationTypeSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AIModelsExpansionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(AIProviderSeeder::class);
        $this->seed(GenerationTypeSeeder::class);
        $this->seed(AIModelSeeder::class);

        Storage::fake('spaces');
    }

    public function test_coin_costs_api_returns_all_eight_new_models(): void
    {
        $response = $this->getJson('/api/v1/coin-costs');

        $response->assertOk();
        $response->assertJsonStructure([
            'image_generation',
            'image_to_video_480p',
            'image_to_video_720p',
            'image_to_video_1080p',
            'image_edit',
            'models',
        ]);

        $models = $response->json('models');

        // 3 Text-to-Image models
        $this->assertArrayHasKey('ideogram-4.5', $models);
        $this->assertEquals(8, $models['ideogram-4.5']['coin_cost']);

        $this->assertArrayHasKey('recraft-v4-pro', $models);
        $this->assertEquals(8, $models['recraft-v4-pro']['coin_cost']);

        $this->assertArrayHasKey('grok-imagine-image-2', $models);
        $this->assertEquals(7, $models['grok-imagine-image-2']['coin_cost']);

        // 3 Image-to-Video models
        $this->assertArrayHasKey('wan3.0-video-prime', $models);
        $this->assertEquals(20, $models['wan3.0-video-prime']['coin_cost']);
        $this->assertEquals(35, $models['wan3.0-video-prime']['resolution_costs']['1080p']);

        $this->assertArrayHasKey('ltx-2.5-pro', $models);
        $this->assertEquals(15, $models['ltx-2.5-pro']['coin_cost']);
        $this->assertEquals(25, $models['ltx-2.5-pro']['resolution_costs']['1080p']);

        $this->assertArrayHasKey('minimax-h3-max-reference-to-video', $models);
        $this->assertEquals(25, $models['minimax-h3-max-reference-to-video']['coin_cost']);
        $this->assertEquals(40, $models['minimax-h3-max-reference-to-video']['resolution_costs']['1080p']);

        // 2 Image Editing models
        $this->assertArrayHasKey('ideogram-4.5-edit', $models);
        $this->assertEquals(12, $models['ideogram-4.5-edit']['coin_cost']);

        $this->assertArrayHasKey('bria-extract-object', $models);
        $this->assertEquals(6, $models['bria-extract-object']['coin_cost']);
    }

    public function test_ideogram_4_5_edit_successful_generation(): void
    {
        $customer = Customer::factory()->create(['coins' => 50]);

        Http::fake([
            'api.segmind.com/v2/ideogram-4.5-edit' => Http::response([
                'request_id' => 'req_ideo_123',
                'status_url' => 'https://api.segmind.com/v2/requests/req_ideo_123/status',
                'response_url' => 'https://api.segmind.com/v2/requests/req_ideo_123',
            ], 200),
            'api.segmind.com/v2/requests/req_ideo_123/status' => Http::response([
                'status' => 'COMPLETED',
            ], 200),
            'api.segmind.com/v2/requests/req_ideo_123' => Http::response([
                'output' => base64_encode('fake-ideo-image-data'),
                'metrics' => ['inference_time' => 3.0, 'cost' => 0.12],
            ], 200),
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-edit', [
                'model' => 'ideogram-4.5-edit',
                'prompt' => 'Paint the wordmark RAMPWORKS across the deck',
                'input_image_url' => 'https://example.com/skateboard.jpg',
                'quality' => 'medium',
            ]);

        $response->assertOk()
            ->assertJsonPath('status', 'completed')
            ->assertJsonPath('generation.coins_spent', 12)
            ->assertJsonPath('generation.coins_remaining', 38);

        $this->assertEquals(38, $customer->fresh()->coins);
    }

    public function test_bria_extract_object_successful_generation(): void
    {
        $customer = Customer::factory()->create(['coins' => 50]);

        Http::fake([
            'api.segmind.com/v2/bria-extract-object' => Http::response([
                'request_id' => 'req_bria_123',
                'status_url' => 'https://api.segmind.com/v2/requests/req_bria_123/status',
                'response_url' => 'https://api.segmind.com/v2/requests/req_bria_123',
            ], 200),
            'api.segmind.com/v2/requests/req_bria_123/status' => Http::response([
                'status' => 'COMPLETED',
            ], 200),
            'api.segmind.com/v2/requests/req_bria_123' => Http::response([
                'output' => base64_encode('fake-bria-cutout-png'),
                'metrics' => ['inference_time' => 1.5, 'cost' => 0.04],
            ], 200),
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-edit', [
                'model' => 'bria-extract-object',
                'prompt' => 'sunglasses',
                'input_image_url' => 'https://example.com/portrait.jpg',
            ]);

        $response->assertOk()
            ->assertJsonPath('status', 'completed')
            ->assertJsonPath('generation.coins_spent', 6)
            ->assertJsonPath('generation.coins_remaining', 44);

        $this->assertEquals(44, $customer->fresh()->coins);
    }

    public function test_ideogram_4_5_text_to_image_generation(): void
    {
        $customer = Customer::factory()->create(['coins' => 50]);

        Http::fake([
            'api.segmind.com/v2/ideogram-4.5' => Http::response([
                'request_id' => 'req_t2i_123',
                'status_url' => 'https://api.segmind.com/v2/requests/req_t2i_123/status',
                'response_url' => 'https://api.segmind.com/v2/requests/req_t2i_123',
            ], 200),
            'api.segmind.com/v2/requests/req_t2i_123/status' => Http::response([
                'status' => 'COMPLETED',
            ], 200),
            'api.segmind.com/v2/requests/req_t2i_123' => Http::response([
                'output' => base64_encode('fake-t2i-image-data'),
                'metrics' => ['inference_time' => 2.0, 'cost' => 0.08],
            ], 200),
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/images', [
                'model' => 'ideogram-4.5',
                'prompt' => 'A coffee cup with the text MORNING BREW written on it',
            ]);

        $response->assertOk()
            ->assertJsonPath('status', 'completed')
            ->assertJsonPath('generation.coins_spent', 8)
            ->assertJsonPath('generation.coins_remaining', 42);

        $this->assertEquals(42, $customer->fresh()->coins);
    }

    public function test_wan_3_video_prime_1080p_generation(): void
    {
        $customer = Customer::factory()->create(['coins' => 100]);

        Http::fake([
            'api.segmind.com/v2/wan3.0-video-prime' => Http::response([
                'request_id' => 'req_vid_123',
                'status_url' => 'https://api.segmind.com/v2/requests/req_vid_123/status',
                'response_url' => 'https://api.segmind.com/v2/requests/req_vid_123',
            ], 200),
            'api.segmind.com/v2/requests/req_vid_123/status' => Http::response([
                'status' => 'COMPLETED',
            ], 200),
            'api.segmind.com/v2/requests/req_vid_123' => Http::response([
                'output' => ['https://example.com/video_1080p.mp4'],
                'metrics' => ['inference_time' => 10.0, 'cost' => 0.35],
            ], 200),
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-to-video', [
                'model' => 'wan3.0-video-prime',
                'prompt' => 'Slow pan over futuristic city',
                'image_url' => 'https://example.com/start_frame.jpg',
                'resolution' => '1080p',
            ]);

        $response->assertOk()
            ->assertJsonPath('status', 'completed')
            ->assertJsonPath('generation.coins_spent', 35)
            ->assertJsonPath('generation.coins_remaining', 65);

        $this->assertEquals(65, $customer->fresh()->coins);
    }

    public function test_ai_models_api_endpoint_returns_active_models_and_filters_by_type(): void
    {
        // 1. Fetch all active models
        $response = $this->getJson('/api/v1/ai-models');
        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'model_name',
                        'type',
                        'provider_name',
                        'coin_cost',
                        'resolution_costs',
                        'duration_costs',
                        'is_default',
                        'description',
                        'sort_order',
                    ],
                ],
            ]);

        $allModels = collect($response->json('data'));
        $this->assertNotEmpty($allModels);
        $this->assertTrue($allModels->contains('model_name', 'ideogram-4.5'));
        $this->assertTrue($allModels->contains('model_name', 'wan3.0-video-prime'));
        $this->assertTrue($allModels->contains('model_name', 'ideogram-4.5-edit'));

        // 2. Filter by generation type text-to-image
        $t2iResponse = $this->getJson('/api/v1/ai-models?type=text-to-image');
        $t2iResponse->assertOk();
        $t2iModels = collect($t2iResponse->json('data'));
        $this->assertTrue($t2iModels->every(fn ($m) => $m['type'] === 'text-to-image'));
        $this->assertTrue($t2iModels->contains('model_name', 'ideogram-4.5'));
        $this->assertFalse($t2iModels->contains('model_name', 'wan3.0-video-prime'));

        // 3. Filter by generation type image-to-video
        $i2vResponse = $this->getJson('/api/v1/ai-models?type=image-to-video');
        $i2vResponse->assertOk();
        $i2vModels = collect($i2vResponse->json('data'));
        $this->assertTrue($i2vModels->every(fn ($m) => $m['type'] === 'image-to-video'));
        $this->assertTrue($i2vModels->contains('model_name', 'wan3.0-video-prime'));
        $this->assertFalse($i2vModels->contains('model_name', 'ideogram-4.5'));

        // 4. Filter by generation type image-editing
        $editResponse = $this->getJson('/api/v1/ai-models?type=image-editing');
        $editResponse->assertOk();
        $editModels = collect($editResponse->json('data'));
        $this->assertTrue($editModels->every(fn ($m) => $m['type'] === 'image-editing'));
        $this->assertTrue($editModels->contains('model_name', 'ideogram-4.5-edit'));
        $this->assertTrue($editModels->contains('model_name', 'bria-extract-object'));
    }
}
