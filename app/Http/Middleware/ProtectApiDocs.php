<?php

namespace App\Http\Middleware;

use App\Support\ApiDocsSettings;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ProtectApiDocs
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! ApiDocsSettings::isEnabled() || ! ApiDocsSettings::hasPassword()) {
            abort(403, 'API documentation is currently disabled.');
        }

        $unlockedVersion = $request->session()->get('api_docs_unlocked_version');
        if ($unlockedVersion !== ApiDocsSettings::version()) {
            if ($request->expectsJson() || str_ends_with($request->path(), '.json')) {
                return response()->json([
                    'message' => 'API documentation is locked. Please unlock at /docs/api/unlock.',
                ], 403);
            }

            return redirect()->route('api-docs.unlock');
        }

        return $next($request);
    }
}
