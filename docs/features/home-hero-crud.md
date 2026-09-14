# Feature: Home Hero Section CRUD & API

The **Home Hero Section** feature provides dynamic management of the landing page hero banner through the Admin Dashboard and exposes a public API endpoint for client applications (web and mobile).

---

## Why this exists

The landing page needs a hero section that displays dynamic headlines, descriptions, videos, and multiple image assets. Rather than hardcoding these assets, admins can manage, reorder, and toggle hero items directly within the unified **Home Page** management section in the admin dashboard.

---

## What was built

### 1. Database Table (`home_heroes`)

Migration: `2026_09_14_094000_create_home_heroes_table.php`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | bigIncrements | No | Primary key |
| `title` | string | No | Hero title / headline |
| `description` | text | Yes | Subtitle / description |
| `video` | text | Yes | DigitalOcean Spaces URL or direct video URL |
| `images` | json | Yes | Array of image URLs (Spaces or external) |
| `sort_order` | integer | No | Default `0`, determines display order |
| `is_active` | boolean | No | Default `true`, determines visibility |
| `created_at` / `updated_at` | timestamps | Yes | Eloquent timestamps |

### 2. Eloquent Model (`App\Models\HomeHero`)

- Fillable attributes: `title`, `description`, `video`, `images`, `sort_order`, `is_active`.
- Casts: `'images' => 'array'`, `'is_active' => 'boolean'`, `'sort_order' => 'integer'`.
- Query scope: `scopeActive()` — filters by `is_active = true` and orders by `sort_order ASC, id ASC`.

### 3. Admin Controller (`App\Http\Controllers\Admin\HomeHeroController`)

- **index**: Paginated list sorted by `sort_order` and `id`.
- **create**: Form rendering.
- **store**: Validates input, uploads video and multiple images to DigitalOcean Spaces (`HomeHero/uuid.ext`), handles direct URLs, and creates the record.
- **edit**: Pre-populated edit form.
- **update**: Updates content, retains existing media, uploads new media files, or adds new image URLs.
- **destroy**: Deletes the hero section record.
- Permission: Protected by `settings.manage`.

### 4. Admin UI Pages

Located at `resources/js/pages/admin/home-heroes/`:
- **`index.tsx`**: Table displaying Sort Order, Title, Description, Video link/badge, image thumbnails strip, Active status badge, and Edit/Delete actions. Includes unified Home Page section navigation buttons:
  - `Hero Section` (active)
  - `Showcases` (`/admin/home-showcases`)
  - `Features` (`/admin/home-features`)
- **`create.tsx`**: Form with title, description, video (file upload to Spaces or direct URL), multiple images (file uploads to Spaces + dynamic list of URLs), sort order, and active switch.
- **`edit.tsx`**: Form displaying current media with option to replace video, remove/add image URLs, upload additional image files, and modify text/order/status.

### 5. Cross-Section Navigation

- Updated `home-showcases/index.tsx` and `home-features/index.tsx` to feature matching navigation buttons (`Hero Section`, `Showcases`, `Features`), keeping the Home Page administration unified in one place.

### 6. Public Client API

- **Endpoint**: `GET /api/v1/home-heroes`
- **Controller**: `App\Http\Controllers\Api\HomePageController@heroes`
- **Output**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Next-Gen AI Media Generation",
      "description": "Create amazing videos and images.",
      "video": "https://imagesbucket.sgp1.digitaloceanspaces.com/HomeHero/uuid.mp4",
      "images": [
        "https://imagesbucket.sgp1.digitaloceanspaces.com/HomeHero/img1.webp",
        "https://imagesbucket.sgp1.digitaloceanspaces.com/HomeHero/img2.webp"
      ],
      "sort_order": 0,
      "is_active": true,
      "created_at": "2026-09-14T09:45:00.000000Z",
      "updated_at": "2026-09-14T09:45:00.000000Z"
    }
  ]
}
```

---

## Automated Tests

- `tests/Feature/AdminHomeHeroTest.php` (10 tests):
  - Index page loads for admin with `settings.manage`.
  - Authentication and permission checks (guest redirect, 403 for unauthorized).
  - Create and store with direct URLs and with uploaded files to DO Spaces.
  - Required validation rules.
  - Edit, update, and destroy actions.
- `tests/Feature/ApiHomeHeroTest.php` (1 test):
  - `GET /api/v1/home-heroes` returns active records in correct sort order with expected fields (`video`, `images`, `description`, `sort_order`, `title`).
  - Inactive records are excluded.
