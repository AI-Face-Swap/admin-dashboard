<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            if (! Schema::hasColumn('customers', 'fcm_token')) {
                $table->string('fcm_token', 500)->nullable()->index()->after('avatar');
            }
        });

        Schema::create('push_notifications', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('body');
            $table->string('target_type', 20)->default('all')->index(); // all | single
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('image_url', 500)->nullable();
            $table->json('data')->nullable();
            $table->timestamp('scheduled_at')->nullable()->index();
            $table->string('status', 20)->default('draft')->index(); // draft | scheduled | sending | sent | failed
            $table->unsignedInteger('sent_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->timestamp('sent_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('customer_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('push_notification_id')->nullable()->constrained('push_notifications')->nullOnDelete();
            $table->string('type', 40)->default('broadcast')->index(); // broadcast | single | scheduled | generation_success | generation_failed
            $table->string('title');
            $table->text('body');
            $table->string('image_url', 500)->nullable();
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_notifications');
        Schema::dropIfExists('push_notifications');

        Schema::table('customers', function (Blueprint $table) {
            if (Schema::hasColumn('customers', 'fcm_token')) {
                $table->dropColumn('fcm_token');
            }
        });
    }
};
