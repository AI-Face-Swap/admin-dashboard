<?php

namespace Tests\Feature;

use App\Models\HomeHero;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminHomeHeroTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->admin = User::factory()->create();
        $role = Role::where('slug', 'super-admin')->first();
        $this->admin->roles()->attach($role->id);
    }

    public function test_index_page_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/admin/home-heroes');

        $response->assertOk()->assertInertia(fn ($page) => $page->component('admin/home-heroes/index'));
    }

    public function test_index_page_requires_auth(): void
    {
        $response = $this->get('/admin/home-heroes');

        $response->assertRedirect('/login');
    }

    public function test_unauthorized_user_forbidden(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/admin/home-heroes');

        $response->assertForbidden();
    }

    public function test_create_page_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/admin/home-heroes/create');

        $response->assertOk()->assertInertia(fn ($page) => $page->component('admin/home-heroes/create'));
    }

    public function test_store_home_hero_with_urls(): void
    {
        $response = $this->actingAs($this->admin)->post('/admin/home-heroes', [
            'title' => 'Hero Title',
            'description' => 'Hero Description',
            'video' => 'https://example.com/video.mp4',
            'images' => [
                'https://example.com/img1.png',
                'https://example.com/img2.png',
            ],
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $response->assertRedirect('/admin/home-heroes');
        $this->assertDatabaseHas('home_heroes', [
            'title' => 'Hero Title',
            'description' => 'Hero Description',
            'video' => 'https://example.com/video.mp4',
            'sort_order' => 1,
            'is_active' => 1,
        ]);

        $hero = HomeHero::where('title', 'Hero Title')->first();
        $this->assertEquals(['https://example.com/img1.png', 'https://example.com/img2.png'], $hero->images);
    }

    public function test_store_home_hero_with_uploaded_files(): void
    {
        Storage::fake('spaces');

        $response = $this->actingAs($this->admin)->post('/admin/home-heroes', [
            'title' => 'Uploaded Hero',
            'description' => 'Hero With Uploads',
            'video_file' => UploadedFile::fake()->create('video.mp4', 5000, 'video/mp4'),
            'image_files' => [
                UploadedFile::fake()->image('image1.jpg', 600, 400),
                UploadedFile::fake()->image('image2.png', 600, 400),
            ],
            'sort_order' => 0,
            'is_active' => true,
        ]);

        $response->assertRedirect('/admin/home-heroes');
        $this->assertDatabaseHas('home_heroes', [
            'title' => 'Uploaded Hero',
        ]);

        $hero = HomeHero::where('title', 'Uploaded Hero')->first();
        $this->assertNotNull($hero->video);
        $this->assertCount(2, $hero->images);
    }

    public function test_validation_fails_without_title(): void
    {
        $response = $this->actingAs($this->admin)->post('/admin/home-heroes', [
            'sort_order' => 0,
        ]);

        $response->assertSessionHasErrors('title');
    }

    public function test_edit_page_loads(): void
    {
        $hero = HomeHero::factory()->create();

        $response = $this->actingAs($this->admin)->get("/admin/home-heroes/{$hero->id}/edit");

        $response->assertOk()->assertInertia(fn ($page) => $page->component('admin/home-heroes/edit'));
    }

    public function test_update_home_hero(): void
    {
        $hero = HomeHero::factory()->create([
            'title' => 'Old Title',
            'sort_order' => 5,
        ]);

        $response = $this->actingAs($this->admin)->put("/admin/home-heroes/{$hero->id}", [
            'title' => 'Updated Title',
            'description' => 'Updated Description',
            'video' => 'https://example.com/updated.mp4',
            'images' => ['https://example.com/new1.jpg'],
            'sort_order' => 10,
            'is_active' => false,
        ]);

        $response->assertRedirect('/admin/home-heroes');
        $this->assertDatabaseHas('home_heroes', [
            'id' => $hero->id,
            'title' => 'Updated Title',
            'sort_order' => 10,
            'is_active' => 0,
        ]);
    }

    public function test_destroy_home_hero(): void
    {
        $hero = HomeHero::factory()->create();

        $response = $this->actingAs($this->admin)->delete("/admin/home-heroes/{$hero->id}");

        $response->assertRedirect('/admin/home-heroes');
        $this->assertDatabaseMissing('home_heroes', [
            'id' => $hero->id,
        ]);
    }
}
