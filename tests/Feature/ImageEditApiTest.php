<?php

namespace Tests\Feature;

use App\Models\AIGeneration;
use App\Models\Customer;
use App\Models\Role;
use App\Models\Template;
use App\Models\User;
use Database\Seeders\AIProviderSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImageEditApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(AIProviderSeeder::class);

        Storage::fake('spaces');
    }

    public function test_flux_kontext_dev_creates_completed_generation(): void
    {
        $customer = Customer::factory()->create(['coins' => 100]);

        Http::fake([
            'api.segmind.com/v2/flux-kontext-dev' => Http::response([
                'request_id' => 'req_flux_123',
                'status_url' => 'https://api.segmind.com/v2/requests/req_flux_123/status',
                'response_url' => 'https://api.segmind.com/v2/requests/req_flux_123',
            ], 200),
            'api.segmind.com/v2/requests/req_flux_123/status' => Http::response([
                'status' => 'COMPLETED',
            ], 200),
            'api.segmind.com/v2/requests/req_flux_123' => Http::response([
                'output' => base64_encode('fake-edited-image-data'),
                'metrics' => ['inference_time' => 2.5, 'cost' => 0.04],
            ], 200),
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-edit', [
                'model' => 'flux-kontext-dev',
                'prompt' => 'Replace background with neon city',
                'input_image_url' => 'https://example.com/source.jpg',
                'aspect_ratio' => 'match_input_image',
                'guidance' => 7.5,
                'num_inference_steps' => 30,
                'output_format' => 'png',
                'output_quality' => 90,
            ]);

        $response->assertOk()->assertJson([
            'status' => 'completed',
            'generation' => [
                'operation' => 'image-editing',
                'status' => 'completed',
                'cost' => '0.0400',
                'coins_spent' => 10,
                'coins_remaining' => 90,
            ],
        ]);

        $this->assertEquals(90, $customer->fresh()->coins);
        $this->assertDatabaseHas('ai_generations', [
            'operation' => 'image-editing',
            'status' => 'completed',
            'coins_spent' => 10,
        ]);
    }

    public function test_multi_image_kontext_max_with_uploaded_files(): void
    {
        $customer = Customer::factory()->create(['coins' => 100]);

        Http::fake([
            'api.segmind.com/v2/multi-image-kontext-max' => Http::response([
                'request_id' => 'req_multi_456',
                'status_url' => 'https://api.segmind.com/v2/requests/req_multi_456/status',
                'response_url' => 'https://api.segmind.com/v2/requests/req_multi_456',
            ], 200),
            'api.segmind.com/v2/requests/req_multi_456/status' => Http::response([
                'status' => 'COMPLETED',
            ], 200),
            'api.segmind.com/v2/requests/req_multi_456' => Http::response([
                'output' => base64_encode('fake-multi-image-data'),
                'metrics' => ['inference_time' => 3.2, 'cost' => 0.05],
            ], 200),
        ]);

        $img1 = UploadedFile::fake()->image('base.jpg');
        $img2 = UploadedFile::fake()->image('dress.png');

        $response = $this->actingAs($customer, 'sanctum')
            ->post('/api/v1/ai/image-edit', [
                'model' => 'multi-image-kontext-max',
                'prompt' => 'Put the dress on the woman',
                'input_image_1' => $img1,
                'input_image_2' => $img2,
                'aspect_ratio' => '1:1',
                'output_format' => 'jpg',
                'safety_tolerance' => 1,
            ]);

        $response->assertOk()->assertJson([
            'status' => 'completed',
            'generation' => [
                'operation' => 'image-editing',
                'status' => 'completed',
            ],
        ]);
    }

    public function test_validation_rejects_missing_image_sources(): void
    {
        $customer = Customer::factory()->create(['coins' => 100]);

        // Missing input_image for flux-kontext-dev
        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-edit', [
                'model' => 'flux-kontext-dev',
                'prompt' => 'Make it sunny',
            ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['input_image']);

        // Missing input_image_1 and input_image_2 for multi-image-kontext-max
        $response2 = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-edit', [
                'model' => 'multi-image-kontext-max',
                'prompt' => 'Blend images',
            ]);

        $response2->assertUnprocessable()
            ->assertJsonValidationErrors(['input_image_1', 'input_image_2']);
    }

    public function test_insufficient_coins_returns_402(): void
    {
        $customer = Customer::factory()->create(['coins' => 5]); // needs 10

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-edit', [
                'model' => 'flux-kontext-dev',
                'prompt' => 'Some edit',
                'input_image_url' => 'https://example.com/source.jpg',
            ]);

        $response->assertStatus(402);
    }

    public function test_save_to_templates_from_image_edit_generation(): void
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('slug', 'super-admin')->first());

        // Create a completed image generation
        $filePath = 'generations/test-image.png';
        Storage::disk('spaces')->put($filePath, 'fake-content');

        $generation = AIGeneration::create([
            'user_id' => $user->id,
            'provider_id' => 1,
            'operation' => AIGeneration::OPERATION_IMAGE_EDIT,
            'status' => AIGeneration::STATUS_COMPLETED,
            'output_metadata' => [Storage::disk('spaces')->url($filePath)],
            'input_metadata' => [
                'prompt' => 'A beautiful watercolor landscape',
            ],
        ]);

        $response = $this->actingAs($user)
            ->post("/admin/templates/from-generation/{$generation->id}");

        $response->assertRedirect();
        $this->assertDatabaseHas('templates', [
            'type' => Template::TYPE_IMAGE,
            'prompt' => 'A beautiful watercolor landscape',
        ]);
    }

    public function test_seedream_v5_lite_creates_completed_generation(): void
    {
        $customer = Customer::factory()->create(['coins' => 100]);

        Http::fake([
            'api.segmind.com/v2/seedream-v5-lite-image-to-image' => Http::response([
                'request_id' => 'req_seedream_789',
                'status_url' => 'https://api.segmind.com/v2/requests/req_seedream_789/status',
                'response_url' => 'https://api.segmind.com/v2/requests/req_seedream_789',
            ], 200),
            'api.segmind.com/v2/requests/req_seedream_789/status' => Http::response([
                'status' => 'COMPLETED',
            ], 200),
            'api.segmind.com/v2/requests/req_seedream_789' => Http::response([
                'output' => ['https://images.segmind.com/generations/output_seedream.jpg'],
                'metrics' => ['inference_time' => 4.1, 'cost' => 0.035],
            ], 200),
            'images.segmind.com/generations/output_seedream.jpg' => Http::response('fake-img-bytes', 200),
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-edit', [
                'model' => 'seedream-v5-lite-image-to-image',
                'prompt' => 'Fashion portrait against stone wall',
                'image_input' => ['https://example.com/model.jpg'],
                'size' => '3K',
                'optimize_prompt' => 'fast',
                'watermark' => 'false',
            ]);

        $response->assertOk()->assertJson([
            'status' => 'completed',
            'generation' => [
                'operation' => 'image-editing',
                'status' => 'completed',
            ],
        ]);
    }

    public function test_gpt_image_1_5_edit_creates_completed_generation(): void
    {
        $customer = Customer::factory()->create(['coins' => 100]);

        Http::fake([
            'api.segmind.com/v2/gpt-image-1.5-edit' => Http::response([
                'request_id' => 'req_gpt_999',
                'status_url' => 'https://api.segmind.com/v2/requests/req_gpt_999/status',
                'response_url' => 'https://api.segmind.com/v2/requests/req_gpt_999',
            ], 200),
            'api.segmind.com/v2/requests/req_gpt_999/status' => Http::response([
                'status' => 'COMPLETED',
            ], 200),
            'api.segmind.com/v2/requests/req_gpt_999' => Http::response([
                'output' => base64_encode('fake-gpt-image-data'),
                'metrics' => ['inference_time' => 5.0, 'cost' => 0.08],
            ], 200),
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-edit', [
                'model' => 'gpt-image-1.5-edit',
                'prompt' => 'Add natural daylight and shadows',
                'image_urls' => ['https://example.com/source.png'],
                'quality' => 'high',
                'background' => 'opaque',
                'output_compression' => 100,
            ]);

        $response->assertOk()->assertJson([
            'status' => 'completed',
            'generation' => [
                'operation' => 'image-editing',
                'status' => 'completed',
            ],
        ]);
    }

    public function test_kling_3_image2image_creates_completed_generation(): void
    {
        $customer = Customer::factory()->create(['coins' => 100]);

        Http::fake([
            'api.segmind.com/v2/kling-3-image2image' => Http::response([
                'request_id' => 'req_kling_111',
                'status_url' => 'https://api.segmind.com/v2/requests/req_kling_111/status',
                'response_url' => 'https://api.segmind.com/v2/requests/req_kling_111',
            ], 200),
            'api.segmind.com/v2/requests/req_kling_111/status' => Http::response([
                'status' => 'COMPLETED',
            ], 200),
            'api.segmind.com/v2/requests/req_kling_111' => Http::response([
                'output' => base64_encode('fake-kling-image-data'),
                'metrics' => ['inference_time' => 6.2, 'cost' => 0.06],
            ], 200),
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-edit', [
                'model' => 'kling-3-image2image',
                'prompt' => 'Cinematic studio lighting portrait',
                'image_url' => 'https://example.com/source.jpg',
                'resolution' => '1K',
                'aspect_ratio' => '16:9',
            ]);

        $response->assertOk()->assertJson([
            'status' => 'completed',
            'generation' => [
                'operation' => 'image-editing',
                'status' => 'completed',
            ],
        ]);
    }

    public function test_nano_banana_pro_creates_completed_generation(): void
    {
        $customer = Customer::factory()->create(['coins' => 100]);

        Http::fake([
            'api.segmind.com/v2/nano-banana-pro' => Http::response([
                'request_id' => 'req_nano_222',
                'status_url' => 'https://api.segmind.com/v2/requests/req_nano_222/status',
                'response_url' => 'https://api.segmind.com/v2/requests/req_nano_222',
            ], 200),
            'api.segmind.com/v2/requests/req_nano_222/status' => Http::response([
                'status' => 'COMPLETED',
            ], 200),
            'api.segmind.com/v2/requests/req_nano_222' => Http::response([
                'output' => base64_encode('fake-nano-banana-data'),
                'metrics' => ['inference_time' => 3.8, 'cost' => 0.05],
            ], 200),
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/image-edit', [
                'model' => 'nano-banana-pro',
                'prompt' => 'Warm vintage film look',
                'image_urls' => ['https://example.com/source.jpg'],
                'system_prompt' => 'You are a professional color grader.',
                'output_resolution' => '4K',
            ]);

        $response->assertOk()->assertJson([
            'status' => 'completed',
            'generation' => [
                'operation' => 'image-editing',
                'status' => 'completed',
            ],
        ]);
    }
}
