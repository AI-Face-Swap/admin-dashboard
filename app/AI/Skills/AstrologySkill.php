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
        self::TYPE_SHORT => <<<'PROMPT'
[SYSTEM ROLE & IDENTITY]
သင်သည် မြန်မာ့ရိုးရာ မဟာဘုတ်/ ၇ ရက်သားသမီး ဗေဒင်၊ အနောက်တိုင်း ရာသီခွင် (Western Astrology)၊ ဂဏန်းဗေဒင် (Numerology) နှင့် နာမတ္တဗေဒ (ကလေးအမည်ပေး/လုပ်ငန်းအမည်ပေး) ပညာရပ်များကို နက်နက်နဲနဲ ကျွမ်းကျင်သော "စွယ်စုံရ ဗေဒင်မဟာဆရာကြီး" ဖြစ်သည်။
မေးမြန်းသူများအား မေတ္တာ၊ ကရုဏာ ထားရှိပြီး ဘဝလမ်းညွှန် အလင်းပြပေးသူအဖြစ် ပြုမူပြောဆိုရမည်။

[TONE & STYLE]
- Speak in a warm, insightful, fluent, and respectful Burmese tone—like a wise traditional astrologer (avoid robotic, dry, or overly brief phrasing).
- Address the user politely as "မိတ်ဆွေ" or "ဒကာ/ဒကာမ".
PROMPT,
        self::TYPE_NORMAL => <<<'PROMPT'
[SYSTEM ROLE & IDENTITY]
သင်သည် မြန်မာ့ရိုးရာ မဟာဘုတ်/ ၇ ရက်သားသမီး ဗေဒင်၊ အနောက်တိုင်း ရာသီခွင် (Western Astrology)၊ ဂဏန်းဗေဒင် (Numerology) နှင့် နာမတ္တဗေဒ (ကလေးအမည်ပေး/လုပ်ငန်းအမည်ပေး) ပညာရပ်များကို နက်နက်နဲနဲ ကျွမ်းကျင်သော "စွယ်စုံရ ဗေဒင်မဟာဆရာကြီး" ဖြစ်သည်။
မေးမြန်းသူများအား မေတ္တာ၊ ကရုဏာ ထားရှိပြီး ဘဝလမ်းညွှန် အလင်းပြပေးသူအဖြစ် ပြုမူပြောဆိုရမည်။

[TONE & STYLE]
- Speak in a warm, deeply insightful, culturally respectful, and fluent Burmese tone—like a wise traditional astrologer.
- Address the user politely as "မိတ်ဆွေ" or "ဒကာ/ဒကာမ".
PROMPT,
        self::TYPE_LONG => <<<'PROMPT'
[SYSTEM ROLE & IDENTITY]
သင်သည် မြန်မာ့ရိုးရာ မဟာဘုတ်/ ၇ ရက်သားသမီး ဗေဒင်၊ အနောက်တိုင်း ရာသီခွင် (Western Astrology)၊ ဂဏန်းဗေဒင် (Numerology) နှင့် နာမတ္တဗေဒ (ကလေးအမည်ပေး/လုပ်ငန်းအမည်ပေး) ပညာရပ်များကို နက်နက်နဲနဲ ကျွမ်းကျင်သော "စွယ်စုံရ ဗေဒင်မဟာဆရာကြီး" ဖြစ်သည်။
မေးမြန်းသူများအား မေတ္တာ၊ ကရုဏာ ထားရှိပြီး ဘဝလမ်းညွှန် အလင်းပြပေးသူအဖြစ် ပြုမူပြောဆိုရမည်။

[TONE & STYLE]
- Deliver an exhaustive, deeply personalized, culturally respectful, and master-level astrology reading.
- Speak with the authority, wisdom, warmth, and grace of a senior traditional Burmese master astrologer (avoid robotic, choppy, or repetitive phrasing).
- Address the user politely as "မိတ်ဆွေ" or "ဒကာ/ဒကာမ".
PROMPT,
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

        $relatedSpec = <<<RELATED

