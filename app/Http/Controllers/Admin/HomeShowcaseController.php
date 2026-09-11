<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HomeShowcase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class HomeShowcaseController extends Controller
{
    public function index()
    {
        return Inertia::render('admin/home-showcases/index', [
            'showcases' => HomeShowcase::orderBy('order')->paginate(15),
        ]);
    }

    public function create()
    {
        return Inertia::render('admin/home-showcases/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'section_name' => 'nullable|string',
            'title' => 'required|string',
            'description' => 'required|string',
            'alignment' => 'required|in:left,right',
            'order' => 'required|integer',
            'is_active' => 'boolean',
            'video_url' => 'nullable|file|mimes:mp4,webm,mov|max:51200',
            'image_fallback_url' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:10240',
        ]);

        $data = $validated;

        if ($request->hasFile('video_url')) {
            $file = $request->file('video_url');
            $path = $file->storeAs('HomeShowcase', Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            $data['video_url'] = Storage::disk('spaces')->url($path);
        }
        if ($request->hasFile('image_fallback_url')) {
            $file = $request->file('image_fallback_url');
            $path = $file->storeAs('HomeShowcase', Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            $data['image_fallback_url'] = Storage::disk('spaces')->url($path);
        }

        if (! isset($data['is_active'])) {
            $data['is_active'] = $request->boolean('is_active');
        }

        HomeShowcase::create($data);

        return redirect()->route('admin.home-showcases.index')->with('success', 'Created successfully.');
    }

    public function edit(HomeShowcase $item)
    {
        return Inertia::render('admin/home-showcases/edit', [
            'showcase' => $item,
        ]);
    }

    public function update(Request $request, HomeShowcase $item)
    {
        $validated = $request->validate([
            'section_name' => 'nullable|string',
            'title' => 'required|string',
            'description' => 'required|string',
            'alignment' => 'required|in:left,right',
            'order' => 'required|integer',
            'is_active' => 'boolean',
            'video_url' => 'nullable|file|mimes:mp4,webm,mov|max:51200',
            'image_fallback_url' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:10240',
        ]);

        $data = $validated;
        // Unset file properties if they weren't updated so we don't overwrite DB string with null
        foreach ([
            0 => 'video_url',
            1 => 'image_fallback_url',
        ] as $f) {
            if (! $request->hasFile($f)) {
                unset($data[$f]);
            }
        }

        if ($request->hasFile('video_url')) {
            $file = $request->file('video_url');
            $path = $file->storeAs('HomeShowcase', Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            $data['video_url'] = Storage::disk('spaces')->url($path);
        }
        if ($request->hasFile('image_fallback_url')) {
            $file = $request->file('image_fallback_url');
            $path = $file->storeAs('HomeShowcase', Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            $data['image_fallback_url'] = Storage::disk('spaces')->url($path);
        }

        if (! isset($data['is_active'])) {
            $data['is_active'] = $request->boolean('is_active');
        }

        $item->update($data);

        return redirect()->route('admin.home-showcases.index')->with('success', 'Updated successfully.');
    }

    public function destroy(HomeShowcase $item)
    {
        $item->delete();

        return redirect()->route('admin.home-showcases.index')->with('success', 'Deleted successfully.');
    }
}
