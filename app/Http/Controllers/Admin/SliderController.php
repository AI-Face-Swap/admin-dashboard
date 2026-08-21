<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Slider;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SliderController extends Controller
{
    /**
     * Display a listing of sliders.
     */
    public function index(): Response
    {
        $sliders = Slider::query()
            ->ordered()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('admin/sliders/index', [
            'sliders' => $sliders,
        ]);
    }

    /**
     * Show the form for creating a new slider.
     */
    public function create(): Response
    {
        return Inertia::render('admin/sliders/create');
    }

    /**
     * Store a newly created slider.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'cta_text' => ['nullable', 'string', 'max:100'],
            'cta_url' => ['nullable', 'string', 'max:500'],
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,gif,mp4,webm,mov', 'max:20480'], // 20MB
            'type' => ['required', 'in:image,video'],
            'sorting' => ['required', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['boolean'],
            'badge' => ['nullable', 'string', 'max:50'],
        ]);

        $file = $request->file('file');
        $path = $file->storeAs(
            'sliders',
            Str::uuid().'.'.$file->getClientOriginalExtension(),
            'spaces',
        );

        Slider::create([
            ...$validated,
            'file_path' => $path,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('admin.sliders.index')
            ->with('success', 'Slider created successfully.');
    }

    /**
     * Show the form for editing the specified slider.
     */
    public function edit(Slider $slider): Response
    {
        return Inertia::render('admin/sliders/edit', [
            'slider' => $slider,
        ]);
    }

    /**
     * Update the specified slider.
     */
    public function update(Request $request, Slider $slider): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'cta_text' => ['nullable', 'string', 'max:100'],
            'cta_url' => ['nullable', 'string', 'max:500'],
            'file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,gif,mp4,webm,mov', 'max:20480'],
            'type' => ['required', 'in:image,video'],
            'sorting' => ['required', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['boolean'],
            'badge' => ['nullable', 'string', 'max:50'],
        ]);

        $data = [
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'cta_text' => $validated['cta_text'] ?? null,
            'cta_url' => $validated['cta_url'] ?? null,
            'type' => $validated['type'],
            'sorting' => $validated['sorting'],
            'is_active' => $request->boolean('is_active', true),
            'badge' => $validated['badge'] ?? null,
        ];

        // Replace file if a new one is uploaded
        if ($request->hasFile('file')) {
            // Delete old file
            if ($slider->file_path) {
                Storage::disk('spaces')->delete($slider->file_path);
            }

            $file = $request->file('file');
            $path = $file->storeAs(
                'sliders',
                Str::uuid().'.'.$file->getClientOriginalExtension(),
                'spaces',
            );

            $data['file_path'] = $path;
        }

        $slider->update($data);

        return redirect()->route('admin.sliders.index')
            ->with('success', 'Slider updated successfully.');
    }

    /**
     * Remove the specified slider.
     */
    public function destroy(Slider $slider): RedirectResponse
    {
        // Delete file from storage
        if ($slider->file_path) {
            Storage::disk('spaces')->delete($slider->file_path);
        }

        $slider->delete();

        return redirect()->route('admin.sliders.index')
            ->with('success', 'Slider deleted successfully.');
    }
}
