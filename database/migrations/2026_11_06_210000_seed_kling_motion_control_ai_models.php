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
                'model_name' => 'kling-2.6-standard-motion-control',
                'name' => 'Kling 2.6 Standard Motion Control',
                'coin_cost' => 20,
                'resolution_costs' => ['720p' => 20],
                'duration_costs' => ['5s' => 20, '10s' => 35],
                'is_active' => true,
                'is_default' => false,
                'docs_link' => 'https://www.segmind.com/models/kling-2.6-standard-motion-control',
                'sort_order' => 9,
                'description' => 'Kling 2.6 Standard Motion Control — transfers full-body dance and movement from a reference video onto a character image while preserving original audio (720p).',
            ],
            [
                'provider_name' => 'segmind',
                'model_name' => 'kling-2.6-pro-motion-control',
                'name' => 'Kling 2.6 Pro Motion Control',
                'coin_cost' => 30,
                'resolution_costs' => ['1080p' => 30],
                'duration_costs' => ['5s' => 30, '10s' => 55],
                'is_active' => true,
                'is_default' => false,
                'docs_link' => 'https://www.segmind.com/models/kling-2.6-pro-motion-control',
                'sort_order' => 10,
                'description' => 'Kling 2.6 Pro Motion Control — high-definition 1080p motion transfer from a reference video onto a character image with original sound preservation.',
            ],
            [
                'provider_name' => 'segmind',
                'model_name' => 'kling-3-motion-control-standard',
                'name' => 'Kling 3.0 Standard Motion Control',
                'coin_cost' => 30,
                'resolution_costs' => ['720p' => 30],
                'duration_costs' => ['5s' => 30, '10s' => 55],
                'is_active' => true,
                'is_default' => false,
                'docs_link' => 'https://www.segmind.com/models/kling-3-motion-control-standard',
                'sort_order' => 11,
                'description' => 'Kling 3.0 Standard Motion Control (720p) — next-gen character motion transfer from a 3–30s driving video with original audio track preservation.',
            ],
            [
                'provider_name' => 'segmind',
                'model_name' => 'kling-3-motion-control-pro',
                'name' => 'Kling 3.0 Pro Motion Control',
                'coin_cost' => 40,
                'resolution_costs' => ['1080p' => 40],
                'duration_costs' => ['5s' => 40, '10s' => 75],
                'is_active' => true,
                'is_default' => false,
                'docs_link' => 'https://www.segmind.com/models/kling-3-motion-control-pro',
                'sort_order' => 12,
                'description' => 'Kling 3.0 Pro Motion Control (1080p) — flagship 1080p character motion transfer from a 3–30s reference video with original audio track preservation.',
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
            'kling-2.6-standard-motion-control',
            'kling-2.6-pro-motion-control',
            'kling-3-motion-control-standard',
            'kling-3-motion-control-pro',
        ])->delete();
    }
};
