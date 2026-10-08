<?php

use Dedoc\Scramble\Http\Middleware\RestrictedDocsAccess;
use Dedoc\Scramble\SecurityDocumentation\MiddlewareAuthSecurityStrategy;

return [
    /*
     * Only document routes starting with "api" (routes/api.php).
     * Admin web routes are excluded.
     */
    'api_path' => 'api',

    /*
     * API domain — used in server URLs and route matching.
     * null = use app domain (default).
     */
    'api_domain' => null,

    'export_path' => 'api.json',

    'cache' => [
        'key' => 'scramble.openapi',
        'store' => 'file',
    ],

    'info' => [
        'version' => env('API_VERSION', '1.0.0'),
        'description' => <<<'EOD'
# HTUT AI — REST API

AI-powered image generation, face swap, image editing, video face swap, and customer portal API.

## Authentication

All protected endpoints require a **Bearer token** issued via HTUT Central Auth SSO.

Include the token in the `Authorization` header:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

## SSO & Customer Auth Flow

1. Redirect user to `GET /api/v1/auth/htut/redirect`
2. User authenticates on HTUT Central Auth (SSO)
3. Callback to `GET /api/v1/auth/htut/callback` returns the customer record and access token
4. Retrieve customer profile & coin balance via `GET /api/v1/auth/me`
5. Terminate session via `POST /api/v1/auth/logout`

## Coin System & Packages

- Customers use coins for AI operations (Face Swap, Image Generation, Video Face Swap, etc.)
- Coin balance and costs can be retrieved via `GET /api/v1/coin-costs` and `GET /api/v1/auth/me`
- Available coin top-up packages can be fetched via `GET /api/v1/packages` and purchased via `POST /api/v1/packages/checkout`
- Insufficient coins return `402 Payment Required` status code

## Base URLs

| Environment | URL |
|---|---|
| Local | `http://localhost:8001/api` |
| Production | `https://ai.htut.com/api` |
EOD,
    ],

    'ui' => [
        'title' => 'HTUT AI — API Docs',
    ],

    'renderer' => 'elements',

    'renderers' => [
        'elements' => [
            'view' => 'scramble::docs',
            'theme' => 'light',
            'hideTryIt' => false,
            'hideSchemas' => false,
            'logo' => '',
            'tryItCredentialsPolicy' => 'include',
            'layout' => 'responsive',
            'router' => 'hash',
        ],
        'scalar' => [
            'view' => 'scramble::scalar',
            'cdn' => 'https://cdn.jsdelivr.net/npm/@scalar/api-reference',
            'theme' => 'laravel',
            'proxyUrl' => 'https://proxy.scalar.com',
            'darkMode' => false,
            'showDeveloperTools' => 'never',
            'agent' => ['disabled' => true],
            'credentials' => 'include',
        ],
    ],

    /*
     * Server URLs for the API docs.
     */
    'servers' => [
        'Local' => env('APP_URL', 'http://localhost:8001') . '/api',
        'Production' => 'https://ai.htut.com/api',
    ],

    'enum_cases_description_strategy' => 'description',

    'enum_cases_names_strategy' => false,

    'flatten_deep_query_parameters' => true,

    'middleware' => [
        'web',
        RestrictedDocsAccess::class,
    ],

    'extensions' => [],

    /*
     * Auto-document Bearer token security for routes with auth middleware.
     * Mobile devs see the "Authorize" button in the docs UI.
     */
    'security_strategy' => [
        MiddlewareAuthSecurityStrategy::class,
        [
            'middleware' => ['auth', 'auth:sanctum'],
            // scheme omitted — the strategy defaults to SecurityScheme::http('bearer').
            // Keep this config serializable: an object here breaks `config:cache`.
        ],
    ],
];
