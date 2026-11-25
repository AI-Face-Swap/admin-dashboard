<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_generations', function (Blueprint $table) {
            if (! Schema::hasColumn('ai_generations', 'thumbnail_path')) {
                $table->string('thumbnail_path', 500)->nullable()->after('output_metadata');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ai_generations', function (Blueprint $table) {
            if (Schema::hasColumn('ai_generations', 'thumbnail_path')) {
                $table->dropColumn('thumbnail_path');
            }
        });
    }
};
