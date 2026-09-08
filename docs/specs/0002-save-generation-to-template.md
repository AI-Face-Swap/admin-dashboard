# 0002 Save Generation to Template

**Status**: Accepted

## Summary

Add the ability to save an AI video generation result as a new Template directly from the Admin AI generation page. This involves extending the `Template` model with new fields and providing a backend endpoint that duplicates the generation's asset into the `templates` storage path.

## Requirements

- **AC-1**: Update the `templates` table and `Template` model to include:
  - `sort_order` (integer, default 1)
  - `prompt` (text, nullable)
  - `negative_prompt` (text, nullable)
  - `aspect_ratio` (string, nullable)
  - `resolution` (string, nullable)
  - `seed` (string, nullable)
- **AC-2**: Create a new admin endpoint (e.g., `POST /admin/templates/from-generation/{generation}`) to handle the save action.
- **AC-3**: The endpoint must duplicate the file from the generation's storage path (in DO Spaces) to the templates storage path, ensuring the template relies on its own distinct file.
- **AC-4**: The endpoint maps the generation's payload (`prompt`, `negative_prompt`, `aspect_ratio`, `resolution`, `seed`) into the new Template's fields.
- **AC-5**: The Admin AI page (`resources/js/pages/admin/ai/index.tsx`) must wire the "Save to Templates" button to call this endpoint and display a success toast/message.

## Decision

We will add a new method to `TemplateController` (e.g., `storeFromGeneration`) or create a single-action controller. Since the generation's file is already stored in DigitalOcean Spaces (`Storage::disk('spaces')`), we can use the `copy()` method to duplicate the file natively on the cloud without re-downloading it to the server.

## Build plan

1. **Migration & Model**: 
   - Run `php artisan make:migration add_generation_fields_to_templates_table`.
   - Add `sort_order`, `prompt`, `negative_prompt`, `aspect_ratio`, `resolution`, `seed`.
   - Update `Template.php` `$fillable` array.
2. **Controller Logic**:
   - Add `storeFromGeneration(AIGeneration $generation)` to `TemplateController` (or similar).
   - Validate that the generation is completed and has output.
   - Use `Storage::disk('spaces')->copy($oldPath, $newPath)`.
   - Create the `Template` with the copied path and extracted payload details.
3. **Routing**: Add the `POST` route to `routes/web.php` under the `permission:templates.manage` middleware.
4. **Admin UI**: Update the "Save to Templates" button in `resources/js/pages/admin/ai/index.tsx` to make an Inertia POST request to the new endpoint.

## Consequences

- Templates will now store detailed generation metadata.
- Duplicating the file ensures that deleting old generation logs (and their files) will not break active templates.

## Rationale
(basis: user request)

The user explicitly requested that saving a generation to a template must fully copy the file in Digital Ocean, not just link the URL, to safely allow deleting generation outputs later. The new database fields are required to store the prompt/settings used to create the template.
