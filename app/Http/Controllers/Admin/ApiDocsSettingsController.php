<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\ApiDocsSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApiDocsSettingsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/settings/api-docs', [
            'enabled' => ApiDocsSettings::isEnabled(),
            'has_password' => ApiDocsSettings::hasPassword(),
            'docs_url' => url('/docs/api'),
            'unlock_url' => url('/docs/api/unlock'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'password' => ['nullable', 'string', 'min:4', 'max:100'],
        ]);

        $enabled = (bool) $validated['enabled'];
        $password = $validated['password'] ?? null;

        if ($enabled && empty($password) && ! ApiDocsSettings::hasPassword()) {
            return back()->withErrors([
                'password' => 'Please set an access password before enabling API documentation.',
            ]);
        }

        ApiDocsSettings::updateSettings($enabled, $password);

        return back()->with('success', 'API Docs access settings updated.');
    }
}
