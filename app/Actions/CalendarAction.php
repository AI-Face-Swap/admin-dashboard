<?php

namespace App\Actions;

use App\Models\Calendar;
use App\Models\CalendarDay;
use Illuminate\Support\Carbon;

class CalendarAction
{
    public function changeNumber(string|int|null $haystack, string $lang = 'my'): string
    {
        if ($haystack === null) {
            return '';
        }
        $en = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
        $my = ['၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉', '၀'];
        if ($lang === 'my') {
            return str_replace($en, $my, (string) $haystack);
        }

        return str_replace($my, $en, (string) $haystack);
    }

    public function handle(string $start, string $end): array
    {
        $calendar = Calendar::query()->with(['specialDays'])->whereBetween('per_date', [$start, $end])->get();

        // If a requested single date does not exist in `calendars` table yet, create/synthesize it like CalendarSeeder
        if ($calendar->isEmpty() && $start === $end) {
            $created = $this->ensureCalendarRecord($start);
            if ($created) {
                $calendar = collect([$created]);
            }
        }

        $buddhist_years_collection = $this->distinctCollection(type: 'buddhist_year_en', start: $start, end: $end);
        if (count($buddhist_years_collection) > 1) {
            $buddhist_years = $this->changeNumber(haystack: $buddhist_years_collection[0]).'/'.$this->changeNumber(haystack: substr($buddhist_years_collection[1], 2, 2));
        } else {
            $buddhist_years = $this->changeNumber(haystack: $buddhist_years_collection[0] ?? '');
        }

        $myanmar_years_collection = $this->distinctCollection(type: 'my_cal_year_en', start: $start, end: $end);
        if (count($myanmar_years_collection) > 1) {
            $myanmar_years = $this->changeNumber(haystack: $myanmar_years_collection[0]).'/'.$this->changeNumber(haystack: substr($myanmar_years_collection[1], 2, 2));
        } else {
            $myanmar_years = $this->changeNumber(haystack: $myanmar_years_collection[0] ?? '');
        }

        $myanmar_months_collection = $this->distinctCollection(type: 'my_cal_month_my', start: $start, end: $end);
        if (count($myanmar_months_collection) > 1) {
            $myanmar_months = $myanmar_months_collection[0].'/'.$myanmar_months_collection[1];
        } else {
            $myanmar_months = $myanmar_months_collection[0] ?? '';
        }

        $weekdays = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        $my_months = [
            'Waso', 'Tagu', 'Kason', 'Nayon', 'Second Waso', 'Wagaung', 'Tawthalin',
            'Thadingyut', 'Tazaungmon', 'Nadaw', 'Pyatho', 'Tabodwe', 'Tabaung',
        ];

        $datum = [];
        $thingyan = [];

        foreach ($calendar as $value) {
            $raw = [
                'date' => $value->per_date->format('Y-m-d'),
                'buddha_year_my' => $buddhist_years,
                'years' => $myanmar_years,
                'year_my' => $value->my_cal_year_my,
                'months' => $myanmar_months,
                'month_my' => $value->my_cal_month_my,
                'day_en' => str_replace(' ', '', strtolower((string) $value->my_cal_type_of_day_en)),
                'day_my' => $value->my_cal_type_of_day_my,
                'date_my' => $value->my_cal_day_my,
                'weekday_my' => $value->my_cal_weekday_my,
                'weekday_en' => $value->my_cal_weekday_en,
            ];
            $formatted = [
                'buddha_year_my' => "သာသနာနှစ် $buddhist_years ခုနှစ်",
                'years' => $myanmar_years.' ခုနှစ်',
                'year_my' => $value->my_cal_year_my.' ခုနှစ်',
                'months' => $myanmar_months,
                'month_my' => $value->my_cal_month_my,
                'day_my' => $value->my_cal_type_of_day_my,
                'date_my' => $value->my_cal_day_my.' ရက်',
                'weekday_my' => $value->my_cal_weekday_my.'နေ့',
            ];

            $weekday = (int) array_search(date('D', strtotime($value->per_date)), $weekdays);
            if (str_contains((string) $value->my_cal_month_en, 'Waso')) {
                $init_my_month = $value->my_cal_month_en === 'Second Waso' ? $value->my_cal_month_en : 'Waso';
            } else {
                $init_my_month = $value->my_cal_month_en;
            }
            $my_month = (int) array_search($init_my_month, $my_months);

            $sabbath = false;
            if ($value->my_cal_type_of_day_en === 'Full Moon' || $value->my_cal_type_of_day_en === 'New Moon') {
                $sabbath = true;
            }

            $sabbath_eve = false;
            if ($value->my_cal_day_en == 13) {
                $check_15th_day_is_exist = Calendar::query()->where('id', '>', $value->id)->select('my_cal_type_of_day_en')->first();
                if ($check_15th_day_is_exist && ($check_15th_day_is_exist->my_cal_type_of_day_en === 'Full Moon' || $check_15th_day_is_exist->my_cal_type_of_day_en === 'New Moon')) {
                    $sabbath_eve = true;
                }
            }

            $dayEnInt = (int) $value->my_cal_day_en;
            $yearEnInt = (int) $value->my_cal_year_en;

            $detail = [
                'holiday' => $value->specialDay()->typeOf('holiday')->select('name')->first()?->name,
                'specials' => $value->specialDay()->typeOf('blessingday')->distinct()->pluck('name'),
                'sabbath' => $sabbath ? 'ဥပုသ်နေ့' : $this->sabbathFor8(day: $dayEnInt),
                'sabbath_eve' => $sabbath_eve ? 'အဖိတ်နေ့' : $this->sabbatheveFor8(day: $dayEnInt),
                'yatyaza' => $this->yatyarzar(month: $my_month, weekday: $weekday),
                'pyathada' => $this->pyatthadar(month: $my_month, weekday: $weekday),
                'thamanyo' => $this->thamanyo(month: $my_month, weekday: $weekday),
                'thamaphyu' => $this->thamaphyu(day: $dayEnInt, weekday: $weekday),
                'amyeittasote' => $this->amyeittasote(day: $dayEnInt, weekday: $weekday),
                'warameittugyi' => $this->warameittugyi(day: $dayEnInt, weekday: $weekday),
                'warameittunge' => $this->warameittunge(day: $dayEnInt, weekday: $weekday),
                'yatpote' => $this->yatpote(day: $dayEnInt, weekday: $weekday),
                'yatyotema' => $this->yatyotema(month: $my_month, day: $dayEnInt),
                'nagapor' => $this->nagapor(day: $dayEnInt, weekday: $weekday),
                'mahayatkyan' => $this->mahayatkyan(month: $my_month, day: $dayEnInt),
                'shanyat' => $this->shanyat(month: $my_month, day: $dayEnInt),
                'nagahle' => $this->nagahle(month: $my_month),
                'mahabote' => $this->mahabote(year: $yearEnInt, weekday: $weekday),
                'nakhat' => $this->natkhat(year: $yearEnInt),
                'zodiac' => $this->zodiac(date: $value->per_date->format('Y-m-d')),
            ];

            $datum[] = [
                'raw' => $raw,
                'formatted' => $formatted,
                'detail' => $detail,
            ];
        }

        $data['info'] = $datum;
        if ($start !== $end) {
            $data['holidays'] = $this->specialDays(type: 'holiday', start: $start, end: $end);
            $data['thingyans'] = $thingyan;
        }
        $data['special_days'] = $this->specialDays(type: 'blessingday', start: $start, end: $end);

        return $data;
    }

