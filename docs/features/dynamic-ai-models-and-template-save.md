# Dynamic AI Models, Resolution/Duration Pricing & Save to Template Enhancement

## Summary

This feature delivers full control of AI models, coin costs, resolution pricing tiers, and video duration options from the Admin Dashboard, along with an enhanced "Save to Template" workflow.

---

## 1. Database & Model Architecture

### Migration: `2026_09_16_110500_add_pricing_and_type_to_ai_models_table.php`
Added to `ai_models`:
- `generation_type_id`: Foreign key to `generation_types` (cascade null on delete).
- `name`: Display name (e.g., "Wan 2.2 I2V Flash", "FLUX Kontext Dev").
- `coin_cost`: Base coin cost (integer, default: 10).
- `resolution_costs`: JSON map for sub-pricing (e.g. `{"480p": 10, "720p": 20}` or `{"1K": 8, "2K": 12, "3K": 16}`).
- `duration_costs`: JSON map for video duration options (e.g. `{"5s": 10, "10s": 20}`).
- `is_active`: Boolean toggle to enable/disable models in real-time.
- `is_default`: Boolean flag to mark the default model for its generation type.

### Model: `App\Models\AIModel`
- Added relationships: `belongsTo(GenerationType::class)`.
- Added scopes: `scopeActive()`, `scopeForGenerationType($slug)`.
- Casts for `resolution_costs` and `duration_costs` as `array`, `coin_cost` as `integer`, and booleans.

---

## 2. Seeders

- **`GenerationTypeSeeder`**: Added `Image Editing` (`image-editing`) alongside `image-faceswap`, `video-faceswap`, `text-to-image`, `image-to-video`, and `text-to-video`.
- **`AIModelSeeder`**: Pre-seeds all 12 current models across the platform:
  - **Image Editing**: `flux-kontext-dev` (10c), `multi-image-kontext-max` (12c), `seedream-v5-lite-image-to-image` (8c-16c), `gpt-image-1.5-edit` (15c-20c), `kling-3-image2image` (15c-20c), `nano-banana-pro` (10c-25c).
  - **Image to Video**: `wan-2.2-i2v-flash` (10c-20c with 480p/720p resolution and 5s/10s duration tiers).
  - **Text to Image**: `flux-schnell` (5c), `sdxl` (5c), `flux-dev` (8c).
  - **Face Swap**: `face-swap` (5c), `video-face-swap` (20c-35c).
- **`DatabaseSeeder`**: Automated seeding of both seeders on environment setup.

---

## 3. Admin Dashboard CRUD (`/admin/ai-models`)

- **Index (`resources/js/pages/admin/ai-models/index.tsx`)**:
  - Displays Model Key & Display Name with Default badges.
  - Generation Type badge.
  - Base Coin Cost badge.
  - Pricing Tiers (Resolution and Duration chips).
  - Active / Inactive status badge.
- **Create & Edit (`create.tsx` and `edit.tsx`)**:
  - Generation Type select dropdown.
  - Display Name and Model Key.
  - Base Coin Cost input.
  - Interactive **Resolution Pricing Tier** builder (add/remove rows).
  - Interactive **Duration Pricing Tier** builder for video models (add/remove rows).
  - Active and Default switches.

---

## 4. API Dynamic Pricing & Charging

- **`CoinCostController::index()` (`GET /api/v1/coin-costs`)**:
  - Returns legacy top-level cost keys for backwards compatibility.
  - Returns `models` dictionary containing all active models, their base costs, and resolution/duration tiers.
- **`AIImageEditController`**: Looks up model by name in `ai_models`, resolves resolution-specific pricing (size/quality/resolution), and charges the customer accordingly.
- **`AIImageToVideoController`**: Looks up `wan-2.2-i2v-flash` (or selected model) in `ai_models`, dynamically checks `resolution_costs` and `duration_costs`.
- **`AIImageGenerationController`**: Resolves model cost dynamically from `ai_models`.

---

## 5. "Save to Template" Workflow

In `TemplateController::storeFromGeneration()`:
1. **Default Generation Type**:
   - Videos automatically map to `Video Face Swap` (`video-faceswap`).
   - Images automatically map to `Image Face Swap` (`image-faceswap`).
2. **Active Status**: Set to `is_active: true` by default.
3. **AI Model Association**: Links `ai_model_id` and records the source `model` name.
4. **Call To Action (CTA) Redirect**:
   - Redirects directly to `admin.templates.edit` (`/admin/templates/{id}/edit`), allowing the admin to immediately customize title, tags, coin cost, or preview.

---

## 6. Frontend Dynamic UI

- **`image-editing-tab.tsx`**:
  - Model selector buttons display actual coin cost badge from `coinCosts.models[id].coin_cost`.
  - Button dynamically updates cost when switching models or high-resolution tiers.
- **`text-to-image-tab.tsx`**:
  - Model dropdown displays dynamic coins for each model option (`(5 coins)`, `(8 coins)`).
