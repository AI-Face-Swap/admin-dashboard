<?php

namespace App\AI\Skills;

class GeneralSkill extends BaseChatSkill
{
    public function category(): string
    {
        return 'general';
    }

    public function label(): array
    {
        return [
            'en' => 'General',
            'my' => 'အထွေထွေ',
        ];
    }

    public function systemPrompt(string $language = 'my'): string
    {
        $langInstruction = $language === 'my'
            ? 'Output strictly in natural, polite Myanmar (Burmese Unicode).'
            : 'Output strictly in English.';

        return "You are HTUT AI General Assistant. {$langInstruction} Provide polite, accurate, concise assistance. Keep explanation direct and under 250 words.";
    }
}
