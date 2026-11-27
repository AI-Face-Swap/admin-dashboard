<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        if (Schema::hasTable('ai_providers')) {
            $exists = DB::table('ai_providers')->where('slug', 'opencode-go')->exists();
            if (! $exists) {
                DB::table('ai_providers')->insert([
                    'name' => 'OpenCode Go',
                    'slug' => 'opencode-go',
                    'is_active' => true,
                    'config' => json_encode([
                        'base_url' => 'https://opencode.ai/inference/go/openai/v1',
                        'operations' => [
                            'astrology-chat' => 'deepseek-v4.1-flash',
                        ],
                    ]),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        if (Schema::hasTable('ai_models') && Schema::hasTable('generation_types')) {
            $chatTypeId = DB::table('generation_types')->where('slug', 'chat')->value('id');
            $modelExists = DB::table('ai_models')
                ->where('provider_name', 'opencode-go')
                ->where('model_name', 'deepseek-v4.1-flash')
                ->exists();

            if (! $modelExists) {
                DB::table('ai_models')->insert([
                    'generation_type_id' => $chatTypeId,
                    'provider_name' => 'opencode-go',
                    'model_name' => 'deepseek-v4.1-flash',
                    'name' => 'DeepSeek V4.1 Flash (OpenCode Go RAG)',
                    'coin_cost' => 5,
                    'is_active' => true,
                    'is_default' => false,
                    'docs_link' => 'https://opencode.ai',
                    'sort_order' => 5,
                    'description' => 'OpenCode Go DeepSeek V4.1 Flash model powered by HTUT Astrology RAG knowledge base.',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ai_models')) {
            DB::table('ai_models')
                ->where('provider_name', 'opencode-go')
                ->where('model_name', 'deepseek-v4.1-flash')
                ->delete();
        }

        if (Schema::hasTable('ai_providers')) {
            DB::table('ai_providers')->where('slug', 'opencode-go')->delete();
        }
    }
};
