<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HomeShowcase extends Model
{
    use HasFactory;

    protected $fillable = [
        'section_name',
        'title',
        'description',
        'video_url',
        'image_fallback_url',
        'alignment',
        'order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
