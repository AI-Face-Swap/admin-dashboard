<?php

use App\Jobs\ProcessVideoFaceSwap;
use App\Models\AIGeneration;
use App\Models\AIProvider;
use App\Models\Customer;
use App\Models\Role;
use App\Models\Template;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->seed(AIProviderSeeder::class);
    Storage::fake('spaces');
});

test('video face swap dispatches a queued job and returns 202', function () {
    Queue::fake();

    $customer = Customer::factory()->create(['coins' => 200]);
    $token = $customer->createToken('test')->plainTextToken;

    $template = Template::create([
        'name' => 'Superman Video',
        'slug' => 'superman-video',
        'type' => 'video',
        'file_path' => 'templates/superman.mp4',
        'is_active' => true,
        'cost' => 10,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->postJson('/api/v1/ai/video-face-swap', [
            'template_slug' => 'superman-video',
            'face_image_url' => 'https://example.com/face.jpg',
        ]);

    $response->assertStatus(202)
        ->assertJson([
            'status' => 'queued',
            'generation' => [
                'operation' => 'video-face-swap',
                'status' => 'queued',
            ],
        ]);

    Queue::assertPushed(ProcessVideoFaceSwap::class);
});

test('video face swap with file upload dispatches job', function () {
    Queue::fake();

    $customer = Customer::factory()->create(['coins' => 200]);
    $token = $customer->createToken('test')->plainTextToken;

    $template = Template::create([
        'name' => 'Anime Video',
        'slug' => 'anime-video',
        'type' => 'video',
        'file_path' => 'templates/anime.mp4',
        'is_active' => true,
        'cost' => 5,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->postJson('/api/v1/ai/video-face-swap', [
            'template_slug' => 'anime-video',
            'face_image' => UploadedFile::fake()->image('face.jpg'),
        ]);

    $response->assertStatus(202);
    Queue::assertPushed(ProcessVideoFaceSwap::class);
});

test('video face swap rejects image templates', function () {
    $customer = Customer::factory()->create(['coins' => 200]);
    $token = $customer->createToken('test')->plainTextToken;

    $template = Template::create([
        'name' => 'Superman Image',
        'slug' => 'superman-image',
        'type' => 'image',
        'file_path' => 'templates/superman.jpg',
        'is_active' => true,
        'cost' => 5,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->postJson('/api/v1/ai/video-face-swap', [
            'template_slug' => 'superman-image',
            'face_image_url' => 'https://example.com/face.jpg',
        ]);

    $response->assertStatus(404);
});

test('video face swap rejects when customer has insufficient coins', function () {
    $customer = Customer::factory()->create(['coins' => 2]);
    $token = $customer->createToken('test')->plainTextToken;

    $template = Template::create([
        'name' => 'Expensive Video',
        'slug' => 'expensive-video',
        'type' => 'video',
        'file_path' => 'templates/expensive.mp4',
        'is_active' => true,
        'cost' => 10,
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->postJson('/api/v1/ai/video-face-swap', [
            'template_slug' => 'expensive-video',
            'face_image_url' => 'https://example.com/face.jpg',
        ]);

    $response->assertStatus(402);
});

test('video face swap requires authentication', function () {
    $response = $this->postJson('/api/v1/ai/video-face-swap', [
        'template_slug' => 'superman-video',
        'face_image_url' => 'https://example.com/face.jpg',
    ]);

    $response->assertStatus(401);
});

test('generation status endpoint returns current state', function () {
    $customer = Customer::factory()->create();
    $token = $customer->createToken('test')->plainTextToken;

    $provider = AIProvider::firstOrCreate(['slug' => 'segmind'], ['name' => 'Segmind']);

    $generation = AIGeneration::create([
        'customer_id' => $customer->id,
        'provider_id' => $provider->id,
        'operation' => 'video-face-swap',
        'status' => 'queued',
    ]);

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson("/api/v1/ai/generations/{$generation->id}");

    $response->assertOk()
        ->assertJson([
            'id' => $generation->id,
            'operation' => 'video-face-swap',
            'status' => 'queued',
        ]);
});

test('admin can view AI page with video templates', function () {
    Storage::fake('spaces');

    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('slug', 'super-admin')->first());
    $this->actingAs($admin);

    Template::create([
        'name' => 'Video Template',
        'slug' => 'video-tpl',
        'type' => 'video',
        'file_path' => 'templates/video.mp4',
        'is_active' => true,
    ]);

    $this->get(route('admin.ai.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/ai/index')
            ->has('templates', 1)
        );
});
