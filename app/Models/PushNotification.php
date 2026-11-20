<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'title',
    'body',
    'target_type',
    'customer_id',
    'template_id',
    'image_url',
    'web_url',
    'mobile_url',
    'data',
    'scheduled_at',
    'status',
    'sent_count',
    'failed_count',
    'sent_at',
    'created_by',
])]
class PushNotification extends Model
{
    public const TARGET_ALL = 'all';
    public const TARGET_SINGLE = 'single';

    public const STATUS_DRAFT = 'draft';
    public const STATUS_SCHEDULED = 'scheduled';
    public const STATUS_SENDING = 'sending';
    public const STATUS_SENT = 'sent';
    public const STATUS_FAILED = 'failed';

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(PromptTemplate::class, 'template_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function histories(): HasMany
    {
        return $this->hasMany(CustomerNotification::class);
    }

    public function scopeDueScheduled(Builder $query): Builder
    {
        return $query
            ->where('status', self::STATUS_SCHEDULED)
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now());
    }

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'scheduled_at' => 'datetime',
            'sent_at' => 'datetime',
            'sent_count' => 'integer',
            'failed_count' => 'integer',
        ];
    }
}
