# Phase 3 — AI Provider Architecture (Segmind first)

> **✅ APPROVED (user decisions):**
> 1. `faceSwap` **end-to-end only** in this slice.
> 2. `generateImage` + `videoFaceSwap` = **interface/stub only** (throw `UnsupportedOperationException`).
> 3. `cost` = **`null`** when the provider does not return an actual cost (never fake `0 USD`).
> 4. `provider_id` is the **source of truth** — no duplicated `provider` string column on `ai_generations`.
> 5. AIService/provider architecture stays **async/queue-compatible** (video takes 5+ min → future queued job).
> 6. No API routes. 7. No admin UI. 8. No admin AI page.
> 9. `Http::fake` tests first.
> 10. **One controlled live Segmind call only after automated tests pass.**
>
> Phase 4 (after this is proven): API routes, admin UI + admin AI page, `api_request_logs` for face swap, capture **response headers** to get the real cost.

## Goal

Build the **core AI abstraction layer** so the app never depends on Segmind/Replicate directly. Controllers call a clean **AI Service**; the service resolves a provider through a **factory**; providers normalize every response into one internal **AIResponse** DTO; and every call is persisted to **`ai_generations`** for cost/usage tracking.

This is Phase 3 only — **no API endpoints, no admin UI yet** (those are Phase 4). We build the engine first, prove it works with tests, then wire it to the API + dashboard.

## Verified Segmind API facts (researched from segmind.com model docs + official Python SDK source — do NOT rely on the outdated blog posts)

**The v2 async flow (all models, including faceswap-v5 and video-faceswap-by-facefusion-labs):**
1. `POST https://api.segmind.com/v2/{slug}` with JSON body + header `x-api-key: <key>` → returns `{ "request_id": "...", "status_url": "...", "response_url": "..." }`
2. Poll `GET /v2/requests/{id}/status` → `status`: `QUEUED` | `PROCESSING` | `COMPLETED` | `FAILED`
3. `GET /v2/requests/{id}` → final response body (results retained **1 hour**, then expire)

**Rules:**
- `FAILED` is served as **HTTP 422** — the body still carries the error detail → treat 422-with-status-body as a normal failed payload, not a transport error
- Unknown/expired `request_id` → HTTP **404**
- Content / RAI blocks surface as `FAILED`, not a separate state
- Result body shape: always carries `status`, `metrics` (incl. `inference_time` — server compute seconds), and `output`; rest is model-specific
- Error codes: 400 bad request, 401 bad key, 403 forbidden, 404 not found, **406 insufficient credits**, 429 rate limited, 500/502/504 server

**Endpoints for our operations:**
- `faceSwap` → **`faceswap-v5`** — params: `source_image` (URL, face to use), `target_image` (URL, face swapped into), `additional_prompt`, `image_format` (`png`|`jpeg`|`webp`, default `png`), `quality` (10–100, default 95), `seed` (default 8005332)
- `videoFaceSwap` → **`video-faceswap-by-facefusion-labs`** — params: `source_image` (URL), `target_video` (URL), `model_name` (`hyperswap_1a`|`1b`|`1c`, default `1a`), `face_detector_score` (0–1, default 0.5, recommended 0.4), `target_face_index` (0–10, default 0). Video takes ~250–300s+ for 15s clips → poll with a long deadline (docs example: 900s)
- `generateImage` (text-to-image) → model slug TBD (open question 5)

**Inputs are public URLs.** Segmind requires image/video inputs as URLs — our DO Spaces public URLs (already built + tested) are the natural source. Customer face uploads + template files must be publicly reachable.

**⚠️ Output format — docs vs. reality:** the docs say `output` is "e.g. media URL", but a real test by the user returned **base64 only**. The provider MUST handle both and we will confirm with a live call during development (real `SEGMIND_API_KEY` is already in `.env`):
- If `output` is a URL → keep it
- If `output` is base64 (raw or `data:` URI) → decode, store on the `spaces` disk, return the persistent URL in `AIResponse.output`

## Requirements

1. **Tables + models** (per `docs/database-diagram.md`):
   - `ai_providers` — `name`, `slug` (unique), `is_active`, `config` (json, non-secret settings). **API keys live in `.env`, never in the DB.** Seeded with `segmind` (+ `config` holding the v2 base URL and the operation→endpoint map).
   - `ai_generations` — `user_id` (nullable, admin-made) OR `customer_id` (nullable, customer-made), `provider_id` (FK), `template_id` (nullable, face-swap), `provider`, `model`, `operation` (`image` | `face-swap` | `video-face-swap`), `status` (`queued` | `processing` | `completed` | `failed`), `request_id`, `cost` + `currency`, `duration_ms`, `input_metadata` / `output_metadata` / `raw_response` (json), `created_at`. Indexes: `(user_id, created_at)`, `(customer_id, created_at)`, `status`.
   - Models: `AIProvider`, `AIGeneration` (+ factory). `AIGeneration` belongs to provider, template, user, customer.
