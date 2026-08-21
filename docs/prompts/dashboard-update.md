# Dashboard Update — Prompt

## Overview

Update the admin dashboard to show **real data** from the database instead of hardcoded values. The current dashboard has placeholder stats and fake recent activity.

## Current State

- Hardcoded stats: `$12.42 cost, 1248 generations, 342 face swaps, 81 video`
- Hardcoded recent activity (fake entries)
- No real data from the database

## What to Build

### 1. Dashboard Controller

Create `Admin/DashboardController` that passes real data:

```php
class DashboardController extends Controller
{
    public function index(): \Inertia\Response
    {
        // Stats
        $stats = [
            'total_generations' => AIGeneration::count(),
            'today_cost' => AIGeneration::whereDate('created_at', today())->sum('cost'),
            'total_cost' => AIGeneration::sum('cost'),
            'face_swaps' => AIGeneration::where('operation', 'face-swap')->count(),
            'video_swaps' => AIGeneration::where('operation', 'video-face-swap')->count(),
            'image_gens' => AIGeneration::where('operation', 'image-generation')->count(),
            'total_customers' => Customer::count(),
            'active_customers' => Customer::where('is_banned', false)->count(),
        ];

        // Recent generations (last 10)
        $recent = AIGeneration::with(['customer', 'template'])
            ->latest()
            ->take(10)
            ->get();

        // Today's stats
        $todayGenerations = AIGeneration::whereDate('created_at', today())->count();
        $todayCost = AIGeneration::whereDate('created_at', today())->sum('cost');

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'recent' => $recent,
            'today' => [
                'generations' => $todayGenerations,
                'cost' => $todayCost,
            ],
        ]);
    }
}
```

### 2. Dashboard Page Updates

Replace hardcoded values with dynamic data:

| Stat | Source |
|---|---|
| Today's Cost | `AIGeneration::whereDate('created_at', today())->sum('cost')` |
| Total Generations | `AIGeneration::count()` |
| Face Swaps | `AIGeneration::where('operation', 'face-swap')->count()` |
| Video Generations | `AIGeneration::where('operation', 'video-face-swap')->count()` |
| Total Customers | `Customer::count()` |
| Active Customers | `Customer::where('is_banned', false)->count()` |

### 3. Recent Activity

Show real recent generations with:
- Operation type (icon + label)
- Model used
- Status badge
- Time ago
- Customer name (if available)
- Cost (if available)

### 4. Quick Actions

Keep existing quick actions:
- Generate image → `/admin/ai`
- Manage providers → `/admin/providers`
- API Playground → `/admin/api-playground`
- View customers → `/admin/customers`
- View templates → `/admin/templates`

## Files to Modify

| File | Action |
|---|---|
| `app/Http/Controllers/Admin/DashboardController.php` | Create |
| `routes/web.php` | Update dashboard route to use controller |
| `resources/js/pages/dashboard.tsx` | Update to use props |

## Notes

- Use `StatCard` component (already exists)
- Use `AnimatedCard` for consistency
- Format cost as `$XX.XX`
- Format large numbers with commas
- Handle empty state (no generations yet)
