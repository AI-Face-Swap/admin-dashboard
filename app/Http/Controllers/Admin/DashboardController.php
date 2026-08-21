<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AIGeneration;
use App\Models\Customer;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the admin dashboard with real data.
     */
    public function index(): Response
    {
        $stats = [
            'total_generations' => AIGeneration::count(),
            'today_cost' => (string) AIGeneration::whereDate('created_at', today())->sum('cost'),
            'total_cost' => (string) AIGeneration::sum('cost'),
            'face_swaps' => AIGeneration::where('operation', 'face-swap')->count(),
            'video_swaps' => AIGeneration::where('operation', 'video-face-swap')->count(),
            'image_gens' => AIGeneration::where('operation', 'image-generation')->count(),
            'total_customers' => Customer::count(),
            'active_customers' => Customer::where('is_banned', false)->count(),
        ];

        $recent = AIGeneration::with(['customer', 'template'])
            ->latest()
            ->take(3)
            ->get()
            ->map(fn (AIGeneration $g) => [
                'id' => $g->id,
                'operation' => $g->operation,
                'status' => $g->status,
                'model' => $g->input_metadata['model'] ?? '—',
                'cost' => $g->cost,
                'customer_name' => $g->customer?->name ?? 'Admin',
                'template_name' => $g->template?->name ?? null,
                'created_at' => $g->created_at->toISOString(),
            ]);

        $today = [
            'generations' => AIGeneration::whereDate('created_at', today())->count(),
            'cost' => (string) AIGeneration::whereDate('created_at', today())->sum('cost'),
        ];

        // Monthly chart data (last 6 months)
        $monthly = collect();
        for ($i = 5; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i);
            $monthly->push([
                'month' => $month->format('M'),
                'generations' => AIGeneration::whereYear('created_at', $month->year)
                    ->whereMonth('created_at', $month->month)
                    ->count(),
                'cost' => (float) AIGeneration::whereYear('created_at', $month->year)
                    ->whereMonth('created_at', $month->month)
                    ->sum('cost'),
            ]);
        }

        // Operation breakdown
        $operations = [
            ['name' => 'Image Gen', 'value' => $stats['image_gens']],
            ['name' => 'Face Swap', 'value' => $stats['face_swaps']],
            ['name' => 'Video Swap', 'value' => $stats['video_swaps']],
        ];

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'recent' => $recent,
            'today' => $today,
            'monthly' => $monthly,
            'operations' => $operations,
        ]);
    }
}
