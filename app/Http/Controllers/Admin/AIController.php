<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AIGeneration;
use App\Models\Template;
use Inertia\Inertia;
use Inertia\Response;

class AIController extends Controller
{
    /**
     * Display the AI generation tool and recent history.
     */
    public function index(): Response
    {
        return Inertia::render('admin/ai/index', [
            'templates' => Template::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'slug', 'type', 'thumbnail_path', 'file_path']),
            'generations' => AIGeneration::with('template:id,name,slug')
                ->latest()
                ->limit(20)
                ->get(),
        ]);
    }
}
