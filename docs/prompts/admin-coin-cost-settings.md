# Admin Coin Cost Settings — Prompt

## Overview

Add an admin settings page where coin costs for AI operations can be changed from the UI instead of editing `.env` files.

## Current State

- Costs stored in `config/ai.php` (read from `.env`)
- Hardcoded defaults: image_generation=5, face_swap=5, video_face_swap=20
- Template-level costs already exist in the `templates` table (per-template override)
- Need a UI to change the **global default** costs

## What to Build

### 1. New Settings Page (`/admin/settings`)

```
┌─────────────────────────────────────────────────┐
│  ⚙️  Settings                                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  💰  AI Coin Costs                              │
│  ───────────────────────────────────────────    │
│                                                 │
│  Image Generation    [  5  ] coins per request  │
│  Face Swap           [  5  ] coins per request  │
│  Video Face Swap     [ 20  ] coins per request  │
│                                                 │
│  [ Save Changes ]                               │
│                                                 │
│  ℹ️  These are the default costs.               │
│     Templates can override with their own cost. │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 2. Database Storage

Store costs in a new `settings` table (key-value pattern):

```php
Schema::create('settings', function (Blueprint $table) {
    $table->id();
    $table->string('group');      // 'ai' | 'general' | etc.
    $table->string('key');        // 'coin_cost_image_generation'
    $table->text('value');        // '5'
    $table->timestamps();
    $table->unique(['group', 'key']);
});
```

### 3. How It Works

1. Admin visits `/admin/settings`
2. Page loads current costs from `settings` table
3. Admin edits values → clicks Save
4. Values saved to `settings` table
5. Config reads from DB first, falls back to `.env` defaults
6. Clear config cache after save

### 4. Config Priority

```
settings table (DB)  →  .env file  →  hardcoded default
```

Update `config/ai.php` to check DB first:
```php
'coin_costs' => [
    'image_generation' => (int) Setting::get('ai', 'coin_cost_image_generation', env('AI_IMAGE_GENERATION_COST', 5)),
    // ...
],
```

### 5. Files to Create/Modify

| File | Action |
|---|---|
| `database/migrations/xxx_create_settings_table.php` | Create |
| `app/Models/Setting.php` | Create |
| `app/Http/Controllers/Admin/SettingController.php` | Create |
| `routes/web.php` | Add settings route |
| `resources/js/pages/admin/settings/index.tsx` | Create |
| `resources/js/components/app-sidebar.tsx` | Add Settings link |
| `config/ai.php` | Update to read from DB |
| `tests/Feature/AdminSettingsPageTest.php` | Create |

### 6. Sidebar Position

Settings link at the bottom of the sidebar:
```
...
API Logs
───────────
Settings    ⚙️
```

### 7. Test Cases

| Test | What |
|---|---|
| `test_settings_page_loads` | Admin can see settings page |
| `test_settings_page_requires_auth` | Guest redirected |
| `test_settings_page_requires_permission` | Non-admin gets 403 |
| `test_update_coin_costs` | Save new values |
| `test_coin_costs_persist` | Values survive page reload |
| `test_config_reads_from_db` | Config uses DB values |

## Notes

- Only Super Admin and Developer roles can access settings
- Template-level costs override global defaults (no change needed)
- No coin cost changes affect existing generations
