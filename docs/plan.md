# HTUT AI — Master Plan

## Completed ✅

| # | Feature | Phase |
|---|---|---|
| 1 | Laravel + Inertia + React + shadcn/ui + animated components | Foundation |
| 2 | Admin core: users, roles, permissions (RBAC, 6 roles, 15 permissions) | Admin Core |
| 3 | Templates CRUD (categories, tags, DO Spaces uploads, auto-slug) | Admin Core |
| 4 | Admin dashboard layout (sidebar, animated shadcn wrappers) | Admin Core |
| 5 | AI provider architecture: contract, factory, service, SegmindProvider | AI Architecture |
| 6 | Shared face-swap API endpoint (`/api/v1/ai/face-swap`) | AI Feature |
| 7 | Customer auth (Sanctum): register/login/logout/me, coin system | Customer |
| 8 | Template cost input (create/edit/list in admin dashboard) | Admin Core |
| 9 | Admin providers page (list, toggle active/inactive, stats) | Admin Core |
| 10 | Video face swap (queued job, 10 min timeout) | AI Feature |
| 11 | API Playground (Postman-like endpoint tester, form-data, HTML preview) | Admin Core |
| 12 | API Playground: global Bearer token, `credentials: 'omit'`, auto-extract token | Admin Core |
| 13 | API request logs page (paginated, filters, expandable rows) | Admin Core |
| 14 | Generation detail modal (click recent generations → output images/videos) | Admin Core |
| 15 | Bug fix: `AIService::execute()` accepts optional `$existingGeneration` | Bug Fix |
| 16 | Bug fix: image face-swap validates template type = `image` | Bug Fix |
| 17 | Bug fix: video face-swap polling detects HTML responses + refreshes | Bug Fix |
| 18 | Customer Management: list (type/coin/status filters), detail, ban/unban, add coins | Admin Core |
| 19 | Example data seeder (`ExampleDataSeeder`) | Dev Tooling |
| 20 | Provider toggle fix (returns Inertia response, not JSON) | Bug Fix |
| 21 | Image Generation API (`POST /api/v1/ai/images` — Segmind seedream, nano-banana, qwen) | AI Feature |
| 22 | Coin cost configurable via `config('ai.php')` + `.env` | Admin Core |
| 23 | Error handling: JSON error responses instead of 500 crashes | Bug Fix |
| 24 | Admin coin cost settings page (`/admin/settings` — UI to change coin costs) | Admin Core |
| 25 | API documentation with Scramble (`/docs/api` — OpenAPI 3.1.0) | Admin Core |
| 26 | Sliders CRUD (admin list/create/edit + mobile API) | Admin Core |
| 27 | Customer-facing frontend (`frontend/` — TanStack Router + React Query + shadcn) | Frontend |
| 28 | Slider carousel on homepage | Frontend |
| 29 | Frontend type/API alignment fixes (slider, generation, operation types) | Bug Fix |
| 30 | Dark mode default + gold theme (matches Logo.png) | Frontend |
| 31 | Glass navbar with backdrop blur | Frontend |
| 32 | Slider carousel with left-to-right gradient (dark → transparent) | Frontend |
| 33 | Text-to-image generation page (`/generate`) | Frontend |
| 34 | Generation history page (`/history`) with real API data | Frontend |
| 35 | Backend API: `GET /api/v1/customer/generations` (paginated, filtered, with stats) | Backend |
| 36 | Generation output stored to our DigitalOcean Spaces (not Segmind URLs) | Backend |
| 37 | `php artisan fix:segmind-urls` — migrate existing Segmind URLs to our Spaces | Dev Tooling |
| 38 | Generation detail: back to history, template info, coin cost (not USD) | Frontend |
| 39 | History page: shows actual result images/videos (not status icons) | Frontend |

---

## Pending 🔲

### High Priority

| # | Feature | Effort | Notes |
|---|---|---|---|
| 1 | **Social login (Google/Apple)** | Medium | Needs your OAuth client credentials |
| 2 | **Customer email verification** | Small | Verify email on register, block unverified |
| 3 | **Customer password reset** | Small | Forgot-password flow (email link) |
| 4 | ~~Admin coin cost settings page~~ | ~~Small~~ | ~~Done — UI to change coin costs instead of .env~~ |

### Medium Priority

| # | Feature | Effort | Notes |
|---|---|---|---|
| 5 | **Usage/cost analytics dashboard** | Medium | Charts: generations/day, cost/day, per-provider |
| 6 | **Image editing features** | Medium | Background removal, image upscaling via Segmind |
| 7 | **Image → Video** | Medium | Animate photos into videos (premium, higher coin cost) |
| 8 | **Virtual try-on** | Medium | Try clothes on photos (fashion niche) |
| 9 | **Animation polish** | Medium | Page transitions, card entrances, loading states |
| 10 | **Replicate provider** | Medium | New provider (when you have credits) |

### Low Priority

| # | Feature | Effort | Notes |
|---|---|---|---|
| 11 | **Payment integration** | Large | KBZ, RevenueCat, Stripe, Google Pay, Apple Pay |
| 12 | **Text → Video** | Large | Premium feature, highest coin cost |
| 13 | **Full test suite coverage** | Large | Comprehensive Pest tests for every feature |

---

## Recommended Next Order

1. Admin coin cost settings page (quick win)
2. Customer email verification + password reset
3. Social login (Google/Apple)
4. Usage/cost analytics dashboard
5. Image editing features (bg removal, upscaling)

---

## Architecture Rules (Never Break These)

- Admin dashboard and mobile app hit the **same** API endpoints — no duplicate logic
- All providers implement `AIProviderInterface` — adding new providers = 1 new class + 1 factory case
- `AIService` is the only class controllers call for AI work
- Cost is nullable when provider doesn't report it — never fake `0`
- `provider_id` is the source of truth — no duplicated provider string column
- API Playground uses `credentials: 'omit'` — Bearer token only, no session interference
- Theme colors controlled through global CSS variables (gold primary)
- AI operations that take 5+ minutes use queues/jobs
- **ALL generation outputs stored to OUR cloud** — never return provider URLs to frontend
- **Template cost shown in coins** — USD cost is internal only, not shown to customers
- **History page shows actual images/videos** — never show status icons for completed generations

---

## AI Capabilities Map (via Segmind)

| Capability | Status | Model |
|---|---|---|
| Image face swap | ✅ Done | `faceswap-v5` |
| Video face swap | ✅ Done | `video-faceswap-by-facefusion-labs` |
| Text → Image | ✅ Done | `seedream-v5-lite-text-to-image`, `nano-banana-2-lite`, `qwen-image-3` |
| Background removal | 🔲 Pending | `bria-remove-bg` |
| Image upscaling | 🔲 Pending | `real-esrgan-x4` |
| Image → Video | 🔲 Pending | `wan-2.6-i2v-flash`, `luma-ray-3.2` |
| Virtual try-on | 🔲 Pending | `pruna-p-try-on` |
| Text → Video | 🔲 Pending | `seedance-2.5` |
| Object removal | 🔲 Pending | `inpainting` |
| Style transfer | 🔲 Pending | `img2img-style` |
