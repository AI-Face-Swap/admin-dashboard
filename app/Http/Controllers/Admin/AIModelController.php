<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AIModel;
use App\Models\GenerationType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AIModelController extends Controller
{
    /**
     * Display a listing of AI models.
     */
    public function index(): Response
    {
        $aiModels = AIModel::query()
            ->with('generationType')
            ->ordered()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('admin/ai-models/index', [
            'aiModels' => $aiModels,
        ]);
    }

    /**
     * Show the form for creating a new AI model.
     */
    public function create(): Response
    {
        return Inertia::render('admin/ai-models/create', [
            'generationTypes' => GenerationType::where('is_active', true)->orderBy('sort_order')->get(),
        ]);
    }

    /**
     * Store a newly created AI model.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'generation_type_id' => ['nullable', 'exists:generation_types,id'],
            'provider_name' => ['required', 'string', 'max:255'],
            'model_name' => ['required', 'string', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'coin_cost' => ['required', 'integer', 'min:0'],
            'resolution_costs' => ['nullable', 'array'],
            'duration_costs' => ['nullable', 'array'],
            'is_active' => ['boolean'],
            'is_default' => ['boolean'],
            'docs_link' => ['nullable', 'string', 'url', 'max:500'],
            'sort_order' => ['required', 'integer', 'min:0'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        if (! empty($validated['is_default']) && ! empty($validated['generation_type_id'])) {
            AIModel::where('generation_type_id', $validated['generation_type_id'])
                ->update(['is_default' => false]);
        }

        AIModel::create($validated);

        return redirect()->route('admin.ai-models.index')
            ->with('success', 'AI model created successfully.');
    }

    /**
     * Show the form for editing the specified AI model.
     */
    public function edit(AIModel $aiModel): Response
    {
        return Inertia::render('admin/ai-models/edit', [
            'aiModel' => $aiModel->load('generationType'),
            'generationTypes' => GenerationType::where('is_active', true)->orderBy('sort_order')->get(),
        ]);
    }

    /**
     * Update the specified AI model.
     */
    public function update(Request $request, AIModel $aiModel): RedirectResponse
    {
        $validated = $request->validate([
            'generation_type_id' => ['nullable', 'exists:generation_types,id'],
            'provider_name' => ['required', 'string', 'max:255'],
            'model_name' => ['required', 'string', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'coin_cost' => ['required', 'integer', 'min:0'],
            'resolution_costs' => ['nullable', 'array'],
            'duration_costs' => ['nullable', 'array'],
            'is_active' => ['boolean'],
            'is_default' => ['boolean'],
            'docs_link' => ['nullable', 'string', 'url', 'max:500'],
            'sort_order' => ['required', 'integer', 'min:0'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        if (! empty($validated['is_default']) && ! empty($validated['generation_type_id'])) {
            AIModel::where('generation_type_id', $validated['generation_type_id'])
                ->where('id', '!=', $aiModel->id)
                ->update(['is_default' => false]);
        }

        $aiModel->update($validated);

        return redirect()->route('admin.ai-models.index')
            ->with('success', 'AI model updated successfully.');
    }

    /**
     * Remove the specified AI model.
     */
    public function destroy(AIModel $aiModel): RedirectResponse
    {
        $aiModel->delete();

        return redirect()->route('admin.ai-models.index')
            ->with('success', 'AI model deleted successfully.');
    }
}
