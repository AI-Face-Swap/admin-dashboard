<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'frontend' => [
        'url' => env('FRONTEND_URL', env('APP_URL')),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    'apple' => [
        'client_id' => env('APPLE_CLIENT_ID'),
        'client_ids' => array_filter(array_map('trim', explode(',', (string) env('APPLE_CLIENT_IDS', env('APPLE_CLIENT_ID', ''))))),
        'redirect' => env('APPLE_REDIRECT_URI'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'htut_central_auth' => [
        'url' => env('HTUT_CENTRAL_AUTH_URL', 'http://localhost:8000'),
        'project_id' => env('HTUT_CENTRAL_AUTH_PROJECT_ID', 'htut_ai'),
        'project_secret' => env('HTUT_CENTRAL_AUTH_PROJECT_SECRET', 'sec_htut_ai_dev_secret_2026'),
        'api_key' => env('HTUT_CENTRAL_AUTH_API_KEY', 's2s_htut_ai_live_key_2026'),
        'redirect_uri' => env('HTUT_CENTRAL_AUTH_REDIRECT_URI', 'http://localhost:8001/v1/auth/htut/callback'),
    ],

    'walmae' => [
        'url' => env('WALMAE_URL', 'https://cp.walmae.net'),
        'token' => env('WALMAE_TOKEN', ''),
    ],

];
