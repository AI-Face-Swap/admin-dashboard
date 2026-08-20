<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AIProvider;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ProviderController extends Controller
{
    /**
     * Display all AI providers with usage stats.
     */
    public function index(): Response
    {
        $providers = AIProvider::query()
            ->withCount([
                'generations',
                'generations as completed_count' => fn ($q) => $q->where('status', 'completed'),
                'generations as failed_count' => fn ($q) => $q->where('status', 'failed'),
            ])
            ->withSum('generations as total_cost', 'cost')
            ->orderBy('name')
            ->get();

        return Inertia::render('admin/providers/index', [
            'providers' => $providers->map(fn (AIProvider $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'is_active' => $p->is_active,
                'config' => $p->config,
                'created_at' => $p->created_at,
                'generations_count' => $p->generations_count,
                'completed_count' => $p->completed_count,
                'failed_count' => $p->failed_count,
                'total_cost' => $p->total_cost,
            ]),
        ]);
    }

    /**
     * Toggle a provider's active state.
     */
    public function toggle(AIProvider $provider): RedirectResponse
    {
        $provider->update(['is_active' => ! $provider->is_active]);

        $state = $provider->fresh()->is_active ? 'enabled' : 'disabled';

        return back()->with('success', "Provider \"{$provider->name}\" has been {$state}.");
    }
}
