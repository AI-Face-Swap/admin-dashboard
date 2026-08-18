<?php

namespace Database\Factories;

use App\Models\AIProvider;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AIProvider>
 */
class AIProviderFactory extends Factory
{
    protected $model = AIProvider::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Segmind',
            'slug' => 'segmind',
            'is_active' => true,
            'config' => [
                'base_url' => 'https://api.segmind.com/v2',
                'operations' => [
                    'face-swap' => 'faceswap-v5',
                ],
            ],
        ];
    }
}
