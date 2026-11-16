<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalendarDay extends Model
{
    protected $fillable = [
        'calendar_id',
        'per_date',
        'type',
        'name',
    ];

    public function casts(): array
    {
        return [
            'per_date' => 'date:Y-m-d',
        ];
    }

    public function scopeTypeOf(Builder $builder, string $value): Builder
    {
        return $builder->where('type', $value);
    }

    public function calendar(): BelongsTo
    {
        return $this->belongsTo(
            related: Calendar::class,
            foreignKey: 'calendar_id',
        );
    }
}
