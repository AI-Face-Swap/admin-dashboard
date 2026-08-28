# Google Customer Login

## Goal

Add Google login for customer accounts. Web customers use a backend OAuth redirect/callback flow, while mobile apps can submit a Google ID token directly and receive the same Sanctum Bearer token response.

## Requirements

- Use Laravel Socialite for the web Google OAuth redirect and callback.
- Keep this customer-only; do not change admin/Fortify authentication.
- Add Google service config from `.env`:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`
  - `FRONTEND_URL`
- Add backend web routes:
  - `GET /api/v1/auth/google/redirect`
  - `GET /api/v1/auth/google/callback`
- Add backend mobile route:
  - `POST /api/v1/auth/google/mobile` with `{ "id_token": "..." }`
- Web callback should create or find a customer, issue a Sanctum token, then redirect to `FRONTEND_URL/auth/callback?token=...`.
- Mobile login should verify the Google ID token, create or find a customer, and return `{ customer, token }`.
- Google-created customers should have nullable password, `auth_provider = google`, `auth_provider_id` set, avatar saved when available, email marked verified, 100 default coins, and `last_active_at` updated.
- Existing email/password login, registration, email verification, and password reset must continue working.
- Add "Continue with Google" on both login and register pages.
- Add frontend `/auth/callback` route to store the token, fetch `/api/v1/auth/me`, and redirect to `/dashboard`.

## Affected Files

- `backend/composer.json`
- `backend/config/services.php`
- `backend/.env.example`
- `backend/.env.production.example`
- `backend/routes/api.php`
- `backend/app/Http/Controllers/Api/CustomerSocialAuthController.php`
- `backend/app/Http/Requests/Api/GoogleMobileLoginRequest.php`
- `backend/tests/Feature/Auth/CustomerGoogleLoginTest.php`
- `frontend/src/App.tsx`
- `frontend/src/hooks/use-auth.ts`
- `frontend/src/pages/login.tsx`
- `frontend/src/pages/register.tsx`
- `frontend/src/pages/auth-callback.tsx`
- `frontend/src/types/index.ts`

## Acceptance Criteria

- Web Google login starts from frontend and returns an authenticated customer session token.
- Mobile Google login accepts a native Google ID token and returns `{ customer, token }`.
- Existing customers are matched by Google provider ID or email.
- Existing password customers can later log in with Google using the same email.
- New Google customers receive default free-plan coins and verified email status.
- Existing email/password auth flows still pass tests.
- Google login tests cover web callback customer creation, existing customer linking, and mobile token login.

## Open Questions

- Apple login remains out of scope and will be implemented after Google login is complete.
