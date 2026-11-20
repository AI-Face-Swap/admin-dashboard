<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'customer_id',
    'push_notification_id',
    'type',
    'title',
    'body',
    'image_url',
    'data',
    'read_at',
])]
class CustomerNotification extends Model
{
    public const TYPE_BROADCAST = 'broadcast';
    public const TYPE_SINGLE = 'single';
    public const TYPE_SCHEDULED = 'scheduled';
    public const TYPE_GENERATION_SUCCESS = 'generation_success';
    public const TYPE_GENERATION_FAILED = 'generation_failed';

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function pushNotification(): BelongsTo
    {
        return $this->belongsTo(PushNotification::class);
    }

    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }

    public function scopeRead(Builder $query): Builder
    {
        return $query->whereNotNull('read_at');
    }

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'read_at' => 'datetime',
        ];
    }
}
