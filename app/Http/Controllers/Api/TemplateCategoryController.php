<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TemplateCategory;
use Illuminate\Http\JsonResponse;

class TemplateCategoryController extends Controller
{
    /**
     * List active template categories.
     *
     * Public endpoint — no authentication required.
     */
    public function index(): JsonResponse
    {
        $categories = TemplateCategory::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'description']);

        return response()->json($categories);
    }
}
