# API Documentation — Scramble Prompt

## Overview

Add auto-generated API documentation for mobile developers using **Scramble** (dedoc/scramble).

## Why Scramble over L5-Swagger

| Feature | Scramble | L5-Swagger |
|---|---|---|
| **Annotations** | Zero — auto-generates from code | Manual PHPDoc on every endpoint |
| **Maintenance** | Always up-to-date (docs = code) | Can go stale |
| **Setup** | `composer require dedoc/scramble` | Complex config |
| **Format** | OpenAPI 3.1.0 | OpenAPI 3.0 |
| **Laravel-native** | Yes | Generic PHP |
| **UI** | Stoplight Elements (built-in) | Swagger UI |

## What Scramble reads automatically

- Routes (`routes/api.php`)
- Controllers (return types, status codes)
- Form Requests (validation rules → parameters)
- Eloquent Models (attributes → response schema)
- Enums (cases → allowed values)
- PHPDoc blocks (only when you want to add descriptions)

## Routes to document

All `/api/v1/*` routes:

| Route | Method | Auth |
|---|---|---|
| `/api/v1/auth/register` | POST | guest |
| `/api/v1/auth/login` | POST | guest |
| `/api/v1/auth/logout` | POST | sanctum |
| `/api/v1/auth/me` | GET | sanctum |
| `/api/v1/ai/face-swap` | POST | sanctum |
| `/api/v1/ai/video-face-swap` | POST | sanctum |
| `/api/v1/ai/images` | POST | sanctum |
| `/api/v1/ai/generations/{id}` | GET | sanctum |

## What to build

### 1. Install Scramble

```bash
composer require dedoc/scramble
```

### 2. Configuration

Scramble auto-discovers routes. We just need to:
- Make docs accessible in non-local environments (via gate)
- Add descriptions to endpoints using Scramble's `#[Operation]` attributes or PHPDoc

### 3. Enhance auto-generated docs

Add descriptions to controllers/requests that explain:
- What each endpoint does
- Rate limits
- Coin costs per operation
- Error responses

### 4. Gate for access control

```php
// AppServiceProvider.php
use Illuminate\Support\Facades\Gate;

Gate::define('viewApiDocs', function ($user) {
    return $user->hasRole('super-admin') || $user->hasRole('developer');
});
```

### 5. Mobile developer access

- URL: `/docs/api` — interactive Swagger UI
- URL: `/docs/api.json` — raw OpenAPI JSON (for Postman import)
- Accessible to admin users with `viewApiDocs` permission

## Files to modify

| File | Action |
|---|---|
| `app/Providers/AppServiceProvider.php` | Add Scramble gate |
| `app/Http/Controllers/Api/*.php` | Add Scramble descriptions |
| `app/Http/Requests/Api/*.php` | Add PHPDoc for better param docs |
| `routes/api.php` | No changes needed (auto-discovered) |

## Notes

- Scramble generates docs from the LIVE code — never stale
- No separate markdown docs to maintain
- Mobile devs can import `/docs/api.json` into Postman
- Admin can view at `/docs/api` in browser
