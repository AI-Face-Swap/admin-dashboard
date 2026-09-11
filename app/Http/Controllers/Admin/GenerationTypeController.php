<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AIProvider;
use App\Models\GenerationType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class GenerationTypeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        return Inertia::render('admin/generation-types/index', [
            'generationTypes' => GenerationType::with('defaultProvider')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        return Inertia::render('admin/generation-types/create', [
            'providers' => AIProvider::orderBy('name')->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
            'default_provider_id' => ['nullable', 'exists:ai_providers,id'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        GenerationType::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'default_provider_id' => $validated['default_provider_id'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return to_route('admin.generation-types.index')->with('success', 'Generation Type created successfully.');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(GenerationType $generationType): Response
    {
        return Inertia::render('admin/generation-types/edit', [
            'generationType' => $generationType,
            'providers' => AIProvider::orderBy('name')->get(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, GenerationType $generationType): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('generation_types', 'name')->ignore($generationType->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
            'default_provider_id' => ['nullable', 'exists:ai_providers,id'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        $generationType->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'default_provider_id' => $validated['default_provider_id'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return to_route('admin.generation-types.index')->with('success', 'Generation Type updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(GenerationType $generationType): RedirectResponse
    {
        $generationType->delete();

        return to_route('admin.generation-types.index')->with('success', 'Generation Type deleted successfully.');
    }
}
