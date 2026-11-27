<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_chat_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('category', 32)->default('astrology')->index();
            $table->string('title', 255);
            $table->string('client_name', 120)->nullable();
            $table->string('client_gender', 16)->nullable();
            $table->date('client_birthday')->nullable();
            $table->json('client_astrology')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'updated_at']);
        });

        Schema::create('admin_chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')
                ->constrained('admin_chat_conversations')
                ->cascadeOnDelete();
            $table->string('role', 16); // user | assistant
            $table->longText('content');
            $table->json('structured')->nullable();
            $table->json('rag_sources')->nullable();
            $table->string('model', 80)->nullable();
            $table->string('response_type', 16)->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_chat_messages');
        Schema::dropIfExists('admin_chat_conversations');
    }
};
