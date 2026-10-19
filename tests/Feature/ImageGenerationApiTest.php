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

    /** Image generation creates a queued generation and returns 202 */
    public function test_image_generation_creates_generation(): void
    {
        \Illuminate\Support\Facades\Queue::fake();

        $customer = Customer::factory()->create(['coins' => 200]);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/images', [
                'prompt' => 'A superhero flying over a city',
                'model' => 'seedream-v5-lite-text-to-image',
            ]);

        $response->assertStatus(202)->assertJson([
            'status' => 'queued',
            'generation' => [
                'operation' => 'image-generation',
                'status' => 'queued',
            ],
        ]);
    }

    /** Image generation dispatches queued job */
    public function test_image_generation_dispatches_queued_job(): void
    {
        \Illuminate\Support\Facades\Queue::fake();

        $customer = Customer::factory()->create(['coins' => 200]);
        \Illuminate\Support\Facades\Cache::put("customer_points_{$customer->central_auth_uuid}", 200, 30);

        \Illuminate\Support\Facades\Http::fake([
            '*/api/v1/s2s/points*' => \Illuminate\Support\Facades\Http::response(['success' => true, 'points' => 195], 200),
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/images', [
                'prompt' => 'A magical forest with glowing fireflies',
                'model' => 'seedream-v5-lite-text-to-image',
                'client_idempotency_token' => 'tok_async_img_123',
            ]);

        $response->assertStatus(202)
            ->assertJsonPath('status', 'queued')
            ->assertJsonPath('generation.status', 'queued');

        \Illuminate\Support\Facades\Queue::assertPushed(\App\Jobs\ProcessImageGeneration::class);

        // Repeated request with same token returns idempotent duplicate without re-dispatching
        $duplicateResponse = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/ai/images', [
                'prompt' => 'A magical forest with glowing fireflies',
                'model' => 'seedream-v5-lite-text-to-image',
                'client_idempotency_token' => 'tok_async_img_123',
            ]);

        $duplicateResponse->assertStatus(202)
            ->assertJsonPath('idempotency.duplicate', true);
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
        \Illuminate\Support\Facades\Queue::fake();

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

        $response->assertStatus(202);
    }

    /** ProcessImageGeneration job executes and completes generation */
    public function test_process_image_generation_job_executes_and_completes(): void
    {
        $customer = Customer::factory()->create(['coins' => 100]);
        \Illuminate\Support\Facades\Cache::put("customer_points_{$customer->central_auth_uuid}", 100, 30);

        Http::fake([
            'api.segmind.com/v2/seedream-v5-lite-text-to-image' => Http::response([
                'request_id' => 'req_job_123',
                'status_url' => 'https://api.segmind.com/v2/requests/req_job_123/status',
                'response_url' => 'https://api.segmind.com/v2/requests/req_job_123',
            ], 200),
            'api.segmind.com/v2/requests/req_job_123/status' => Http::response(['status' => 'COMPLETED'], 200),
            'api.segmind.com/v2/requests/req_job_123' => Http::response([
                'output' => base64_encode('fake-image-data'),
                'metrics' => ['inference_time' => 1.2, 'cost' => 0.01],
            ], 200),
            '*/api/v1/s2s/points*' => Http::response(['success' => true, 'points' => 95], 200),
        ]);

        $provider = \App\Models\AIProvider::where('slug', 'segmind')->first();

        $generation = \App\Models\AIGeneration::create([
            'customer_id' => $customer->id,
            'provider_id' => $provider?->id ?? 1,
            'operation' => \App\Models\AIGeneration::OPERATION_IMAGE,
            'status' => \App\Models\AIGeneration::STATUS_QUEUED,
            'input_metadata' => ['prompt' => 'A sunset over mountains'],
        ]);

        $job = new \App\Jobs\ProcessImageGeneration(
            generationId: $generation->id,
            payload: ['prompt' => 'A sunset over mountains'],
            customerId: $customer->id,
            pointCost: 5,
            model: 'seedream-v5-lite-text-to-image'
        );

        $job->handle(app(\App\AI\Services\AIService::class));

        $generation->refresh();
        $this->assertEquals(\App\Models\AIGeneration::STATUS_COMPLETED, $generation->status);
        $this->assertEquals(5, $generation->points_spent);
        $this->assertNotEmpty($generation->output_metadata);
    }

    /** ProcessImageGeneration job refunds points on failure */
    public function test_process_image_generation_job_refunds_on_failure(): void
    {
        $customer = Customer::factory()->create(['coins' => 100]);
        \Illuminate\Support\Facades\Cache::put("customer_points_{$customer->central_auth_uuid}", 100, 30);

        Http::fake([
            'api.segmind.com/v2/seedream-v5-lite-text-to-image' => Http::response([
                'request_id' => 'req_fail_123',
                'status_url' => 'https://api.segmind.com/v2/requests/req_fail_123/status',
                'response_url' => 'https://api.segmind.com/v2/requests/req_fail_123',
            ], 200),
            'api.segmind.com/v2/requests/req_fail_123/status' => Http::response(['status' => 'FAILED', 'error' => 'GPU out of memory'], 200),
            '*/api/v1/s2s/points*' => Http::response(['success' => true, 'points' => 100], 200),
        ]);

        $provider = \App\Models\AIProvider::where('slug', 'segmind')->first();

        $generation = \App\Models\AIGeneration::create([
            'customer_id' => $customer->id,
            'provider_id' => $provider?->id ?? 1,
            'operation' => \App\Models\AIGeneration::OPERATION_IMAGE,
            'status' => \App\Models\AIGeneration::STATUS_QUEUED,
            'points_spent' => 5,
            'input_metadata' => ['prompt' => 'A failing test image'],
        ]);

        $job = new \App\Jobs\ProcessImageGeneration(
            generationId: $generation->id,
            payload: ['prompt' => 'A failing test image'],
            customerId: $customer->id,
            pointCost: 5,
            model: 'seedream-v5-lite-text-to-image'
        );

        try {
            $job->handle(app(\App\AI\Services\AIService::class));
            $this->fail('Expected exception was not thrown');
        } catch (\Throwable $e) {
            // Expected
        }

        $generation->refresh();
        $this->assertEquals(\App\Models\AIGeneration::STATUS_FAILED, $generation->status);
        $this->assertEquals(5, $generation->points_refunded);
        $this->assertNotNull($generation->refunded_at);
    }
}
