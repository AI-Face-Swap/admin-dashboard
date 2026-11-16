<?php

namespace Database\Seeders;

use App\Actions\CalendarAction;
use App\Models\CustomerInfo;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CalendarSeeder extends Seeder
{
    public function run(): void
    {
        $sqlPath = __DIR__.'/nl_cal.sql';

        if (file_exists($sqlPath)) {
            Schema::disableForeignKeyConstraints();
            DB::table('calendar_details')->truncate();
            DB::table('calendars')->truncate();
            Schema::enableForeignKeyConstraints();

            DB::unprepared(file_get_contents($sqlPath));
        }

        // Recalculate any existing customer_infos records with the correct Myanmar calendar data
        $action = app(CalendarAction::class);
        foreach (CustomerInfo::all() as $ci) {
            if ($ci->birthday) {
                $dob = $ci->birthday->format('Y-m-d');
                $cal = $action->handle($dob, $dob);
                $calInfo = json_decode(json_encode($cal))->info[0] ?? null;
                if ($calInfo) {
                    $ci->update([
                        'day' => $calInfo->formatted->weekday_my ?? null,
                        'zodiac' => $calInfo->detail->zodiac ?? null,
                        'mahabote' => $calInfo->detail->mahabote ?? null,
                        'nakhat' => $calInfo->detail->nakhat ?? null,
                        'myanmar_birthday' => $calInfo->formatted->year_my.', '.$calInfo->formatted->month_my.' '.$calInfo->formatted->day_my.' '.$calInfo->formatted->date_my,
                    ]);
                }
            }
        }
    }
}
