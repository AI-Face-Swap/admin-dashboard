<?php

namespace Tests\Feature;

use App\Models\Customer;
use Database\Seeders\AIProviderSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImageGenerationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
        $this->seed(AIProviderSeeder::class);

        Storage::fake('spaces');
    }

    /** Image generation creates a generation and returns 200 */
    public function test_image_generation_creates_generation(): void
    {
        $customer = Customer::factory()->create(['coins' => 200]);

        Http::fake([
            'api.segmind.com/v2/seedream-v5-lite-text-to-image' => Http::response([
                'request_id' => 'req_abc123',
                'status_url' => 'https://api.segmind.com/v2/requests/req_abc123/status',
                'response_url' => 'https://api.segmind.com/v2/requests/req_abc123',
            ], 200),
            'api.segmind.com/v2/requests/req_abc123/status' => Http::response([
                'status' => 'COMPLETED',
            ], 200),
            'api.segmind.com/v2/requests/req_abc123' => Http::response([
                'output' => base64_encode('fake-image-data'),
                'metrics' => ['inference_time' => 1.5, 'cost' => 0.02],
            ], 200),
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/images', [
                'prompt' => 'A superhero flying over a city',
                'model' => 'seedream-v5-lite-text-to-image',
            ]);

        $response->assertOk()->assertJson([
            'status' => 'completed',
            'generation' => [
                'operation' => 'image-generation',
                'status' => 'completed',
            ],
        ]);
    }

    /** Prompt is required */
    public function test_prompt_is_required(): void
    {
        $customer = Customer::factory()->create();

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/images', []);

        $response->assertUnprocessable()->assertJsonValidationErrors('prompt');
    }

    /** Guests get 401 */
    public function test_guests_get_401(): void
    {
        $response = $this->postJson('/api/v1/ai/images', [
            'prompt' => 'Test image',
        ]);

        $response->assertUnauthorized();
    }

    /** Customer with insufficient coins gets 402 */
    public function test_insufficient_coins_returns_402(): void
    {
        $customer = Customer::factory()->create(['coins' => 0]);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/images', [
                'prompt' => 'A beautiful landscape',
            ]);

        $response->assertStatus(402);
    }

    /** Validation rejects invalid model */
    public function test_invalid_model_is_rejected(): void
    {
        $customer = Customer::factory()->create();

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/images', [
                'prompt' => 'Test',
                'model' => 12345, // not a string
            ]);

        $response->assertUnprocessable();
    }

    /** Validation accepts valid parameters */
    public function test_valid_parameters_are_accepted(): void
    {
        $customer = Customer::factory()->create(['coins' => 200]);

        Http::fake([
            'api.segmind.com/v2/qwen-image-3' => Http::response([
                'request_id' => 'req_xyz789',
                'status_url' => 'https://api.segmind.com/v2/requests/req_xyz789/status',
                'response_url' => 'https://api.segmind.com/v2/requests/req_xyz789',
            ], 200),
            'api.segmind.com/v2/requests/req_xyz789/status' => Http::response([
                'status' => 'COMPLETED',
            ], 200),
            'api.segmind.com/v2/requests/req_xyz789' => Http::response([
                'output' => base64_encode('fake-image-data'),
                'metrics' => ['inference_time' => 0.8],
            ], 200),
        ]);

        Http::fake([
            'api.segmind.com/v2/*' => Http::response([
                'request_id' => 'req_xyz789',
                'status_url' => 'https://api.segmind.com/v2/requests/req_xyz789/status',
                'response_url' => 'https://api.segmind.com/v2/requests/req_xyz789',
            ], 200),
            'api.segmind.com/v2/requests/req_xyz789/status' => Http::response([
                'status' => 'COMPLETED',
            ], 200),
            'api.segmind.com/v2/requests/req_xyz789' => Http::response([
                'output' => base64_encode('fake-image-data'),
                'metrics' => ['inference_time' => 0.8],
            ], 200),
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/images', [
                'prompt' => 'A cat in space',
                'negative_prompt' => 'blurry',
                'model' => 'qwen-image-3',
                'width' => 1024,
                'height' => 768,
                'seed' => 42,
                'image_format' => 'png',
                'quality' => 95,
            ]);

        $response->assertOk();
    }
}
