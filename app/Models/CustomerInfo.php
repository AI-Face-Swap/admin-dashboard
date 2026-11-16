<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerInfo extends Model
{
    protected $fillable = [
        'customer_id',
        'name',
        'birthday',
        'birthtime',
        'gender',
        'zodiac',
        'mahabote',
        'day',
        'myanmar_birthday',
        'nakhat',
    ];

    public function casts(): array
    {
        return [
            'birthday' => 'date',
            'birthtime' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(
            related: Customer::class,
            foreignKey: 'customer_id',
        );
    }
}
