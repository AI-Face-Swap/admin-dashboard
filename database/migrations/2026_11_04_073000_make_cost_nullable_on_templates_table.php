<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            $table->unsignedInteger('cost')->nullable()->default(null)->change();
        });

        // Link missing ai_model_id to default face-swap / video-face-swap models
        $imageGenTypeId = DB::table('generation_types')->where('slug', 'image-faceswap')->value('id');
        $videoGenTypeId = DB::table('generation_types')->where('slug', 'video-faceswap')->value('id');

        $faceSwapModel = DB::table('ai_models')->where('model_name', 'face-swap')->first();
        $videoFaceSwapModel = DB::table('ai_models')->where('model_name', 'video-face-swap')->first();

        if ($faceSwapModel) {
            DB::table('templates')
                ->where('type', 'image')
                ->whereNull('ai_model_id')
                ->update([
                    'ai_model_id' => $faceSwapModel->id,
                    'generation_type_id' => $imageGenTypeId,
                    'model' => DB::raw(" COALESCE(model, 'face-swap') "),
                ]);
        }

        if ($videoFaceSwapModel) {
            DB::table('templates')
                ->where('type', 'video')
                ->whereNull('ai_model_id')
                ->update([
                    'ai_model_id' => $videoFaceSwapModel->id,
                    'generation_type_id' => $videoGenTypeId,
                    'model' => DB::raw(" COALESCE(model, 'video-face-swap') "),
                ]);
        }

        // Reset all existing templates' cost to NULL so they inherit from their assigned AI model
        DB::table('templates')->update(['cost' => null]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('templates')->whereNull('cost')->update(['cost' => 0]);

        Schema::table('templates', function (Blueprint $table) {
            $table->unsignedInteger('cost')->nullable(false)->default(0)->change();
        });
    }
};
