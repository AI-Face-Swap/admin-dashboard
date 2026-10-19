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
        Schema::table('ai_generations', function (Blueprint $table) {
            $table->string('submission_state', 50)->nullable()->after('status');
            $table->timestamp('submitted_at')->nullable()->after('submission_state');
            $table->boolean('reconciliation_attempted')->default(false)->after('submitted_at');
            $table->unsignedInteger('points_refunded')->default(0)->after('coins_spent');
            $table->timestamp('refunded_at')->nullable()->after('points_refunded');

            $table->index('submission_state');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ai_generations', function (Blueprint $table) {
            $table->dropIndex(['submission_state']);
            $table->dropColumn([
                'submission_state',
                'submitted_at',
                'reconciliation_attempted',
                'points_refunded',
                'refunded_at',
            ]);
        });
    }
};
