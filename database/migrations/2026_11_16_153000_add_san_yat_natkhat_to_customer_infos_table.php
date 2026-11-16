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
        if (! Schema::hasColumn('customer_infos', 'san_yat_natkhat')) {
            Schema::table('customer_infos', function (Blueprint $table) {
                $table->string('san_yat_natkhat')->nullable()->after('nakhat');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('customer_infos', 'san_yat_natkhat')) {
            Schema::table('customer_infos', function (Blueprint $table) {
                $table->dropColumn('san_yat_natkhat');
            });
        }
    }
};
