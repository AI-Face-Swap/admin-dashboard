<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            $table->unsignedTinyInteger('required_images')->default(1)->after('type');
            $table->json('example_images')->nullable()->after('reference_images');
            $table->text('guideline')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            $table->dropColumn(['required_images', 'example_images', 'guideline']);
        });
    }
};
