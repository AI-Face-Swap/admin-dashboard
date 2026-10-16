<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $customer_id
 * @property string $title_en
 * @property string $title_my
 * @property string $category
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Customer $customer
 * @property-read Collection<int, ChatMessage> $messages
 */
#[Fillable([
    'customer_id',
    'title_en',
    'title_my',
    'category',
])]
class ChatConversation extends Model
{
    use HasFactory;

    protected $table = 'chat_conversations';

    /**
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * @return HasMany<ChatMessage, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'conversation_id')->orderBy('id', 'asc');
    }
}
