# Apple Customer Login

## Goal

Add Apple login for customer accounts after Google login. Web customers use Apple's redirect/form-post callback flow, while mobile apps submit the native Apple identity token and receive the same Sanctum Bearer token response.

## Requirements

- Keep this customer-only; do not change admin/Fortify authentication.
- Use Apple's OAuth endpoints directly instead of adding another Socialite provider package.
- Add Apple config from `.env`:
  - `APPLE_CLIENT_ID`
  - `APPLE_REDIRECT_URI`
- Add backend web routes:
  - `GET /api/v1/auth/apple/redirect`
  - `POST /api/v1/auth/apple/callback`
  - `GET /api/v1/auth/apple/callback` for callback error handling
- Add backend mobile route:
  - `POST /api/v1/auth/apple/mobile` with `{ "identity_token": "...", "name": "optional", "email": "optional" }`
- Verify Apple identity tokens with Apple's JWKS from `https://appleid.apple.com/auth/keys`.
- Validate token issuer, audience, subject, expiration, and signature.
- Create or find customers using `auth_provider = apple` and `auth_provider_id = sub`; fall back to email match when email is present.
- Apple-created customers should have nullable password, `auth_provider = apple`, `auth_provider_id` set, email marked verified when present, 100 default coins, and `last_active_at` updated.
- Add "Continue with Apple" on both login and register pages.
- Reuse the existing frontend `/auth/callback` token landing page.

## Affected Files

- `backend/config/services.php`
- `backend/.env.example`
- `backend/.env.production.example`
- `backend/routes/api.php`
- `backend/app/Http/Controllers/Api/CustomerSocialAuthController.php`
- `backend/app/Http/Requests/Api/AppleMobileLoginRequest.php`
- `backend/tests/Feature/Auth/CustomerAppleLoginTest.php`
- `frontend/src/services/auth.service.ts`
- `frontend/src/pages/login.tsx`
- `frontend/src/pages/register.tsx`
- `backend/docs/features/apple-customer-login.md`

## Acceptance Criteria

- Web Apple login redirects users to Apple's authorize endpoint.
- Apple callback verifies `id_token`, creates or links the customer, issues a Sanctum token, and redirects to `/auth/callback?token=...`.
- Mobile Apple login accepts a native identity token and returns `{ customer, token }`.
- Existing Google and email/password auth still pass tests.
- Apple login tests cover web redirect, web callback customer creation, existing customer linking, mobile token login, and invalid audience rejection.
