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
        if (! Schema::hasTable('generation_types') || ! Schema::hasTable('ai_models')) {
            return;
        }

        $genType = GenerationType::firstOrCreate(
            ['slug' => 'chat'],
            [
                'name' => 'AI Chat',
                'description' => 'Conversational AI and reasoning models for general, healthcare, and education chat.',
                'sort_order' => 7,
            ]
        );

        $models = [
            [
                'generation_type_id' => $genType->id,
                'provider_name' => 'segmind',
                'model_name' => 'deepseek-chat',
                'name' => 'DeepSeek Chat (V3)',
                'coin_cost' => 5,
                'resolution_costs' => null,
                'duration_costs' => null,
                'is_active' => true,
                'is_default' => true,
                'docs_link' => 'https://www.segmind.com/models/deepseek-chat',
                'sort_order' => 1,
                'description' => 'DeepSeek V3 671B MoE model — default model for General AI Chat.',
            ],
            [
                'generation_type_id' => $genType->id,
                'provider_name' => 'segmind',
                'model_name' => 'deepseek-reasoner',
                'name' => 'DeepSeek Reasoner (R1)',
                'coin_cost' => 5,
                'resolution_costs' => null,
                'duration_costs' => null,
                'is_active' => true,
                'is_default' => false,
                'docs_link' => 'https://www.segmind.com/models/deepseek-reasoner',
                'sort_order' => 2,
                'description' => 'DeepSeek R1 671B reasoning model — default model for Healthcare and Education AI Chat.',
            ],
            [
                'generation_type_id' => $genType->id,
                'provider_name' => 'segmind',
                'model_name' => 'qwen-flash',
                'name' => 'Qwen Flash',
                'coin_cost' => 5,
                'resolution_costs' => null,
                'duration_costs' => null,
                'is_active' => true,
                'is_default' => false,
                'docs_link' => 'https://www.segmind.com/models/qwen-flash',
                'sort_order' => 3,
                'description' => 'Ultra-fast conversational LLM for general text inquiries.',
            ],
            [
                'generation_type_id' => $genType->id,
                'provider_name' => 'segmind',
                'model_name' => 'qwen3-vl-flash',
                'name' => 'Qwen3 VL Flash (Vision)',
                'coin_cost' => 5,
                'resolution_costs' => null,
                'duration_costs' => null,
                'is_active' => true,
                'is_default' => false,
                'docs_link' => 'https://www.segmind.com/models/qwen3-vl-flash',
                'sort_order' => 4,
                'description' => 'Multimodal vision-language chat model for image + text inquiries.',
            ],
        ];

        foreach ($models as $item) {
            AIModel::updateOrCreate(
                [
                    'provider_name' => $item['provider_name'],
                    'model_name' => $item['model_name'],
                ],
                $item
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

        AIModel::query()->whereIn('model_name', [
            'deepseek-chat',
            'deepseek-reasoner',
            'qwen-flash',
            'qwen3-vl-flash',
        ])->delete();
    }
};
