<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AIModel;
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
        return Inertia::render('admin/ai-models/create');
    }

    /**
     * Store a newly created AI model.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'provider_name' => ['required', 'string', 'max:255'],
            'model_name' => ['required', 'string', 'max:255'],
            'docs_link' => ['nullable', 'string', 'url', 'max:500'],
            'sort_order' => ['required', 'integer', 'min:0'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

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
            'aiModel' => $aiModel,
        ]);
    }

    /**
     * Update the specified AI model.
     */
    public function update(Request $request, AIModel $aiModel): RedirectResponse
    {
        $validated = $request->validate([
            'provider_name' => ['required', 'string', 'max:255'],
            'model_name' => ['required', 'string', 'max:255'],
            'docs_link' => ['nullable', 'string', 'url', 'max:500'],
            'sort_order' => ['required', 'integer', 'min:0'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

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
