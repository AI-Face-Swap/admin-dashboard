<?php

namespace Database\Seeders;

use App\Models\Calendar;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class CalendarSeeder extends Seeder
{
    public function run(): void
    {
        $startYear = 1900;
        $endYear = 2026;

        $myanmarMonths = [
            1 => 'Tagu', 2 => 'Kason', 3 => 'Nayon', 4 => 'Waso',
            5 => 'Wagaung', 6 => 'Tawthalin', 7 => 'Thadingyut',
            8 => 'Tazaungmon', 9 => 'Nadaw', 10 => 'Pyatho',
            11 => 'Tabodwe', 12 => 'Tabaung',
        ];

        $myanmarMonthsMy = [
            1 => 'တန်ခူး', 2 => 'ကဆုန်', 3 => 'နယုန်', 4 => 'ဝါဆို',
            5 => 'ဝါခေါင်', 6 => 'တော်သလင်း', 7 => 'သီတင်းကျွတ်',
            8 => 'တန်ဆောင်းမုန်း', 9 => 'နတ်တော်', 10 => 'ပြာသို',
            11 => 'တပို့တွဲ', 12 => 'တပေါင်း',
        ];

        $weekdaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        $weekdaysMy = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'];

        for ($year = $startYear; $year <= $endYear; $year++) {
            $firstDateOfTagu = Carbon::create($year, 4, 13);
            $firstDateOfWaso = Carbon::create($year, 7, 1);
            $newYearDay = Carbon::create($year, 4, 17);

            for ($month = 1; $month <= 12; $month++) {
                $daysInMonth = Carbon::create($year, $month, 1)->daysInMonth;

                for ($day = 1; $day <= $daysInMonth; $day++) {
                    $date = Carbon::create($year, $month, $day);

                    Calendar::firstOrCreate(
                        ['per_date' => $date->toDateString()],
                        [
                            'buddhist_year_my' => $this->convertToMyanmarNumber($date->year + 543),
                            'buddhist_year_en' => $date->year + 543,
                            'my_cal_year_my' => $this->convertToMyanmarNumber($year - 639),
                            'my_cal_year_en' => $year - 639,
                            'my_cal_month_my' => $myanmarMonthsMy[$month],
                            'my_cal_month_en' => $myanmarMonths[$month],
                            'my_cal_day_my' => $this->convertToMyanmarNumber($day),
                            'my_cal_day_en' => $day,
                            'my_cal_type_of_day_my' => ($day <= 15) ? 'လဆန်း' : 'လဆုတ်',
                            'my_cal_type_of_day_en' => ($day <= 15) ? 'Waxing' : 'Waning',
                            'my_cal_weekday_my' => $weekdaysMy[$date->dayOfWeek],
                            'my_cal_weekday_en' => $weekdaysEn[$date->dayOfWeek],
                            'first_date_of_tagu' => $firstDateOfTagu,
                            'first_date_of_waso' => $firstDateOfWaso,
                            'is_watat' => rand(0, 1),
                            'is_big_watat' => rand(0, 1),
                            'akyo_day' => $date->copy()->addDays(1),
                            'akya_day' => $date->copy()->addDays(1),
                            'first_akyat_day' => $date->copy()->addDays(1),
                            'second_akyat_day' => $date->copy()->addDays(2),
                            'atat_day' => $date->copy()->addDays(1),
                            'new_year_day' => $newYearDay,
                            'akya_time' => now(),
                            'atat_time' => now(),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]
                    );
                }
            }
        }
    }

    private function convertToMyanmarNumber(int|string $number): string
    {
        $myanmarDigits = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];

        return implode('', array_map(fn ($d) => $myanmarDigits[$d] ?? $d, str_split((string) $number)));
    }
}
