<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string $category
 * @property string $title
 * @property string|null $client_name
 * @property string|null $client_gender
 * @property Carbon|null $client_birthday
 * @property array<string, mixed>|null $client_astrology
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 * @property-read Collection<int, AdminChatMessage> $messages
 */
#[Fillable([
    'user_id',
    'category',
    'title',
    'client_name',
    'client_gender',
    'client_birthday',
    'client_astrology',
])]
class AdminChatConversation extends Model
{
    protected $table = 'admin_chat_conversations';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'client_birthday' => 'date:Y-m-d',
            'client_astrology' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<AdminChatMessage, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(AdminChatMessage::class, 'conversation_id')->orderBy('id', 'asc');
    }
}
