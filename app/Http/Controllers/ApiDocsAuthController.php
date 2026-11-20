<?php

namespace App\Http\Controllers;

use App\Support\ApiDocsSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ApiDocsAuthController extends Controller
{
    public function showUnlock(Request $request): View|RedirectResponse
    {
        $enabled = ApiDocsSettings::isEnabled() && ApiDocsSettings::hasPassword();

        if (! $enabled) {
            abort(403, 'API documentation is currently disabled.');
        }

        if ($request->session()->get('api_docs_unlocked_version') === ApiDocsSettings::version()) {
            return redirect('/docs/api');
        }

        return view('api-docs.unlock');
    }

    public function unlock(Request $request): RedirectResponse
    {
        if (! ApiDocsSettings::isEnabled() || ! ApiDocsSettings::hasPassword()) {
            abort(403, 'API documentation is currently disabled.');
        }

        $validated = $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (! ApiDocsSettings::verifyPassword($validated['password'])) {
            return back()->withErrors([
                'password' => 'Invalid API docs password.',
            ]);
        }

        $request->session()->put('api_docs_unlocked_version', ApiDocsSettings::version());

        return redirect('/docs/api');
    }

    public function lock(Request $request): RedirectResponse
    {
        $request->session()->forget('api_docs_unlocked_version');

        return redirect()->route('api-docs.unlock');
    }
}
