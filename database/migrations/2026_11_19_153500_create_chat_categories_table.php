<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_categories', function (Blueprint $table) {
            $table->id();
            $table->string('key', 50)->unique();
            $table->string('label_en', 100);
            $table->string('label_my', 100);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $now = now();
        DB::table('chat_categories')->insert([
            [
                'key' => 'astrology',
                'label_en' => 'Astrology',
                'label_my' => 'ဗေဒင်',
                'sort_order' => 1,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'education',
                'label_en' => 'Education',
                'label_my' => 'ပညာရေး',
                'sort_order' => 2,
                'is_active' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'health',
                'label_en' => 'Health',
                'label_my' => 'ကျန်းမာရေး',
                'sort_order' => 3,
                'is_active' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'general',
                'label_en' => 'General',
                'label_my' => 'အထွေထွေ',
                'sort_order' => 4,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_categories');
    }
};
