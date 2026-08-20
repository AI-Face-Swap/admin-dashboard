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
        Schema::create('ai_generations', function (Blueprint $table) {
            $table->id();
            // One of the two is set: an admin (dashboard) or a customer (mobile app).
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            // Source of truth for the provider (no duplicated string column).
            $table->foreignId('provider_id')->constrained('ai_providers');
            $table->foreignId('template_id')->nullable()->constrained()->nullOnDelete();
            $table->string('operation'); // image | face-swap | video-face-swap
            $table->string('status')->default('queued'); // queued | processing | completed | failed
            $table->string('request_id')->nullable();
            $table->decimal('cost', 10, 4)->nullable(); // null = provider did not report a cost
            $table->string('currency', 3)->nullable();
            $table->integer('duration_ms')->nullable();
            $table->json('input_metadata')->nullable();
            $table->json('output_metadata')->nullable();
            $table->json('raw_response')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['customer_id', 'created_at']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_generations');
    }
};
