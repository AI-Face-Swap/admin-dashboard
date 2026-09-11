# Prompt: Generation Types CRUD

## Objective
Create an Admin CRUD to manage the different types of AI capabilities (e.g., video-faceswap, image-faceswap, image-to-video, text-to-image, text-to-video) our platform supports.

## Model Name Decision
We will use the name **`GenerationType`** (table: `generation_types`) to align closely with our existing `ai_generations` table.

## Schema
Table: `generation_types`
- `id` (Primary Key)
- `name` (string) - e.g., "Image Face Swap"
- `slug` (string, unique) - auto-generated via `HasAutoSlug` trait, e.g., `image-faceswap`
- `description` (text, nullable)
- `is_active` (boolean, default: true)
- `default_provider_id` (foreignId to `ai_providers`, nullable)
- `sort_order` (integer, default: 0)
- `timestamps`

## Tasks
1. **Database:**
   - Create `GenerationType` model with `HasAutoSlug` trait.
   - Create migration for `generation_types` table.
   - Create a Seeder to populate the initial types: `video-faceswap`, `image-faceswap`, `image-to-video`, `text-to-image`, `text-to-video`.

2. **Backend Controllers:**
   - Create `Admin/GenerationTypeController`.
   - Implement `index`, `create`, `store`, `edit`, `update`, `destroy` methods.
   - Register routes in `routes/web.php` under the admin group.
   - Run `make wayfinder` to regenerate typed routes.

3. **Frontend (Admin Dashboard):**
   - Create Inertia React pages in `resources/js/Pages/Admin/GenerationTypes/`:
     - `Index.tsx` (Data table with Shadcn UI, showing columns and active status)
     - `Create.tsx` / `Edit.tsx` (Forms with name, description, active toggle, provider select, and sort order)
   - Add "Generation Types" to the admin sidebar navigation layout.

4. **Testing:**
   - Write Feature tests for the CRUD operations (`tests/Feature/Admin/GenerationTypeTest.php`).
