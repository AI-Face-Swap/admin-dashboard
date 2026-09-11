<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HomeFeature;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class HomeFeatureController extends Controller
{
    public function index()
    {
        return Inertia::render('admin/home-features/index', [
            'features' => HomeFeature::orderBy('order')->paginate(15)
        ]);
    }

    public function create()
    {
        return Inertia::render('admin/home-features/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'description' => 'required|string',
            'link' => 'nullable|string',
            'order' => 'required|integer',
            'is_active' => 'boolean',
            'icon_url' => 'nullable|file|mimes:jpg,jpeg,png,webp,svg|max:5120',
            'video_url' => 'nullable|file|mimes:mp4,mov,avi|max:20480'
        ]);

        $data = $validated;
        
        if ($request->hasFile('icon_url')) {
            $file = $request->file('icon_url');
            $path = $file->storeAs('HomeFeature', \Illuminate\Support\Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            $data['icon_url'] = \Illuminate\Support\Facades\Storage::disk('spaces')->url($path);
        }

        if ($request->hasFile('video_url')) {
            $file = $request->file('video_url');
            $path = $file->storeAs('HomeFeature', \Illuminate\Support\Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            $data['video_url'] = \Illuminate\Support\Facades\Storage::disk('spaces')->url($path);
        }

        if (!isset($data['is_active'])) {
            $data['is_active'] = $request->boolean('is_active');
        }

        HomeFeature::create($data);
        return redirect()->route('admin.home-features.index')->with('success', 'Created successfully.');
    }

    public function edit(HomeFeature $item)
    {
        return Inertia::render('admin/home-features/edit', [
            'feature' => $item
        ]);
    }

    public function update(Request $request, HomeFeature $item)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'description' => 'required|string',
            'link' => 'nullable|string',
            'order' => 'required|integer',
            'is_active' => 'boolean',
            'icon_url' => 'nullable|file|mimes:jpg,jpeg,png,webp,svg|max:5120',
            'video_url' => 'nullable|file|mimes:mp4,mov,avi|max:20480'
        ]);

        $data = $validated;
        // Unset file properties if they weren't updated so we don't overwrite DB string with null
        foreach (['icon_url', 'video_url'] as $f) {
            if (!$request->hasFile($f)) {
                unset($data[$f]);
            }
        }
        
        
        if ($request->hasFile('icon_url')) {
            $file = $request->file('icon_url');
            $path = $file->storeAs('HomeFeature', \Illuminate\Support\Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            $data['icon_url'] = \Illuminate\Support\Facades\Storage::disk('spaces')->url($path);
        }

        if ($request->hasFile('video_url')) {
            $file = $request->file('video_url');
            $path = $file->storeAs('HomeFeature', \Illuminate\Support\Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            $data['video_url'] = \Illuminate\Support\Facades\Storage::disk('spaces')->url($path);
        }
        
        if (!isset($data['is_active'])) {
            $data['is_active'] = $request->boolean('is_active');
        }

        $item->update($data);
        return redirect()->route('admin.home-features.index')->with('success', 'Updated successfully.');
    }

    public function destroy(HomeFeature $item)
    {
        $item->delete();
        return redirect()->route('admin.home-features.index')->with('success', 'Deleted successfully.');
    }
}
