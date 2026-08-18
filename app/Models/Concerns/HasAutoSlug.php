<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

trait HasAutoSlug
{
    /**
     * Generate a slug from the name and ensure it is unique on creation.
     */
    public static function bootHasAutoSlug(): void
    {
        static::creating(function (Model $model) {
            if (empty($model->getAttribute('slug'))) {
                $model->setAttribute('slug', Str::slug((string) $model->getAttribute('name')));
            }

            $model->setAttribute('slug', static::uniqueSlug((string) $model->getAttribute('slug')));
        });
    }

    /**
     * Append a numeric suffix to the slug until it does not collide:
     * "testing" -> "testing-2" -> "testing-3" ...
     */
    protected static function uniqueSlug(string $slug): string
    {
        $base = $slug;
        $counter = 2;

        while (static::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$counter;
            $counter++;
        }

        return $slug;
    }
}
