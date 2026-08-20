<?php

namespace App\Http\Middleware;

use App\Models\Customer;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Reject banned customers from accessing API endpoints.
 *
 * Banned customers cannot login or make authenticated API requests.
 * This middleware checks the authenticated customer's ban status
 * and returns 403 if banned.
 */
class EnsureCustomerNotBanned
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof Customer && $user->is_banned) {
            return response()->json([
                'message' => 'Your account has been banned. Please contact support.',
            ], 403);
        }

        return $next($request);
    }
}
