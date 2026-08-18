# Admin Roles, Permissions & Users

## Goal

Add role-based access control for **admin users** (Phase 2 of the plan): `roles`, `permissions`, `role_user`, and `permission_role` tables per `docs/database-diagram.md`, plus the admin pages to manage users, roles, and permissions. Authorization is enforced on the Laravel backend; React only knows permission names for UI show/hide.

## Requirements

1. **Tables + models**
   - `roles` — `name`, `slug` (unique), `description`
   - `permissions` — `name`, `slug` (unique), `description`
   - `role_user` + `permission_role` pivot tables
   - Models: `Role`, `Permission`; `User` gets `roles()` and `permission` helpers
2. **Seed roles & permissions** — default roles (Super Admin, Admin, Developer, AI Manager, Support, Viewer) and permissions (`dashboard.view`, `ai.generate`, `ai.view`, `providers.view`, `providers.manage`, `api.playground`, `users.view`, `users.manage`, `roles.view`, `roles.manage`, `settings.manage`) via `DatabaseSeeder`.
3. **Backend enforcement** — a permission middleware (e.g. `permission:users.manage`) and/or Gates; a `hasPermission()` helper on `User`.
4. **Share permissions to React** — include the current admin's permission slugs in the Inertia shared props (`HandleInertiaRequests`) so the UI can hide/show menu items and buttons.
5. **Admin pages**
   - `/admin/users` — list, create, edit, delete admins; assign roles
   - `/admin/roles` — list, create, edit, delete roles; grant permissions
   - `/admin/permissions` — list/create/edit (or manage inside roles page — see open question 1)
   - Guarded by the new permission middleware; menu links added to the sidebar

## Affected files

- Migrations: `create_roles_table`, `create_permissions_table`, `create_role_user_table`, `create_permission_role_table`
- `app/Models/Role.php`, `app/Models/Permission.php`, updates to `app/Models/User.php`
- `app/Http/Middleware/EnsureUserHasPermission.php`
- `database/seeders/RolePermissionSeeder.php`
- `app/Http/Controllers/Admin/UserController.php`, `RoleController.php`, `PermissionController.php`
- `resources/js/pages/Admin/Users/*`, `Admin/Roles/*`, `Admin/Permissions/*`
- `app/Http/Middleware/HandleInertiaRequests.php` (share permissions)
- `resources/js/components/app-sidebar.tsx` (menu links)

## Acceptance criteria

- [ ] Migrations create the 4 tables; seeders create default roles + permissions
- [ ] `User::find(...)->hasPermission('users.manage')` works
- [ ] Admin without `users.manage` gets 403 on `/admin/users` (or menu hidden + route blocked)
- [ ] Admin pages list/create/edit users, roles, permissions without errors
- [ ] Sidebar shows/hides sections based on the admin's permissions
- [ ] `php artisan test --compact` passes (new tests for RBAC included)
- [ ] `npm run types:check` + `npm run build` pass

## Open questions

1. **Permissions page**: standalone CRUD page for permissions, or manage them inside the roles page (role → checkboxes of permissions)? (recommended: manage inside roles page + a read-only list page — fewer pages, same power)
2. **RBAC package**: hand-rolled (as designed above) or `spatie/laravel-permission`? (recommended: hand-rolled — the schema is small, and the plan says own foundation; no new dependency without your approval)
3. **Route prefix**: `/admin/...` as designed, or keep flat `/users` `/roles`? (recommended: `/admin/*` to separate from customer-facing web routes)
