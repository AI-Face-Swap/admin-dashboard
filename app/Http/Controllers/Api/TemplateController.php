<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Template;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TemplateController extends Controller
{
    /**
     * List active templates with optional filters.
     *
     * Public endpoint — no authentication required.
     * Supports: search, category slug, type (image/video), pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'in:image,video'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $templates = Template::query()
            ->where('is_active', true)
            ->with(['category:id,name,slug', 'tags:id,name,slug'])
            ->when($validated['search'] ?? null, fn ($query, $search) => $query
                ->where(fn ($q) => $q
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhereHas('tags', fn ($tag) => $tag->where('name', 'like', "%{$search}%"))))
            ->when($validated['category'] ?? null, fn ($query, $slug) => $query
                ->whereHas('category', fn ($cat) => $cat->where('slug', $slug)))
            ->when($validated['type'] ?? null, fn ($query, $type) => $query->where('type', $type))
            ->latest()
            ->paginate($validated['per_page'] ?? 12)
            ->withQueryString();

        return response()->json($templates);
    }

    /**
     * Get a single active template by slug.
     */
    public function show(string $slug): JsonResponse
    {
        $template = Template::where('slug', $slug)
            ->where('is_active', true)
            ->with(['category:id,name,slug', 'tags:id,name,slug'])
            ->firstOrFail();

        return response()->json($template);
    }
}
