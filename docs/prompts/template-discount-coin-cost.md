# Template Discount Coin Cost & Admin Dashboard UI Redesign

## Overview

1. **Discount Coin Cost**:
   - Add `discount_cost` column (default 0) to `templates` table.
   - Deduction rule: If base cost is 20 and discount is 5, customer is charged `15` coins (`effective_cost = max(0, cost - discount_cost)`).
   - If discount is 0, normal cost is charged.

2. **AI Model & Pricing Link**:
   - In Template Create & Edit: selecting an AI model auto-populates the template's `Cost (coins)` with that model's `coin_cost`.
   - If cost is 0 or empty, fallback to the AI Model's `coin_cost`.

3. **Admin Dashboard UI Redesign (`create.tsx` & `edit.tsx`)**:
   - Redesign the templates form with clear, card-based sectioning:
     - **Card 1: General Info & AI Model**: Template Name, Slug (in Edit), Description, Type (Image/Video), Category, Generation Type, and AI Model (filtered/highlighted by generation type, displaying provider + model + coin cost).
     - **Card 2: Pricing & Discount (Gold/Coin Theme)**: Base Cost, Discount Cost, and an Interactive Live Preview showing: Base Price, Discount Amount, Discount Percentage badge (e.g. `25% OFF`), and the final amount the customer will pay.
     - **Card 3: Media & Preview**: Clean file dropzone + live preview of current image or video file when editing, plus thumbnail upload.
     - **Card 4: Generation Parameters & Prompts**: Aspect ratio, resolution, seed, prompt, negative prompt.
     - **Card 5: Visibility & Tags**: Sort order, clickable tag badges, active/inactive switch, and full-width action button.
   - **Templates List (`index.tsx`)**:
     - Render discounted prices clearly: original price struck through, final price highlighted with a discount badge.

4. **API & Customer Deduction**:
   - Update `AIFaceSwapController` and `AIVideoFaceSwapController` to deduct `$template->effective_cost`.
   - Expose `cost`, `discount_cost`, and `effective_cost` on `GET /api/v1/templates` and `GET /api/v1/templates/{slug}`.

5. **Customer Frontend**:
   - On the customer-facing frontend, show original price struck through and the discounted coin cost badge.
