<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('ai_models', function (Blueprint $table) {
            $table->foreignId('generation_type_id')->nullable()->after('id')->constrained('generation_types')->nullOnDelete();
            $table->string('name')->nullable()->after('model_name');
            $table->unsignedInteger('coin_cost')->default(10)->after('name');
            $table->json('resolution_costs')->nullable()->after('coin_cost');
            $table->json('duration_costs')->nullable()->after('resolution_costs');
            $table->boolean('is_active')->default(true)->after('duration_costs');
            $table->boolean('is_default')->default(false)->after('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ai_models', function (Blueprint $table) {
            $table->dropForeign(['generation_type_id']);
            $table->dropColumn([
                'generation_type_id',
                'name',
                'coin_cost',
                'resolution_costs',
                'duration_costs',
                'is_active',
                'is_default',
            ]);
        });
    }
};
