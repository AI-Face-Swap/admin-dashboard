export type Template = {
    id: number;
    name: string;
    slug: string;
    type: 'image' | 'video';
    thumbnail_path: string | null;
    file_path: string;
};

export type Generation = {
    id: number;
    operation: string;
    status: string;
    request_id: string | null;
    cost: string | null;
    currency: string | null;
    duration_ms: number | null;
    output_metadata: string[] | null;
    created_at: string;
    template: { id: number; name: string; slug: string } | null;
};

export type GenerationResult = {
    status: string;
    generation: {
        id: number;
        request_id: string | null;
        operation: string;
        status: string;
        cost: string | null;
        currency: string | null;
        duration_ms: number | null;
        output: string[];
        message?: string;
    };
};

export type TabType =
    | 'image'
    | 'video'
    | 'generate'
    | 'image-to-video'
    | 'image-edit';

export type EditModel =
    | 'p-image-edit'
    | 'multi-image-kontext-max'
    | 'flux-kontext-dev'
    | 'seedream-v5-lite-image-to-image'
    | 'gpt-image-1.5-edit'
    | 'kling-3-image2image'
    | 'nano-banana-pro'
    | 'ideogram-4.5-edit'
    | 'bria-extract-object';

export function csrfToken(): string {
    const cookie = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith('XSRF-TOKEN='));

    return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
}

export async function handleDownload(
    url: string,
    defaultFilename?: string,
    generationId?: number,
    index: number = 0,
) {
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) {
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download =
                defaultFilename ||
                url.split('/').pop()?.split('?')[0] ||
                'generation';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            return;
        }
    } catch {
        // Fallback to server route or direct link
    }

    if (generationId) {
        const downloadUrl = `/admin/ai/generations/${generationId}/download?index=${index}`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = defaultFilename || 'generation';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
}

export const SEED_PRESET_DESCRIPTIONS: Record<string, string> = {
    '-1': 'ထုတ်လုပ်တိုင်း မတူညီသော လှုပ်ရှားမှုနှင့် ကင်မရာရှုထောင့်အသစ်များ ထွက်လာပါမည် (အသစ်စမ်းသပ်ရန် အကောင်းဆုံး)။',
    '42': 'Prompt တူပါက လှုပ်ရှားမှုနှင့် အလင်းအမှောင် တူညီသော ရလဒ်ကို အတည်တကျ ပြန်ထုတ်ပေးပါမည် (Prompt ပြင်ပြီး နှိုင်းယှဉ်စမ်းသပ်ရန် အကောင်းဆုံး)။',
    '777': 'တူညီသော Prompt ကိုပင် ရုပ်ရှင်ဆန်သော ကင်မရာရှုထောင့်နှင့် လှုပ်ရှားမှု ပုံစံတစ်မျိုးဖြင့် အတည်တကျ ထုတ်ပေးပါမည်။',
    '2026': 'တူညီသော Prompt ကိုပင် အက်ရှင်နှင့် လှုပ်ရှားမှု ပိုမိုသွက်လက်သော ပုံစံတစ်မျိုးဖြင့် အတည်တကျ ထုတ်ပေးပါမည်။',
    custom: 'ယခင်ထုတ်လုပ်ခဲ့သော ဗီဒီယိုတစ်ခု၏ Seed ဂဏန်းကို ပြန်ရိုက်ထည့်ပြီး ပုံစံတူ ပြန်ထုတ်ယူနိုင်ပါသည်။',
};

export const DURATION_DESCRIPTIONS: Record<string, string> = {
    '4s': '၄ စက္ကန့် — အမြန်ဆုံးထွက်ပြီး အတိုချုပ် လှုပ်ရှားမှု (Short Clip) အတွက် သင့်တော်ပါသည်။',
    '5s': '၅ စက္ကန့် — ပုံမှန် စံနှုန်းဖြစ်ပြီး လှုပ်ရှားမှု တိကျပြတ်သားပါသည် (အကြံပြုချက်)။',
    '6s': '၆ စက္ကန့် — တိုက်ခိုက်ခန်း (Action) နှင့် Camera Pan ရိုက်ချက်များအတွက် အသင့်တော်ဆုံး ဖြစ်ပါသည်။',
    '8s': '၈ စက္ကန့် — ဇာတ်ဝင်ခန်း အလတ်စား (Shot ၂ ခု ခွဲရိုက်ရန် သင့်တော်သည်)။',
    '10s': '၁၀ စက္ကန့် — ဇာတ်လမ်းရှည် (Shot 1, Shot 2, Shot 3 ခွဲပြီး ရိုက်ကူးရန် အကောင်းဆုံး)။',
    '12s': '၁၂ စက္ကန့် — Seedance 2.0 / MiniMax အတွက် ဇာတ်ဝင်ခန်းအရှည်။',
    '15s': '၁၅ စက္ကန့် — အရှည်ဆုံး Cinematic ဇာတ်ဝင်ခန်း (ထုတ်လုပ်ချိန် ပိုကြာနိုင်ပါသည်)။',
};

