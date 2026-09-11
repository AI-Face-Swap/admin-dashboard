<?php

namespace App\Models;

use App\Models\Concerns\HasAutoSlug;
use Database\Factories\AIProviderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property bool $is_active
 * @property array<string, mixed>|null $config
 * @property int|null $completed_count
 * @property int|null $failed_count
 * @property string|float|null $total_cost
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'slug', 'is_active', 'config'])]
class AIProvider extends Model
{
    use HasAutoSlug;

    /** @use HasFactory<AIProviderFactory> */
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'ai_providers';

    /**
     * The generations served by this provider.
     *
     * @return HasMany<AIGeneration, $this>
     */
    public function generations(): HasMany
    {
        return $this->hasMany(AIGeneration::class, 'provider_id');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'config' => 'array',
        ];
    }
}
