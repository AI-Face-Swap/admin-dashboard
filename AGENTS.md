# HTUT AI — Admin Dashboard & AI Generation Platform

## Stack

- **Language / Runtime**: PHP 8.4
- **Framework**: Laravel 13 (Fortify for authentication, Passkeys, 2FA)
- **Frontend**: Inertia v3 + React 19 + TypeScript, Tailwind CSS v4, shadcn/ui components
- **Package managers**: Composer (PHP) + npm / pnpm (JS)
- **Database**: MySQL (local + production), configured in `.env` as `DB_CONNECTION=mysql`
- **Testing**: Pest 4
- **Tooling**: Pint (PHP style), PHPStan/Larastan (static analysis), ESLint + Prettier (JS), Wayfinder (typed routes), Vite

## Project (memorize this)

Laravel admin dashboard + mobile-facing API for AI media generation (image generation, face swap, video face swap) via abstracted providers (Segmind, Replicate) with usage/cost tracking, an admin API testing playground, roles & permissions, and a theme system. Full product plan lives in `project-usecase.md` — read it before designing features.

### Completed phases

| Phase | Feature | Status |
|---|---|---|
| 1 | Laravel + Inertia + React + shadcn/ui + animated components | ✅ |
| 2 | Admin core: users, roles, permissions (RBAC, 6 roles, 15 permissions), dashboard | ✅ |
| 2 | Templates CRUD (categories, tags, DO Spaces uploads, auto-slug) | ✅ |
| 2 | Admin dashboard layout (sidebar, animated shadcn wrappers) | ✅ |
| 3 | AI provider architecture: contract, factory, service, SegmindProvider (face-swap end-to-end, live-tested) | ✅ |
| 4 | Shared face-swap API endpoint (`/api/v1/ai/face-swap`) + request logging + admin AI page | ✅ |
| 5 | Customer auth (Sanctum): register/login/logout/me, coin system (100 coins default, per-template cost) | ✅ |
| 5 | Template cost input (create/edit/list in admin dashboard) | ✅ |
| 5 | Admin providers page (`/admin/providers` — list, toggle active/inactive, stats) | ✅ |
| 6 | Video face swap (queued job, 10 min timeout) — SegmindProvider, ProcessVideoFaceSwap job, admin AI page tabs | ✅ |
| 7 | Admin API playground (`/admin/api-playground` — Postman-like endpoint tester, form-data, HTML preview) | ✅ |
| 7 | API Playground: global Bearer token + `credentials: 'omit'` + auto-extract token from login | ✅ |
| — | Dashboard links fixed (`/ai` → `/admin/ai`, etc.) | ✅ |
| — | Template `file_url` null guard (prevents crash on templates without files) | ✅ |
| 8 | API request logs page (`/admin/api-logs` — paginated, filters, expandable rows) | ✅ |
| — | Generation detail modal (click recent generations → output images/videos + metadata) | ✅ |
| — | Customer Management: list (type/coin/status filters), detail (generations + stats), ban/unban, add coins (developer only) | ✅ |
| — | Example data seeder (`ExampleDataSeeder` — customers, templates, categories, tags, generations) | ✅ |
| — | Provider toggle fix (returns Inertia response, not JSON) | ✅ |
| — | Image Generation API (`POST /api/v1/ai/images` — Segmind seedream-v3, flux-schnell, sd-xl) | ✅ |
| — | API Playground: form-data file upload, HTML preview, global Bearer token, `credentials: 'same-origin'` | ✅ |
| — | Bug fix: `AIService::execute()` accepts optional `$existingGeneration` to prevent duplicate generation rows | ✅ |
| — | Bug fix: image face-swap validates template type = `image` (prevents video templates in image swap) | ✅ |
| — | Bug fix: video face-swap polling detects HTML responses + refreshes generations via `router.reload()` | ✅ |
| — | Coin cost configurable via `config('ai.php')` + `.env` | ✅ |
| — | Error handling: JSON error responses instead of 500 crashes | ✅ |
| — | Admin coin cost settings page (`/admin/settings` — UI to change coin costs) | ✅ |

### Pending phases

