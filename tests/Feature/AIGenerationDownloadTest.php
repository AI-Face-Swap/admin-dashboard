<?php

use App\Models\AIGeneration;
use App\Models\AIProvider;
use App\Models\Customer;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('a customer can download their own generation output', function () {
    Storage::fake('spaces');
    Storage::disk('spaces')->put('generations/output-1.png', 'fake image binary data');

    $customer = Customer::factory()->create();
    $provider = AIProvider::create(['name' => 'Test', 'slug' => 'test', 'is_active' => true]);

    $generation = AIGeneration::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'operation' => 'face-swap',
        'status' => AIGeneration::STATUS_COMPLETED,
        'output_metadata' => ['generations/output-1.png'],
    ]);

    Sanctum::actingAs($customer);
    $response = $this->get("/api/v1/ai/generations/{$generation->id}/download");

    $response->assertOk();
    $response->assertHeader('content-disposition');
});

test('an admin can download any customer generation output via api', function () {
    Storage::fake('spaces');
    Storage::disk('spaces')->put('generations/output-2.mp4', 'fake video data');

    $customer = Customer::factory()->create();
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('slug', 'super-admin')->first());
    $provider = AIProvider::create(['name' => 'Test', 'slug' => 'test', 'is_active' => true]);

    $generation = AIGeneration::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'operation' => 'video-face-swap',
        'status' => AIGeneration::STATUS_COMPLETED,
        'output_metadata' => ['generations/output-2.mp4'],
    ]);

    $response = $this->actingAs($admin)->get("/api/v1/ai/generations/{$generation->id}/download");

    $response->assertOk();
    $response->assertHeader('content-disposition');
});

test('an admin can download generation output via admin web route', function () {
    Storage::fake('spaces');
    Storage::disk('spaces')->put('generations/output-3.png', 'fake image data');

    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('slug', 'super-admin')->first());
    $provider = AIProvider::create(['name' => 'Test', 'slug' => 'test', 'is_active' => true]);

    $generation = AIGeneration::create([
        'user_id' => $admin->id,
        'provider_id' => $provider->id,
        'operation' => 'image-editing',
        'status' => AIGeneration::STATUS_COMPLETED,
        'output_metadata' => ['generations/output-3.png'],
    ]);

    $response = $this->actingAs($admin)->get("/admin/ai/generations/{$generation->id}/download");

    $response->assertOk();
    $response->assertHeader('content-disposition');
});

test('customer cannot download another customer generation', function () {
    Storage::fake('spaces');
    Storage::disk('spaces')->put('generations/output-4.png', 'fake image data');

    $customer1 = Customer::factory()->create();
    $customer2 = Customer::factory()->create();
    $provider = AIProvider::create(['name' => 'Test', 'slug' => 'test', 'is_active' => true]);

    $generation = AIGeneration::create([
        'customer_id' => $customer1->id,
        'provider_id' => $provider->id,
        'operation' => 'image-generation',
        'status' => AIGeneration::STATUS_COMPLETED,
        'output_metadata' => ['generations/output-4.png'],
    ]);

    Sanctum::actingAs($customer2);
    $response = $this->get("/api/v1/ai/generations/{$generation->id}/download");

    $response->assertStatus(403);
});
