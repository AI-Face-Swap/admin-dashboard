# Image Generation (Text → Image) + Toggle Fix

## Goal

1. Fix the provider toggle Inertia error (quick fix)
2. Implement text-to-image generation using Segmind

---

## 1. Toggle Fix (quick)

### Problem

`ProviderController::toggle()` returns `JsonResponse` but Inertia expects an Inertia response.

### Fix

- **Controller**: `back()->with('success', 'Provider enabled/disabled')` instead of `response()->json()`
- **Frontend**: `router.reload({ only: ['providers'] })` after toggle

### Files

- `app/Http/Controllers/Admin/ProviderController.php`
- `resources/js/pages/admin/providers/index.tsx`

---

## 2. Image Generation (Text → Image)

### What

A new `POST /api/v1/ai/images` endpoint that generates images from text prompts using Segmind.

### Segmind API pattern

Same async v2 pattern as face-swap:

1. **Submit**: `POST https://api.segmind.com/v2/{model}`
   - Headers: `x-api-key: ...`, `Content-Type: application/json`
   - Body: `{ "prompt": "...", "negative_prompt": "...", "seed": ..., "image_format": "png", "quality": 95 }`
   - Returns: `{ "request_id": "..." }`

2. **Poll**: `GET https://api.segmind.com/v2/requests/{request_id}/status`
   - Returns: `{ "status": "COMPLETED" | "QUEUED" | "PROCESSING" }`

3. **Fetch result**: `GET https://api.segmind.com/v2/requests/{request_id}`
   - Returns base64 image data

### Models to support

| Model | Operation | Best for |
|---|---|---|
| `seedream-v3` | `image-generation` | High quality, versatile |
| `flux-schnell` | `image-generation` | Fast, good quality |
| `sd-xl` | `image-generation` | Stable Diffusion XL |

### Architecture

Controller → AIService → SegmindProvider::generateImage() → Segmind API

### New files

| File | Action |
|---|---|
| `app/Http/Controllers/Api/AIImageGenerationController.php` | Create |
| `app/Http/Requests/Api/ImageGenerationRequest.php` | Create |
| `routes/api.php` | Edit — add route |
| `database/seeders/AIProviderSeeder.php` | Edit — add image-generation operation |
| `resources/js/pages/admin/ai/index.tsx` | Edit — add image generation tab |
| `resources/js/pages/admin/api-playground/index.tsx` | Edit — add image generation template |
| `tests/Feature/ImageGenerationApiTest.php` | Create |

### Request body

```json
{
    "prompt": "A superhero flying over a city at sunset",
    "negative_prompt": "blurry, low quality",
    "model": "seedream-v3",
    "width": 1024,
    "height": 1024,
    "seed": null,
    "image_format": "png",
    "quality": 95
}
```

### Response

```json
{
    "status": "queued",
    "generation": {
        "id": 1,
        "operation": "image-generation",
        "status": "queued"
    }
}
```

### Coin cost

- Default: 5 coins per generation (configurable per template)
- Free customers start with 100 coins

### Admin AI page

Add a third tab: **Image Generation** with:
- Prompt textarea
- Negative prompt textarea
- Model selector (seedream-v3, flux-schnell, sd-xl)
- Width/Height selectors
- Generate button
- Result display (generated image)

### API Playground

Add template: `Image Generation (Upload)` with form-data fields:
- `prompt` (text)
- `negative_prompt` (text)
- `model` (text, default: seedream-v3)

---

## Acceptance Criteria

- [ ] Toggle provider → no Inertia error
- [ ] `POST /api/v1/ai/images` creates generation + returns 202
- [ ] Image generation works end-to-end with Segmind
- [ ] Admin AI page has Image Generation tab
- [ ] API Playground has image generation template
- [ ] Coin deduction works
- [ ] All tests pass
