# Home Hero Section CRUD & API — Prompt

## Overview

Implement the **Home Hero Section** management feature. This provides a full CRUD interface in the Admin Dashboard for managing the landing page hero section, along with a public API endpoint for client applications (web/mobile).

Each hero record contains a title, description, video (file upload or URL), multiple image URLs, sort order, and active toggle.

---

## Fields Specification

| Field | Type | Required | Notes |
|---|---|---|---|
| **title** | string | Yes | Hero section title / main headline |
| **description** | text | No | Hero subtitle / descriptive text |
| **video** | string | No | Video file uploaded to DigitalOcean Spaces or direct video URL |
| **images** | json (array of strings) | No | Multiple image URLs (uploaded to DigitalOcean Spaces or external URLs) |
| **sort_order** | integer | Yes | Order of display (default `0`) |
| **is_active** | boolean | Yes | Whether the hero section item is visible (default `true`) |

---

## Database

### Migration: `create_home_heroes_table`

```php
Schema::create('home_heroes', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->text('description')->nullable();
    $table->string('video')->nullable();
    $table->json('images')->nullable();
    $table->integer('sort_order')->default(0);
    $table->boolean('is_active')->default(true);
    $table->timestamps();
});
```

### Model: `App\Models\HomeHero`

- Fillable: `['title', 'description', 'video', 'images', 'sort_order', 'is_active']`
- Casts:
  - `'images' => 'array'`
  - `'is_active' => 'boolean'`
  - `'sort_order' => 'integer'`
- Scope: `scopeActive($query)` ordered by `sort_order ASC, id ASC`

---

## Admin Dashboard Pages

Permission: `settings.manage`

### 1. Hero List (`/admin/home-heroes`)
- Route: `admin.home-heroes.index`
- Table displaying:
  - `Sort Order`
  - `Title`
  - `Description` (truncated)
  - `Video` (badge / preview modal or video tag)
  - `Images` (thumbnails strip showing count / preview)
  - `Status` (Active / Inactive badge)
  - `Actions` (Edit, Delete with confirmation)
- Header actions:
  - Quick navigation tabs/buttons to other Home Page sections (`Hero`, `Showcases`, `Features`, `Partners`)
  - "+ New Hero Section" button

### 2. Create Hero Section (`/admin/home-heroes/create`)
- Route: `admin.home-heroes.create` & `POST admin.home-heroes.store`
- Form fields:
  - `title` (text input, required)
  - `description` (textarea, optional)
  - `video` (file upload for mp4/webm/mov up to 50MB, OR direct URL input)
  - `images` (supports uploading multiple image files to DigitalOcean Spaces + adding external image URLs dynamically)
  - `sort_order` (number input, default 0)
  - `is_active` (checkbox / toggle, default true)

### 3. Edit Hero Section (`/admin/home-heroes/{homeHero}/edit`)
- Route: `admin.home-heroes.edit` & `PUT/PATCH admin.home-heroes.update`
- Pre-populated form showing existing video and images
- Allows removing existing images, adding new URLs, or uploading additional files
- Keeps existing media intact when not re-uploaded

---

## API Endpoints

### 1. Get Home Heroes
- **Endpoint**: `GET /api/v1/home-heroes`
- **Auth**: Public
- **Controller**: `App\Http\Controllers\Api\HomePageController@heroes` (or `App\Http\Controllers\Api\HomeHeroController@index`)
- **Query / Filtering**: Returns all items where `is_active = true`, ordered by `sort_order ASC, id ASC`.
- **Response**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Next-Gen AI Media Studio",
      "description": "Create hyper-realistic face swaps, images, and videos with cutting-edge AI models.",
      "video": "https://imagesbucket.sgp1.digitaloceanspaces.com/HomeHero/hero-video-1.mp4",
      "images": [
        "https://imagesbucket.sgp1.digitaloceanspaces.com/HomeHero/banner-1.webp",
        "https://imagesbucket.sgp1.digitaloceanspaces.com/HomeHero/banner-2.webp"
      ],
      "sort_order": 0,
      "is_active": true,
      "created_at": "2026-09-14T09:30:00.000000Z",
      "updated_at": "2026-09-14T09:30:00.000000Z"
    }
  ]
}
```

---

## Navigation & Sidebar Integration

- Add "Home Hero" in `app-sidebar.tsx` or under the Home Page management section.
- Add quick cross-links in the header between `Home Hero`, `Showcases`, `Features`, and `Partners`.

---

## Automated Tests

1. `tests/Feature/AdminHomeHeroTest.php`:
   - Admin with `settings.manage` can list, create, edit, update, delete hero sections.
   - Non-admin or unauthorized user is forbidden (403).
   - Validation tests (title required, sort_order integer, media handling).
2. `tests/Feature/ApiHomeHeroTest.php`:
   - Public endpoint `GET /api/v1/home-heroes` returns active items in `sort_order` sequence.
   - Inactive items are excluded.
