<?php

namespace Database\Factories;

use App\Models\HomeHero;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HomeHero>
 */
class HomeHeroFactory extends Factory
{
    protected $model = HomeHero::class;

    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'video' => 'https://imagesbucket.sgp1.digitaloceanspaces.com/HomeHero/sample.mp4',
            'images' => [
                'https://imagesbucket.sgp1.digitaloceanspaces.com/HomeHero/sample1.webp',
                'https://imagesbucket.sgp1.digitaloceanspaces.com/HomeHero/sample2.webp',
            ],
            'sort_order' => 0,
            'is_active' => true,
        ];
    }
}
