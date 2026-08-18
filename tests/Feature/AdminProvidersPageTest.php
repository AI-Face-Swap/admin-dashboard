<?php

use App\Models\AIProvider;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('admin can view the providers page', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('slug', 'super-admin')->first());
    $this->actingAs($admin);

    AIProvider::create(['name' => 'Segmind', 'slug' => 'segmind']);

    $this->get(route('admin.providers.index'))
        ->assertOk();
});

test('providers page lists all providers with stats', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('slug', 'super-admin')->first());
    $this->actingAs($admin);

    $segmind = AIProvider::create(['name' => 'Segmind', 'slug' => 'segmind']);
    $replicate = AIProvider::create(['name' => 'Replicate', 'slug' => 'replicate', 'is_active' => false]);

    $this->get(route('admin.providers.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/providers/index')
            ->has('providers', 2)
        );
});

test('guest is redirected from providers page', function () {
    $this->get(route('admin.providers.index'))
        ->assertStatus(302)
        ->assertRedirect(route('login'));
});

test('unauthorized admin gets 403', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->get(route('admin.providers.index'))
        ->assertForbidden();
});

test('toggle flips provider active state', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('slug', 'super-admin')->first());
    $this->actingAs($admin);

    $provider = AIProvider::create(['name' => 'Segmind', 'slug' => 'segmind', 'is_active' => true]);

    $this->patchJson(route('admin.providers.toggle', $provider))
        ->assertOk()
        ->assertJson(['is_active' => false]);

    expect($provider->fresh()->is_active)->toBeFalse();
});

test('toggle activates an inactive provider', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('slug', 'super-admin')->first());
    $this->actingAs($admin);

    $provider = AIProvider::create(['name' => 'Segmind', 'slug' => 'segmind', 'is_active' => false]);

    $this->patchJson(route('admin.providers.toggle', $provider))
        ->assertOk()
        ->assertJson(['is_active' => true]);

    expect($provider->fresh()->is_active)->toBeTrue();
});
