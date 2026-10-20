<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Dedoc\Scramble\Scramble;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureScrambleAccess();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }

    /**
     * Control who can access API docs (/docs/api) and ensure only routes/api.php endpoints are documented.
     */
    protected function configureScrambleAccess(): void
    {
        // Allow public access to API docs
        Gate::define('viewApiDocs', fn ($user = null) => true);

        // Strictly restrict documentation to client API routes from routes/api.php
        Scramble::routes(function (Route $route) {
            if (! Str::startsWith($route->uri(), 'api/') || ! in_array('api', $route->gatherMiddleware())) {
                return false;
            }

            // Exclude local dev test routes, browser redirects, and S2S webhooks
            if (Str::startsWith($route->uri(), 'api/v1/test/') ||
                Str::startsWith($route->uri(), 'api/v1/htut/') ||
                $route->uri() === 'api/v1/auth/htut/redirect' ||
                ($route->uri() === 'api/v1/auth/htut/callback' && in_array('GET', $route->methods()))
            ) {
                return false;
            }

            return true;
        });
    }
}
