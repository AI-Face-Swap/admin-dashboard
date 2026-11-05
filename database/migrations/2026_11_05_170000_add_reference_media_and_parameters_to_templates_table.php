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
            $table->string('reference_video_path')->nullable()->after('thumbnail_path');
            $table->json('reference_images')->nullable()->after('reference_video_path');
            $table->string('reference_audio_path')->nullable()->after('reference_images');
            $table->json('parameters')->nullable()->after('seed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            $table->dropColumn([
                'reference_video_path',
                'reference_images',
                'reference_audio_path',
                'parameters',
            ]);
        });
    }
};