    protected function ensureCalendarRecord(string $dateStr): ?Calendar
    {
        try {
            $date = Carbon::parse($dateStr);
        } catch (\Throwable) {
            return null;
        }

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

        // Match Carbon dayOfWeek (0=Sunday..6=Saturday)
        $weekdaysEn = [
            0 => 'Sunday', 1 => 'Monday', 2 => 'Tuesday', 3 => 'Wednesday',
            4 => 'Thursday', 5 => 'Friday', 6 => 'Saturday',
        ];
        $weekdaysMy = [
            0 => 'တနင်္ဂနွေ', 1 => 'တနင်္လာ', 2 => 'အင်္ဂါ', 3 => 'ဗုဒ္ဓဟူး',
            4 => 'ကြာသပတေး', 5 => 'သောကြာ', 6 => 'စနေ',
        ];

        $year = $date->year;
        $month = $date->month;
        $day = $date->day;

        return Calendar::firstOrCreate(
            ['per_date' => $date->toDateString()],
            [
                'buddhist_year_my' => $this->changeNumber($year + 543),
                'buddhist_year_en' => (string) ($year + 543),
                'my_cal_year_my' => $this->changeNumber($year - 639),
                'my_cal_year_en' => (string) ($year - 639),
                'my_cal_month_my' => $myanmarMonthsMy[$month],
                'my_cal_month_en' => $myanmarMonths[$month],
                'my_cal_day_my' => $this->changeNumber($day),
                'my_cal_day_en' => (string) $day,
                'my_cal_type_of_day_my' => ($day <= 15) ? 'လဆန်း' : 'လဆုတ်',
                'my_cal_type_of_day_en' => ($day <= 15) ? 'Waxing' : 'Waning',
                'my_cal_weekday_my' => $weekdaysMy[$date->dayOfWeek],
                'my_cal_weekday_en' => $weekdaysEn[$date->dayOfWeek],
                'first_date_of_tagu' => Carbon::create($year, 4, 13)->toDateString(),
                'first_date_of_waso' => Carbon::create($year, 7, 1)->toDateString(),
                'is_watat' => false,
                'is_big_watat' => false,
                'akyo_day' => Carbon::create($year, 4, 13)->toDateString(),
                'akya_day' => Carbon::create($year, 4, 14)->toDateString(),
                'first_akyat_day' => Carbon::create($year, 4, 15)->toDateString(),
                'second_akyat_day' => Carbon::create($year, 4, 15)->toDateString(),
                'atat_day' => Carbon::create($year, 4, 16)->toDateString(),
                'new_year_day' => Carbon::create($year, 4, 17)->toDateString(),
                'akya_time' => now(),
                'atat_time' => now(),
            ]
        );
    }

