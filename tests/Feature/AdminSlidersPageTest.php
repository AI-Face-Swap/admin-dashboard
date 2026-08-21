<?php

use App\Models\Role;
use App\Models\Slider;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminSlidersPageTest extends TestCase
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
        $response = $this->actingAs($this->admin)->get('/admin/sliders');

        $response->assertOk()->assertInertia(fn ($page) => $page->component('admin/sliders/index'));
    }

    public function test_index_page_requires_auth(): void
    {
        $response = $this->get('/admin/sliders');

        $response->assertRedirect('/login');
    }

    public function test_create_page_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/admin/sliders/create');

        $response->assertOk()->assertInertia(fn ($page) => $page->component('admin/sliders/create'));
    }

    public function test_store_slider(): void
    {
        Storage::fake('spaces');

        $response = $this->actingAs($this->admin)->post('/admin/sliders', [
            'title' => 'Test Slider',
            'description' => 'A test slider',
            'cta_text' => 'Try it',
            'cta_url' => '/test',
            'file' => UploadedFile::fake()->image('slider.jpg', 800, 400),
            'type' => 'image',
            'sorting' => 10,
            'is_active' => true,
            'badge' => 'New',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('sliders', [
            'title' => 'Test Slider',
            'type' => 'image',
            'sorting' => 10,
            'is_active' => true,
        ]);
    }

    public function test_edit_page_loads(): void
    {
        $slider = Slider::create([
            'title' => 'Edit Me',
            'file_path' => 'sliders/test.jpg',
            'type' => 'image',
            'sorting' => 0,
        ]);

        $response = $this->actingAs($this->admin)->get("/admin/sliders/{$slider->id}/edit");

        $response->assertOk()->assertInertia(fn ($page) => $page->component('admin/sliders/edit'));
    }

    public function test_update_slider(): void
    {
        Storage::fake('spaces');

        $slider = Slider::create([
            'title' => 'Old Title',
            'file_path' => 'sliders/test.jpg',
            'type' => 'image',
            'sorting' => 0,
        ]);

        $response = $this->actingAs($this->admin)->put("/admin/sliders/{$slider->id}", [
            'title' => 'New Title',
            'type' => 'image',
            'sorting' => 5,
            'is_active' => false,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('sliders', [
            'id' => $slider->id,
            'title' => 'New Title',
            'sorting' => 5,
            'is_active' => false,
        ]);
    }

    public function test_delete_slider(): void
    {
        Storage::fake('spaces');

        $slider = Slider::create([
            'title' => 'Delete Me',
            'file_path' => 'sliders/test.jpg',
            'type' => 'image',
            'sorting' => 0,
        ]);

        $response = $this->actingAs($this->admin)->delete("/admin/sliders/{$slider->id}");

        $response->assertRedirect();
        $this->assertDatabaseMissing('sliders', ['id' => $slider->id]);
    }

    public function test_slider_api_returns_active_sorted(): void
    {
        Slider::create(['title' => 'Low', 'file_path' => 'a.jpg', 'type' => 'image', 'sorting' => 1, 'is_active' => true]);
        Slider::create(['title' => 'High', 'file_path' => 'b.jpg', 'type' => 'image', 'sorting' => 10, 'is_active' => true]);
        Slider::create(['title' => 'Inactive', 'file_path' => 'c.jpg', 'type' => 'image', 'sorting' => 100, 'is_active' => false]);

        $response = $this->get('/api/v1/sliders');

        $response->assertOk()->assertJsonCount(2, 'sliders');
        $response->assertJsonPath('sliders.0.title', 'High');
        $response->assertJsonPath('sliders.1.title', 'Low');
    }
}
