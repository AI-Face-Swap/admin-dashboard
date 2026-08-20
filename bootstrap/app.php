<?php

use App\Http\Middleware\EnsureCustomerNotBanned;
use App\Http\Middleware\EnsureUserHasPermission;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleGuestRedirect;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\LogApiRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        // API routes use Bearer token auth (Sanctum), not session cookies.
        // CSRF is not needed — skip it for all /api/* routes.
        $middleware->validateCsrfTokens(except: ['api/*']);

        $middleware->alias([
            'permission' => EnsureUserHasPermission::class,
            'guest' => HandleGuestRedirect::class,
            'customer.not-banned' => EnsureCustomerNotBanned::class,
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->api(prepend: [
            // Lets Sanctum accept session-cookie auth (admin dashboard) on
            // /api/* routes, not just Bearer tokens (mobile app).
            EnsureFrontendRequestsAreStateful::class,
        ]);

        $middleware->api(append: [
            LogApiRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
