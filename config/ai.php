<?php

return [

    /*
    |--------------------------------------------------------------------------
    | AI Providers
    |--------------------------------------------------------------------------
    |
    | Provider API keys are environment variables — never stored in the
    | database. Non-secret settings (base URL, operation endpoints) live
    | in the ai_providers table's config column.
    |
    */

    'providers' => [

        'segmind' => [
            'api_key' => env('SEGMIND_API_KEY'),
            'storage_disk' => env('AI_STORAGE_DISK', 'spaces'),
        ],

    ],

];
