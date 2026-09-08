<?php

use App\Models\AIGeneration;
use App\Models\AIProvider;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

test('a customer can delete their own generation', function () {
    Storage::fake('spaces');
    Storage::disk('spaces')->put('generations/dummy.mp4', 'dummy content');

    $customer = Customer::factory()->create();
    $provider = AIProvider::create(['name' => 'Test', 'slug' => 'test', 'is_active' => true]);
    
    $generation = AIGeneration::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'operation' => AIGeneration::OPERATION_IMAGE_TO_VIDEO,
        'status' => AIGeneration::STATUS_COMPLETED,
        'output_metadata' => ['generations/dummy.mp4'],
    ]);

    \Laravel\Sanctum\Sanctum::actingAs($customer);
    $response = $this->deleteJson("/api/v1/ai/generations/{$generation->id}");

    $response->assertStatus(200);
    $this->assertDatabaseMissing('ai_generations', ['id' => $generation->id]);
    Storage::disk('spaces')->assertMissing('generations/dummy.mp4');
});

test('an admin can delete any generation', function () {
    Storage::fake('spaces');
    Storage::disk('spaces')->put('generations/dummy2.mp4', 'dummy content');

    $customer = Customer::factory()->create();
    $admin = User::factory()->create();
    $provider = AIProvider::create(['name' => 'Test', 'slug' => 'test', 'is_active' => true]);
    
    $generation = AIGeneration::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'operation' => AIGeneration::OPERATION_IMAGE_TO_VIDEO,
        'status' => AIGeneration::STATUS_COMPLETED,
        'output_metadata' => ['generations/dummy2.mp4'],
    ]);

    $this->actingAs($admin);
    $response = $this->delete("/api/v1/ai/generations/{$generation->id}");

    $response->assertRedirect(); // since we added Inertia fallback
    $this->assertDatabaseMissing('ai_generations', ['id' => $generation->id]);
    Storage::disk('spaces')->assertMissing('generations/dummy2.mp4');
});

test('a customer cannot delete another customer generation', function () {
    $customer1 = Customer::factory()->create();
    $customer2 = Customer::factory()->create();
    $provider = AIProvider::create(['name' => 'Test', 'slug' => 'test', 'is_active' => true]);
    
    $generation = AIGeneration::create([
        'customer_id' => $customer1->id,
        'provider_id' => $provider->id,
        'operation' => AIGeneration::OPERATION_IMAGE_TO_VIDEO,
        'status' => AIGeneration::STATUS_COMPLETED,
        'output_metadata' => [],
    ]);

    \Laravel\Sanctum\Sanctum::actingAs($customer2); $response = $this->deleteJson("/api/v1/ai/generations/{$generation->id}");

    $response->assertStatus(403);
    $this->assertDatabaseHas('ai_generations', ['id' => $generation->id]);
});
