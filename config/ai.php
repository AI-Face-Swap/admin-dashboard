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
    | Point Costs
    |--------------------------------------------------------------------------
    |
    | Default point costs per operation. Admin can override per-template.
    |
    */

    'point_costs' => [
        'image_generation' => (int) env('AI_IMAGE_GENERATION_COST', 5),
        'face_swap' => (int) env('AI_FACE_SWAP_COST', 5),
        'video_face_swap' => (int) env('AI_VIDEO_FACE_SWAP_COST', 20),
        'image_to_video_480p' => (int) env('AI_IMAGE_TO_VIDEO_480P_COST', 10),
        'image_to_video_720p' => (int) env('AI_IMAGE_TO_VIDEO_720P_COST', 20),
        'image_edit' => (int) env('AI_IMAGE_EDIT_COST', 10),
        'chat' => (int) env('AI_CHAT_COST', 5),
        'astrology_short' => (int) env('AI_ASTROLOGY_SHORT_COST', 3),
        'astrology_normal' => (int) env('AI_ASTROLOGY_NORMAL_COST', 5),
        'astrology_long' => (int) env('AI_ASTROLOGY_LONG_COST', 10),
    ],

    // Backward-compatible alias
    'coin_costs' => [
        'image_generation' => (int) env('AI_IMAGE_GENERATION_COST', 5),
        'face_swap' => (int) env('AI_FACE_SWAP_COST', 5),
        'video_face_swap' => (int) env('AI_VIDEO_FACE_SWAP_COST', 20),
        'image_to_video_480p' => (int) env('AI_IMAGE_TO_VIDEO_480P_COST', 10),
        'image_to_video_720p' => (int) env('AI_IMAGE_TO_VIDEO_720P_COST', 20),
        'image_edit' => (int) env('AI_IMAGE_EDIT_COST', 10),
        'chat' => (int) env('AI_CHAT_COST', 5),
        'astrology_short' => (int) env('AI_ASTROLOGY_SHORT_COST', 3),
        'astrology_normal' => (int) env('AI_ASTROLOGY_NORMAL_COST', 5),
        'astrology_long' => (int) env('AI_ASTROLOGY_LONG_COST', 10),
    ],

    'chat_model' => env('AI_CHAT_MODEL', 'deepseek-chat'),

    'providers' => [

        'segmind' => [
            'api_key' => env('SEGMIND_API_KEY'),
            'storage_disk' => env('AI_STORAGE_DISK', 'spaces'),
            'poll_timeout_seconds' => (int) env('SEGMIND_POLL_TIMEOUT_SECONDS', 5400),
        ],

        'opencode_go' => [
            'base_url' => env('RAG_CHAT_URL', 'https://opencode.ai/inference/go/openai/v1'),
            'api_key' => env('RAG_CHAT_API_KEY'),
            'model' => env('RAG_CHAT_MODEL', 'deepseek-v4.1-flash'),
            'session_header' => env('RAG_CHAT_SESSION_HEADER', 'x-opencode-session'),
        ],

    ],

];
