<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $conversation_id
 * @property string $role
 * @property string $content
 * @property string|null $image_url
 * @property string $category
 * @property array<string, mixed>|null $structured
 * @property int|null $tokens_used
 * @property string|null $cost
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property ChatConversation $conversation
 */
#[Fillable([
    'conversation_id',
    'role',
    'content',
    'image_url',
    'category',
    'structured',
    'tokens_used',
    'cost',
])]
class ChatMessage extends Model
{
    use HasFactory;

    protected $table = 'chat_messages';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'structured' => 'array',
            'tokens_used' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<ChatConversation, $this>
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(ChatConversation::class, 'conversation_id');
    }
}
