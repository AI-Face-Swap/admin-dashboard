<?php

use App\Models\AIModel;
use App\Models\GenerationType;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('admin can view ai models list', function () {
    $user = User::factory()->create();
    $user->roles()->attach(Role::where('slug', 'super-admin')->first());

    $response = $this->actingAs($user)->get('/admin/ai-models');

    $response->assertStatus(200);
});

test('admin can create ai model with pricing and tiers', function () {
    $user = User::factory()->create();
    $user->roles()->attach(Role::where('slug', 'super-admin')->first());

    $genType = GenerationType::firstOrCreate(
        ['slug' => 'image-editing'],
        ['name' => 'Image Editing', 'sort_order' => 1]
    );

    $response = $this->actingAs($user)->post('/admin/ai-models', [
        'generation_type_id' => $genType->id,
        'provider_name' => 'segmind',
        'model_name' => 'test-model-key',
        'name' => 'Test Model Name',
        'coin_cost' => 14,
        'resolution_costs' => ['1K' => 14, '2K' => 20],
        'duration_costs' => ['5s' => 14, '10s' => 28],
        'is_active' => true,
        'is_default' => true,
        'sort_order' => 1,
    ]);

    $response->assertRedirect('/admin/ai-models');

    $this->assertDatabaseHas('ai_models', [
        'model_name' => 'test-model-key',
        'name' => 'Test Model Name',
        'coin_cost' => 14,
        'is_active' => 1,
        'is_default' => 1,
    ]);
});

test('admin can update ai model', function () {
    $user = User::factory()->create();
    $user->roles()->attach(Role::where('slug', 'super-admin')->first());

    $model = AIModel::create([
        'provider_name' => 'segmind',
        'model_name' => 'updatable-model',
        'name' => 'Old Name',
        'coin_cost' => 10,
        'sort_order' => 0,
    ]);

    $response = $this->actingAs($user)->put("/admin/ai-models/{$model->id}", [
        'provider_name' => 'segmind',
        'model_name' => 'updatable-model',
        'name' => 'New Name',
        'coin_cost' => 25,
        'sort_order' => 2,
        'is_active' => true,
        'is_default' => false,
    ]);

    $response->assertRedirect('/admin/ai-models');

    $this->assertDatabaseHas('ai_models', [
        'id' => $model->id,
        'name' => 'New Name',
        'coin_cost' => 25,
    ]);
});

test('api coin-costs returns dynamic models list', function () {
    $response = $this->getJson('/api/v1/coin-costs');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'image_generation',
            'image_to_video_480p',
            'image_to_video_720p',
            'image_edit',
            'models',
        ]);
});