    public function specialDays(string $type, string $start, string $end): array
    {
        $names_array = [];
        $names = CalendarDay::query()
            ->typeOf(value: $type)
            ->whereBetween('per_date', [$start, $end])
            ->distinct()
            ->pluck('name');

        foreach ($names as $name) {
            $dates = CalendarDay::query()->where('name', $name)
                ->whereBetween('per_date', [$start, $end])
                ->orderBy('per_date')
                ->pluck('per_date');

            if ($type === 'holiday') {
                if ($dates->count() > 1) {
                    $names_array[] = [
                        'name' => $name,
                        'days' => collect($dates)->map(fn ($date) => $this->changeNumber(haystack: $date->format('j'))),
                    ];
                } else {
                    $names_array[] = [
                        'name' => $name,
                        'days' => collect($dates)->map(fn ($date) => $this->changeNumber(haystack: $date->format('j')).' ရက်နေ့'),
                    ];
                }
            } else {
                $names_array[] = [
                    'name' => $name,
                    'days' => collect($dates)->map(fn ($date) => $this->changeNumber(haystack: $date->format('j'))),
                ];
            }
        }

        return $names_array;
    }

    public function distinctCollection(string $type, string $start, string $end)
    {
        return Calendar::query()
            ->whereBetween('per_date', [$start, $end])
            ->distinct()
            ->pluck($type);
    }

    public function sabbathFor8(int $day): ?string
    {
        return $day == 8 ? 'ဥပုသ်နေ့' : null;
    }

    public function sabbatheveFor8(int $day): ?string
    {
        return $day == 7 ? 'အဖိတ်နေ့' : null;
    }

