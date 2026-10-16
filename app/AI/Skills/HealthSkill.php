<?php

namespace App\AI\Skills;

class HealthSkill extends BaseChatSkill
{
    public function category(): string
    {
        return 'health';
    }

    public function label(): array
    {
        return [
            'en' => 'Health',
            'my' => 'ကျန်းမာရေး',
        ];
    }

    public function systemPrompt(string $language = 'my'): string
    {
        $langInstruction = $language === 'my'
            ? 'Output strictly in natural Myanmar (Burmese Unicode).'
            : 'Output strictly in English.';

        return "You are HTUT AI Health Guide. {$langInstruction} Provide comprehensive, evidence-based wellness, nutrition, and lifestyle advice with an educational disclaimer. Break down recommendations into clear practical sections.";
    }
}
