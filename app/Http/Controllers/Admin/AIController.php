<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AIGeneration;
use App\Models\Template;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

    /**
     * Download the output file of an AI generation.
     */
    public function download(AIGeneration $generation, Request $request): StreamedResponse|RedirectResponse
    {
        $outputs = $generation->output_metadata ?? [];
        $index = (int) $request->input('index', 0);

        if (! isset($outputs[$index]) || ! is_string($outputs[$index])) {
            abort(404, 'Output file not found.');
        }

        $sourceUrl = $outputs[$index];
        if (filter_var($sourceUrl, FILTER_VALIDATE_URL)) {
            $sourcePath = ltrim((string) parse_url($sourceUrl, PHP_URL_PATH), '/');
        } else {
            $sourcePath = ltrim($sourceUrl, '/');
        }

        $disk = Storage::disk('spaces');
        if ($disk->exists($sourcePath)) {
            $ext = pathinfo($sourcePath, PATHINFO_EXTENSION);
            $filename = "{$generation->operation}-{$generation->id}".($index > 0 ? "-{$index}" : '').'.'.($ext ?: 'png');

            return $disk->download($sourcePath, $filename);
        }

        if (filter_var($sourceUrl, FILTER_VALIDATE_URL)) {
            return redirect()->away($sourceUrl);
        }

        abort(404, 'File not found on storage.');
    }
}
