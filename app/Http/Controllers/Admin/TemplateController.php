<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Template;
use App\Models\TemplateCategory;
use App\Models\TemplateTag;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TemplateController extends Controller
{
    /**
     * The storage disk used for template files.
     */
    protected string $disk = 'spaces';

    /**
     * Display a listing of the templates.
     */
    public function index(Request $request): Response
    {
        $templates = Template::query()
            ->with(['category:id,name,slug', 'tags:id,name,slug'])
            ->when($request->category, fn ($query, $category) => $query->where('category_id', $category))
            ->when($request->search, fn ($query, $search) => $query
                ->where(fn ($q) => $q
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhereHas('tags', fn ($tag) => $tag->where('name', 'like', "%{$search}%"))))
            ->orderBy('name')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('admin/templates/index', [
            'templates' => $templates,
            'categories' => TemplateCategory::orderBy('name')->get(['id', 'name', 'slug']),
            'filters' => $request->only('search', 'category'),
        ]);
    }

    /**
     * Show the form for creating a new template.
     */
    public function create(): Response
    {
        return Inertia::render('admin/templates/create', [
            'categories' => TemplateCategory::orderBy('name')->get(['id', 'name', 'slug']),
            'tags' => TemplateTag::orderBy('name')->get(['id', 'name', 'slug']),
        ]);
    }

    /**
     * Store a newly created template.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            // No unique rule: HasAutoSlug appends -2, -3... when the slug exists.
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'category_id' => ['nullable', 'integer', 'exists:template_categories,id'],
            'type' => ['required', Rule::in([Template::TYPE_IMAGE, Template::TYPE_VIDEO])],
            'file' => ['required', 'file', 'max:51200'], // 50 MB
            'thumbnail' => ['nullable', 'image', 'max:5120'],
            'cost' => ['sometimes', 'integer', 'min:0'],
            'model' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['integer', 'exists:template_tags,id'],
        ]);

        $filePath = $request->file('file')->store('templates', $this->disk);
        $thumbnailPath = $request->file('thumbnail')?->store('templates/thumbnails', $this->disk);

        $template = Template::create([
            'name' => $validated['name'],
            'slug' => $validated['slug'] ?? Str::slug($validated['name']),
            'description' => $validated['description'] ?? null,
            'category_id' => $validated['category_id'] ?? null,
            'type' => $validated['type'],
            'cost' => $validated['cost'] ?? 0,
            'file_path' => $filePath,
            'thumbnail_path' => $thumbnailPath,
            'model' => $validated['model'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $template->tags()->sync($validated['tags'] ?? []);

        return to_route('admin.templates.index')->with('success', 'Template uploaded.');
    }

    /**
     * Show the form for editing the specified template.
     */
    public function edit(Template $template): Response
    {
        return Inertia::render('admin/templates/edit', [
            'template' => $template->load(['category:id,name,slug', 'tags:id,name,slug']),
            'categories' => TemplateCategory::orderBy('name')->get(['id', 'name', 'slug']),
            'tags' => TemplateTag::orderBy('name')->get(['id', 'name', 'slug']),
        ]);
    }

    /**
     * Update the specified template.
     */
    public function update(Request $request, Template $template): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'category_id' => ['nullable', 'integer', 'exists:template_categories,id'],
            'type' => ['required', Rule::in([Template::TYPE_IMAGE, Template::TYPE_VIDEO])],
            'file' => ['nullable', 'file', 'max:51200'],
            'thumbnail' => ['nullable', 'image', 'max:5120'],
            'cost' => ['sometimes', 'integer', 'min:0'],
            'model' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['integer', 'exists:template_tags,id'],
        ]);

        $data = [
            'name' => $validated['name'],
            // Slugs stay stable once created — only change when explicitly provided.
            'slug' => $validated['slug'] ?? $template->slug,
            'description' => $validated['description'] ?? null,
            'category_id' => $validated['category_id'] ?? null,
            'type' => $validated['type'],
            'cost' => $validated['cost'] ?? $template->cost,
            'model' => $validated['model'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ];

        if ($request->hasFile('file')) {
            $data['file_path'] = $request->file('file')->store('templates', $this->disk);
        }

        if ($request->hasFile('thumbnail')) {
            $data['thumbnail_path'] = $request->file('thumbnail')->store('templates/thumbnails', $this->disk);
        }

        $template->update($data);
        $template->tags()->sync($validated['tags'] ?? []);

        return to_route('admin.templates.index')->with('success', 'Template updated.');
    }

    /**
     * Remove the specified template.
     */
    public function destroy(Template $template): RedirectResponse
    {
        Storage::disk($this->disk)->delete(array_filter([
            $template->file_path,
            $template->thumbnail_path,
        ]));

        $template->delete();

        return to_route('admin.templates.index')->with('success', 'Template deleted.');
    }
}
