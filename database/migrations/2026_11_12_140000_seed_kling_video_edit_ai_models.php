<?php

use App\Models\AIModel;
use App\Models\GenerationType;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('ai_models') || ! Schema::hasTable('generation_types')) {
            return;
        }

        $genType = GenerationType::firstOrCreate(
            ['slug' => 'image-to-video'],
            ['name' => 'Image to Video', 'sort_order' => 3]
        );

        $models = [
            [
                'provider_name' => 'segmind',
                'model_name' => 'kling-o3-video2video-edit',
                'name' => 'Kling O3 Video-to-Video Edit',
                'coin_cost' => 45,
                'resolution_costs' => ['720p' => 45, '1080p' => 65],
                'duration_costs' => ['5s' => 45, '10s' => 85, '15s' => 125],
                'is_active' => true,
                'is_default' => false,
                'docs_link' => 'https://www.segmind.com/models/kling-o3-video2video-edit',
                'sort_order' => 13,
                'description' => 'Kling O3 Video-to-Video Edit — direct character replacement (@Element1/@Element2) and scene editing on 3–15s videos while preserving original motion, interactions, and audio.',
            ],
            [
                'provider_name' => 'segmind',
                'model_name' => 'kling-4-video-edit',
                'name' => 'Kling 4.0 Video Edit',
                'coin_cost' => 50,
                'resolution_costs' => ['720p' => 50, '1080p' => 75],
                'duration_costs' => ['5s' => 50, '10s' => 95, '15s' => 140],
                'is_active' => true,
                'is_default' => false,
                'docs_link' => 'https://www.segmind.com/models/kling-4-video-edit',
                'sort_order' => 14,
                'description' => 'Kling 4.0 Video Edit — flagship in-place video editor supporting multi-character/object swaps (@Image1/@Image2) across 3–30s clips at 720p/1080p.',
            ],
        ];

        $hasDocsLink = Schema::hasColumn('ai_models', 'docs_link');

        foreach ($models as $item) {
            $payload = [
                'generation_type_id' => $genType->id,
                'name' => $item['name'],
                'coin_cost' => $item['coin_cost'],
                'resolution_costs' => $item['resolution_costs'],
                'duration_costs' => $item['duration_costs'],
                'is_active' => $item['is_active'],
                'is_default' => $item['is_default'],
                'sort_order' => $item['sort_order'],
                'description' => $item['description'],
            ];

            if ($hasDocsLink) {
                $payload['docs_link'] = $item['docs_link'];
            }

            AIModel::updateOrCreate(
                [
                    'provider_name' => $item['provider_name'],
                    'model_name' => $item['model_name'],
                ],
                $payload,
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('ai_models')) {
            return;
        }

        AIModel::whereIn('model_name', [
            'kling-o3-video2video-edit',
            'kling-4-video-edit',
        ])->delete();
    }
};
