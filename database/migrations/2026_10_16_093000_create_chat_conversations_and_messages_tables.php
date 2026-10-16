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
        Schema::create('chat_conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('title_en')->default('New Conversation with HTUT AI');
            $table->string('title_my')->default('HTUT AI နှင့် စကားဝိုင်းအသစ်');
            $table->string('category', 50)->default('general');
            $table->timestamps();

            $table->index(['customer_id', 'updated_at']);
        });

        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('chat_conversations')->cascadeOnDelete();
            $table->string('role', 20); // 'user' | 'assistant'
            $table->text('content');
            $table->string('category', 50)->default('general');
            $table->json('structured')->nullable();
            $table->integer('tokens_used')->nullable();
            $table->string('cost', 50)->nullable();
            $table->timestamps();

            $table->index(['conversation_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_conversations');
    }
};
