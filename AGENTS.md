# HTUT AI — Backend (Laravel API + Admin Dashboard)

## Stack

- **Language / Runtime**: PHP 8.4
- **Framework**: Laravel 13 (Fortify for authentication, Passkeys, 2FA)
- **Admin Frontend**: Inertia v3 + React 19 + TypeScript, Tailwind CSS v4, shadcn/ui components
- **Package managers**: Composer (PHP) + npm / pnpm (JS)
- **Database**: MySQL (local + production), configured in `.env` as `DB_CONNECTION=mysql`
- **Storage**: DigitalOcean Spaces (`imagesbucket.sgp1.digitaloceanspaces.com`)
- **Local dev**: Docker Compose (`serversideup/php:8.4-fpm-nginx` + MariaDB 11 + Redis 7 + Mailpit + Node 20) with a Makefile — start here: **`DOCKER.md`** · deep-dive: `docs/features/docker-setup.md`
- **Testing**: Pest 4
- **Tooling**: Pint (PHP style), PHPStan/Larastan (static analysis), ESLint + Prettier (JS), Wayfinder (typed routes), Vite

## Project (memorize this)

Laravel backend + admin dashboard for AI media generation (image generation, face swap, video face swap) via abstracted providers (Segmind). Includes customer auth, coin system, API testing playground, roles & permissions, and API documentation.

**Customer-facing frontend lives in a separate repo.** This repo contains only the Laravel API and Inertia admin dashboard.

## Completed phases

| Phase | Feature | Status |
|---|---|---|
| 1 | Laravel + Inertia + React + shadcn/ui + animated components | ✅ |
| 2 | Admin core: users, roles, permissions (RBAC, 6 roles, 15 permissions), dashboard | ✅ |
| 2 | Templates CRUD (categories, tags, DO Spaces uploads, auto-slug) | ✅ |
| 2 | Admin dashboard layout (sidebar, animated shadcn wrappers) | ✅ |
| 3 | AI provider architecture: contract, factory, service, SegmindProvider | ✅ |
| 4 | Shared face-swap API endpoint (`/api/v1/ai/face-swap`) + request logging | ✅ |
| 5 | Customer auth (Sanctum): register/login/logout/me, coin system | ✅ |
| 5 | Template cost input (create/edit/list in admin dashboard) | ✅ |
| 5 | Admin providers page (`/admin/providers`) | ✅ |
| 6 | Video face swap (queued job, 10 min timeout) | ✅ |
| 7 | Admin API playground (`/admin/api-playground`) | ✅ |
| 8 | API request logs page (`/admin/api-logs`) | ✅ |
| — | Customer Management: list, detail, ban/unban, add coins | ✅ |
| — | Image Generation API (`POST /api/v1/ai/images`) | ✅ |
| — | Admin coin cost settings page (`/admin/settings`) | ✅ |
| — | API documentation with Scramble (`/docs/api`) | ✅ |
| — | Sliders CRUD (admin + mobile API) | ✅ |
| — | Generation outputs stored to our DigitalOcean Spaces | ✅ |
| — | `GET /api/v1/customer/generations` (paginated, filtered, with stats) | ✅ |
| — | Image-to-Video API (`POST /api/v1/ai/image-to-video`) — Wan 2.2 I2V Flash | ✅ |
| — | Image-to-Video supports file upload + URL (like face-swap) | ✅ |
| — | Admin AI page: Image to Video tab with upload/URL toggle | ✅ |
| — | API Playground: all 16 routes including image-to-video (upload + URL) | ✅ |
| — | `coins_spent` column on `ai_generations` — tracks coins per generation | ✅ |
| — | `GET /api/v1/coin-costs` — returns coin costs from admin settings | ✅ |
| — | Customer detail: shows both USD cost and coins spent | ✅ |
| — | `CleanupStuckGenerations` command — auto-fails timed-out generations | ✅ |
| — | Docker local dev environment (compose + Makefile, `/healthcheck`, Vite on :5174) | ✅ |
| — | Production Docker stack: multi-stage image, host-nginx reverse proxy (`127.0.0.1:8080`), queue + scheduler containers, GHCR CI/CD | ✅ |

