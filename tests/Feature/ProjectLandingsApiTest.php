<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ProjectLandingsApiTest extends TestCase
{
    use RefreshDatabase;
    public function test_it_fetches_and_caches_project_landings_from_central_auth(): void
    {
        Cache::flush();

        Http::fake([
            '*/api/v1/s2s/project-landings*' => Http::response([
                'status' => 'success',
                'total' => 2,
                'project_landings' => [
                    [
                        'id' => 1,
                        'project_id' => 'vvip9',
                        'project_slug' => 'vvip9',
                        'project_name' => 'VVIP9 Smart Card',
                        'logo_url' => 'https://sso.htut.com/logo-vvip9.png',
                        'banner_url' => 'https://sso.htut.com/banner-vvip9.jpg',
                        'title' => 'VVIP9 Digital Business Card',
                        'description' => 'Next-generation NFC digital business card.',
                        'website_url' => 'https://vvip9.co',
                        'play_store_url' => 'https://play.google.com/store/apps/details?id=co.vvip9',
                        'app_store_url' => 'https://apps.apple.com/app/vvip9',
                        'direct_link' => null,
                        'benefit' => ['Instant NFC Sharing', 'Custom Profile Themes'],
                        'ordering' => 1,
                    ],
                    [
                        'id' => 2,
                        'project_id' => 'htut_ai',
                        'project_slug' => 'htut_ai',
                        'project_name' => 'HTUT AI',
                        'logo_url' => 'https://ai.htut.com/Logo.png',
                        'banner_url' => 'https://ai.htut.com/ecosystem-bg.jpg',
                        'title' => 'HTUT AI Creative Studio',
                        'description' => 'AI chat, image generation, and face swap platform.',
                        'website_url' => 'https://ai.htut.com/home',
                        'play_store_url' => null,
                        'app_store_url' => null,
                        'direct_link' => null,
                        'benefit' => ['AI Chat Assistant', 'Face Swap & Video AI'],
                        'ordering' => 2,
                    ],
                ],
            ], 200),
        ]);

        $response = $this->getJson('/api/v1/project-landings');

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('total', 2)
            ->assertJsonPath('data.0.project_id', 'vvip9')
            ->assertJsonPath('data.1.project_id', 'htut_ai');
    }

    public function test_it_fetches_single_project_landing_detail(): void
    {
        Cache::flush();

        Http::fake([
            '*/api/v1/s2s/project-landings/vvip9' => Http::response([
                'status' => 'success',
                'project_landing' => [
                    'id' => 1,
                    'project_id' => 'vvip9',
                    'project_slug' => 'vvip9',
                    'project_name' => 'VVIP9 Smart Card',
                    'title' => 'VVIP9 Digital Business Card',
                    'description' => 'Next-generation NFC digital business card.',
                    'benefit' => ['Instant NFC Sharing'],
                    'ordering' => 1,
                ],
            ], 200),
        ]);

        $response = $this->getJson('/api/v1/project-landings/vvip9');

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.project_id', 'vvip9')
            ->assertJsonPath('data.title', 'VVIP9 Digital Business Card');
    }
}
