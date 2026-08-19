<?php

use App\Models\ApiRequestLog;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('admin can view the api logs page', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('slug', 'super-admin')->first());
    $this->actingAs($admin);

    $this->get(route('admin.api-logs.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/api-logs/index')
        );
});

test('api logs page shows logs', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('slug', 'super-admin')->first());
    $this->actingAs($admin);

    ApiRequestLog::create([
        'method' => 'POST',
        'path' => '/api/v1/ai/face-swap',
        'response_status' => 200,
        'duration_ms' => 1500,
    ]);

    $this->get(route('admin.api-logs.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/api-logs/index')
            ->has('logs.data', 1)
        );
});

test('api logs page filters by method', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('slug', 'super-admin')->first());
    $this->actingAs($admin);

    ApiRequestLog::create(['method' => 'GET', 'path' => '/api/v1/auth/me', 'response_status' => 200]);
    ApiRequestLog::create(['method' => 'POST', 'path' => '/api/v1/ai/face-swap', 'response_status' => 200]);

    $this->get(route('admin.api-logs.index', ['method' => 'GET']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/api-logs/index')
            ->has('logs.data', 1)
        );
});

test('guest is redirected from api logs', function () {
    $this->get(route('admin.api-logs.index'))
        ->assertStatus(302)
        ->assertRedirect(route('login'));
});

test('unauthorized admin gets 403', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->get(route('admin.api-logs.index'))
        ->assertForbidden();
});

test('api log show endpoint returns full details', function () {
    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('slug', 'super-admin')->first());
    $this->actingAs($admin);

    $log = ApiRequestLog::create([
        'method' => 'POST',
        'path' => '/api/v1/ai/face-swap',
        'response_status' => 200,
        'response_body' => ['status' => 'completed'],
        'duration_ms' => 1500,
    ]);

    $this->get(route('admin.api-logs.show', $log))
        ->assertOk()
        ->assertJsonPath('method', 'POST')
        ->assertJsonPath('response_body.status', 'completed');
});
