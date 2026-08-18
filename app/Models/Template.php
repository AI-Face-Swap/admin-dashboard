<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int|null $category_id
 * @property string $slug
 * @property string $name
 * @property string|null $description
 * @property string $type
 * @property string $file_path
 * @property string|null $thumbnail_path
 * @property string|null $model
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['category_id', 'slug', 'name', 'description', 'type', 'file_path', 'thumbnail_path', 'model', 'is_active'])]
class Template extends Model
{
    use HasFactory;

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
    protected $appends = ['file_url', 'thumbnail_url'];

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
    protected function fileUrl(): Attribute
    {
        return Attribute::get(fn () => Storage::disk(self::DISK)->url($this->file_path));
    }

    /**
     * The full public URL of the thumbnail, if one exists.
     */
    protected function thumbnailUrl(): Attribute
    {
        return Attribute::get(fn () => $this->thumbnail_path
            ? Storage::disk(self::DISK)->url($this->thumbnail_path)
            : null);
    }

    /**
     * Boot the model and auto-generate a slug when one is not provided.
     */
    protected static function booted(): void
    {
        static::saving(function (Template $template) {
            if (empty($template->slug)) {
                $template->slug = Str::slug($template->name);
            }
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
            'is_active' => 'boolean',
        ];
    }
}
