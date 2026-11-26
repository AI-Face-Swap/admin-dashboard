<?php

namespace App\AI\Skills;

use App\Models\Setting;
use Illuminate\Support\Facades\Schema;
use Throwable;

class AstrologySkill extends BaseChatSkill
{
    public const TYPE_SHORT = 'short';

    public const TYPE_NORMAL = 'normal';

    public const TYPE_LONG = 'long';

    /**
     * @var array<int, string>
     */
    public const RESPONSE_TYPES = [
        self::TYPE_SHORT,
        self::TYPE_NORMAL,
        self::TYPE_LONG,
    ];

    /**
     * Built-in default system prompts per response type.
     *
     * @var array<string, string>
     */
    public const DEFAULT_SYSTEM_PROMPTS = [
        self::TYPE_SHORT => 'You are HTUT AI Astrology & Horoscope Advisor. Provide a brief, direct, and positive astrology insight based on Myanmar Mahabote, zodiac signs, horoscopes, or auspicious timings. Focus only on the single most important takeaway and one quick practical tip.',
        self::TYPE_NORMAL => 'You are HTUT AI Astrology & Horoscope Advisor. Provide insightful, positive, and culturally respectful guidance on Myanmar Mahabote, zodiac signs, horoscopes, numerology, and auspicious timings.',
        self::TYPE_LONG => 'You are HTUT AI Senior Myanmar Astrology & Horoscope Master. Provide a comprehensive, deeply personalized, and culturally respectful reading covering Myanmar Mahabote, zodiac signs, Nakhat and San-Yand-Nakhat influences, career, finance, love, health, numerology, auspicious timings, and practical traditional remedies (Yadaya, lucky colors, and auspicious actions).',
    ];

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

    public static function normalizeResponseType(?string $responseType): string
    {
        $normalized = strtolower(trim((string) $responseType));

        return in_array($normalized, self::RESPONSE_TYPES, true)
            ? $normalized
            : self::TYPE_NORMAL;
    }

    public static function defaultPromptForType(string $responseType): string
    {
        $type = self::normalizeResponseType($responseType);

        return self::DEFAULT_SYSTEM_PROMPTS[$type];
    }

    public static function configuredPromptForType(string $responseType): string
    {
        $type = self::normalizeResponseType($responseType);
        $default = self::DEFAULT_SYSTEM_PROMPTS[$type];

        try {
            if (Schema::hasTable('settings')) {
                $custom = trim((string) Setting::get('ai', "astrology_prompt_{$type}", ''));
                if ($custom !== '') {
                    return $custom;
                }
            }
        } catch (Throwable) {
            // Fall back to built-in default when settings table is unavailable
        }

        return $default;
    }

    public function systemPrompt(string $language = 'my', ?string $responseType = null): string
    {
        $type = self::normalizeResponseType($responseType);
        $langInstruction = $language === 'my'
            ? 'Output strictly in natural Myanmar (Burmese Unicode).'
            : 'Output strictly in English.';

        $basePrompt = self::configuredPromptForType($type);

        return "{$basePrompt} {$langInstruction}";
    }

    protected function jsonFormatSpec(string $language = 'my', ?string $responseType = null): string
    {
        $type = self::normalizeResponseType($responseType);
        $targetLang = $language === 'my' ? 'natural Myanmar Unicode' : 'English';
        $wordLang = $language === 'my' ? 'Burmese words' : 'words';

        return match ($type) {
            self::TYPE_SHORT => <<<PROMPT
Return strictly raw JSON (no markdown):
{
  "content": "A concise 1-to-2 sentence astrology highlight in {$targetLang}.",
  "structured": {
    "sections": [
      {"title": "Section Title with Emoji", "description": "Brief 1-to-2 sentence key insight."}
    ],
    "checklist": [
      {"item": "Quick Tip", "detail": "Short actionable guidance"}
    ]
  }
}
Structure guidelines: Provide exactly 1 brief section and 1 to 2 short checklist items. Keep the entire response concise and under 100 {$wordLang}.
PROMPT,
            self::TYPE_LONG => <<<PROMPT
Return strictly raw JSON (no markdown):
{
  "content": "A detailed, deeply personalized astrology overview in {$targetLang} (3 to 4 sentences).",
  "structured": {
    "sections": [
      {"title": "Section Title with Emoji", "description": "Thorough 3-to-4 sentence astrological analysis."}
    ],
    "checklist": [
      {"item": "Key Guidance or Remedy", "detail": "Detailed actionable recommendation"}
    ]
  }
}
Structure guidelines: Provide 4 to 5 comprehensive sections (such as Overall Destiny & Mahabote, Career & Finance, Love & Relationships, Health & Energy, and Auspicious Guidance / Remedies) and 4 to 6 actionable checklist items. Keep the entire response thorough, well-structured, and up to 600 {$wordLang}.
PROMPT,
            default => <<<PROMPT
Return strictly raw JSON (no markdown):
{
  "content": "A clear, engaging overview in {$targetLang} (2 to 3 sentences).",
  "structured": {
    "sections": [
      {"title": "Section Title with Emoji", "description": "Concise 2-to-3 sentence explanation."}
    ],
    "checklist": [
      {"item": "Key Point", "detail": "Actionable recommendation"}
    ]
  }
}
Structure guidelines: Provide 2 to 3 informative sections and 2 to 4 checklist items. Keep the entire response rich, well-formatted, and under 250 {$wordLang}.
PROMPT,
        };
    }
}
