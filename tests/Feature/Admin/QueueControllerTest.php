<?php

use App\Jobs\ProcessImageGeneration;
use App\Models\AIGeneration;
use App\Models\Customer;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('admin can view queue monitor with metrics and generations', function () {
    $user = User::factory()->create();
    $user->roles()->attach(Role::where('slug', 'super-admin')->first());

    $customer = Customer::factory()->create(['name' => 'John Queue', 'email' => 'john@queue.com']);

    AIGeneration::factory()->create([
        'customer_id' => $customer->id,
        'operation' => 'image-generation',
        'status' => 'queued',
        'coins_spent' => 5,
    ]);

    AIGeneration::factory()->create([
        'customer_id' => $customer->id,
        'operation' => 'face-swap',
        'status' => 'processing',
        'coins_spent' => 10,
    ]);

    $response = $this->actingAs($user)->get('/admin/queue');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('admin/queue/index')
        ->has('metrics')
        ->has('generations.data', 2)
        ->where('metrics.queued_count', 1)
        ->where('metrics.processing_count', 1)
    );
});

test('admin can fetch live metrics json', function () {
    $user = User::factory()->create();
    $user->roles()->attach(Role::where('slug', 'super-admin')->first());

    AIGeneration::factory()->create(['status' => 'queued']);
    AIGeneration::factory()->create(['status' => 'queued']);
    AIGeneration::factory()->create(['status' => 'processing']);

    $response = $this->actingAs($user)->getJson('/admin/queue/metrics');

    $response->assertStatus(200);
    $response->assertJson([
        'queued_count' => 2,
        'processing_count' => 1,
    ]);
});

test('admin can filter queue monitor by status', function () {
    $user = User::factory()->create();
    $user->roles()->attach(Role::where('slug', 'super-admin')->first());

    AIGeneration::factory()->create(['status' => 'queued', 'operation' => 'image-generation']);
    AIGeneration::factory()->create(['status' => 'completed', 'operation' => 'image-generation']);

    $response = $this->actingAs($user)->get('/admin/queue?status=queued');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('admin/queue/index')
        ->where('generations.total', 1)
        ->where('generations.data.0.status', 'queued')
    );
});

test('admin can retry failed generation and it re-dispatches job', function () {
    Queue::fake();

    $user = User::factory()->create();
    $user->roles()->attach(Role::where('slug', 'super-admin')->first());

    $generation = AIGeneration::factory()->create([
        'operation' => 'image-generation',
        'status' => 'failed',
        'error' => 'Simulated AI provider timeout',
        'coins_spent' => 5,
        'points_refunded' => 5,
    ]);

    $response = $this->actingAs($user)->post("/admin/queue/{$generation->id}/retry");

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $generation->refresh();
    expect($generation->status)->toBe('queued');
    expect($generation->error)->toBeNull();

    Queue::assertPushed(ProcessImageGeneration::class, function ($job) use ($generation) {
        return $job->generationId === $generation->id;
    });
});

test('unauthenticated user cannot access queue monitor', function () {
    $response = $this->get('/admin/queue');
    $response->assertRedirect('/login');
});
