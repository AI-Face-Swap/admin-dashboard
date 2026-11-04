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
