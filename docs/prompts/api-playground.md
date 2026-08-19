# Admin API Playground

## Goal

Build a **Postman-like API testing tool** inside the admin dashboard (`/admin/api-playground`) that lets admins test the **same API endpoints** the mobile app uses — with zero duplicate logic. The playground sends real HTTP requests through the Laravel backend, logs them via the existing `LogApiRequests` middleware, and displays the full response.

## Requirements

### 1. Page layout (`/admin/api-playground`)

- **Permission**: `api.playground` required (already seeded)
- **Two-column layout**:
  - **Left panel (request builder)**:
    - Method dropdown (GET, POST, PUT, PATCH, DELETE)
    - URL input (pre-filled with `{{APP_URL}}/api/v1/...`)
    - Headers section (key-value editor, add/remove rows, defaults: `Content-Type: application/json`, `Accept: application/json`)
    - Body section (JSON textarea, shown only for POST/PUT/PATCH)
    - **Send Request** button (with loading spinner)
  - **Right panel (response viewer)**:
    - Status badge (200 green, 4xx yellow, 5xx red)
    - Duration (ms)
    - Response headers (collapsible, key-value)
    - Response body (JSON formatted/highlighted)

### 2. Pre-configured endpoint templates

Quick-select dropdown or chips that auto-fill the method + URL + body:
- `POST /api/v1/auth/register` (body: name, email, password)
- `POST /api/v1/auth/login` (body: email, password)
- `GET /api/v1/auth/me`
- `POST /api/v1/ai/face-swap` (body: template_slug + face_image_url)

### 3. Request execution

- The page sends requests via `fetch()` to the **same API endpoints** (same session auth, same logging, same throttling)
- Include the CSRF token (X-XSRF-TOKEN from cookie) for stateful session auth
- Display the full response including headers (useful for billing/cost debugging)

### 4. Request history (optional but recommended)

- Store last ~10 requests in local storage (method, url, body, response status, duration)
- Show as a clickable history list below the response panel
- Click to re-populate the request builder

### 5. No backend controller logic

- The playground page is a **pure Inertia React page** — no custom PHP controller logic beyond rendering the page
- Requests go directly to the existing `/api/v1/*` routes (the same ones the mobile app uses)
- The `LogApiRequests` middleware already captures everything

## Affected files

- `app/Http/Controllers/Admin/APIPlaygroundController.php` (new — Inertia render only)
- `resources/js/pages/admin/api-playground/index.tsx` (new — the playground UI)
- `routes/web.php` (replace "coming soon" with real controller)
- `resources/js/components/app-sidebar.tsx` (update href if needed)
- `tests/Feature/AdminAPIPlaygroundTest.php` (new)

## Acceptance criteria

- [ ] `/admin/api-playground` loads (permission `api.playground` required)
- [ ] Method selector, URL input, headers editor, body editor work
- [ ] Send button fires a real `fetch()` to the API endpoint with session auth
- [ ] Response panel shows status, headers, body, duration
- [ ] Pre-configured templates auto-fill the request builder
- [ ] Guest → redirect; no permission → 403
- [ ] Requests appear in `api_request_logs` (existing middleware handles this)
- [ ] `php artisan test --compact --filter=AdminAPIPlayground` passes
- [ ] ESLint + build clean

## Open questions

1. **Body format**: JSON only, or also support form-data / x-www-form-urlencoded? (recommended: JSON only for now — all our API endpoints accept JSON; file upload support can come later)
2. **Auth headers**: auto-inject the session cookie (stateful) or let admins paste a Bearer token? (recommended: session cookie — it's an admin tool; token testing can be a v2 feature)
3. **History persistence**: localStorage (client-side only, per-browser) vs database? (recommended: localStorage — it's just convenience, not audit data; the `api_request_logs` table is the real audit trail)
