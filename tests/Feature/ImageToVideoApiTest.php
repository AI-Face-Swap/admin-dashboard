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
}
