<?php

namespace App\AI\Skills;

use App\Models\ChatCategory;
use Illuminate\Support\Facades\Schema;

class ChatSkillFactory
{
    /**
     * Map of category slugs to their concrete skill implementations.
     *
     * @var array<string, class-string<ChatSkillInterface>>
     */
    protected static array $skills = [
        'general' => GeneralSkill::class,
        'health' => HealthSkill::class,
        'education' => EducationSkill::class,
        'astrology' => AstrologySkill::class,
    ];

    /**
     * Resolve a skill by category slug.
     */
    public static function make(?string $category = null): ChatSkillInterface
    {
        $normalized = strtolower(trim((string) $category));

        if (empty($normalized) || ! isset(self::$skills[$normalized])) {
            $normalized = 'general';
        }

        $class = self::$skills[$normalized];

        return new $class;
    }

    /**
     * Get all supported categories with their metadata.
     *
     * @return array<int, array{key: string, label_en: string, label_my: string}>
     */
    public static function all(): array
    {
        if (Schema::hasTable('chat_categories')) {
            return ChatCategory::active()
                ->ordered()
                ->get(['key', 'label_en', 'label_my'])
                ->map(fn (ChatCategory $category) => [
                    'key' => $category->key,
                    'label_en' => $category->label_en,
                    'label_my' => $category->label_my,
                ])
                ->values()
                ->all();
        }

        $list = [];
        foreach (['astrology', 'general'] as $key) {
            if (! isset(self::$skills[$key])) {
                continue;
            }
            $class = self::$skills[$key];
            /** @var ChatSkillInterface $instance */
            $instance = new $class;
            $label = $instance->label();
            $list[] = [
                'key' => $key,
                'label_en' => $label['en'],
                'label_my' => $label['my'],
            ];
        }

        return $list;
    }
}
