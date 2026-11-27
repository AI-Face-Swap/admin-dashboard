<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('settings')) {
            return;
        }

        $now = now();
        $updates = [
            'point_cost_astrology_short' => '10',
            'point_cost_astrology_normal' => '50',
            'point_cost_astrology_long' => '100',
        ];

        foreach ($updates as $key => $value) {
            DB::table('settings')->updateOrInsert(
                ['group' => 'ai', 'key' => $key],
                ['value' => $value, 'updated_at' => $now, 'created_at' => $now]
            );
        }
    }

    public function down(): void
    {
        // Keep configured settings intact on rollback
    }
};
