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
        Schema::table('customers', function (Blueprint $table) {
            if (! Schema::hasColumn('customers', 'central_auth_uuid')) {
                $table->uuid('central_auth_uuid')->nullable()->unique()->after('id');
            }
            if (! Schema::hasColumn('customers', 'phone')) {
                $table->string('phone')->nullable()->unique()->after('email');
            }
            if (! Schema::hasColumn('customers', 'expired_at')) {
                $table->timestamp('expired_at')->nullable()->after('customer_type');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            if (Schema::hasColumn('customers', 'central_auth_uuid')) {
                $table->dropUnique(['central_auth_uuid']);
                $table->dropColumn('central_auth_uuid');
            }
            if (Schema::hasColumn('customers', 'phone')) {
                $table->dropUnique(['phone']);
                $table->dropColumn('phone');
            }
            if (Schema::hasColumn('customers', 'expired_at')) {
                $table->dropColumn('expired_at');
            }
        });
    }
};