    public function yatyarzar(int $month, int $weekday): ?string
    {
        $month = $month % 4;
        $weekday_1 = floor($month / 2) + 4;
        $weekday_2 = ((1 - floor($month / 2)) + $month % 2) * (1 + 2 * ($month % 2));
        if (($weekday == $weekday_1) || ($weekday == $weekday_2)) {
            return 'ရက်ရာဇာ';
        }

        return null;
    }

    public function pyatthadar(int $month, int $weekday): ?string
    {
        $month = $month % 4;
        $weekday_array = [1, 3, 3, 0, 2, 1, 2];
        if ($month == $weekday_array[$weekday]) {
            return 'ပြဿဒါး';
        } elseif (($month == 0) && ($weekday == 4)) {
            return 'မွန်းလွဲ ပြဿဒါး';
        }

        return null;
    }

    public function thamanyo(int $month, int $weekday): ?string
    {
        $month = $month - 1 - floor($month / 9);
        $weekday_1 = ($month * 2 - floor($month / 8)) % 7;
        $weekday_2 = ($weekday + 7 - $weekday_1) % 7;
        if ($weekday_2 <= 1) {
            return 'သမားညို';
        }

        return null;
    }

    public function thamaphyu(int $day, int $weekday): ?string
    {
        $weekdays = [1, 2, 6, 6, 5, 6, 7];
        if ($day == $weekdays[$weekday]) {
            return 'သမားဖြူ';
        }
        $weekdays = [0, 1, 0, 0, 0, 3, 3];
        if ($day == $weekdays[$weekday]) {
            return 'သမားဖြူ';
        }
        if (($day == 4) && ($weekday == 5)) {
            return 'သမားဖြူ';
        }

        return null;
    }

    public function amyeittasote(int $day, int $weekday): ?string
    {
        $weekdays = [5, 8, 3, 7, 2, 4, 1];
        if ($day == $weekdays[$weekday]) {
            return 'အမြိတ္တစုတ်';
        }

        return null;
    }

    public function warameittugyi(int $day, int $weekday): ?string
    {
        $weekdays = [7, 1, 4, 8, 9, 6, 3];
        if ($day == $weekdays[$weekday]) {
            return 'ဝါရမိတ္တုကြီး';
        }

        return null;
    }

    public function warameittunge(int $day, int $weekday): ?string
    {
        $data = ($weekday + 6) % 7;
        if ((12 - $day) == $data) {
            return 'ဝါရမိတ္တုငယ်';
        }

        return null;
    }

    public function yatpote(int $day, int $weekday): ?string
    {
        $weekdays = [8, 1, 4, 6, 9, 8, 7];
        if ($day == $weekdays[$weekday]) {
            return 'ရက်ပုပ်';
        }

        return null;
    }

    public function yatyotema(int $month, int $day): ?string
    {
        $month = ($month % 2) ? $month : (($month + 9) % 12);
        $month = ($month + 4) % 12 + 1;
        if ($day == $month) {
            return 'ရက်ယုတ်မာ';
        }

        return null;
    }

    public function nagapor(int $day, int $weekday): ?string
    {
        $weekdays = [26, 21, 2, 10, 18, 2, 21];
        if ($day == $weekdays[$weekday]) {
            return 'နဂါးပေါ်ရက်';
        }
        $weekdays = [17, 19, 1, 0, 9, 0, 0];
        if ($day == $weekdays[$weekday]) {
            return 'နဂါးပေါ်ရက်';
        }
        if ((($day == 2) && ($weekday == 1)) || ((($day == 12) || ($day == 4) || ($day == 18)) && ($weekday == 2))) {
            return 'နဂါးပေါ်ရက်';
        }

        return null;
    }

    public function mahayatkyan(int $month, int $day): ?string
    {
        $month = (floor(($month % 12) / 2) + 4) % 6 + 1;
        if ($day == $month) {
            return 'မဟာရက်ကြမ်း';
        }

        return null;
    }

