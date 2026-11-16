<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalendarDetail extends Model
{
    protected $fillable = [
        'calendar_id',
        'sabbath',
        'sabbath_eve',
        'yatyaza',
        'pyathada',
        'thamanyo',
        'thamaphyu',
        'amyeittasote',
        'warameittugyi',
        'warameittunge',
        'yatpote',
        'yatyotema',
        'nagapor',
        'nagahle',
        'mahayatkyan',
        'shanyat',
        'mahabote',
        'nakhat',
    ];

    public function calendar(): BelongsTo
    {
        return $this->belongsTo(
            related: Calendar::class,
            foreignKey: 'calendar_id',
        );
    }
}
