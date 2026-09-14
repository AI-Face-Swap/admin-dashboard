<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HomeHero;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class HomeHeroController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/home-heroes/index', [
            'heroes' => HomeHero::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->paginate(15),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/home-heroes/create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'video' => 'nullable|string',
            'video_file' => 'nullable|file|mimes:mp4,webm,mov|max:51200',
            'images' => 'nullable|array',
            'images.*' => 'nullable|string',
            'image_files' => 'nullable|array',
            'image_files.*' => 'file|mimes:jpg,jpeg,png,webp|max:10240',
            'sort_order' => 'required|integer',
            'is_active' => 'boolean',
        ]);

        $video = $validated['video'] ?? null;
        if ($request->hasFile('video_file')) {
            $file = $request->file('video_file');
            $path = $file->storeAs('HomeHero', Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            $video = Storage::disk('spaces')->url($path);
        }

        $images = array_values(array_filter($validated['images'] ?? [], fn ($img) => ! empty($img)));
        if ($request->hasFile('image_files')) {
            foreach ($request->file('image_files') as $imgFile) {
                $path = $imgFile->storeAs('HomeHero', Str::uuid().'.'.$imgFile->getClientOriginalExtension(), 'spaces');
                $images[] = Storage::disk('spaces')->url($path);
            }
        }

        HomeHero::create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'video' => $video,
            'images' => $images,
            'sort_order' => $validated['sort_order'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('admin.home-heroes.index')
            ->with('success', 'Home Hero section created successfully.');
    }

    public function edit(HomeHero $homeHero): Response
    {
        return Inertia::render('admin/home-heroes/edit', [
            'hero' => $homeHero,
        ]);
    }

    public function update(Request $request, HomeHero $homeHero): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'video' => 'nullable|string',
            'video_file' => 'nullable|file|mimes:mp4,webm,mov|max:51200',
            'images' => 'nullable|array',
            'images.*' => 'nullable|string',
            'image_files' => 'nullable|array',
            'image_files.*' => 'file|mimes:jpg,jpeg,png,webp|max:10240',
            'sort_order' => 'required|integer',
            'is_active' => 'boolean',
        ]);

        $video = $validated['video'] ?? $homeHero->video;
        if ($request->hasFile('video_file')) {
            $file = $request->file('video_file');
            $path = $file->storeAs('HomeHero', Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            $video = Storage::disk('spaces')->url($path);
        }

        $images = array_values(array_filter($validated['images'] ?? [], fn ($img) => ! empty($img)));
        if ($request->hasFile('image_files')) {
            foreach ($request->file('image_files') as $imgFile) {
                $path = $imgFile->storeAs('HomeHero', Str::uuid().'.'.$imgFile->getClientOriginalExtension(), 'spaces');
                $images[] = Storage::disk('spaces')->url($path);
            }
        }

        $homeHero->update([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'video' => $video,
            'images' => $images,
            'sort_order' => $validated['sort_order'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('admin.home-heroes.index')
            ->with('success', 'Home Hero section updated successfully.');
    }

    public function destroy(HomeHero $homeHero): RedirectResponse
    {
        $homeHero->delete();

        return redirect()->route('admin.home-heroes.index')
            ->with('success', 'Home Hero section deleted successfully.');
    }
}
