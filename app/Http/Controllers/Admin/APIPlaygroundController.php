<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Template;
use Inertia\Inertia;
use Inertia\Response;

class APIPlaygroundController extends Controller
{
    /**
     * Display the API testing playground.
     */
    public function index(): Response
    {
        $templates = Template::where('is_active', true)
            ->with([
                'aiModel:id,name,model_name,provider_name',
                'generationType:id,name,slug',
            ])
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->get([
                'id',
                'name',
                'slug',
                'type',
                'model',
                'ai_model_id',
                'generation_type_id',
            ]);

        return Inertia::render('admin/api-playground/index', [
            'templates' => $templates,
        ]);
    }
}
