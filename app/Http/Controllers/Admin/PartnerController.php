<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Partner;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class PartnerController extends Controller
{
    public function index()
    {
        return Inertia::render('admin/partners/index', [
            'partners' => Partner::orderBy('order')->paginate(15)
        ]);
    }

    public function create()
    {
        return Inertia::render('admin/partners/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'website_url' => 'nullable|string',
            'order' => 'required|integer',
            'is_active' => 'boolean',
            'logo_url' => 'nullable|file|mimes:jpg,jpeg,png,webp,svg|max:5120'
        ]);

        $data = $validated;
        
        if ($request->hasFile('logo_url')) {
            $file = $request->file('logo_url');
            $path = $file->storeAs('Partner', \Illuminate\Support\Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            $data['logo_url'] = \Illuminate\Support\Facades\Storage::disk('spaces')->url($path);
        }

        if (!isset($data['is_active'])) {
            $data['is_active'] = $request->boolean('is_active');
        }

        Partner::create($data);
        return redirect()->route('admin.partners.index')->with('success', 'Created successfully.');
    }

    public function edit(Partner $item)
    {
        return Inertia::render('admin/partners/edit', [
            'partner' => $item
        ]);
    }

    public function update(Request $request, Partner $item)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'website_url' => 'nullable|string',
            'order' => 'required|integer',
            'is_active' => 'boolean',
            'logo_url' => 'nullable|file|mimes:jpg,jpeg,png,webp,svg|max:5120'
        ]);

        $data = $validated;
        // Unset file properties if they weren't updated so we don't overwrite DB string with null
        foreach (array (
  0 => 'logo_url',
) as $f) {
            if (!$request->hasFile($f)) {
                unset($data[$f]);
            }
        }
        
        
        if ($request->hasFile('logo_url')) {
            $file = $request->file('logo_url');
            $path = $file->storeAs('Partner', \Illuminate\Support\Str::uuid().'.'.$file->getClientOriginalExtension(), 'spaces');
            $data['logo_url'] = \Illuminate\Support\Facades\Storage::disk('spaces')->url($path);
        }
        
        if (!isset($data['is_active'])) {
            $data['is_active'] = $request->boolean('is_active');
        }

        $item->update($data);
        return redirect()->route('admin.partners.index')->with('success', 'Updated successfully.');
    }

    public function destroy(Partner $item)
    {
        $item->delete();
        return redirect()->route('admin.partners.index')->with('success', 'Deleted successfully.');
    }
}