| # | Feature | Effort |
|---|---|---|
| 1 | Social login (Google/Apple) — needs your OAuth client credentials | Medium |
| 2 | Customer email verification + password reset | Small |
| 3 | Usage/cost analytics dashboard (charts: generations/day, cost/day) | Medium |
| 4 | Payment integration (KBZ, RevenueCat, Stripe, Google Pay, Apple Pay) | Large |
| 5 | Animation polish (page transitions, card entrances, loading states) | Medium |
| 6 | Full test suite coverage (comprehensive Pest tests) | Large |

### Key architecture patterns

- **Shared API rule**: Admin dashboard (session cookie) and mobile app (Bearer token) hit the **same** `/api/v1/ai/face-swap` endpoint — never duplicate AI logic.
- **Provider abstraction**: `app/AI/` — `AIProviderInterface` → `AIProviderFactory` → `SegmindProvider`. Adding a new provider = 1 new class + 1 factory case.
- **`AIService`** is the only class controllers call: resolves provider → persists generation → returns normalized response.
- **`AIResponse` DTO**: provider, model, request_id, status, duration, usage, cost, currency, output, raw_response.
- **Cost is nullable**: `null` when the provider doesn't report it (never fake `0`). Segmind v2 returns `metrics.cost`.
- **`provider_id` is the source of truth**: no duplicated provider string column in `ai_generations`.
- **Slugs are auto-suffixed**: duplicate names get `name-2`, `name-3` (shared `HasAutoSlug` trait). Slugs are stable on edit.
- **Coin economy**: customers start with 100 coins; each generation deducts the template's cost; reject 402 on insufficient balance.
- **API Playground auth model**: global Bearer token (localStorage) + `credentials: 'same-origin'` — session cookie sent for CSRF verification, Bearer token takes precedence when set. Token auto-extracted from login responses. Guest routes (register/login) use `HandleGuestRedirect` to return JSON 403 instead of redirecting.
- **`HandleGuestRedirect` middleware**: replaces built-in `guest` alias — returns JSON 403 instead of redirect when API requests hit guest routes from an authenticated session.
- **`EnsureCustomerNotBanned` middleware**: checks `is_banned` on the `customer` guard — banned customers get 403 on all `/api/v1/*` routes.
- **Filter queries use `$request->input()` not `$request->filled()`**: Laravel's `when()` passes the condition value to the callback. Using `filled()` passes `true`/`false` instead of the actual value. Always use `input()` as the `when()` condition.
- **Template accessors return nullable**: `file_url` and `thumbnail_url` return `?string` — always null-check before calling `Storage::url()`.

### Current DB tables

`users` (admin), `customers` (mobile/web users), `roles`, `permissions`, `role_user`, `permission_role`, `templates`, `template_categories`, `template_tags`, `template_tag`, `ai_providers`, `ai_generations`, `api_request_logs`, `settings` (key-value config), `personal_access_tokens`, `sessions`, `cache`, `jobs`, `failed_jobs`, `passkeys`, `password_reset_tokens`