export const MODEL_GUIDE: Record<string, string> = {
    'seedance-2.0-fast':
        'ByteDance Seedance 2.0 Fast — မြန်ဆန်ပြီး Reference Image/Video/Audio နှင့် First/Last Frame အားလုံး သုံးနိုင်သည် (အကြံပြုချက်)။',
    'seedance-2.0':
        'ByteDance Seedance 2.0 Standard — အရည်အသွေးအမြင့်ဆုံး Multimodal ဗီဒီယို မော်ဒယ် (Reference Image/Video/Audio + First/Last Frame)။',
    'seedance-2.5':
        'ByteDance Seedance 2.5 — ဇာတ်ကောင်မျက်နှာနှင့် လှုပ်ရှားမှု တိကျမှန်ကန်သော မော်ဒယ် (Reference Image/Video/Audio + First/Last Frame)။',
    'kling-o1-reference-image-to-video':
        'Kling O1 Reference — ပုံပါ ဇာတ်ကောင်ကို နမူနာယူပြီး ရုပ်ရှင်ဆန်သော ဗီဒီယိုဖန်တီးပေးသည့် မော်ဒယ်။',
    'minimax-h3-max-reference-to-video':
        'MiniMax Hailuo H3 Max — လူပုံစံနှင့် ကုန်ပစ္စည်း (Product) ပုံစံ မပျက်ယွင်းစေဘဲ ဗီဒီယိုဖန်တီးပေးသည့် မော်ဒယ်။',
    'wan-2.2-i2v-flash':
        'Wan 2.2 Flash — ပုံကို အစပုံ (Starting Frame) အဖြစ်သုံးပြီး အမြန်နှုန်းဖြင့် ဗီဒီယိုထုတ်ပေးသည့် မော်ဒယ် (480p / 720p)။',
    'wan3.0-video-prime':
        'Wan 3.0 Video Prime — 1080P အရည်အသွေးဖြင့် အစပုံမှ ဆက်လက်လှုပ်ရှားစေသည့် မော်ဒယ်။',
    'ltx-2.5-pro':
        'LTX 2.5 Pro — ကင်မရာရွေ့လျားမှု (Camera Motion) ဦးစားပေး အစပုံအခြေခံ မော်ဒယ်။',
};