## Pending phases

| # | Feature | Effort |
|---|---|---|
| 1 | Customer email verification + password reset | Small |
| 2 | Social login (Google/Apple) | Medium |
| 3 | Usage/cost analytics dashboard | Medium |
| 4 | Payment integration (KBZ, RevenueCat, Stripe) | Large |
| 5 | Full test suite coverage | Large |
| 6 | Longer video duration (10s, 15s, 20s) — multiple calls + FFmpeg stitching | Medium |

## Key architecture patterns

- **Shared API rule**: Admin dashboard (session cookie) and mobile app (Bearer token) hit the **same** API endpoints — never duplicate AI logic.
- **Provider abstraction**: `app/AI/` — `AIProviderInterface` → `AIProviderFactory` → `SegmindProvider`. Adding a new provider = 1 new class + 1 factory case.
- **`AIService`** is the only class controllers call: resolves provider → persists generation → returns normalized response.
- **`AIResponse` DTO**: provider, model, request_id, status, duration, usage, cost, currency, output, raw_response.
- **Cost is nullable**: `null` when the provider doesn't report it (never fake `0`).
- **`provider_id` is the source of truth**: no duplicated provider string column.
- **Slugs are auto-suffixed**: duplicate names get `name-2`, `name-3` (HasAutoSlug trait).
- **Coin economy**: customers start with 100 coins; each generation deducts the template's cost; reject 402 on insufficient balance.
- **ALL generation outputs stored to OUR cloud**: SegmindProvider downloads and stores to DigitalOcean Spaces. Never return provider URLs. Use `php artisan fix:segmind-urls` to fix existing data.
- **Output metadata format**: stored as `{"url": "/generations/uuid.ext"}` (relative URL).
- **Template cost in coins**: Frontend shows template cost in coins, NOT USD cost. USD cost is internal only.
- **File upload pattern**: Face-swap and image-to-video accept both file upload AND URL. Upload stores to Spaces, returns public URL.
- **Boolean validation**: Use `'nullable|string|in:true,false,0,1'` for form-data booleans (not `'boolean'`).
- **`coins_spent` on ai_generations**: Every generation saves `coins_spent` (template cost for face-swap, settings cost for image-gen/image-to-video).
- **Coin costs from admin settings**: Use `config('ai.coin_cost_*')` for image-generation and image-to-video. Face-swap/video-face-swap use `template.cost`.
- **Coin cost API endpoint**: `GET /api/v1/coin-costs` returns costs from database — frontend MUST fetch from here, never hardcode.
- **Cleanup stuck generations**: Run `php artisan app:cleanup-stuck-generations` or check status endpoint auto-fails generations >10min old.
- **Docker networking**: Containers communicate via service names — compose sets `DB_HOST=mysql`, `REDIS_HOST=redis`, `MAIL_HOST=mailpit` as real env vars (override `.env` inside containers only). Host ports 8080/3307/6380/8025/5174 are for host access; never use them for Laravel→service connections.

## Current DB tables

`users`, `customers`, `roles`, `permissions`, `role_user`, `permission_role`, `templates`, `template_categories`, `template_tags`, `template_tag`, `ai_providers`, `ai_generations`, `api_request_logs`, `settings`, `sliders`, `personal_access_tokens`, `sessions`, `cache`, `jobs`, `failed_jobs`, `passkeys`, `password_reset_tokens`

