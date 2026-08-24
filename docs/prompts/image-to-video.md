# Image-to-Video Generation (Wan 2.2 I2V Flash)

## Overview

Add image-to-video generation capability using Segmind's Wan 2.2 I2V Flash model. This allows customers to generate short, coherent videos from a single reference image plus a text prompt.

## API Provider

**Segmind Wan 2.2 I2V Flash**
- Endpoint: `https://api.segmind.com/v2/wan-2.2-i2v-flash`
- Async v2 flow: submit → poll → fetch result
- Output: MP4 video stored to our DigitalOcean Spaces

## Endpoint

```
POST /api/v1/ai/image-to-video
```

### Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `prompt` | string | ✅ | Describe motion, camera behavior, atmosphere (max 2000 chars) |
| `image` | string (URL) | ✅ | Base image URL for video generation |
| `negative_prompt` | string | ❌ | Exclude unwanted elements (max 1000 chars) |
| `resolution` | string | ❌ | "480p" ($0.075) or "720p" ($0.18, default) |
| `prompt_extend` | boolean | ❌ | Auto-enhance prompt (default: true) |
| `seed` | integer | ❌ | Lock randomness for reproducibility |
| `watermark` | boolean | ❌ | Add "AI Generated" tag |

### Coin Cost

- **20 coins** per generation (configurable in admin settings)

### Response

```json
{
    "status": "completed",
    "generation": {
        "id": 1,
        "operation": "image-to-video",
        "status": "completed",
        "cost": "0.1800",
        "currency": "USD",
        "duration_ms": 45000,
        "output": ["https://your-space.com/generations/uuid.mp4"],
        "coins_spent": 20,
        "coins_remaining": 80
    }
}
```

## Implementation

### Files to Create/Modify

| File | Action |
|---|---|
| `app/Models/AIGeneration.php` | Add `OPERATION_IMAGE_TO_VIDEO` constant |
| `app/AI/Providers/Segmind/SegmindProvider.php` | Add `imageToVideo()` method |
| `app/AI/Services/AIService.php` | Add `imageToVideo()` method + match case |
| `app/Http/Controllers/Api/AIImageToVideoController.php` | **New** controller |
| `routes/api.php` | Add `POST /api/v1/ai/image-to-video` |
| `database/seeders/AIProviderSeeder.php` | Add `wan-2.2-i2v-flash` endpoint |
| `config/ai.php` | Add `image_to_video` coin cost |
| `resources/js/pages/admin/api-playground/index.tsx` | Add template |

### Segmind API Flow

1. **Submit**: POST to `/v2/wan-2.2-i2v-flash` with payload
2. **Poll**: GET `/v2/requests/{request_id}/status` until COMPLETED
3. **Fetch**: GET `/v2/requests/{request_id}` for final result
4. **Store**: Download output MP4 to our DigitalOcean Spaces

### Pricing (Segmind)

| Resolution | Cost per generation |
|---|---|
| 480p | $0.075 |
| 720p | $0.18 |

## Testing

- Unit test: Mock Http::fake for submit/poll/fetch flow
- Feature test: POST to `/api/v1/ai/image-to-video` with valid payload
- Verify: Generation record created, output stored to Spaces, coins deducted

## Admin Dashboard

- Template added to API Playground: "Image to Video (Wan 2.2)"
- Coin cost configurable at `/admin/settings`

## Prompt Writing Tips (from Segmind docs)

- Combine motion + camera + lighting: "Smooth crane-up, gentle breeze rustling leaves, golden hour soft glow"
- Keep prompts concise (10-20 words) and focused on key movements
- Use negative prompts to filter noise and unwanted artifacts
