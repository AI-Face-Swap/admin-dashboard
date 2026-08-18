<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TemplateTag;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TemplateTagController extends Controller
{
    /**
     * Display a listing of the tags.
     */
    public function index(): Response
    {
        return Inertia::render('admin/template-tags/index', [
            'tags' => TemplateTag::withCount('templates')->orderBy('name')->get(),
        ]);
    }

    /**
     * Show the form for creating a new tag.
     */
    public function create(): Response
    {
        return Inertia::render('admin/template-tags/create');
    }

    /**
     * Store a newly created tag.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        TemplateTag::create(['name' => $validated['name']]);

        return to_route('admin.template-tags.index')->with('success', 'Tag created.');
    }

    /**
     * Show the form for editing the specified tag.
     */
    public function edit(TemplateTag $tag): Response
    {
        return Inertia::render('admin/template-tags/edit', [
            'tag' => $tag,
        ]);
    }

    /**
     * Update the specified tag.
     */
    public function update(Request $request, TemplateTag $tag): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('template_tags', 'name')->ignore($tag->id)],
        ]);

        $tag->update(['name' => $validated['name']]);

        return to_route('admin.template-tags.index')->with('success', 'Tag updated.');
    }

    /**
     * Remove the specified tag.
     */
    public function destroy(TemplateTag $tag): RedirectResponse
    {
        $tag->delete();

        return to_route('admin.template-tags.index')->with('success', 'Tag deleted.');
    }
}
