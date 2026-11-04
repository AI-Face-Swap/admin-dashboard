<?php

namespace App\Models;

use App\Models\Concerns\HasAutoSlug;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int|null $category_id
 * @property int|null $ai_model_id
 * @property string $slug
 * @property string $name
 * @property string|null $description
 * @property string $type
 * @property string|null $file_path
 * @property string|null $thumbnail_path
 * @property string|null $model
 * @property int $cost
 * @property int $discount_cost
 * @property-read int $effective_cost
 * @property bool $is_active
 * @property int $sort_order
 * @property string|null $prompt
 * @property string|null $negative_prompt
 * @property string|null $aspect_ratio
 * @property string|null $resolution
 * @property string|null $seed
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['category_id', 'generation_type_id', 'ai_model_id', 'slug', 'name', 'description', 'type', 'file_path', 'thumbnail_path', 'model', 'cost', 'discount_cost', 'is_active', 'sort_order', 'prompt', 'negative_prompt', 'aspect_ratio', 'resolution', 'seed'])]
class Template extends Model
{
    use HasAutoSlug;

    public const TYPE_IMAGE = 'image';

    public const TYPE_VIDEO = 'video';

    /**
     * The storage disk template files are kept on.
     */
    public const DISK = 'spaces';

    /**
     * Attributes appended to every serialized template.
     *
     * @var list<string>
     */
    protected $appends = ['file_url', 'thumbnail_url', 'manual_cost', 'effective_cost'];

    /**
     * The category this template belongs to.
     *
     * @return BelongsTo<TemplateCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(TemplateCategory::class, 'category_id');
    }

    /**
     * The generation type this template belongs to.
     *
     * @return BelongsTo<GenerationType, $this>
     */
    public function generationType(): BelongsTo
    {
        return $this->belongsTo(GenerationType::class, 'generation_type_id');
    }

    /**
     * The AI model assigned to this template.
     *
     * @return BelongsTo<AIModel, $this>
     */
    public function aiModel(): BelongsTo
    {
        return $this->belongsTo(AIModel::class, 'ai_model_id');
    }

    /**
     * The tags attached to this template.
     *
     * @return BelongsToMany<TemplateTag, $this>
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(TemplateTag::class, 'template_tag');
    }

    /**
     * The full public URL of the template file.
     */
    public function getFileUrlAttribute(): ?string
    {
        return $this->file_path
            ? Storage::disk(self::DISK)->url($this->file_path)
            : null;
    }

    /**
     * The full public URL of the thumbnail, if one exists.
     */
    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->thumbnail_path
            ? Storage::disk(self::DISK)->url($this->thumbnail_path)
            : null;
    }

    /**
     * Get the manual cost override if explicitly set on the template, or null when inheriting from AI model.
     */
    public function getManualCostAttribute(): ?int
    {
        $raw = $this->attributes['cost'] ?? null;

        if ($raw === null) {
            return null;
        }

        return (int) $raw;
    }

    /**
     * Resolve the base cost: manual override if set (> 0), otherwise dynamically from the linked AI model.
     */
    public function getCostAttribute(?int $value): int
    {
        if ($value !== null && $value > 0) {
            return (int) $value;
        }

        return $this->resolveModelCost();
    }

    /**
     * Resolve point cost from the assigned AIModel (or fallback by model_name / template type).
     */
    public function resolveModelCost(): int
    {
        if ($this->relationLoaded('aiModel') && $this->aiModel) {
            return (int) $this->aiModel->coin_cost;
        }

        if ($this->ai_model_id) {
            $cost = AIModel::whereKey($this->ai_model_id)->value('coin_cost');
            if ($cost !== null) {
                return (int) $cost;
            }
        }

        if (! empty($this->model)) {
            $cost = AIModel::where('model_name', $this->model)->value('coin_cost');
            if ($cost !== null) {
                return (int) $cost;
            }
        }

        $defaultModelName = $this->type === self::TYPE_VIDEO ? 'video-face-swap' : 'face-swap';
        $fallbackCost = AIModel::where('model_name', $defaultModelName)->value('coin_cost');

        return $fallbackCost !== null ? (int) $fallbackCost : 0;
    }

    /**
     * Get the final coin cost for the customer after discount.
     */
    public function getEffectiveCostAttribute(): int
    {
        $baseCost = $this->cost;

        return max(0, $baseCost - ($this->discount_cost ?? 0));
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cost' => 'integer',
            'discount_cost' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
