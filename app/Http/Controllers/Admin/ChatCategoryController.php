<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ChatCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChatCategoryController extends Controller
{
    public function index(): Response
    {
        $categories = ChatCategory::query()->ordered()->get();

        return Inertia::render('admin/chat-categories/index', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'key' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:chat_categories,key'],
            'label_en' => ['required', 'string', 'max:100'],
            'label_my' => ['required', 'string', 'max:100'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:999'],
            'is_active' => ['boolean'],
        ]);

        ChatCategory::create([
            'key' => strtolower($validated['key']),
            'label_en' => $validated['label_en'],
            'label_my' => $validated['label_my'],
            'sort_order' => $validated['sort_order'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return back()->with('success', 'Chat category created successfully.');
    }

    public function update(Request $request, ChatCategory $chatCategory): RedirectResponse
    {
        $validated = $request->validate([
            'key' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:chat_categories,key,'.$chatCategory->id],
            'label_en' => ['required', 'string', 'max:100'],
            'label_my' => ['required', 'string', 'max:100'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:999'],
            'is_active' => ['boolean'],
        ]);

        $chatCategory->update([
            'key' => strtolower($validated['key']),
            'label_en' => $validated['label_en'],
            'label_my' => $validated['label_my'],
            'sort_order' => $validated['sort_order'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return back()->with('success', 'Chat category updated successfully.');
    }

    public function toggle(ChatCategory $chatCategory): RedirectResponse
    {
        $chatCategory->update([
            'is_active' => ! $chatCategory->is_active,
        ]);

        return back()->with('success', 'Chat category visibility updated.');
    }

    public function destroy(ChatCategory $chatCategory): RedirectResponse
    {
        $chatCategory->delete();

        return back()->with('success', 'Chat category deleted successfully.');
    }
}
