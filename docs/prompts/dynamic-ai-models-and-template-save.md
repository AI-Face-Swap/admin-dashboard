# Dynamic AI Models, Resolution/Duration Pricing & Save to Template Enhancement

## Overview

1. **Dynamic Model & Coin Cost Control**:
   - Expand `ai_models` database table with `generation_type_id`, `name`, `coin_cost`, `resolution_costs`, `duration_costs`, `is_active`, `is_default`.
   - Update `AIModel` Eloquent model with relationships, casts, and scopes.
   - Upgrade Admin CRUD (`/admin/ai-models`) to manage all models, generation type assignments, base coin costs, resolution pricing tiers, and duration pricing tiers.
   - Create `AIModelSeeder` to pre-seed all existing models across Image Generation, Image Editing, Image to Video, and Face Swap.
   - Update `GenerationTypeSeeder` to ensure all 6 generation types exist.

2. **API Dynamic Pricing & Charge Logic**:
   - Update `GET /api/v1/coin-costs` to return model-level coin costs and tier breakdowns.
   - Update `ImageEditController`, `ImageController`, and `ImageToVideoController` to resolve model cost dynamically from the database.
   - Update frontend generator tabs to show exact dynamic coin cost per model.

3. **Save to Template Workflow**:
   - Update `TemplateController::storeFromGeneration()`:
     - Default `generation_type` to `Video Face Swap` (video) or `Image Face Swap` (image).
     - Default `is_active` to `true`.
     - Populate `ai_model_id` and `model` from generation.
     - Redirect CTA to `admin.templates.edit` of the newly created template.
