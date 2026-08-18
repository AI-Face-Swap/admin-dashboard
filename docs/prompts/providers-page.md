# Prompt: AI Providers Admin Page

## Goal

Replace the "coming soon" placeholder at `/providers` with a real admin page that lists all AI providers (Segmind, Replicate, future ones), shows their status and usage stats, and lets admins toggle providers active/inactive.

## Requirements

### Route & controller

- Move the existing `providers` route from the first `auth` group into the `admin` group (`/admin/providers`) with `providers.view` permission.
- Create `Admin\ProviderController@index` — single page, no create/edit/delete (providers are seeded via `AIProviderSeeder`, not created by admins).
- The controller passes all providers with:
  - Basic info: `id`, `name`, `slug`, `is_active`, `config`, `created_at`
  - Stats: `generations_count` (total), `completed_count`, `failed_count` (use `withCount` + conditional counts)
- Update the sidebar link from `/providers` to `/admin/providers`.

### Admin page (`/admin/providers`)

- **Provider cards** in a grid (similar to template cards):
  - Provider name + slug
  - Active/Inactive badge (green/gray)
  - Toggle switch (calls `PATCH /admin/providers/{id}/toggle`)
  - Stats: total generations, completed, failed, cost sum
  - Created date

- **Toggle endpoint**: `PATCH /admin/providers/{provider}/toggle` — flips `is_active`, returns JSON `{ is_active: bool }`. Permission: `providers.manage`.

- **No create/edit forms** — providers are seeded. The page is read-only + toggle.

### Stats to show per provider

- Total generations (all time)
- Completed generations
- Failed generations
- Total cost (sum of `ai_generations.cost` where cost is not null)

## Files affected

- `routes/web.php` — move providers route to admin group
- `resources/js/components/app-sidebar.tsx` — update href
- `app/Http/Controllers/Admin/ProviderController.php` (new)
- `resources/js/pages/admin/providers/index.tsx` (new)
- `tests/Feature/AdminProvidersPageTest.php` (new)

## Acceptance criteria

1. `/admin/providers` shows all providers with stats.
2. Toggle switch flips `is_active` (admin sees the change immediately via Inertia).
3. Guest gets redirect, unauthorized admin gets 403.
4. Sidebar "Providers" links to `/admin/providers`.
5. Tests pass for: page renders, toggle works, permission check.

## Open questions

1. **Config display**: show the config JSON in a collapsible `<details>` or formatted code block? → Recommended: yes, collapsible (helps debugging).
2. **Cost sum**: should we show total cost across all generations for the provider? → Recommended: yes, formatted as `$X.XX`.
3. **Cost column in ai_providers**: the current `ai_generations.cost` is nullable per-provider-cost. Summing it gives a rough total. No new columns needed.

## Not in scope

- Adding/editing/deleting providers (seeded, not CRUD).
- API key management (lives in `.env`, never in the UI).
- Replicate provider setup (that's a separate phase).
