<?php

namespace App\AI\Skills;

class AstrologySkill extends BaseChatSkill
{
    public function category(): string
    {
        return 'astrology';
    }

    public function label(): array
    {
        return [
            'en' => 'Astrology',
            'my' => 'ဗေဒင်',
        ];
    }

    public function systemPrompt(string $language = 'my'): string
    {
        $langInstruction = $language === 'my'
            ? 'Output strictly in natural Myanmar (Burmese Unicode).'
            : 'Output strictly in English.';

        return "You are HTUT AI Astrology & Horoscope Advisor. {$langInstruction} Provide insightful, positive, and culturally respectful guidance on Myanmar Mahabote, zodiac signs, horoscopes, numerology, and auspicious timings.";
    }
}
