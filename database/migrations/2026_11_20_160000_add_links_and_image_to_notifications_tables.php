<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('push_notifications', function (Blueprint $table) {
            if (! Schema::hasColumn('push_notifications', 'template_id')) {
                $table->foreignId('template_id')->nullable()->after('customer_id')->constrained('prompt_templates')->nullOnDelete();
            }
            if (! Schema::hasColumn('push_notifications', 'web_url')) {
                $table->string('web_url', 500)->nullable()->after('image_url');
            }
            if (! Schema::hasColumn('push_notifications', 'mobile_url')) {
                $table->string('mobile_url', 500)->nullable()->after('web_url');
            }
        });

        Schema::table('customer_notifications', function (Blueprint $table) {
            if (! Schema::hasColumn('customer_notifications', 'web_url')) {
                $table->string('web_url', 500)->nullable()->after('image_url');
            }
            if (! Schema::hasColumn('customer_notifications', 'mobile_url')) {
                $table->string('mobile_url', 500)->nullable()->after('web_url');
            }
        });
    }

    public function down(): void
    {
        Schema::table('customer_notifications', function (Blueprint $table) {
            $cols = array_filter(['web_url', 'mobile_url'], fn ($c) => Schema::hasColumn('customer_notifications', $c));
            if ($cols !== []) {
                $table->dropColumn($cols);
            }
        });

        Schema::table('push_notifications', function (Blueprint $table) {
            if (Schema::hasColumn('push_notifications', 'template_id')) {
                $table->dropConstrainedForeignId('template_id');
            }
            $cols = array_filter(['web_url', 'mobile_url'], fn ($c) => Schema::hasColumn('push_notifications', $c));
            if ($cols !== []) {
                $table->dropColumn($cols);
            }
        });
    }
};