    public function shanyat(int $month, int $day): ?string
    {
        if ($month === 0) {
            $month = 4;
        }
        $shanyats = [8, 8, 2, 2, 9, 3, 3, 5, 1, 4, 7, 4];
        if ($day == $shanyats[$month - 1]) {
            return 'ရှမ်းရက်';
        }

        return null;
    }

    public function nagahle(int $month): string
    {
        return match ((int) floor(($month % 12) / 3)) {
            1 => 'နဂါးခေါင်း မြောက်အရပ်သို့ လှည့်',
            2 => 'နဂါးခေါင်း အရှေ့အရပ်သို့ လှည့်',
            3 => 'နဂါးခေါင်း တောင်အရပ်သို့ လှည့်',
            default => 'နဂါးခေါင်း အနောက်အရပ်သို့ လှည့်'
        };
    }

    public function mahabote(int $year, int $weekday): string
    {
        // Mahabote has 7 types called Puti, Binga, Marana, Atun, Thike, Yaza, and Adipati [မဟာဘုတ်-ဝီကီပီးဒီးယား].
        $rem = (($year - $weekday) % 7 + 7) % 7;

        return match ($rem) {
            1 => 'အထွန်းဖွား',
            2 => 'ရာဇဖွား',
            3 => 'အဓိပတိဖွား',
            4 => 'မရဏဖွား',
            5 => 'သိုက်ဖွား',
            6 => 'ပုတိဖွား',
            default => 'ဘင်္ဂဖွား',
        };
    }

    public function natkhat(int $year): string
    {
        return match ($year % 3) {
            1 => 'နတ်နက္ခတ်',
            2 => 'လူနက္ခတ်',
            default => 'ဘီလူးနက္ခတ်'
        };
    }

    public function zodiac(string $date): string
    {
        $month = date('n', strtotime($date));
        $day = (int) date('d', strtotime($date));
        switch ($month) {
            case '1':
                return ($day >= 1 && $day <= 19) ? 'မကာရရာသီ (Capricorn)' : 'ကုမ်ရာသီ (Aquarius)';
            case '2':
                return ($day >= 1 && $day <= 18) ? 'ကုမ်ရာသီ (Aquarius)' : 'မိန်ရာသီ (Pisces)';
            case '3':
                return ($day >= 1 && $day <= 20) ? 'မိန်ရာသီ (Pisces)' : 'မိဿရာသီ (Aries)';
            case '4':
                return ($day >= 1 && $day <= 19) ? 'မိဿရာသီ (Aries)' : 'ပြိဿရာသီ (Taurus)';
            case '5':
                return ($day >= 1 && $day <= 20) ? 'ပြိဿရာသီ (Taurus)' : 'မေထုန်ရာသီ (Gemini)';
            case '6':
                return ($day >= 1 && $day <= 20) ? 'မေထုန်ရာသီ (Gemini)' : 'ကရကဋ်ရာသီ (Cancer)';
            case '7':
                return ($day >= 1 && $day <= 22) ? 'ကရကဋ်ရာသီ (Cancer)' : 'သိဟ်ရာသီ (Leo)';
            case '8':
                return ($day >= 1 && $day <= 22) ? 'သိဟ်ရာသီ (Leo)' : 'ကန်ရာသီ (Virgo)';
            case '9':
                return ($day >= 1 && $day <= 22) ? 'ကန်ရာသီ (Virgo)' : 'တူရာသီ (Libra)';
            case '10':
                return ($day >= 1 && $day <= 22) ? 'တူရာသီ (Libra)' : 'ဗြိစ္ဆာရာသီ (Scorpio)';
            case '11':
                return ($day >= 1 && $day <= 21) ? 'ဗြိစ္ဆာရာသီ (Scorpio)' : 'ဓနုရာသီ (Sagittarius)';
            case '12':
                return ($day >= 1 && $day <= 21) ? 'ဓနုရာသီ (Sagittarius)' : 'မကာရရာသီ (Capricorn)';
            default:
                return 'none';
        }
    }
}
