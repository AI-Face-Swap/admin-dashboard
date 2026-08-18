# Phase 4 — Face Swap API + Request Logging + Admin AI Page

## Goal

Expose the Phase 3 engine to real users: a **shared JSON API endpoint** for face swap (the same endpoint the mobile app will use later — **no duplicate logic for the admin**), a **request logger** that records every API call **including response headers** (the billing/cost source), and an **admin AI page** that uses the API directly.

## Requirements

1. **`api_request_logs` table + middleware** (`app/Http/Middleware/LogApiRequests.php`)
   - Columns per `docs/database-diagram.md` + one addition: `id`, `user_id` (nullable FK), `customer_id` (nullable FK), `method`, `path`, `request_headers` (json), `request_body` (json), `response_status`, **`response_headers` (json — added per user: response headers carry billing/cost info)**, `response_body` (json), `duration_ms`, timestamps
   - Middleware measures wall time, captures request + response, writes one row per request. **Request headers exclude sensitive values** (`Authorization`, `Cookie`); **response headers are logged in full**
   - Applied to all `/api/*` routes
2. **API routes** — create `routes/api.php` + register in `bootstrap/app.php` (`withRouting(api: ...)`; JSON exception rendering for `api/*` is already configured)
   - `POST /api/v1/ai/face-swap` — the **single shared endpoint** for face swap (admin page AND future mobile app call this)
     - Input (validated): `face_image` (file upload, image, ≤10 MB) **OR** `face_image_url`; `template_slug` (lookup by slug, active only) **OR** `target_image_url` — exactly one of each pair
     - Flow: store uploaded face on the `spaces` disk (public URL) → resolve template → `AIService::faceSwap(GenerationRequest, requester: current user)` with `{source_image: face_url, target_image: template_url}` → JSON response
     - Response: `{ status, generation: { id, request_id, operation, status, cost, currency, duration_ms, output[] } }` — **no API keys, no raw provider internals**
     - Auth for now: admin session (`web` middleware group + `auth`) — see open question 1
   - Validation errors → 422 JSON; unknown template slug → 404 JSON
3. **Admin AI page** — `/admin/ai` replaces the "AI Generation" Coming Soon link (sidebar → real page; `ai.view` to view, `ai.generate` to use the tool)
   - **Face Swap tool** (the core): face image upload (preview) + template picker (active templates with thumbnails, from `/admin/templates` data) → Generate (`AnimatedButton`, loading state) → result image displayed with status / cost / duration / request_id
   - **The page calls `POST /api/v1/ai/face-swap` directly** (XHR with CSRF + session) — same endpoint as the mobile app, no separate admin logic
   - **Recent generations** list below (last ~20): status badge, operation, template, cost, duration, created_at
4. **No changes to** Phase 3 engine (AIService/factory/providers stay as-is)

## Affected files

- `routes/api.php` (new), `bootstrap/app.php` (register api routing)
- `database/migrations/<ts>_create_api_request_logs_table.php`
- `app/Models/ApiRequestLog.php` (+ factory optional)
- `app/Http/Middleware/LogApiRequests.php` (registered on `api` group)
- `app/Http/Controllers/Api/AIFaceSwapController.php` (+ a `FormRequest` for validation)
- `app/Http/Controllers/Admin/AIController.php` (Inertia page) — or inline
- `resources/js/pages/admin/ai/index.tsx` (tool + history)
- `resources/js/components/app-sidebar.tsx` (AI Generation → `/admin/ai`)
- `resources/js/types` (API response types)
- `tests/Feature/FaceSwapApiTest.php`, `tests/Feature/ApiRequestLogTest.php`, `tests/Feature/AdminAIPageTest.php`

## Acceptance criteria

- [ ] `api_request_logs` table + middleware; every `/api/*` request logged with method/path/headers/body/status/**response headers**/duration
- [ ] `POST /api/v1/ai/face-swap` works with (a) uploaded face + template slug, (b) face URL + target URL — via `Http::fake` in tests
- [ ] Face upload stored on `spaces`; generation row linked to template + requester; cost/duration from the provider persisted
- [ ] 422 on invalid input, 404 on unknown template slug, unauthenticated → 401/redirect
- [ ] `/admin/ai` page loads (permission `ai.view`), generate button posts to the SAME API endpoint, history shows recent generations
- [ ] `php artisan test --compact`, `composer run types:check` (PHPStan), `vendor/bin/pint` all pass

## Open questions

1. **API auth**: admin session auth only (no new dependency) vs install **Sanctum** now for token auth? (recommended: session now — the admin page is the only consumer; Sanctum ships with customer auth, endpoints unchanged)
2. **Sync vs queued**: face-swap image (~10–30s) runs synchronously in the request, or submit-and-return-queued (poll later)? (recommended: synchronous now — matches Phase 3's design; queued jobs for video face swap come in Phase 5/8)
3. **Rate limiting**: add a basic `throttle` to the face-swap endpoint now? (recommended: yes — e.g. `throttle:30,1` per user; free-quota enforcement comes with customer auth)
4. **Response headers**: log them all (recommended — billing source), or only non-sensitive ones?
5. **History scope**: show all admins' generations on the page, or only the current admin's? (recommended: all — it's an admin dashboard; user filter later)