2. **`AIProviderInterface`** (`app/AI/Contracts/`): `generateImage(GenerationRequest): AIResponse`, `faceSwap(GenerationRequest): AIResponse`, `videoFaceSwap(GenerationRequest): AIResponse`, `name(): string`, `supports(string $operation): bool`. All three operations declared now (face-swap stubs are implemented in Phase 5? — see open question 1).
3. **`AIProviderFactory`** (`app/AI/Factories/`) — resolves `"segmind"` → `SegmindProvider` by slug; unknown slug → clear exception. Future `"replicate"` = one class + one case, zero rewrites.
4. **`AIResponse` DTO** (`app/AI/DTOs/`) — `provider`, `model`, `operation`, `request_id`, `status`, `duration_ms` (from `metrics.inference_time` when present, else client-measured), `usage` (array), `cost` + `currency`, `output` (normalized: persistent URLs), `raw_response` (array).
5. **`GenerationRequest` DTO** — `operation`, `provider` slug, `model`, `payload` (the Segmind body params), optional `template_id`, optional requester (`User` or `Customer`).
6. **`AIService`** (`app/AI/Services/`) — the only class other code calls:
   - Validates, picks the provider via factory, submits + **polls** (1s interval, configurable deadline — 600s default, 900s for video), persists the `ai_generations` row with status transitions (queued → processing → completed/failed), records `request_id`, duration, cost, `raw_response`, `output_metadata`.
   - **Never lets provider errors escape unhandled** — on FAILED (HTTP 422 body or status FAILED) / timeout: mark the row `failed` with error metadata, then rethrow a typed `AIGenerationFailedException`.
7. **`SegmindProvider`** (`app/AI/Providers/Segmind/`) — uses Laravel's `Http` facade:
   - `faceSwap()` → POST `/v2/faceswap-v5` + poll + normalize (base64-or-URL handling)
   - `videoFaceSwap()` → POST `/v2/video-faceswap-by-facefusion-labs` + poll + normalize
   - `generateImage()` → endpoint per open question 5
   - `.env.example` already has `SEGMIND_API_KEY=""` placeholder (real key in `.env`)
8. **Live verification during development** — one real call (face swap with a tiny public test image) to confirm the actual `output` shape (base64 vs URL) and record the real response format in the feature doc.

## Affected files

- `database/migrations/<ts>_create_ai_providers_table.php`, `<ts>_create_ai_generations_table.php`
- `app/Models/AIProvider.php`, `app/Models/AIGeneration.php`, `database/factories/AIGenerationFactory.php`
- `app/AI/Contracts/AIProviderInterface.php`
- `app/AI/DTOs/AIResponse.php`, `app/AI/DTOs/GenerationRequest.php`
- `app/AI/Factories/AIProviderFactory.php`
- `app/AI/Services/AIService.php`
- `app/AI/Providers/Segmind/SegmindProvider.php`, `app/AI/Exceptions/AIGenerationFailedException.php`
- `app/AI/Exceptions/UnknownProviderException.php` (+ `UnsupportedOperationException`)
- `database/seeders/AIProviderSeeder.php` (seed `segmind`; call from `DatabaseSeeder`)
- `tests/Feature/AIProviderTest.php` (Http::fake-based: factory resolution, full submit→poll→complete flow, base64 output normalization, failure persistence)

## Acceptance criteria

- [ ] `ai_providers` + `ai_generations` tables with indexes; `segmind` provider seeded
- [ ] `AIProviderFactory` resolves `segmind`; unknown slug throws
- [ ] `AIService::faceSwap()` (with `Http::fake`): submit → poll → completed row persisted with `request_id`, `duration_ms`, `raw_response`, `output_metadata`
- [ ] **Base64 output** from Segmind is decoded and stored on `spaces`, `AIResponse.output` = persistent URL; URL output passes through
- [ ] Failure path (status FAILED / HTTP 422 / timeout): row `failed` + error metadata, typed exception rethrown
- [ ] Live call with the real key confirms the output shape and is documented
- [ ] `php artisan test --compact`, `composer run types:check` (PHPStan), `vendor/bin/pint` all pass
- [ ] No API routes, no admin pages in this slice (Phase 4)

## Open questions

1. **Which operations are implemented in this slice?** The architecture + `faceSwap()` end-to-end (it's the user's tested path + uses our templates), with `generateImage()` and `videoFaceSwap()` declared but throwing `UnsupportedOperationException` until their phases? Or implement all three? (recommended: architecture + `faceSwap()` + `generateImage()` if we agree on a model in Q5; `videoFaceSwap()` stub — it needs the 900s polling design validated separately)
2. **Generation requester**: `AIService` accepts an optional admin `User` now; `customer_id` wired when the mobile API lands (recommended: yes)
3. **Cost data**: Segmind doesn't document a cost field in v2 responses — store what the provider returns (default `0` + `USD`) and add per-model price estimation later with analytics (recommended: yes)
4. **Synchronous polling**: `AIService` polls synchronously (fine for Phase 3 — no HTTP endpoints yet). Video face swap (~5 min) should move to a queued job when the API lands (Phase 4/8) (recommended: yes)
5. **Text-to-image model for `generateImage()`**: which Segmind slug? (SDK examples use `seedream-v3-text-to-image`; alternatives: `segmind-vega`, `sd1.5-edgeofrealism`...) (recommended: `seedream-v3-text-to-image`, the current SDK default — but confirm the exact slug on segmind.com during development)
6. **Admin AI page**: leave the "AI Generation" sidebar item on Coming Soon (recommended) or build a minimal page to fire a generation and see the result?
