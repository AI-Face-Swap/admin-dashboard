<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HomeHero extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'video',
        'images',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'images' => 'array',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Scope: active hero sections ordered by sort_order ASC, id ASC.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id');
    }
}
