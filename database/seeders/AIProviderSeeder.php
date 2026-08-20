<?php

namespace Database\Seeders;

use App\Models\AIProvider;
use Illuminate\Database\Seeder;

class AIProviderSeeder extends Seeder
{
    /**
     * Seed the default AI providers.
     */
    public function run(): void
    {
        AIProvider::updateOrCreate(
            ['slug' => 'segmind'],
            [
                'name' => 'Segmind',
                'config' => [
                    'base_url' => 'https://api.segmind.com/v2',
                    'operations' => [
                        'face-swap' => 'faceswap-v5',
                        'video-face-swap' => 'video-faceswap-by-facefusion-labs',
                        'image-generation' => 'seedream-v5-lite-text-to-image',
                    ],
                ],
            ],
        );
    }
}