export const IMAGE_EDIT_MODEL_GUIDE: Record<EditModel, string> = {
    'p-image-edit':
        'Pruna P Image Edit — ပုံ (၁) ပုံ သို့မဟုတ် (၂) ပုံကို ပေါင်းစပ်ပြုပြင်ရန်၊ စတိုင်ပြောင်းရန် အမြန်ဆုံးနှင့် စရိတ်အသက်သာဆုံး မော်ဒယ် (အကြံပြုချက်)။',
    'multi-image-kontext-max':
        'Multi-Image Kontext Max — လူပုံ (Image 1) နှင့် အဝတ်အစား/ပစ္စည်းပုံ (Image 2) နှစ်ပုံကို ကိုယ်နေဟန်ထား မပျက်ဘဲ ပေါင်းစပ်ပေးသည့် မော်ဒယ်။',
    'flux-kontext-dev':
        'Flux Kontext Dev — ပုံ (၁) ပုံတည်းမှ နောက်ခံပြောင်းခြင်း၊ အလင်းအမှောင်နှင့် အရောင်အသွေး ပြုပြင်ခြင်းအတွက် အကောင်းဆုံး မော်ဒယ်။',
    'seedream-v5-lite-image-to-image':
        'Seedream 5.0 Lite I2I — ဖက်ရှင်၊ Portrait နှင့် ကြော်ငြာဓာတ်ပုံများကို 3K/4K အကြည်နှုန်းဖြင့် အလှပဆုံး ပြောင်းလဲပေးသည့် မော်ဒယ်။',
    'gpt-image-1.5-edit':
        'GPT Image 1.5 Edit — ရှုပ်ထွေးသော Prompt ညွှန်ကြားချက်များနှင့် နောက်ခံအကြည် (Transparent PNG) ထုတ်ယူရန် အသင့်တော်ဆုံး OpenAI မော်ဒယ်။',
    'kling-3-image2image':
        'Kling 3 Image-to-Image — ရုပ်ရှင်ဆန်သော အလင်းအမှောင် (Cinematic Lighting) နှင့် ပတ်ဝန်းကျင်တစ်ခုလုံး ပြောင်းလဲရန် အကောင်းဆုံး မော်ဒယ်။',
    'nano-banana-pro':
        'Nano Banana Pro — မူရင်းမျက်နှာ မပျက်ယွင်းစေဘဲ 4K ပုံရိပ်၊ ကာတွန်းနှင့် စတိုင်အမျိုးမျိုး ပြောင်းလဲပေးသည့် မော်ဒယ်။',
    'ideogram-4.5-edit':
        'Ideogram 4.5 Edit — ပုံပေါ်တွင် စာလုံး/Logo (Typography) အတိအကျ ရေးထိုးရန် သို့မဟုတ် Mask ဖြင့် လိုချင်သည့်နေရာကိုသာ ကွက်ပြင်ရန် အကောင်းဆုံး။',
    'bria-extract-object':
        'Bria Extract Object — ပုံထဲမှ အမည်တပ်ပြောသော အရာဝတ္ထု/လူကိုသာ နောက်ခံဖျောက်ပြီး (Cutout PNG) သီးသန့်ဖြတ်ထုတ်ပေးသည့် မော်ဒယ်။',
};

export const TEXT_TO_IMAGE_MODEL_GUIDE: Record<string, string> = {
    'seedream-v5-lite-text-to-image':
        'Seedream 5.0 Lite — သဘာဝကျသော အရောင်အသွေးဖြင့် အမြန်ဆုံး ပုံထုတ်ပေးသည့် မော်ဒယ် (အကြံပြုချက်)။',
    'nano-banana-2-lite':
        'Nano Banana 2 Lite — Google ၏ ၄ စက္ကန့်အတွင်း အမြန်ဆုံး ပုံဖန်တီးပေးသည့် မော်ဒယ်။',
    'qwen-image-3':
        'Qwen Image 3 — Prompt အတိုင်း အတိအကျ လိုက်နာပြီး ပုံထဲတွင် စာသားများ ရှင်းလင်းစွာ ထည့်သွင်းနိုင်သည့် မော်ဒယ်။',
    'flux-schnell':
        'FLUX.1 Schnell — မြန်ဆန်ပြီး အရည်အသွေးမြင့်မားသော Black Forest Labs မော်ဒယ်။',
    'sdxl':
        'Stable Diffusion XL — အရောင်အသွေး စိုပြည်ပြီး အသေးစိတ်ကျသော စံနှုန်းမြင့် မော်ဒယ်။',
    'flux-dev':
        'FLUX.1 Dev — 28-step ဖြင့် အနုစိတ်အရည်အသွေး အမြင့်ဆုံး ထုတ်ပေးသည့် မော်ဒယ်။',
    'ideogram-4.5':
        'Ideogram 4.5 — Logo၊ ပိုစတာနှင့် စာလုံးဒီဇိုင်း (Typography) များအတွက် အကောင်းဆုံး မော်ဒယ်။',
    'recraft-v4-pro':
        'Recraft V4 Pro — ပုံနှိပ်လုပ်ငန်းနှင့် Brand ဒီဇိုင်းများအတွက် ပြတ်သားသော 2K မော်ဒယ်။',
    'grok-imagine-image-2':
        'Grok Imagine 2 — xAI ၏ အလင်းအမှောင်နှင့် အသားအရေ အစစ်အမှန်ဆန်သော ဓာတ်ပုံမော်ဒယ်။',
};
