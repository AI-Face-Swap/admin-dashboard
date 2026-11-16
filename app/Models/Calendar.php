<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Calendar extends Model
{
    protected $fillable = [
        'per_date',
        'buddhist_year_my',
        'buddhist_year_en',
        'my_cal_year_my',
        'my_cal_year_en',
        'my_cal_month_my',
        'my_cal_month_en',
        'my_cal_day_my',
        'my_cal_day_en',
        'my_cal_type_of_day_my',
        'my_cal_type_of_day_en',
        'my_cal_weekday_my',
        'my_cal_weekday_en',
        'first_date_of_tagu',
        'first_date_of_waso',
        'is_watat',
        'is_big_watat',
        'akyo_day',
        'akya_day',
        'first_akyat_day',
        'second_akyat_day',
        'atat_day',
        'new_year_day',
        'akya_time',
        'atat_time',
    ];

    public function casts(): array
    {
        return [
            'per_date' => 'date:Y-m-d',
            'first_date_of_tagu' => 'date:Y-m-d',
            'first_date_of_waso' => 'date:Y-m-d',
            'akyo_day' => 'date:Y-m-d',
            'akya_day' => 'date:Y-m-d',
            'first_akyat_day' => 'date:Y-m-d',
            'second_akyat_day' => 'date:Y-m-d',
            'atat_day' => 'date:Y-m-d',
            'new_year_day' => 'date:Y-m-d',
            'akya_time' => 'datetime:Y-m-d H:i:s',
            'atat_time' => 'datetime:Y-m-d H:i:s',
        ];
    }

    public function detail(): HasOne
    {
        return $this->hasOne(
            related: CalendarDetail::class,
            foreignKey: 'calendar_id',
        );
    }

    public function specialDay(): HasOne
    {
        return $this->hasOne(
            related: CalendarDay::class,
            foreignKey: 'calendar_id',
        );
    }

    public function specialDays(): HasMany
    {
        return $this->hasMany(
            related: CalendarDay::class,
            foreignKey: 'calendar_id',
        );
    }
}
