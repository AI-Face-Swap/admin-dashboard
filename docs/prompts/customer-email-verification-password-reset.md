# Customer Email Verification + Password Reset

## Goal

Add **email verification** and **password reset** for customers via API endpoints. Both flows send emails with deep links that the mobile/frontend app can intercept and use to complete the action.

The existing Fortify email verification and password reset is wired to the `web` guard (admin users only). Customers use Sanctum Bearer tokens, so we need separate API endpoints.

## Requirements

1. **Email verification flow:**
   - After registration, send a verification email with a signed URL
   - Customer taps link → opens frontend app → app calls API to verify
   - `POST /api/v1/auth/email/verify/resend` — resend verification email (authenticated, unverified only)
   - `GET /api/v1/email/verify/{id}/{hash}` — verify email via signed URL (public, no auth)
   - Customer model gains `MustVerifyEmail` interface

2. **Password reset flow:**
   - `POST /api/v1/auth/forgot-password` — send reset email (guest, throttled)
   - `POST /api/v1/auth/reset-password` — reset password with token (guest)
   - Email contains a deep link with token + email as query params
   - `customers` password broker in `config/auth.php`

3. **Notifications:**
   - Custom `VerifyEmail` notification with signed URL deep link
   - Custom `CustomerResetPassword` notification with frontend deep link

4. **Config:**
   - `FRONTEND_URL` env var for deep links in emails
   - `customers` password broker in `config/auth.php`

## Affected files

- `config/auth.php` (customers password broker)
- `config/app.php` (frontend_url)
- `app/Models/Customer.php` (MustVerifyEmail, CanResetPassword)
- `app/Notifications/VerifyEmail.php` (new)
- `app/Notifications/CustomerResetPassword.php` (new)
- `app/Http/Controllers/Api/CustomerAuthController.php` (new methods)
- `app/Http/Requests/Api/SendVerificationEmailRequest.php` (new)
- `app/Http/Requests/Api/ForgotPasswordRequest.php` (new)
- `app/Http/Requests/Api/ResetPasswordRequest.php` (new)
- `routes/api.php` (new routes)
- `tests/Feature/Auth/CustomerEmailVerificationTest.php` (new)
- `tests/Feature/Auth/CustomerPasswordResetTest.php` (new)

## Acceptance criteria

- [ ] Registration sends verification email
- [ ] `POST /api/v1/auth/email/verify/resend` sends verification email (unverified only)
- [ ] `GET /api/v1/email/verify/{id}/{hash}` verifies email via signed URL
- [ ] Expired/invalid signed URLs return appropriate errors
- [ ] `POST /api/v1/auth/forgot-password` sends reset email (throttled)
- [ ] `POST /api/v1/auth/reset-password` resets password with valid token
- [ ] Invalid/expired tokens return 400
- [ ] Login works with new password after reset
- [ ] All existing tests still pass
