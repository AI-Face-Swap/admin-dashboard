<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('push_notifications', function (Blueprint $table) {
            $table->foreignId('template_id')->nullable()->after('customer_id')->constrained('prompt_templates')->nullOnDelete();
            $table->string('web_url', 500)->nullable()->after('image_url');
            $table->string('mobile_url', 500)->nullable()->after('web_url');
        });

        Schema::table('customer_notifications', function (Blueprint $table) {
            $table->string('web_url', 500)->nullable()->after('image_url');
            $table->string('mobile_url', 500)->nullable()->after('web_url');
        });
    }

    public function down(): void
    {
        Schema::table('customer_notifications', function (Blueprint $table) {
            $table->dropColumn(['web_url', 'mobile_url']);
        });

        Schema::table('push_notifications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('template_id');
            $table->dropColumn(['web_url', 'mobile_url']);
        });
    }
};
