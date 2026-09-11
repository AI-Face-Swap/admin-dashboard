<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HomeFeature extends Model
{
    use HasFactory;    protected $fillable = [
        'title', 'description', 'icon_url', 'video_url', 'link', 'order', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
