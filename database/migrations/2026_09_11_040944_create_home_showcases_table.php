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
        Schema::create('home_showcases', function (Blueprint $table) {
            $table->id();
            $table->string('section_name')->nullable();
            $table->string('title');
            $table->text('description');
            $table->string('video_url')->nullable();
            $table->string('image_fallback_url')->nullable();
            $table->enum('alignment', ['left', 'right'])->default('left');
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('home_showcases');
    }
};
