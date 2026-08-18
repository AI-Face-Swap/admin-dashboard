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
        AIProvider::firstOrCreate(
            ['slug' => 'segmind'],
            [
                'name' => 'Segmind',
                'config' => [
                    'base_url' => 'https://api.segmind.com/v2',
                    'operations' => [
                        'face-swap' => 'faceswap-v5',
                    ],
                ],
            ],
        );
    }
}
