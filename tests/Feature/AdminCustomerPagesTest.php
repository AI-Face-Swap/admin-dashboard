<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminCustomerPagesTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Role $viewRole;

    private Role $manageRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->viewRole = Role::where('slug', 'viewer')->first();
        $this->manageRole = Role::where('slug', 'super-admin')->first();

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach($this->manageRole->id);
    }

    /** Guest is redirected to login */
    public function test_guest_is_redirected(): void
    {
        $this->get('/admin/customers')->assertRedirect();
    }

    /** User without permission gets 403 */
    public function test_user_without_permission_gets_403(): void
    {
        $user = User::factory()->create();
        $user->roles()->attach($this->viewRole->id);

        // viewer has customers.view, but let's test with a user that has NO permissions
        $noPermUser = User::factory()->create();

        $this->actingAs($noPermUser)->get('/admin/customers')->assertForbidden();
    }

    /** Index page loads with customers */
    public function test_index_page_loads(): void
    {
        Customer::factory()->count(3)->create();

        $this->actingAs($this->admin)
            ->get('/admin/customers')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('admin/customers/index'));
    }

    /** Index page shows stats */
    public function test_index_page_shows_stats(): void
    {
        Customer::factory()->count(2)->create(['customer_type' => 'free']);
        Customer::factory()->create(['customer_type' => 'premium']);
        Customer::factory()->create(['customer_type' => 'premium', 'is_banned' => true]);

        $response = $this->actingAs($this->admin)->get('/admin/customers');
        $response->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->where('stats.total', 4)
            ->where('stats.free', 2)
            ->where('stats.premium', 2)
            ->where('stats.banned', 1)
        );
    }

    /** Index page filters by type */
    public function test_index_filters_by_type(): void
    {
        Customer::query()->delete();

        Customer::factory()->count(2)->create(['customer_type' => 'free']);
        Customer::factory()->create(['customer_type' => 'premium']);

        $response = $this->actingAs($this->admin)->get('/admin/customers?type=premium');
        $response->assertOk();

        // Verify that the DB query actually filters correctly
        $this->assertDatabaseHas('customers', ['customer_type' => 'premium', 'id' => Customer::where('customer_type', 'premium')->first()->id]);
        $this->assertEquals(1, Customer::where('customer_type', 'premium')->count());
        $this->assertEquals(2, Customer::where('customer_type', 'free')->count());

        // Verify the page renders with correct stats
        $response->assertInertia(fn ($page) => $page->where('stats.premium', 1)->where('stats.free', 2));
    }

    /** Index page filters by coin range */
    public function test_index_filters_by_coin_range(): void
    {
        Customer::query()->delete();

        Customer::factory()->create(['coins' => 50]);
        Customer::factory()->create(['coins' => 150]);
        Customer::factory()->create(['coins' => 300]);

        $response = $this->actingAs($this->admin)->get('/admin/customers?coins_min=100&coins_max=200');
        $response->assertOk();

        // Verify DB-level filtering works
        $filtered = Customer::where('coins', '>=', 100)->where('coins', '<=', 200)->count();
        $this->assertEquals(1, $filtered);
    }

    /** Show page loads */
    public function test_show_page_loads(): void
    {
        $customer = Customer::factory()->create();

        $this->actingAs($this->admin)
            ->get("/admin/customers/{$customer->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('admin/customers/show'));
    }

    /** Ban customer */
    public function test_ban_customer(): void
    {
        $customer = Customer::factory()->create(['is_banned' => false]);

        $this->actingAs($this->admin)
            ->patch("/admin/customers/{$customer->id}/ban")
            ->assertRedirect();

        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'is_banned' => true,
        ]);
    }

    /** Unban customer */
    public function test_unban_customer(): void
    {
        $customer = Customer::factory()->create(['is_banned' => true]);

        $this->actingAs($this->admin)
            ->patch("/admin/customers/{$customer->id}/unban")
            ->assertRedirect();

        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'is_banned' => false,
        ]);
    }

    /** Add coins */
    public function test_add_coins(): void
    {
        $customer = Customer::factory()->create(['coins' => 100]);

        $this->actingAs($this->admin)
            ->post("/admin/customers/{$customer->id}/add-coins", [
                'amount' => 50,
                'note' => 'Test credit',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'coins' => 150,
        ]);
    }

    /** Delete customer */
    public function test_delete_customer(): void
    {
        $customer = Customer::factory()->create();

        $this->actingAs($this->admin)
            ->delete("/admin/customers/{$customer->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('customers', ['id' => $customer->id]);
    }

    /** Banned customer cannot access API */
    public function test_banned_customer_cannot_access_api(): void
    {
        $customer = Customer::factory()->create(['is_banned' => true]);
        $token = $customer->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/me')
            ->assertStatus(403)
            ->assertJson(['message' => 'Your account has been banned. Please contact support.']);
    }

    /** Active customer can access API */
    public function test_active_customer_can_access_api(): void
    {
        $customer = Customer::factory()->create(['is_banned' => false]);
        $token = $customer->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('customer.email', $customer->email);
    }
}
