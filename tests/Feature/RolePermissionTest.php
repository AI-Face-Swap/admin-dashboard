<?php

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

test('the seeder creates the default roles and permissions', function () {
    $this->seed(RolePermissionSeeder::class);

    expect(Role::count())->toBe(6)
        ->and(Permission::count())->toBe(15)
        ->and(Role::where('slug', 'super-admin')->exists())->toBeTrue();
});

test('a role can have permissions and a user can have roles', function () {
    $role = Role::create(['name' => 'Editor']);
    $permission = Permission::create(['name' => 'Edit posts', 'slug' => 'posts.edit']);
    $role->permissions()->attach($permission);

    $user = User::factory()->create();
    $user->roles()->attach($role);

    expect($user->hasPermission('posts.edit'))->toBeTrue()
        ->and($user->permissions())->toContain('posts.edit');
});

test('a user without the role lacks the permission', function () {
    $user = User::factory()->create();

    expect($user->hasPermission('users.manage'))->toBeFalse();
});

test('a super admin bypasses permission checks', function () {
    $this->seed(RolePermissionSeeder::class);

    $user = User::factory()->create();
    $user->roles()->attach(Role::where('slug', 'super-admin')->first());

    expect($user->isSuperAdmin())->toBeTrue()
        ->and($user->hasPermission('users.manage'))->toBeTrue();
});

test('a user without permission gets a 403 on an admin route', function () {
    $this->seed(RolePermissionSeeder::class);

    $user = User::factory()->create();
    $this->actingAs($user);

    $this->get(route('admin.users.index'))->assertForbidden();
});

test('a user with permission can view the admin users page', function () {
    $this->seed(RolePermissionSeeder::class);

    $user = User::factory()->create();
    $user->roles()->attach(Role::where('slug', 'admin')->first());
    $this->actingAs($user);

    $this->get(route('admin.users.index'))->assertOk();
});

test('guests are redirected to login on admin routes', function () {
    $this->get(route('admin.roles.index'))->assertRedirect(route('login'));
});

test('an admin can create a user with roles', function () {
    $this->seed(RolePermissionSeeder::class);

    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('slug', 'admin')->first());
    $this->actingAs($admin);

    $viewer = Role::where('slug', 'viewer')->first();

    $this->post(route('admin.users.store'), [
        'name' => 'New Admin',
        'email' => 'newadmin@example.com',
        'password' => 'password123',
        'roles' => [$viewer->id],
    ])->assertRedirect(route('admin.users.index'));

    $created = User::where('email', 'newadmin@example.com')->first();
    expect($created)->not->toBeNull()
        ->and($created->hasPermission('dashboard.view'))->toBeTrue();
});

test('the super admin role cannot be deleted', function () {
    $this->seed(RolePermissionSeeder::class);

    $admin = User::factory()->create();
    $admin->roles()->attach(Role::where('slug', 'super-admin')->first());
    $this->actingAs($admin);

    $superAdmin = Role::where('slug', 'super-admin')->first();

    $this->delete(route('admin.roles.destroy', $superAdmin))->assertForbidden();
});
