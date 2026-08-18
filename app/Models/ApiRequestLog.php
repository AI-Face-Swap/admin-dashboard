<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int|null $user_id
 * @property int|null $customer_id
 * @property string $method
 * @property string $path
 * @property array<string, mixed>|null $request_headers
 * @property array<string, mixed>|null $request_body
 * @property int|null $response_status
 * @property array<string, mixed>|null $response_headers
 * @property array<string, mixed>|null $response_body
 * @property int|null $duration_ms
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'user_id',
    'customer_id',
    'method',
    'path',
    'request_headers',
    'request_body',
    'response_status',
    'response_headers',
    'response_body',
    'duration_ms',
])]
class ApiRequestLog extends Model
{
    /**
     * The admin who made this request, if any.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The customer who made this request, if any.
     *
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'request_headers' => 'array',
            'request_body' => 'array',
            'response_headers' => 'array',
            'response_body' => 'array',
        ];
    }
}
