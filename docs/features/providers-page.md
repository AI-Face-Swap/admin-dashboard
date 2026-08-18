# Feature: Admin Providers Page

## What was built

The `/admin/providers` page lists all AI providers (Segmind, Replicate, future ones) with their status, usage stats, and a toggle switch. No create/edit/delete — providers are seeded via `AIProviderSeeder`, not managed by admins.

## The page

- **Provider cards** in a 3-column grid
  - Name + slug + active/inactive badge
  - Toggle switch (calls `PATCH /admin/providers/{id}/toggle`)
  - Stats: total generations, completed, failed, total cost
  - Collapsible config JSON for debugging
  - Created date
- Permission-gated: `providers.view` to see, `providers.manage` to toggle
- Sidebar "Providers" now links to `/admin/providers`

## Toggle endpoint

`PATCH /admin/providers/{provider}/toggle` — flips `is_active`, returns `{ is_active: bool }`. Permission: `providers.manage`.

## Bug fix

The `AIProvider::generations()` relationship needed an explicit foreign key (`'provider_id'`) because Laravel pluralizes `AIProvider` to `a_i_providers`, causing the auto-inferred FK `a_i_provider_id` to not match the actual column `provider_id`.

## Files

- `app/Http/Controllers/Admin/ProviderController.php` (new) — index (with `withCount`/`withSum`) + toggle
- `resources/js/pages/admin/providers/index.tsx` (new) — provider cards + toggle
- `routes/web.php` — moved providers route to admin group with permissions
- `resources/js/components/app-sidebar.tsx` — updated href + permission
- `app/Models/AIProvider.php` — fixed `generations()` FK
- `tests/Feature/AdminProvidersPageTest.php` (new) — 6 tests

## Verification

- ✅ **6 tests pass**: page renders, lists providers, guest redirect, unauthorized 403, toggle on/off
- ✅ Pint · ✅ ESLint · ✅ build
