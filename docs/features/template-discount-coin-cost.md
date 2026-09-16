# Template Discount Coin Cost & Admin Dashboard UI Redesign

## Summary

Implemented discount coin pricing on templates, connected AI model coin pricing with template defaults, and completely redesigned the Admin Dashboard Template Create and Edit pages.

---

## What Changed

### 1. Database & Schema
- Added migration `2026_09_16_053629_add_discount_cost_to_templates_table.php`:
  - `discount_cost` column (unsigned integer, default `0`).

### 2. Model (`App\Models\Template`)
- Added `discount_cost` to `$fillable` and `$casts`.
- Added computed accessor `getEffectiveCostAttribute(): int`:
  - Formula: $\text{effective\_cost} = \max(0, \text{cost} - \text{discount\_cost})$
  - If a template has `cost = 20` and `discount_cost = 5`, `effective_cost` is `15`.
- Appended `effective_cost` to serialized JSON responses for frontend & mobile APIs.

### 3. Admin Dashboard UI Redesign (`create.tsx` & `edit.tsx`)
- **Card-based Sectioning**:
  1. **Template Information Card**: Template name, description, media type toggle (Image / Video), category, generation type, and AI model selector.
  2. **AI Model Auto-Fill**: Selecting an AI model immediately auto-populates the template's `cost` with that model's `coin_cost`.
  3. **Coin Pricing & Discount Card (Gold Accent)**:
     - Base Cost input + Discount Coins input.
     - Live Customer Final Price preview banner: Base cost $\rightarrow$ Discount $\rightarrow$ Customer final charge (with dynamic `% OFF` badge).
  4. **Media Asset Card**:
     - Drag-and-drop file upload with live media preview (interactive video player for videos, image preview for images).
     - Thumbnail upload with image preview.
     - In Edit mode: displays active media file with optional replacement upload.
  5. **AI Prompts & Parameters Card**: Aspect ratio, resolution, seed, prompt, and negative prompt.
  6. **Publishing & Tags Card**: Sort order, clickable tag chips, active status toggle, and full-width gradient submit button.
- **Templates List (`index.tsx`)**:
  - Displays original price struck through alongside discounted price (e.g. `~20~ 15 coins`) when discount is active.

### 4. Generation & API Charge Logic
- **`AIFaceSwapController.php` & `AIVideoFaceSwapController.php`**:
  - Deducts `$template->effective_cost` from the customer's coin balance.
  - Saves `coins_spent` on `ai_generations` matching the effective discounted price.

### 5. Customer Frontend
- **`TemplateCard` (`template-card.tsx`)**:
  - Shows green `-X OFF` badge on top-right when discount is active.
  - Shows strikethrough original coins with effective coins in the footer row.
- **`TemplateDetail` (`template-detail.tsx`)**:
  - Shows strikethrough original coins and final effective price.
  - Updates balance affordability check against `effective_cost`.
  - Button text displays `Generate (15 coins)`.

---

## Verification
- **Unit & Feature Tests**:
  - `TemplateCrudTest`: 15 passed (including creation and updating with `cost` and `discount_cost`).
  - `FaceSwapApiTest`: 14 passed.
  - `VideoFaceSwapApiTest`: 7 passed.
- **Static Analysis & Builds**:
  - Backend Vite & TypeScript build: `npm run build` passed with 0 errors.
  - Frontend Vite & TypeScript build: `npm run build` passed with 0 errors.
  - Laravel Pint: passed.
