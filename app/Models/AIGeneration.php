<?php

namespace App\Models;

use Database\Factories\AIGenerationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/** @property int $id */
/** @property int|null $user_id */
/** @property int|null $customer_id */
/** @property int $provider_id */
/** @property int|null $template_id */
/** @property string $operation */
/** @property string $status */
/** @property string|null $request_id */
/** @property string|null $cost */
/** @property string|null $currency */
/** @property int|null $duration_ms */
/** @property array<int|string, mixed>|null $input_metadata */
/** @property array<int|string, mixed>|null $output_metadata */
/** @property array<string, mixed>|null $output */
/** @property array<string, mixed>|null $raw_response */
/** @property string|null $error */
/** @property string|null $client_idempotency_token */
/** @property Carbon|null $created_at */
/** @property Carbon|null $updated_at */
/** @property Customer|null $customer */
/** @property Template|null $template */
#[Fillable([
    'user_id',
    'customer_id',
    'provider_id',
    'template_id',
    'operation',
    'status',
    'request_id',
    'cost',
    'currency',
    'coins_spent',
    'points_spent',
    'duration_ms',
    'input_metadata',
    'output_metadata',
    'raw_response',
    'error',
    'client_idempotency_token',
    'submission_state',
    'submitted_at',
    'reconciliation_attempted',
    'points_refunded',
    'refunded_at',
])]
class AIGeneration extends Model
{
    /** @use HasFactory<AIGenerationFactory> */
    use HasFactory;

    /** The table associated with the model. */
    protected $table = 'ai_generations';

    protected $appends = [
        'points_spent',
    ];

    public function getPointsSpentAttribute(): ?int
    {
        return $this->coins_spent;
    }

    public function setPointsSpentAttribute(?int $value): void
    {
        $this->attributes['coins_spent'] = $value;
    }

    public const CLIENT_IDEMPOTENCY_TOKEN_MAX_LENGTH = 255;

    public const OPERATION_IMAGE = 'image-generation';

    public const OPERATION_FACE_SWAP = 'face-swap';

    public const OPERATION_VIDEO_FACE_SWAP = 'video-face-swap';

    public const OPERATION_IMAGE_TO_VIDEO = 'image-to-video';

    public const OPERATION_IMAGE_EDIT = 'image-editing';

    public const OPERATION_CHAT = 'chat';

    public const STATUS_QUEUED = 'queued';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    public const SUBMISSION_SUBMITTING = 'submitting';
    public const SUBMISSION_SUBMITTED = 'submitted';
    public const SUBMISSION_UNRECONCILED = 'unreconciled';

    /** Generations stuck in queued/processing for longer than this are considered abandoned. */
    public const TIMEOUT_MINUTES = 10;

    /** The provider that served this generation. */
    public function provider(): BelongsTo
    {
        return $this->belongsTo(AIProvider::class);
    }

    /** The template used for this generation (face swaps). */
    public function template(): BelongsTo
    {
        return $this->belongsTo(Template::class);
    }

    /** The admin user who requested this generation, if any. */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** The customer who requested this generation, if any. */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** Accessor: alias output_metadata as output for frontend consumption. */
    public function getOutputAttribute(): ?array
    {
        return $this->output_metadata;
    }

    /**
     * Atomically and durably refund points if they have been spent and not already refunded.
     * Guarantees exact-once refund behavior.
     */
    public function refundPointsOnce(string $reason = 'AI Generation failed'): bool
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($reason) {
            $locked = self::where('id', $this->id)->lockForUpdate()->first();
            if (! $locked) {
                return false;
            }

            $spent = (int) ($locked->coins_spent ?? 0);
            $alreadyRefunded = (int) ($locked->points_refunded ?? 0);

            if ($spent <= 0 || $alreadyRefunded > 0 || $locked->refunded_at !== null) {
                return false;
            }

            $customer = $locked->customer_id ? Customer::find($locked->customer_id) : null;
            if (! $customer || empty($customer->central_auth_uuid)) {
                return false;
            }

            $refundRef = "gen_{$locked->id}_refund";
            $res = \App\Services\CentralAuthPointService::addPoints(
                $customer->central_auth_uuid,
                $spent,
                $reason,
                $refundRef,
                ['generation_id' => $locked->id, 'operation' => $locked->operation]
            );

            if ($res['success'] ?? false) {
                $locked->update([
                    'points_refunded' => $spent,
                    'refunded_at' => now(),
                ]);

                $this->points_refunded = $spent;
                $this->refunded_at = $locked->refunded_at;

                return true;
            }

            return false;
        });
    }

    /** Scope: find generations stuck in queued/processing for too long. */
    public function scopeStuck(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_QUEUED, self::STATUS_PROCESSING])
            ->where('created_at', '<', now()->subMinutes(self::TIMEOUT_MINUTES));
    }

    /** Mark stuck generations as failed. */
    public static function failStuck(): int
    {
        return static::stuck()->update([
            'status' => self::STATUS_FAILED,
            'error' => 'Generation timed out — request abandoned or server disconnected.',
        ]);
    }

    /** Get the attributes that should be cast. */
    protected function casts(): array
    {
        return [
            'cost' => 'decimal:4',
            'coins_spent' => 'integer',
            'points_refunded' => 'integer',
            'input_metadata' => 'array',
            'output_metadata' => 'array',
            'raw_response' => 'array',
            'submitted_at' => 'datetime',
            'refunded_at' => 'datetime',
            'reconciliation_attempted' => 'boolean',
        ];
    }
}