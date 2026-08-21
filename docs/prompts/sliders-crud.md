# Sliders CRUD — Prompt

## Overview

Add a Sliders (hero banners) CRUD for the admin dashboard, with a mobile API endpoint to fetch active sliders for the app.

## Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| **title** | string | Yes | Slider heading (e.g., "HappyHorse 1.0") |
| **description** | text | No | Subtitle text |
| **cta_text** | string | No | Button label (e.g., "Try it →") |
| **cta_url** | string | No | Button link (e.g., "/ai/face-swap") |
| **file** | file | Yes | Image or video upload to DigitalOcean Spaces |
| **type** | enum | Yes | `image` or `video` |
| **sorting** | integer | Yes | Higher = shows first. Default 0. |
| **is_active** | boolean | Yes | Default true |
| **badge** | string | No | Small label (e.g., "New", "Featured") |

## Sorting Logic

```
ORDER BY sorting DESC, created_at DESC
```

- Higher sorting number = shows first
- Same sorting number = latest created first

## Database

### Migration: `create_sliders_table`

```php
Schema::create('sliders', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->text('description')->nullable();
    $table->string('cta_text')->nullable();
    $table->string('cta_url')->nullable();
    $table->string('file_path');           // DO Spaces path
    $table->string('type');                // image | video
    $table->integer('sorting')->default(0);
    $table->boolean('is_active')->default(true);
    $table->string('badge')->nullable();   // "New", "Featured", etc.
    $table->timestamps();
});
```

## Admin Dashboard Pages

### 1. Slider List (`/admin/sliders`)

```
┌─────────────────────────────────────────────────────────┐
│  Sliders                                    [+ New]     │
├─────────────────────────────────────────────────────────┤
│  ┌──────┬───────┬──────┬────────┬────────┬───────────┐ │
│  │ Sort │ Badge │ Type │ Title  │ Status │ Actions   │ │
│  ├──────┼───────┼──────┼────────┼────────┼───────────┤ │
│  │ 10   │ New   │ img  │ Horse  │ Active │ Edit Del  │ │
│  │ 5    │ —     │ vid  │ Cat    │ Active │ Edit Del  │ │
│  │ 0    │ —     │ img  │ Dog    │ Draft  │ Edit Del  │ │
│  └──────┴───────┴──────┴────────┴────────┴───────────┘ │
└─────────────────────────────────────────────────────────┘
```

- Table with thumbnail preview
- Drag-to-reorder OR inline sorting number input
- Toggle active/inactive
- Delete with confirmation

### 2. Slider Create/Edit (`/admin/sliders/create`, `/admin/sliders/{id}/edit`)

```
┌─────────────────────────────────────────┐
│  Create Slider                          │
├─────────────────────────────────────────┤
│  Title *        [                    ]  │
│  Description    [                    ]  │
│                 [                    ]  │
│  Badge          [ "New"             ]  │
│  CTA Text       [ "Try it →"        ]  │
│  CTA URL        [ "/ai/face-swap"   ]  │
│  Type *         [ Image ▾           ]  │
│  Sorting *      [ 0                 ]  │
│  Active         [ ✓ ]                  │
│                                         │
│  File *                                │
│  ┌─────────────────────────────────┐   │
│  │  [ Upload Image or Video ]      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [ Save ]  [ Cancel ]                  │
└─────────────────────────────────────────┘
```

- File upload to DigitalOcean Spaces (same as templates)
- Image preview after upload
- Video preview for video type

## Mobile API Endpoint

### `GET /api/v1/sliders` (public — no auth)

Returns active sliders sorted by `sorting DESC, created_at DESC`.

**Response:**
```json
{
    "sliders": [
        {
            "id": 1,
            "title": "HappyHorse 1.0",
            "description": "Alibaba's #1-ranked video model...",
            "cta_text": "Try it →",
            "cta_url": "/ai/face-swap",
            "file_url": "https://cdn...",
            "type": "video",
            "badge": "New",
            "sorting": 10
        }
    ]
}
```

## Files to Create/Modify

| File | Action |
|---|---|
| `database/migrations/xxx_create_sliders_table.php` | Create |
| `app/Models/Slider.php` | Create |
| `app/Http/Controllers/Admin/SliderController.php` | Create |
| `app/Http/Controllers/Api/SliderController.php` | Create |
| `routes/web.php` | Add admin routes |
| `routes/api.php` | Add public API route |
| `resources/js/pages/admin/sliders/index.tsx` | Create |
| `resources/js/pages/admin/sliders/create.tsx` | Create |
| `resources/js/pages/admin/sliders/edit.tsx` | Create |
| `resources/js/components/app-sidebar.tsx` | Add Sliders link |
| `tests/Feature/AdminSlidersPageTest.php` | Create |
| `tests/Feature/SliderApiTest.php` | Create |

## Notes

- File upload follows existing template pattern (DO Spaces)
- Only `templates.view` / `templates.manage` permissions needed (or create new `sliders.view` / `sliders.manage`)
- Mobile API is public (no auth) — sliders are for everyone
- Use existing `AnimatedCard`, `AnimatedButton`, `Badge` components
