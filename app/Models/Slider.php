<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Slider extends Model
{
    protected $fillable = [
        'title',
        'description',
        'cta_text',
        'cta_url',
        'file_path',
        'type',
        'sorting',
        'is_active',
        'badge',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sorting' => 'integer',
    ];

    /**
     * Scope: active sliders ordered by sorting DESC, created_at DESC.
     *
     * @param Builder<self> $query
     * @return Builder<self>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)
            ->orderByDesc('sorting')
            ->orderByDesc('created_at');
    }

    /**
     * Scope: all sliders ordered by sorting DESC, created_at DESC.
     *
     * @param Builder<self> $query
     * @return Builder<self>
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderByDesc('sorting')
            ->orderByDesc('created_at');
    }

    /**
     * The full public URL of the slider file.
     */
    public function getFileUrlAttribute(): ?string
    {
        if (! $this->file_path) {
            return null;
        }

        return Storage::disk('spaces')->url($this->file_path);
    }

    /**
     * Thumbnail URL (same as file for now).
     */
    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->file_url;
    }
}
