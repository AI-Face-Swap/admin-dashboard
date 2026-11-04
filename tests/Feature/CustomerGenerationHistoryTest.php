<?php

use App\Models\AIGeneration;
use App\Models\AIProvider;
use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('customer generations history excludes chat operations from both list and stats', function () {
    $customer = Customer::factory()->create();
    $provider = AIProvider::create(['name' => 'Test Provider', 'slug' => 'test-provider', 'is_active' => true]);

    // Non-chat operations
    $imageGen = AIGeneration::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'operation' => AIGeneration::OPERATION_IMAGE,
        'status' => AIGeneration::STATUS_COMPLETED,
    ]);

    $videoGen = AIGeneration::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'operation' => AIGeneration::OPERATION_IMAGE_TO_VIDEO,
        'status' => AIGeneration::STATUS_PROCESSING,
    ]);

    // Chat operations (should be excluded from /history)
    AIGeneration::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'operation' => AIGeneration::OPERATION_CHAT,
        'status' => AIGeneration::STATUS_COMPLETED,
    ]);

    AIGeneration::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'operation' => AIGeneration::OPERATION_CHAT,
        'status' => AIGeneration::STATUS_FAILED,
    ]);

    Sanctum::actingAs($customer);

    $response = $this->getJson('/api/v1/customer/generations');

    $response->assertStatus(200)
        ->assertJsonPath('stats.total', 2)
        ->assertJsonPath('stats.completed', 1)
        ->assertJsonPath('stats.processing', 1)
        ->assertJsonPath('stats.failed', 0)
        ->assertJsonCount(2, 'generations.data');

    $operations = collect($response->json('generations.data'))->pluck('operation')->all();
    expect($operations)->not->toContain(AIGeneration::OPERATION_CHAT)
        ->and($operations)->toContain(AIGeneration::OPERATION_IMAGE)
        ->and($operations)->toContain(AIGeneration::OPERATION_IMAGE_TO_VIDEO);
});

test('customer generations history groups image and video type filters and supports pagination', function () {
    $customer = Customer::factory()->create();
    $provider = AIProvider::create(['name' => 'Test Provider', 'slug' => 'test-provider', 'is_active' => true]);

    AIGeneration::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'operation' => AIGeneration::OPERATION_IMAGE,
        'status' => AIGeneration::STATUS_COMPLETED,
    ]);

    AIGeneration::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'operation' => AIGeneration::OPERATION_IMAGE_EDIT,
        'status' => AIGeneration::STATUS_COMPLETED,
    ]);

    AIGeneration::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'operation' => AIGeneration::OPERATION_VIDEO_FACE_SWAP,
        'status' => AIGeneration::STATUS_COMPLETED,
    ]);

    AIGeneration::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'operation' => AIGeneration::OPERATION_IMAGE_TO_VIDEO,
        'status' => AIGeneration::STATUS_COMPLETED,
    ]);

    Sanctum::actingAs($customer);

    // Filter by image-generation should return both image-generation and image-editing
    $imageResponse = $this->getJson('/api/v1/customer/generations?type=image-generation');
    $imageResponse->assertStatus(200)->assertJsonCount(2, 'generations.data');

    // Filter by video-face-swap should return both video-face-swap and image-to-video
    $videoResponse = $this->getJson('/api/v1/customer/generations?type=video-face-swap');
    $videoResponse->assertStatus(200)->assertJsonCount(2, 'generations.data');

    // Pagination for infinite scroll
    $page1 = $this->getJson('/api/v1/customer/generations?per_page=2&page=1');
    $page1->assertStatus(200)
        ->assertJsonCount(2, 'generations.data')
        ->assertJsonPath('generations.meta.current_page', 1)
        ->assertJsonPath('generations.meta.last_page', 2);
});
