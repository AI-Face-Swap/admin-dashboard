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
     * Supports: search, category slug, type (image/video/commercial), is_commercial, pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'in:image,video,commercial'],
            'is_commercial' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $templates = Template::query()
            ->where('is_active', true)
            ->with([
                'category:id,name,slug',
                'tags:id,name,slug',
                'aiModel:id,name,provider_name,model_name,coin_cost,generation_type_id',
                'generationType:id,name,slug',
            ])
            ->when($validated['search'] ?? null, fn ($query, $search) => $query
                ->where(fn ($q) => $q
                    ->where('name', 'like', "%{$search}%")
                    ->where('slug', 'like', "%{$search}%", 'or')
                    ->orWhereHas('tags', fn ($tag) => $tag->where('name', 'like', "%{$search}%"))))
            ->when($validated['category'] ?? null, fn ($query, $slug) => $query
                ->whereHas('category', fn ($cat) => $cat->where('slug', $slug)))
            ->when($validated['type'] ?? null, function ($query, $type) {
                if ($type === 'commercial') {
                    $query->where('is_commercial', true);
                } else {
                    $query->where('type', $type);
                }
            })
            ->when($request->has('is_commercial') && $validated['is_commercial'] !== null, fn ($query) => $query
                ->where('is_commercial', $request->boolean('is_commercial')))
            ->orderBy('sort_order', 'asc')
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
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
            ->with([
                'category:id,name,slug',
                'tags:id,name,slug',
                'aiModel:id,name,provider_name,model_name,coin_cost,generation_type_id',
                'generationType:id,name,slug',
            ])
            ->firstOrFail();

        return response()->json($template);
    }
}
