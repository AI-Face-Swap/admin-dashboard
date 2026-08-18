# Customer Foundation (mobile + web end users)

## Goal

Create the `customers` table and model for the platform's **end users** (mobile app + web app) — separate from the admin `users` table. Customers are the people who generate images / face swaps. This is the data foundation for customer auth (Phase 1) and the customer-side API (later phases).

## Requirements

1. **Model + migration** — `Customer` model + `customers` migration matching `docs/database-diagram.md`:
   - `name`, `email` (unique), `password` (nullable for social login), `avatar` (nullable)
   - `auth_provider` + `auth_provider_id` (nullable; `google`, `apple` now, `tiktok`/`facebook` in v2)
   - `customer_type` — `free` / `premium` (default `free`)
   - `email_verified_at`, `last_active_at`, timestamps
2. **Factory** — `CustomerFactory` for tests/seeders.
3. **Email + password auth** — register / login / logout / password reset for customers (either a small custom controller set or Sanctum-style token auth — see open question 1). Kept simple: this slice establishes the data model + basic auth only.
4. **Do NOT touch** the admin `users` table or Fortify — admins and customers stay fully separate.

## Affected files

- `database/migrations/<timestamp>_create_customers_table.php`
- `app/Models/Customer.php`
- `database/factories/CustomerFactory.php`
- `app/Http/Controllers/Api/Auth/*` (customer auth controllers, if in this slice)
- `routes/api.php` (customer auth routes)
- `tests/Feature/CustomerAuthTest.php` (or similar)

## Acceptance criteria

- [ ] `customers` table exists with all columns above; `customers.email` unique and `customer_type` defaults to `free`
- [ ] `Customer` model + factory work (`Customer::factory()->create()`)
- [ ] Customer can register and log in with email + password (if auth is in this slice)
- [ ] Admin `users` auth still works (existing 39 tests pass)
- [ ] `php artisan test --compact` passes
- [ ] `npm run types:check` + `npm run build` pass (if frontend touched)

## Open questions

1. **Auth approach**: keep this slice to the model/migration only, or include customer email/password auth? If auth: plain Laravel session auth on a customer guard, or Sanctum tokens (mobile-friendly)? (recommended: model + migration + factory now; Sanctum token auth when the mobile API is built — keeps this slice tiny)
2. **Google / Apple login**: requires a social-login package (e.g. `laravel/socialite`) + provider credentials. Add in this slice or a follow-up? (recommended: follow-up, once the foundation is in)
3. **`last_active_at`**: update it on each authenticated request now, or when the mobile API exists? (recommended: when the API exists — no middleware yet)
