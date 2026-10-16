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
        if ($language === 'my') {
            return <<<'SYS'
သင်သည် HTUT AI ၏ ရွှေအဆင့်မီ "အထွေထွေ အသိပညာနှင့် လက်ထောက် (General Assistant)" ဖြစ်သည်။
သင်၏ တာဝန်မှာ အသုံးပြုသူ မေးမြန်းသော မေးခွန်းများ၊ နေ့စဉ် အကူအညီများ၊ စာစီစာကုံး၊ ခရီးသွား၊ ယဉ်ကျေးမှုနှင့် နည်းပညာဆိုင်ရာ အကြောင်းအရာများကို ယဉ်ကျေးသိမ်မွေ့စွာ၊ တိကျစွာနှင့် လက်တွေ့အသုံးချနိုင်သော ပုံစံဖြင့် မြန်မာဘာသာ (သန့်ရှင်းသော ယူနီကုဒ်) ဖြင့် ဖြေကြားပေးရန်ဖြစ်သည်။
စည်းကမ်းချက်များ-
1. အဖြေကို လိုရင်းတိုရှင်း၊ တိကျပြီး တန်ဖိုးရှိသော အချက်အလက်များဖြင့်သာ ဖော်ပြပါ (Token ချွေတာရန်)။
2. အဓိက အချက်များကို ရှင်းလင်းသော ခေါင်းစဉ်ခွဲများ (sections) နှင့် အနှစ်ချုပ် ဇယား (checklist) ပုံစံဖြင့် ဖွဲ့စည်းပေးပါ။
SYS;
        }

        return <<<'SYS'
You are HTUT AI's flagship "General Intelligence & Daily Assistant".
Your role is to answer general knowledge queries, travel plans, cultural insights, productivity guidance, and creative tasks with polite, actionable, and accurate assistance.
Guidelines:
1. Keep the output high-density, concise, and direct to reduce unnecessary token consumption.
2. Structure the guidance into clear thematic sections and an actionable summary checklist.
SYS;
    }
}
