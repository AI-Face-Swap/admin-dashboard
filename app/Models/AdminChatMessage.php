<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $conversation_id
 * @property string $role
 * @property string $content
 * @property array<string, mixed>|null $structured
 * @property array<int, array<string, mixed>>|null $rag_sources
 * @property string|null $model
 * @property string|null $response_type
 * @property int|null $duration_ms
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'conversation_id',
    'role',
    'content',
    'structured',
    'rag_sources',
    'model',
    'response_type',
    'duration_ms',
])]
class AdminChatMessage extends Model
{
    protected $table = 'admin_chat_messages';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'structured' => 'array',
            'rag_sources' => 'array',
            'duration_ms' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<AdminChatConversation, $this>
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(AdminChatConversation::class, 'conversation_id');
    }
}
