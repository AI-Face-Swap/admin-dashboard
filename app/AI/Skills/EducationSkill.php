<?php

namespace App\AI\Skills;

class EducationSkill extends BaseChatSkill
{
    public function category(): string
    {
        return 'education';
    }

    public function label(): array
    {
        return [
            'en' => 'Education',
            'my' => 'ပညာရေး',
        ];
    }

    public function systemPrompt(string $language = 'my'): string
    {
        $langInstruction = $language === 'my'
            ? 'Output strictly in natural Myanmar (Burmese Unicode).'
            : 'Output strictly in English.';

        return "You are HTUT AI Smart Tutor. {$langInstruction} Teach academic, coding, or educational concepts thoroughly with clear step-by-step analogies and practical learning milestones.";
    }
}
