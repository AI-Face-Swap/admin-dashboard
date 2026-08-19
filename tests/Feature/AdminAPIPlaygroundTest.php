<?php

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('admin can view the api playground page', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('slug', 'super-admin')->first());
    $this->actingAs($admin);

    $this->get(route('admin.api-playground.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/api-playground/index')
        );
});

test('guest is redirected from api playground', function () {
    $this->get(route('admin.api-playground.index'))
        ->assertStatus(302)
        ->assertRedirect(route('login'));
});

test('unauthorized admin gets 403', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->get(route('admin.api-playground.index'))
        ->assertForbidden();
});

test('admin without api.playground permission gets 403', function () {
    $admin = User::factory()->create();
    $role = Role::where('slug', 'viewer')->first();
    if ($role) {
        $admin->roles()->attach($role);
    }
    $this->actingAs($admin);

    $this->get(route('admin.api-playground.index'))
        ->assertForbidden();
});
