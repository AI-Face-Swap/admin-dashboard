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
Format your reply in clean, natural Markdown in {$targetLang} (like ChatGPT):
- Use short headings, **bold** key points, and concise bullet points where helpful.
- Do NOT return JSON or wrap the reply in code fences.
- Keep the entire response concise and under 100 {$wordLang}.
PROMPT,
            self::TYPE_LONG => <<<PROMPT
Format your reply in clean, rich Markdown in {$targetLang} (like ChatGPT):
- Use clear emoji headings (e.g. Overall Destiny & Mahabote, Career & Finance, Love & Relationships, Health & Energy, Auspicious Guidance / Remedies), **bold** highlights, bullet points, and Markdown tables when useful.
- Do NOT return JSON or wrap the reply in code fences.
- Keep the entire response thorough, well-structured, and up to 600 {$wordLang}.
PROMPT,
            default => <<<PROMPT
Format your reply in clean, well-structured Markdown in {$targetLang} (like ChatGPT):
- Use clear headings with emojis, **bold** key points, bullet points, and Markdown tables when helpful.
- Do NOT return JSON or wrap the reply in code fences.
- Keep the entire response rich, easy to read, and under 250 {$wordLang}.
PROMPT,
        };
    }
}
