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
        Schema::table('templates', function (Blueprint $table) {
            $table->integer('sort_order')->default(1)->after('id');
            $table->text('prompt')->nullable()->after('model');
            $table->text('negative_prompt')->nullable()->after('prompt');
            $table->string('aspect_ratio')->nullable()->after('negative_prompt');
            $table->string('resolution')->nullable()->after('aspect_ratio');
            $table->string('seed')->nullable()->after('resolution');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            $table->dropColumn([
                'sort_order',
                'prompt',
                'negative_prompt',
                'aspect_ratio',
                'resolution',
                'seed',
            ]);
        });
    }
};