## API routes

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/v1/auth/register` | guest | Register customer |
| `POST /api/v1/auth/login` | guest | Login customer |
| `POST /api/v1/auth/logout` | sanctum | Revoke token |
| `GET /api/v1/auth/me` | sanctum | Customer profile |
| `POST /api/v1/ai/face-swap` | sanctum | Face-swap endpoint |
| `POST /api/v1/ai/video-face-swap` | sanctum | Video face-swap (queued) |
| `POST /api/v1/ai/images` | sanctum | Text-to-image generation |
| `POST /api/v1/ai/image-to-video` | sanctum | Image-to-video (Wan 2.2) — accepts `image` (file) OR `image_url` (URL) |
| `GET /api/v1/ai/generations/{id}` | sanctum | Poll generation status |
| `GET /api/v1/customer/generations` | sanctum | Customer's generations |
| `GET /api/v1/sliders` | public | Active sliders |
| `GET /api/v1/templates` | public | Active templates |
| `GET /api/v1/templates/{slug}` | public | Single template |
| `GET /api/v1/template-categories` | public | Template categories |
| `GET /api/v1/coin-costs` | public | Coin costs from admin settings |

## Admin web routes

| Route | Permission | Purpose |
|---|---|---|
| `/admin/providers` | `providers.view` | List providers |
| `/admin/providers/{provider}/toggle` | `providers.manage` | Toggle provider |
| `/admin/api-playground` | `api.playground` | API tester |
| `/admin/api-logs` | `settings.manage` | API request logs |
| `/admin/customers` | `customers.view` | List customers |
| `/admin/customers/{customer}` | `customers.view` | Customer detail |
| `/admin/customers/{customer}/ban` | `customers.manage` | Ban customer |
| `/admin/customers/{customer}/unban` | `customers.manage` | Unban customer |
| `/admin/customers/{customer}/coins` | `customers.manage` | Add coins |
| `/admin/settings` | `settings.manage` | Coin cost settings |
| `/admin/sliders` | `templates.view` | List sliders |
| `/docs/api` | `viewApiDocs` gate | API documentation |

## Commands

```bash
# Install
composer install && npm install

# Dev (admin dashboard only)
composer run dev

# Test
php artisan test --compact --filter=TestName

# PHP code style
vendor/bin/pint --dirty --format agent

# Fix Segmind URLs
php artisan fix:segmind-urls

# Cleanup stuck generations
php artisan app:cleanup-stuck-generations

# Docker (local dev)
make up            # start all services (app: http://localhost:8080)
make down          # stop — NEVER deletes volumes/database
make migrate       # migrate inside the php container
make shell         # bash into php container
make wayfinder     # regenerate typed routes after route changes (node has no PHP)

# Docker (production) — see docs/features/docker-production-setup.md
docker compose --env-file .env.production -f docker-compose.production.yml up -d
IMAGE_TAG=<sha> docker compose --env-file .env.production -f docker-compose.production.yml up -d   # rollback
```

## Production rules

- **Config must be cacheable**: never put objects/closures in `config/*.php` — AUTORUN runs `php artisan optimize` on boot and non-serializable values fail the container.
- **Wayfinder types are gitignored**: CI builds generate them in the image's vendor stage; locally run `make wayfinder`.
- **Font builds are hermetic**: `node_modules/.cache/laravel-vite-plugin` is committed — keep it when npm cache issues occur, re-warm with a local `npm run build`.
- Production secrets live only in `.env.production` on the VPS (gitignored); `.env.production.example` documents every key.

## Rules

- Follow Laravel conventions: `php artisan make:` for new files, Eloquent models with factories, named routes, feature tests.
- Keep the API clean and versioned (`/api/v1/...`); never duplicate logic for admin vs mobile.
- Provider integrations go behind an interface + factory (`app/AI/`), never hardcoded in controllers.
- Passwords / secrets come from `.env`, never committed.
- **Sanctum stateful middleware is mandatory** for session-cookie auth. Never remove `EnsureFrontendRequestsAreStateful`.
- **Slug uniqueness**: duplicate slugs auto-suffixed by HasAutoSlug. Never add `unique` validation on slugs.
- **Test discipline**: run only the tests that cover your changes. See test rules below.

## Test discipline

| What changed | What to run |
|---|---|
| Markdown / docs files | Skip tests |
| PHP files | Run specific test file |
| Migration / seeder | Run relevant feature test |
| Milestone gates | Full suite once |

## Workflow

1. Write prompt first → `docs/prompts/<feature-slug>.md`
2. Wait for approval
3. Write code (smallest correct change)
4. Check & test
5. Auto-debug failures
6. Write docs → `docs/features/<feature-slug>.md`
