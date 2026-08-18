# Customer Auth — Sanctum tokens for mobile + web end users

## Goal

Let **customers** (the `customers` table — mobile app + web end users, separate from admin `users`) register and log in with email/password, receive **Sanctum API tokens**, and call the **same shared API** the admin dashboard uses. The face-swap endpoint keeps working for the admin (session) **and** starts accepting customer tokens — one endpoint, no duplicate logic.

**New dependency:** `laravel/sanctum` (official Laravel token auth — the standard choice; mobile apps can't use sessions).

## Requirements

1. **Install + configure Sanctum** — `composer require laravel/sanctum`; publish config; run the `personal_access_tokens` migration. `Customer` gains `HasApiTokens`.
2. **Customer guard** — add a `customer` guard + eloquent provider in `config/auth.php` (model `App\Models\Customer`). Sanctum's token guard resolves the customer; the admin `web` guard is untouched (Fortify stays admin-only).
3. **Auth endpoints** (`/api/v1/auth/*`, JSON only, throttled):
   - `POST /api/v1/auth/register` — `name`, `email`, `password` (min 8) → creates customer (type `free`), returns `{ customer, token }`
   - `POST /api/v1/auth/login` — `email`, `password` → `{ customer, token }` (token issued once — never stored in plain form, only its hash)
   - `POST /api/v1/auth/logout` — revokes the current token (`auth:sanctum`)
   - `GET /api/v1/auth/me` — authenticated customer profile (`auth:sanctum`)
   - Errors: 422 validation (incl. duplicate email), 401 bad credentials / invalid token
4. **Face-swap endpoint accepts both** — change `POST /api/v1/ai/face-swap` to `auth:sanctum` with Sanctum's stateful-session handling (`EnsureFrontendRequestsAreStateful`, config `stateful` domains from `APP_URL`) so:
   - Admin dashboard (session cookie) → still works unchanged
   - Mobile app (Bearer token) → works too
   - `AIFaceSwapController` attaches the **customer** as requester when token-authenticated (`customer_id` on the generation row)
5. **`api_request_logs` records the requester** — `LogApiRequests` middleware captures `user_id` (admin session) **or** `customer_id` (token) depending on the authenticated guard.
6. **Social login (Google, Apple)** — see open question 1. When in scope: `laravel/socialite`, `POST /api/v1/auth/social/{provider}` + callback flow, maps `auth_provider_id`, creates the customer if new (no password — nullable already), updates `auth_provider`.
7. **Free quota** — see open question 2.

## Affected files

- `composer.json` (+ `laravel/sanctum`, maybe `laravel/socialite`)
- `config/auth.php` (customer guard), `config/sanctum.php` (published), `.env.example` (sanctum stateful domains + social credentials placeholders)
- `database/migrations/<ts>_create_personal_access_tokens_table.php` (via Sanctum)
- `app/Models/Customer.php` (`HasApiTokens`)
- `app/Http/Controllers/Api/Auth/RegisterController.php`, `LoginController.php`, `LogoutController.php`, `MeController.php` (+ social if in scope) — or one `CustomerAuthController`
- `app/Http/Requests/Api/RegisterRequest.php`, `LoginRequest.php`
- `routes/api.php` (auth group + face-swap middleware change)
- `app/Http/Middleware/LogApiRequests.php` (customer guard detection)
- `app/Http/Controllers/Api/AIFaceSwapController.php` (requester: user or customer)
- `tests/Feature/CustomerAuthTest.php` (+ update `FaceSwapApiTest` for token auth)
- `docs/database-diagram.md` (minor: note Sanctum tokens table)

## Acceptance criteria

- [ ] `register` → customer row + working token; duplicate email → 422
- [ ] `login` → token; wrong password → 401; `logout` → token revoked (reuse → 401)
- [ ] `me` returns the customer profile
- [ ] Face swap works with a **Bearer token** (customer requester, `customer_id` set, free-type customer) **and** still works with the admin session
- [ ] `api_request_logs.customer_id` populated for token-authenticated requests
- [ ] Existing admin auth + admin AI page unchanged (all 92 existing tests still pass)
- [ ] `php artisan test --compact`, `composer run types:check` (PHPStan), `vendor/bin/pint` all pass

## Open questions

1. **Social login in this slice?** Google/Apple via Socialite needs your **client ID/secret credentials** (from Google Cloud Console / Apple Developer). (recommended: **email/password + Sanctum first** — fully testable today; add social immediately after, once you paste the credentials — the customer table is already social-ready)
2. **Free quota now?** **Coin-based** (per your design): customers start with **100 coins** (`customers.coins`, default 100); each generation deducts the **template's cost** in coins (`templates.cost`, default 0); reject when balance is insufficient. (recommended: implement the deduction check now — it's the whole point of the coin fields; premium = unlimited or a larger pool later)
3. **Email verification + password reset for customers?** (recommended: later — mobile apps usually handle these outside the app; keep this slice tight)
4. **Token model:** long-lived personal tokens (Sanctum default) vs expiring tokens (e.g. 30-day expiry)? (recommended: default long-lived now; add refresh/expiry when the app asks)
