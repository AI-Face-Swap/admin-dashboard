# Templates, Categories & Tags — Admin CRUD

## Goal

Build the admin CRUD pages for **templates** (the face-swap source files), **template categories** (Superhero, Football, Anime, ...), and **template tags** (for global search). This is the admin side of the face-swap flow: admins upload templates, customers later pick them by slug.

## Requirements

1. **Tables + models** per `docs/database-diagram.md`:
   - `template_categories` — `name`, `slug` (unique), `description`, `is_active`
   - `templates` — `category_id` (FK), `slug` (unique, **indexed — used in API, never id**), `name`, `description`, `type` (`image` | `video`), `file_path`, `thumbnail_path`, `model` (Segmind model), `is_active`
   - `template_tags` — `name`, `slug` (unique)
   - `template_tag` pivot
   - Models: `Template`, `TemplateCategory`, `TemplateTag`; relationships (category → templates, template ↔ tags)
2. **File upload** — templates accept **image AND video** files (not just images). Files stored on local/object storage; `file_path` + generated `thumbnail_path` saved to the row. Validation by `type`.
3. **Slug generation** — auto-generate a unique slug from the name on create; editable.
4. **Admin pages**
   - `/admin/templates` — list (with category filter + search), create, edit, delete; pick category, tags, type, model
   - `/admin/categories` — list, create, edit, delete
   - `/admin/tags` — list, create, edit, delete
   - Guarded by `templates.manage` / `providers.manage`-style permission (see open question 2); links added to the sidebar
5. **No public API yet** — this slice is admin CRUD only. The customer-facing template list API (by slug, searchable by tag) comes with the mobile API phase.

## Affected files

- Migrations: `create_template_categories_table`, `create_templates_table`, `create_template_tags_table`, `create_template_tag_table`
- `app/Models/Template.php`, `TemplateCategory.php`, `TemplateTag.php`
- `app/Http/Controllers/Admin/TemplateController.php`, `TemplateCategoryController.php`, `TemplateTagController.php`
- `app/Http/Requests/Admin/*` (validation rules)
- `resources/js/pages/Admin/Templates/*`, `Admin/Categories/*`, `Admin/Tags/*`
- `resources/js/components/app-sidebar.tsx` (menu links)

## Acceptance criteria

- [ ] 4 tables created; `templates.slug` unique + indexed; `type` limited to `image`/`video`
- [ ] Admin can upload an image and a video template (files saved, paths stored)
- [ ] Create/edit/delete works for templates, categories, tags
- [ ] Templates page filters by category and searches (name/tag)
- [ ] `php artisan test --compact` passes (tests for the CRUD + slug uniqueness included)
- [ ] `npm run types:check` + `npm run build` pass

## Open questions

1. **Storage**: store template files locally (`storage/app/public`, symlinked) or wire object storage now? (recommended: local public disk now; object storage when the API + production deploys)
2. **Permission slugs**: use existing plan slugs (e.g. `templates.manage` needs adding to the permissions list), or reuse `providers.manage`? (recommended: add `templates.view` + `templates.manage` to the permission seed — clearer)
3. **Video preview**: show a `<video>` player for video templates in the list, or a static thumbnail only? (recommended: thumbnail in list, player on the detail/edit view — lighter list page)
