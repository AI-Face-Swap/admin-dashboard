<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AIModel;
use App\Models\HomeFeature;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class HomeFeatureController extends Controller
{
    public function index()
    {
        return Inertia::render('admin/home-features/index', [
            'features' => HomeFeature::with('aiModel')->orderBy('order')->paginate(15),
        ]);
    }

    public function create()
    {
        return Inertia::render('admin/home-features/create', [
            'aiModels' => AIModel::ordered()->get(),
        ]);
    }

    public function store(Request $request)
    {
        // Convert 'none' to null before validation so exists:ai_models,id doesn't fail
        if ($request->input('ai_model_id') === 'none') {
            $request->merge(['ai_model_id' => null]);
        }

        $validated = $request->validate([
            'title' => 'required|string',
            'description' => 'required|string',
            'link' => 'nullable|string',
            'order' => 'required|integer',
            'is_active' => 'boolean',
            'ai_model_id' => 'nullable|exists:ai_models,id',
            'icon_url' => 'nullable|file|mimes:jpg,jpeg,png,webp,svg|max:5120',
            'video_url' => 'nullable|file|mimes:mp4,mov,avi|max:20480',
        ]);

        $data = $validated;

        if ($request->hasFile('icon_url')) {
            $file = $request->file('icon_url');
            $path = $file->storeAs('HomeFeature', Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            $data['icon_url'] = Storage::disk('spaces')->url($path);
        }

        if ($request->hasFile('video_url')) {
            $file = $request->file('video_url');
            $path = $file->storeAs('HomeFeature', Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            $data['video_url'] = Storage::disk('spaces')->url($path);
        }

        if (! isset($data['is_active'])) {
            $data['is_active'] = $request->boolean('is_active');
        }

        HomeFeature::create($data);

        return redirect()->route('admin.home-features.index')->with('success', 'Created successfully.');
    }

    public function edit(HomeFeature $homeFeature)
    {
        return Inertia::render('admin/home-features/edit', [
            'feature' => $homeFeature->load('aiModel'),
            'aiModels' => AIModel::ordered()->get(),
        ]);
    }

    public function update(Request $request, HomeFeature $homeFeature)
    {
        // Convert 'none' to null before validation so exists:ai_models,id doesn't fail
        if ($request->input('ai_model_id') === 'none') {
            $request->merge(['ai_model_id' => null]);
        }

        $validated = $request->validate([
            'title' => 'required|string',
            'description' => 'required|string',
            'link' => 'nullable|string',
            'order' => 'required|integer',
            'is_active' => 'boolean',
            'ai_model_id' => 'nullable|exists:ai_models,id',
            'icon_url' => 'nullable|file|mimes:jpg,jpeg,png,webp,svg|max:5120',
            'video_url' => 'nullable|file|mimes:mp4,mov,avi|max:20480',
        ]);

        $data = $validated;
        // Unset file properties if they weren't updated so we don't overwrite DB string with null
        foreach (['icon_url', 'video_url'] as $f) {
            if (! $request->hasFile($f)) {
                unset($data[$f]);
            }
        }

        if ($request->hasFile('icon_url')) {
            $file = $request->file('icon_url');
            $path = $file->storeAs('HomeFeature', Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            $data['icon_url'] = Storage::disk('spaces')->url($path);
        }

        if ($request->hasFile('video_url')) {
            $file = $request->file('video_url');
            $path = $file->storeAs('HomeFeature', Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            $data['video_url'] = Storage::disk('spaces')->url($path);
        }

        if (! isset($data['is_active'])) {
            $data['is_active'] = $request->boolean('is_active');
        }

        $homeFeature->update($data);

        return redirect()->route('admin.home-features.index')->with('success', 'Updated successfully.');
    }

    public function destroy(HomeFeature $homeFeature)
    {
        $homeFeature->delete();

        return redirect()->route('admin.home-features.index')->with('success', 'Deleted successfully.');
    }
}
