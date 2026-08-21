<?php

use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSettingsPageTest extends TestCase
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

    public function test_settings_page_loads(): void
    {
        $response = $this->actingAs($this->admin)->get('/admin/settings');

        $response->assertOk()->assertInertia(fn ($page) => $page->component('admin/settings/index'));
    }

    public function test_settings_page_requires_auth(): void
    {
        $response = $this->get('/admin/settings');

        $response->assertRedirect('/login');
    }

    public function test_settings_page_requires_permission(): void
    {
        $user = User::factory()->create();
        $role = Role::where('slug', 'viewer')->first();
        $user->roles()->attach($role->id);

        $response = $this->actingAs($user)->get('/admin/settings');

        $response->assertForbidden();
    }

    public function test_update_coin_costs(): void
    {
        $response = $this->actingAs($this->admin)->put('/admin/settings', [
            'coin_costs' => [
                'image_generation' => 10,
                'face_swap' => 8,
                'video_face_swap' => 25,
            ],
        ]);

        $response->assertOk();

        $this->assertEquals('10', Setting::get('ai', 'coin_cost_image_generation'));
        $this->assertEquals('8', Setting::get('ai', 'coin_cost_face_swap'));
        $this->assertEquals('25', Setting::get('ai', 'coin_cost_video_face_swap'));
    }

    public function test_coin_costs_persist(): void
    {
        Setting::set('ai', 'coin_cost_image_generation', 15);

        $response = $this->actingAs($this->admin)->get('/admin/settings');

        $response->assertOk()->assertInertia(fn ($page) => $page->has('coinCosts'));
    }

    public function test_config_reads_from_db(): void
    {
        Setting::set('ai', 'coin_cost_image_generation', 42);

        $cost = Setting::get('ai', 'coin_cost_image_generation', config('ai.coin_costs.image_generation', 5));

        $this->assertEquals(42, (int) $cost);
    }
}
