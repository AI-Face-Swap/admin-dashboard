<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HomeFeature extends Model
{
    use HasFactory;

    protected $fillable = [
        'title', 'description', 'icon_url', 'video_url', 'link', 'order', 'is_active', 'ai_model_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function aiModel(): BelongsTo
    {
        return $this->belongsTo(AIModel::class);
    }
}
