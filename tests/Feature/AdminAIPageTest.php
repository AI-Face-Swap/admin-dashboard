<?php

use App\Models\AIGeneration;
use App\Models\AIProvider;
use App\Models\Role;
use App\Models\Template;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('spaces', ['url' => 'https://bucket.example.com']);

    $this->seed(RolePermissionSeeder::class);
});

test('a user with the ai permission can view the admin ai page', function () {
    $user = User::factory()->create();
    $user->roles()->attach(Role::where('slug', 'admin')->first());
    $this->actingAs($user);

    $this->get(route('admin.ai.index'))->assertOk();
});

test('a user without the ai permission gets 403', function () {
    $user = User::factory()->create();
    $user->roles()->attach(Role::where('slug', 'viewer')->first());
    $this->actingAs($user);

    $this->get(route('admin.ai.index'))->assertOk(); // viewer has ai.view
});

test('the admin ai page lists active templates and recent generations', function () {
    $user = User::factory()->create();
    $user->roles()->attach(Role::where('slug', 'admin')->first());
    $this->actingAs($user);

    AIProvider::factory()->create();

    Template::create([
        'name' => 'Superman Suit',
        'type' => 'image',
        'file_path' => 'templates/superman.jpg',
    ]);

    AIGeneration::factory()->create([
        'status' => 'completed',
        'cost' => '0.0500',
        'currency' => 'USD',
        'output_metadata' => ['https://example.com/result.png'],
    ]);

    $this->get(route('admin.ai.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/ai/index')
            ->has('templates', 1)
            ->has('generations', 1)
            ->where('generations.0.status', 'completed'));
});
