<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'slug'])]
class TemplateTag extends Model
{
    use HasFactory;

    /**
     * The templates carrying this tag.
     *
     * @return BelongsToMany<Template, $this>
     */
    public function templates(): BelongsToMany
    {
        return $this->belongsToMany(Template::class, 'template_tag');
    }

    /**
     * Boot the model and auto-generate a slug when one is not provided.
     */
    protected static function booted(): void
    {
        static::saving(function (TemplateTag $tag) {
            if (empty($tag->slug)) {
                $tag->slug = Str::slug($tag->name);
            }
        });
    }
}
