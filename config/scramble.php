<?php

use Dedoc\Scramble\Http\Middleware\RestrictedDocsAccess;
use Dedoc\Scramble\SecurityDocumentation\MiddlewareAuthSecurityStrategy;
use Dedoc\Scramble\Support\Generator\SecurityScheme;

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
# HTUT AI — Mobile API

AI-powered image generation, face swap, and video face swap API.

## Authentication

All `/ai/*` endpoints require a **Bearer token** obtained from the login or register endpoint.

Include the token in the `Authorization` header:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

## Coin System

- New customers start with **100 free coins**
- Each operation costs coins (see endpoint descriptions)
- Insufficient coins return `402` status code

## Endpoints

| Endpoint | Cost | Description |
|---|---|---|
| `POST /auth/register` | Free | Register (get 100 coins) |
| `POST /auth/login` | Free | Login (get token) |
| `GET /auth/me` | Free | Get profile |
| `POST /auth/logout` | Free | Revoke token |
| `POST /ai/face-swap` | Template cost | Swap face onto image |
| `POST /ai/video-face-swap` | Template cost | Swap face in video (queued) |
| `POST /ai/images` | 5 coins | Generate image from text |
| `GET /ai/generations/{id}` | Free | Poll generation status |

## Base URLs

| Environment | URL |
|---|---|
| Local | `http://localhost:8000` |
| Production | `https://api-ai.htut.com` |
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
     * Mobile devs will see both Local and Production servers.
     */
    'servers' => [
        'Local' => 'http://localhost:8000/api',
        'Production' => 'https://api-ai.htut.com/api',
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
            'scheme' => SecurityScheme::http('bearer'),
        ],
    ],
];
