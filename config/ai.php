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

    /*
    |--------------------------------------------------------------------------
    | Coin Costs
    |--------------------------------------------------------------------------
    |
    | Default coin costs per operation. Admin can override per-template.
    |
    */

    'coin_costs' => [
        'image_generation' => (int) env('AI_IMAGE_GENERATION_COST', 5),
        'face_swap' => (int) env('AI_FACE_SWAP_COST', 5),
        'video_face_swap' => (int) env('AI_VIDEO_FACE_SWAP_COST', 20),
        'image_to_video_480p' => (int) env('AI_IMAGE_TO_VIDEO_480P_COST', 10),
        'image_to_video_720p' => (int) env('AI_IMAGE_TO_VIDEO_720P_COST', 20),
    ],

    'providers' => [

        'segmind' => [
            'api_key' => env('SEGMIND_API_KEY'),
            'storage_disk' => env('AI_STORAGE_DISK', 'spaces'),
        ],

    ],

];
