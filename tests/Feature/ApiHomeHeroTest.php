<?php

namespace Tests\Feature;

use App\Models\HomeHero;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiHomeHeroTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_home_heroes_endpoint_returns_active_heroes(): void
    {
        HomeHero::factory()->create([
            'title' => 'First Hero',
            'description' => 'First Description',
            'video' => 'https://example.com/video1.mp4',
            'images' => ['https://example.com/img1.png', 'https://example.com/img2.png'],
            'sort_order' => 2,
            'is_active' => true,
        ]);

        HomeHero::factory()->create([
            'title' => 'Top Hero',
            'description' => 'Top Description',
            'video' => 'https://example.com/video0.mp4',
            'images' => ['https://example.com/top.png'],
            'sort_order' => 1,
            'is_active' => true,
        ]);

        HomeHero::factory()->create([
            'title' => 'Inactive Hero',
            'is_active' => false,
            'sort_order' => 0,
        ]);

        $response = $this->getJson('/api/v1/home-heroes');

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.title', 'Top Hero')
            ->assertJsonPath('data.1.title', 'First Hero')
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'title',
                        'description',
                        'video',
                        'images',
                        'sort_order',
                        'is_active',
                        'created_at',
                        'updated_at',
                    ],
                ],
            ]);
    }
}
