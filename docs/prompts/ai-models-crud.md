# AI Models CRUD

## Goal

Add an `ai_models` table, Eloquent model, and full admin CRUD page so that AI models (e.g. Segmind model strings) can be managed through the dashboard and then selected on the Template create/edit forms.

## Why

Currently the `model` field on `templates` is a free-text string. This is error-prone and inconsistent. Centralising model names in a dedicated table lets admins maintain a single source of truth and templates simply pick from a dropdown.

## Fields (`ai_models` table)

| Column | Type | Notes |
|---|---|---|
| `id` | bigint unsigned PK | auto-increment |
| `provider_name` | string | default `'segmind'`; the provider this model belongs to |
| `model_name` | string | the exact model identifier string (e.g. `wan2.2-i2v`) |
| `docs_link` | string nullable | URL to the provider's documentation for this model |
| `sort_order` | integer | default `0`; lower = appears first in dropdowns |
| `description` | text nullable | admin notes about what this model does |
| `created_at` / `updated_at` | timestamps | |

## Admin CRUD routes

```
GET    /admin/ai-models                    → index (paginated list)
GET    /admin/ai-models/create             → create form
POST   /admin/ai-models                    → store
GET    /admin/ai-models/{ai_model}/edit    → edit form
PUT    /admin/ai-models/{ai_model}         → update
DELETE /admin/ai-models/{ai_model}         → destroy
```

Permission guard: use `templates.manage` (existing permission — ai models are part of template management).

## Template integration

- Add `ai_model_id` nullable FK on `templates` pointing to `ai_models.id` (set null on delete).
- Pass the `ai_models` list to the Template create/edit Inertia pages.
- Replace the free-text `model` input on Template forms with a Select dropdown populated from `ai_models` (display: `provider_name — model_name`).
- Keep the existing `model` string column on `templates` for backward compatibility; populate it automatically from the selected `AIModel->model_name` on save (so the API layer is unchanged).

## Sidebar

Add "AI Models" entry in `app-sidebar.tsx` near Templates, with icon `Cpu` and permission `templates.view`.

## Wayfinder

Run `make wayfinder` after routes are registered so the typed route helpers are generated.

## What is NOT changing

- API endpoints — no new public API routes; `model` string on `ai_generations` is unchanged.
- Provider abstraction — `AIProviderFactory` and `SegmindProvider` are unchanged.
- Existing template records — `ai_model_id` is nullable so old records are unaffected.