### Current API routes

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/v1/auth/register` | guest | Register customer (returns token + 100 coins) |
| `POST /api/v1/auth/login` | guest | Login customer (returns token) |
| `POST /api/v1/auth/logout` | sanctum | Revoke token |
| `GET /api/v1/auth/me` | sanctum | Authenticated customer profile |
| `POST /api/v1/ai/face-swap` | sanctum (session + token) | Shared face-swap endpoint |
| `POST /api/v1/ai/video-face-swap` | sanctum (session + token) | Shared video face-swap endpoint (queued) |
| `POST /api/v1/ai/images` | sanctum (session + token) | Text-to-image generation endpoint |
| `GET /api/v1/ai/generations/{id}` | sanctum | Poll generation status |

**Admin web routes:**

| Route | Permission | Purpose |
|---|---|---|
| `GET /admin/providers` | `providers.view` | List all providers with stats |
| `PATCH /admin/providers/{provider}/toggle` | `providers.manage` | Toggle provider active/inactive |
| `GET /admin/api-playground` | `api.playground` | API endpoint tester (Postman-like) |
| `GET /admin/api-logs` | `settings.manage` | Browse/search logged API requests |
| `GET /admin/api-logs/{log}` | `settings.manage` | Get full log details |
| `GET /admin/customers` | `customers.view` | List customers (type/coin/status filters, stats) |
| `GET /admin/customers/{customer}` | `customers.view` | Customer detail (info, generations, stats) |
| `PATCH /admin/customers/{customer}/ban` | `customers.manage` | Ban customer |
| `PATCH /admin/customers/{customer}/unban` | `customers.manage` | Unban customer |
| `POST /admin/customers/{customer}/coins` | `customers.manage` | Add coins (developer role only) |
| `DELETE /admin/customers/{customer}` | `customers.manage` | Delete customer |
| `GET /admin/settings` | `settings.manage` | Admin settings page (coin costs) |
| `PUT /admin/settings` | `settings.manage` | Update coin costs |

### Middleware setup (`bootstrap/app.php`)

- `EnsureFrontendRequestsAreStateful` — **prepended** to the `api` group so Sanctum accepts session-cookie auth for admin dashboard API calls. **This is required** — without it, `/api/*` routes return 401 because the session is never started.
- `LogApiRequests` — appended to the `api` group. Logs method, path, headers (sensitive excluded), body, response status, response headers (billing source), body, duration.

### Dev DB note

`SESSION_DRIVER=database` in `.env`. The `sessions` table is created by the first migration (`0001_01_01_000000_create_users_table.php`). After `migrate:fresh`, run seeders to restore admin + role data.

## Build approach

**Tracer bullet**: build thin, end-to-end slices through every layer (route → service → provider → DB → UI) for one feature at a time, then thicken. The admin dashboard and the mobile API must share the same core logic — never write two implementations of the same feature.

## Commands

```bash
# Install
composer install && npm install

# Dev (server + queue + logs + vite)
composer run dev

# Frontend build
npm run build

# Test — always run ONLY what's needed (see "Test discipline" below)
php artisan test --compact --filter=TestName        # one feature test
php artisan test --compact tests/Feature/SomeTest.php # one file
php artisan test --compact                           # full suite (only at milestone gates)

# PHP code style
vendor/bin/pint --dirty --format agent

# TypeScript check
npm run types:check

# PHP static analysis
composer run types:check
```

## Test discipline

**Running the full test suite (`php artisan test --compact`) on every change is too slow and wasteful.** Follow these rules:

| What changed | What to run |
|---|---|
| Markdown / docs files (`.md`) | **Skip tests entirely.** MD changes never affect test results. |
| PHP files (model, controller, middleware, etc.) | Run the specific test file(s) that cover that code. Use `--filter=` or pass the file path. |
| React / TypeScript files (pages, components) | Run `npm run build` + `npx eslint` on the changed files. No PHP tests needed for pure UI changes. |
| Migration / seeder files | Run `php artisan test --compact --filter=SeederName` or the relevant feature test. |
| Config / env files | Run only the tests that depend on that config. |
| Multiple files across layers | Run only the test files that directly exercise the changed code. |
| **Milestone gates** (end of a phase, before deploy, before commit) | Run the full suite **once** to catch regressions. |

**Minimum rule:** always run at least the specific test file you wrote or updated. Never run the full suite just because a markdown file was edited.

## Rules

- Follow Laravel conventions: `php artisan make:` for new files, Eloquent models with factories, named routes, feature tests.
- React pages live in `resources/js/pages`; reuse existing shadcn/ui components before writing new ones.
- Use TypeScript types and Wayfinder generated routes (`@/routes` / `@/actions`) — never hardcode URLs in components.
- Keep the API clean and versioned (`/api/v1/...`); do not write separate logic for admin vs mobile — reuse the same services.
- Provider integrations go behind an interface + factory (`app/AI/`), never hardcoded in controllers.
- Passwords / secrets come from `.env`, never committed.
- **Test discipline**: run only the tests that cover your changes. Never run the full suite for markdown edits. See "Test discipline" section above.
- **Sanctum stateful middleware is mandatory on the `api` group** for session-cookie auth to work. Never remove `EnsureFrontendRequestsAreStateful` from `bootstrap/app.php`.
- **Array session driver caveat**: the default test session driver (`array`) shares its store across the whole test run, so a login-then-API-call test passes even without `EnsureFrontendRequestsAreStateful`. For faithful API-auth tests, use `config(['session.driver' => 'database'])` + pass the real session cookie via `withUnencryptedCookies` + set `HTTP_REFERER` to trigger the stateful pipeline.
- **Session cookie name** is `laravel-session` (dash) in Laravel 13 — not `laravel_session` (underscore). Use `config('session.cookie')` for portability.
- **Slug uniqueness**: duplicate slugs are auto-suffixed (`testing` → `testing-2`) by the `HasAutoSlug` trait. Never add `unique` validation rules on slug fields — the trait handles it.
- **API Playground uses `credentials: 'omit'`**: never sends session cookies — Bearer token is the only auth. CSRF is skipped for `api/*` routes in `bootstrap/app.php`. This prevents the admin session from interfering with customer API testing.

## Workflow — every feature request (approval gated)

Follow this order for any coding request (e.g. "create the admin dashboard"):

1. **Write the prompt first.** Create `docs/prompts/<feature-slug>.md` describing: goal, requirements, affected files, acceptance criteria, open questions. Written in plain English.
2. **Stop and wait for approval.** Do NOT write code before the user accepts the prompt.
3. **On approval, write the code.** Smallest correct change, following existing conventions.
4. **Check & test.** Run the relevant tests (`php artisan test --compact`), `npm run types:check`, Pint, and `npm run build`.
5. **Auto-debug failures.** Find the root cause, fix it, re-run until green. Do not leave failing tests.
6. **Write the docs file.** Only when everything passes, create `docs/features/<feature-slug>.md`:
   - Beginner-friendly **English** by default (user may be new to the stack).
   - Include a **flowchart** (Mermaid ```` ```mermaid ```` block) of how the feature works.
   - Use **Myanmar (Burmese)** only when a concept is deep and hard to express simply in English.

## Agent skills (installed workflow)

This project uses the Engineering Workflow Skills (`jsmastery-pro/skills`) installed in `.agents/`. **Always read `.agents/docs/AGENTS.md` and `.agents/README.md` before significant work** to understand how each skill runs.

- [scope](.agents/skills/scope/): `jsmastery-pro/skills`, turns an idea into a coarse plan in `docs/scope/`
- [audit](.agents/skills/audit/): `jsmastery-pro/skills`, writes/updates this AGENTS.md from the real repo
- [architect](.agents/skills/architect/): `jsmastery-pro/skills`, makes load-bearing decisions as specs in `docs/specs/`
- [develop](.agents/skills/develop/): `jsmastery-pro/skills`, builds a feature from its spec
- [check](.agents/skills/check/): `jsmastery-pro/skills`, verifies a change in the running app or reviews it
- [test](.agents/skills/test/): `jsmastery-pro/skills`, writes the test suite for a change
- [document](.agents/skills/document/): `jsmastery-pro/skills`, writes PR/changelog/release docs from the real diff
- [sync](.agents/skills/sync/): `jsmastery-pro/skills`, keeps AGENTS.md / scope / specs current
- [debug](.agents/skills/debug/): `jsmastery-pro/skills`, root-cause loop for anything failing

## Context files

<!-- Nested AGENTS.md files are listed here as they are created -->

## Free AI CLI usage (Claude Code with a free provider)

This repo's workflow (AGENTS.md + `.agents` skills) is tool-agnostic and works the same whether Claude Code is backed by the paid Anthropic API or a free/custom endpoint. To point Claude Code at a free or third-party provider, set these environment variables before launching it (values are provider-specific — the pattern below is what every Anthropic-compatible endpoint expects):

```bash
export ANTHROPIC_BASE_URL="https://<provider>/api/anthropic"   # provider's Anthropic-compatible base URL
export ANTHROPIC_AUTH_TOKEN="<provider-api-key>"               # or ANTHROPIC_API_KEY for key-based providers
export ANTHROPIC_MODEL="<model-name>"                          # e.g. a free-tier model the provider exposes
export ANTHROPIC_SMALL_FAST_MODEL="<small-fast-model>"         # for background/researcher subagents
```

Notes:

- Free-tier examples in the wild: OpenRouter's `:free` models, DeepSeek, or other Anthropic-compatible gateways — each provides its own base URL and key. Never commit these values; keep them in your shell profile or a local env file.
- The `.agents` skills spawn cheap "researcher"/"scout" subagents — the `ANTHROPIC_SMALL_FAST_MODEL` var controls what those use, so a small/free model keeps the cost near zero.
- Any behavior differences (rate limits, no vision, tool call quirks) come from the provider, not from this repo's workflow; the files-based handoff (AGENTS.md, docs/) means switching providers mid-feature loses nothing.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
