<?php

namespace App\Models;

use Database\Factories\AIGenerationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int|null $user_id
 * @property int|null $customer_id
 * @property int $provider_id
 * @property int|null $template_id
 * @property string $operation
 * @property string $status
 * @property string|null $request_id
 * @property string|null $cost
 * @property string|null $currency
 * @property int|null $duration_ms
 * @property array<string, mixed>|null $input_metadata
 * @property array<string, mixed>|null $output_metadata
 * @property array<string, mixed>|null $output
 * @property array<string, mixed>|null $raw_response
 * @property string|null $error
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
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
    'duration_ms',
    'input_metadata',
    'output_metadata',
    'raw_response',
    'error',
])]
class AIGeneration extends Model
{
    /** @use HasFactory<AIGenerationFactory> */
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'ai_generations';

    public const OPERATION_IMAGE = 'image-generation';

    public const OPERATION_FACE_SWAP = 'face-swap';

    public const OPERATION_VIDEO_FACE_SWAP = 'video-face-swap';

    public const OPERATION_IMAGE_TO_VIDEO = 'image-to-video';

    public const STATUS_QUEUED = 'queued';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    /**
     * Generations stuck in queued/processing for longer than this are considered abandoned.
     */
    public const TIMEOUT_MINUTES = 10;

    /**
     * The provider that served this generation.
     *
     * @return BelongsTo<AIProvider, $this>
     */
    public function provider(): BelongsTo
    {
        return $this->belongsTo(AIProvider::class);
    }

    /**
     * The template used for this generation (face swaps).
     *
     * @return BelongsTo<Template, $this>
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(Template::class);
    }

    /**
     * The admin user who requested this generation, if any.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The customer who requested this generation, if any.
     *
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Accessor: alias output_metadata as output for frontend consumption.
     *
     * @return array<string, mixed>|null
     */
    public function getOutputAttribute(): ?array
    {
        return $this->output_metadata;
    }

    /**
     * Scope: find generations stuck in queued/processing for too long.
     */
    public function scopeStuck($query)
    {
        return $query->whereIn('status', [self::STATUS_QUEUED, self::STATUS_PROCESSING])
            ->where('created_at', '<', now()->subMinutes(self::TIMEOUT_MINUTES));
    }

    /**
     * Mark stuck generations as failed.
     *
     * @return int Number of generations marked as failed
     */
    public static function failStuck(): int
    {
        return static::stuck()->update([
            'status' => self::STATUS_FAILED,
            'error' => 'Generation timed out — request abandoned or server disconnected.',
        ]);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cost' => 'decimal:4',
            'input_metadata' => 'array',
            'output_metadata' => 'array',
            'raw_response' => 'array',
        ];
    }
}
