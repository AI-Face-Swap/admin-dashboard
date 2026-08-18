<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Seed the default roles and permissions.
     */
    public function run(): void
    {
        $permissions = [
            'dashboard.view',
            'ai.generate',
            'ai.view',
            'providers.view',
            'providers.manage',
            'api.playground',
            'users.view',
            'users.manage',
            'roles.view',
            'roles.manage',
            'settings.manage',
            'templates.view',
            'templates.manage',
            'customers.view',
            'customers.manage',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['slug' => $permission], [
                'name' => ucwords(str_replace(['.', '_'], [' ', ' '], $permission)),
                'description' => 'Allows '.str_replace('.', ' ', $permission),
            ]);
        }

        $roles = [
            'super-admin' => ['name' => 'Super Admin', 'permissions' => $permissions],
            'admin' => ['name' => 'Admin', 'permissions' => $permissions],
            'developer' => [
                'name' => 'Developer',
                'permissions' => [
                    'dashboard.view',
                    'ai.generate',
                    'ai.view',
                    'providers.view',
                    'providers.manage',
                    'api.playground',
                    'templates.view',
                    'templates.manage',
                    'customers.view',
                ],
            ],
            'ai-manager' => [
                'name' => 'AI Manager',
                'permissions' => [
                    'dashboard.view',
                    'ai.generate',
                    'ai.view',
                    'providers.view',
                    'templates.view',
                    'templates.manage',
                ],
            ],
            'support' => [
                'name' => 'Support',
                'permissions' => [
                    'dashboard.view',
                    'ai.view',
                    'customers.view',
                    'users.view',
                ],
            ],
            'viewer' => [
                'name' => 'Viewer',
                'permissions' => [
                    'dashboard.view',
                    'ai.view',
                    'providers.view',
                    'templates.view',
                ],
            ],
        ];

        foreach ($roles as $slug => $role) {
            $roleModel = Role::firstOrCreate(['slug' => $slug], [
                'name' => $role['name'],
                'description' => $role['name'].' role',
            ]);

            $roleModel->permissions()->sync(
                Permission::whereIn('slug', $role['permissions'])->pluck('id'),
            );
        }
    }
}
