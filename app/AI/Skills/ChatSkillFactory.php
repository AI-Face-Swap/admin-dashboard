<?php

namespace App\AI\Skills;

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
        $list = [];
        foreach (self::$skills as $key => $class) {
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