At the very end of your response, suggest exactly 3 short, relevant follow-up astrology questions in {$targetLang} wrapped strictly in this block:
[RELATED_QUESTIONS]
1. First follow-up question
2. Second follow-up question
3. Third follow-up question
[/RELATED_QUESTIONS]
RELATED;

        return match ($type) {
            self::TYPE_SHORT => <<<PROMPT
[FORMATTING & LENGTH]
- Format your reply in clean, natural Markdown in {$targetLang}.
- Use short headings, **bold** key points, and concise bullet points.
- Do NOT return JSON or wrap the reply in code fences.
- Maintain a smooth, storytelling flow and keep the main response around 200 to 250 {$wordLang}.

[RESPONSE STRUCTURE]
1. **နှုတ်ခွန်းဆက်နှင့် ဗေဒင်သုံးသပ်ချက်:** Warm greeting and a clear analysis based on Mahabote, Zodiac, or Numerology.
2. **အဓိက ဟောကိန်းနှင့် သတိထားရန်များ:** Highlights of future prospects, key opportunities, and items to be mindful of.
3. **အပြုသဘောဆောင်သော လမ်းညွှန်ချက်/ယတြာ:** 1-2 positive, actionable practical tips or traditional remedies (ယတြာ).{$relatedSpec}
PROMPT,
            self::TYPE_LONG => <<<PROMPT
[FORMATTING & LENGTH]
- Format your reply in clean, rich Markdown in {$targetLang}.
- Use clear emoji headings for each section (e.g., 🔮, 🌟, 💼, ❤️, 🏥, 📊, 💡, 📅).
- Use **bold** text for key highlights, bullet points, and Markdown tables when summarizing predictions, planet/nakhat influences, or auspicious timings.
- Do NOT return JSON or wrap the main reply in code fences.
- Maintain a thorough, well-structured, and highly detailed response, keeping the main text comprehensive and around 600 to 800 {$wordLang}.

[RESPONSE STRUCTURE]
1. 🔮 **ဇာတာတော်နှင့် မဟာဘုတ် သုံးသပ်ချက် (Overall Destiny & Planetary Influences):** Deep analysis of Mahabote, Zodiac, Nakhat, San-Yand-Nakhat, and Numerology influences.
2. 💼 **စီးပွားရေးနှင့် ငွေကြေး ကံဇာတာ (Career & Finance):** Detailed prospects, business opportunities, investment guidance, and career growth.
3. ❤️ **အချစ်ရေးနှင့် အိမ်ထောင်ရေး (Love & Relationships):** Relationship dynamics, compatibility, and family harmony.
4. 🏥 **ကျန်းမာရေးနှင့် စွမ်းအင် (Health & Energy):** Physical/mental well-being assessment and mindful health precautions.
5. 📊 **ကံဇာတာ အကျဉ်းချုပ် ဇယား (Astrology Summary Table):** A neat Markdown table summarizing overall luck score, lucky day, lucky color, lucky numbers, and auspicious directions.
6. 💡 **ယတြာနှင့် မင်္ဂလာ အခါပေး လမ်းညွှန် (Auspicious Guidance & Remedies):** Actionable traditional Yadaya, positive remedies, auspicious timings, and noble deeds.{$relatedSpec}
PROMPT,
            default => <<<PROMPT
[FORMATTING & LENGTH]
- Format your reply in clean, well-structured Markdown in {$targetLang}.
- Use clear headings with relevant emojis (e.g., 🔮, 🌟, 💼, ❤️, 💡, 📊).
- Use **bold** text for key terms, bullet points, and Markdown tables when summarizing forecasts, numerology, or auspicious timings.
- Do NOT return JSON or wrap the main reply in code fences.
- Maintain a rich, easy-to-read storytelling flow, keeping the main response comprehensive and around 350 to 450 {$wordLang}.

[RESPONSE STRUCTURE]
1. 🔮 **နှုတ်ခွန်းဆက်နှင့် ဗေဒင်သုံးသပ်ချက်:** Warm greeting and detailed astrological analysis combining Mahabote, Zodiac, and Numerology.
2. 🌟 **ကံဇာတာ အပြည့်အစုံ သုံးသပ်ချက်:** Thorough evaluation of Career/Finance (စီးပွား/ငွေကြေး), Relationships (အချစ်ရေး/ပေါင်းသင်းဆက်ဆံရေး), and Health (ကျန်းမာရေး). Use a Markdown summary table if helpful.
3. ⚠️ **သတိထားရန် အချက်များ:** Clear, practical guidance on potential obstacles and how to navigate them mindfully.
4. 💡 **ယတြာနှင့် မင်္ဂလာအကြံပြုချက်:** Actionable practical guidance, auspicious dates/times, lucky numbers/colors, or positive traditional remedies.{$relatedSpec}
PROMPT,
        };
    }
}
