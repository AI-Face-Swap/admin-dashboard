<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Drop-in replacement for RedirectIfAuthenticated that returns JSON 403
 * instead of a redirect when the request expects JSON.
 *
 * This fixes the API Playground: when an admin (logged in via session)
 * hits guest-only routes like /api/v1/auth/register, the default
 * RedirectIfAuthenticated redirects to /dashboard (HTML). This middleware
 * returns a proper JSON error instead.
 */
class HandleGuestRedirect
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, ?string ...$guards): Response
    {
        $guards = empty($guards) ? [null] : $guards;

        foreach ($guards as $guard) {
            if (Auth::guard($guard)->check()) {
                if ($request->expectsJson() || $request->isXmlHttpRequest()) {
                    return response()->json([
                        'message' => 'You are already authenticated.',
                    ], 403);
                }

                return redirect()->intended(route('dashboard'));
            }
        }

        return $next($request);
    }
}
