# Video Face Swap

## Goal

Add video face swap as a queued job — the provider polls for 5+ minutes, so it cannot run synchronously in an HTTP request. The admin dashboard and mobile app hit the **same** `/api/v1/ai/video-face-swap` endpoint (your architecture rule). The endpoint returns immediately with `status: "processing"`, and the job updates the generation row when complete.

## Requirements

### 1. SegmindProvider: implement `videoFaceSwap()`

The method already exists in the interface but throws `UnsupportedOperationException`. Implement it using the same submit → poll → fetch pattern as `faceSwap()`, but:

- Endpoint: `video-faceswap-by-facefusion-labs` (from `$this->operations['video-face-swap']`)
- Payload shape: `{ source_image, target_video, model_name, face_detector_score, target_face_index }`
- **Poll timeout: 600s (10 min)** — video generation is slow
- Same output normalization (base64 or URL → persist to disk)
- Add `video-face-swap` to the Segmind provider config in `AIProviderSeeder`

### 2. Queued job: `ProcessVideoFaceSwap`

- Wraps `AIService::execute()` in a job
- On completion: updates the `AIGeneration` row (status, output, cost, duration)
- On failure: marks generation as `failed` with error message
- Dispatched from the API controller, not run synchronously
- Uses the `default` queue (Horizon handles it)

### 3. API endpoint: `POST /api/v1/ai/video-face-swap`

Same pattern as face-swap but:
- Accepts: `face_image` (file) OR `face_image_url` + `template_slug` OR `target_video_url`
- Template must be `type = 'video'`
- Creates `AIGeneration` row with `status = 'queued'`
- Dispatches `ProcessVideoFaceSwap` job
- Returns immediately: `{ status: "queued", generation: { id, status, ... } }`
- Customer coin check happens **before** dispatch (reject 402 if insufficient)
- Coin deduction happens **in the job** on completion (not in the controller)

### 4. Admin AI page: video face swap section

Add a "Video Face Swap" tab/section to `/admin/ai`:
- Face upload + video template picker (only `type = 'video'` templates)
- Generate button → calls `POST /api/v1/ai/video-face-swap`
- Shows "Queued" / "Processing" status with polling (every 5s)
- When complete: shows result video + cost/duration
- Recent generations list filters by `operation = 'video-face-swap'`

### 5. Status polling endpoint

`GET /api/v1/ai/generations/{id}` — returns the current generation status + output.
Used by the admin page to poll for completion. Auth: same as face-swap (session or token).

## Affected files

- `app/AI/Providers/Segmind/SegmindProvider.php` (implement `videoFaceSwap()`)
- `app/Jobs/ProcessVideoFaceSwap.php` (new)
- `app/Http/Controllers/Api/AIVideoFaceSwapController.php` (new)
- `app/Http/Requests/Api/VideoFaceSwapRequest.php` (new)
- `app/Http/Controllers/Api/AIGenerationStatusController.php` (new — status endpoint)
- `routes/api.php` (add routes)
- `database/seeders/AIProviderSeeder.php` (add video-face-swap endpoint)
- `resources/js/pages/admin/ai/index.tsx` (add video section)
- `tests/Feature/VideoFaceSwapApiTest.php` (new)
- `docs/features/video-face-swap.md` (new)

## Acceptance criteria

- [ ] `SegmindProvider::videoFaceSwap()` submits + polls + fetches result (Http::fake in tests)
- [ ] `ProcessVideoFaceSwap` job updates generation on success/failure
- [ ] `POST /api/v1/ai/video-face-swap` returns `202 queued` immediately
- [ ] `GET /api/v1/ai/generations/{id}` returns current status
- [ ] Customer coin check before dispatch, deduction in job on completion
- [ ] Admin AI page shows video templates, polling, result video
- [ ] Guest → redirect; no coins → 402; unknown template → 404
- [ ] `php artisan test --compact --filter=VideoFaceSwap` passes
- [ ] PHPStan + Pint + ESLint + build clean

## Open questions

1. **Poll interval for admin UI**: 5s recommended — video takes 5+ min, no need for faster
2. **Queue connection**: `database` queue (already configured) vs Redis? (recommended: database — Horizon manages it)
3. **Max concurrent video jobs**: limit to 1 per customer? (recommended: later — queue throttling when needed)
