<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['group', 'key', 'value'];

    /**
     * Get a setting value by group and key.
     */
    public static function get(string $group, string $key, mixed $default = null): mixed
    {
        $setting = static::where('group', $group)->where('key', $key)->first();

        return $setting ? $setting->value : $default;
    }

    /**
     * Set a setting value by group and key.
     */
    public static function set(string $group, string $key, mixed $value): self
    {
        /** @var self $model */
        $model = static::updateOrCreate(
            ['group' => $group, 'key' => $key],
            ['value' => (string) $value],
        );
        return $model;
    }

    /**
     * Get all settings for a group as key => value array.
     *
     * @return array<string, string>
     */
    public static function group(string $group): array
    {
        return static::where('group', $group)
            ->pluck('value', 'key')
            ->toArray();
    }
}
