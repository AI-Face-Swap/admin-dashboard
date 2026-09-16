<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int|null $generation_type_id
 * @property string $provider_name
 * @property string $model_name
 * @property string|null $name
 * @property int $coin_cost
 * @property array|null $resolution_costs
 * @property array|null $duration_costs
 * @property bool $is_active
 * @property bool $is_default
 * @property string|null $docs_link
 * @property int $sort_order
 * @property string|null $description
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'generation_type_id',
    'provider_name',
    'model_name',
    'name',
    'coin_cost',
    'resolution_costs',
    'duration_costs',
    'is_active',
    'is_default',
    'docs_link',
    'sort_order',
    'description',
])]
class AIModel extends Model
{
    /**
     * The table associated with the model.
     */
    protected $table = 'ai_models';

    /**
     * The generation type this model belongs to.
     *
     * @return BelongsTo<GenerationType, $this>
     */
    public function generationType(): BelongsTo
    {
        return $this->belongsTo(GenerationType::class, 'generation_type_id');
    }

    /**
     * The templates using this AI model.
     *
     * @return HasMany<Template, $this>
     */
    public function templates(): HasMany
    {
        return $this->hasMany(Template::class, 'ai_model_id');
    }

    public function homeFeatures(): HasMany
    {
        return $this->hasMany(HomeFeature::class, 'ai_model_id');
    }

    /**
     * Scope to order by sort_order then model_name.
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('model_name');
    }

    /**
     * Scope to only active models.
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope by generation type slug.
     *
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeForGenerationType($query, string $slug)
    {
        return $query->whereHas('generationType', function ($q) use ($slug) {
            $q->where('slug', $slug);
        });
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'coin_cost' => 'integer',
            'resolution_costs' => 'array',
            'duration_costs' => 'array',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
