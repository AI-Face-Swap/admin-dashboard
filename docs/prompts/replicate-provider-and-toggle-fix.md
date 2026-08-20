# Replicate Provider + Toggle Fix

## Goal

1. Fix the provider toggle endpoint to work with Inertia (currently returns plain JSON → error)
2. Implement a Replicate provider (inactive by default)

---

## 1. Toggle Fix

### Problem

`ProviderController::toggle()` returns `JsonResponse`, but the frontend uses `router.patch()` which expects an Inertia response. The error:

```
All Inertia requests must receive a valid Inertia response,
however a plain JSON response was received.
{"is_active":false}
```

### Fix

- **Controller**: Change `toggle()` to return `back()->with('success', ...)` instead of `response()->json()`
- **Frontend**: After `router.patch()`, use `router.reload({ only: ['providers'] })` to refresh the provider list instead of reading props from the response

### Files

- `app/Http/Controllers/Admin/ProviderController.php`
- `resources/js/pages/admin/providers/index.tsx`

---

## 2. Replicate Provider

### What

A new `ReplicateProvider` class implementing `AIProviderInterface`, added to the factory and seeder (inactive by default).

### Replicate API pattern

Replicate uses a prediction-based async model:

1. **Create prediction**: `POST https://api.replicate.com/v1/predictions`
   - Header: `Authorization: Bearer r8_...`
   - Body: `{ "version": "<model-version>", "input": { ... } }`
   - Returns: `{ "id": "...", "status": "starting", "urls": { "get": "..." } }`

2. **Poll status**: `GET https://api.replicate.com/v1/predictions/{id}`
   - Statuses: `starting` → `processing` → `succeeded` | `failed` | `canceled`
   - On success: `{ "status": "succeeded", "output": "https://..." }`
   - Cost: Replicate reports `metrics.predict_time` but no direct cost field — cost is `null`

3. **Result**: Output is typically a URL array (images/videos)

### Face-swap model on Replicate

- `lucataco/face-swap` — popular face-swap model
- Input: `source_image` (URL), `target_image` (URL)
- Output: swapped image URL

### Video face-swap on Replicate

- `lucataco/fast-svd-dream-studio` or similar video models
- Not all Replicate models support video — for now, implement face-swap only

### Architecture

```
app/AI/Providers/Replicate/
    ReplicateProvider.php    ← implements AIProviderInterface
```

### SegmindProvider pattern to follow

Same as Segmind:
- `name()` → `'replicate'`
- `supports()` → checks operations config
- `faceSwap()` → create prediction → poll until terminal → return AIResponse
- `generateImage()` → stub (throws UnsupportedOperationException for now)
- `videoFaceSwap()` → stub (throws UnsupportedOperationException for now)

### Config

```php
// In AIProviderSeeder for Replicate
[
    'slug' => 'replicate',
    'name' => 'Replicate',
    'is_active' => false,  // inactive by default
    'config' => [
        'base_url' => 'https://api.replicate.com/v1',
        'operations' => [
            'face-swap' => 'lucataco/face-swap',
        ],
    ],
]
```

### API key

From config: `config('ai.providers.replicate.api_key')` — set via env `REPLICATE_API_KEY`

### Files to create/edit

| File | Action |
|---|---|
| `app/AI/Providers/Replicate/ReplicateProvider.php` | Create — implements AIProviderInterface |
| `app/AI/Factories/AIProviderFactory.php` | Edit — add Replicate case |
| `database/seeders/AIProviderSeeder.php` | Edit — add Replicate provider (inactive) |
| `config/ai.php` | Edit — add replicate config |

### Tests

- Http::fake tests for Replicate prediction create + poll + result
- Test that Replicate provider supports face-swap
- Test that Replicate provider does NOT support video-face-swap (stub)
- Test that the toggle fix returns Inertia response

---

## Acceptance Criteria

- [ ] Toggle provider → no Inertia error, provider state updates, success message shown
- [ ] Replicate provider seeded as inactive
- [ ] Enabling Replicate on providers page works (same toggle)
- [ ] Replicate face-swap via API works end-to-end (with test key)
- [ ] Replicate video-face-swap returns UnsupportedOperationException
- [ ] All tests pass
