export type Template = {
    id: number;
    name: string;
    slug: string;
    type: 'image' | 'video';
    model?: string | null;
    thumbnail_path: string | null;
    file_path: string;
    file_url?: string | null;
    reference_video_url?: string | null;
    generation_type?: { id: number; name: string; slug: string } | null;
    ai_model?: {
        id: number;
        name: string;
        model_name: string;
        provider_name: string;
    } | null;
};

export type Generation = {
    id: number;
    operation: string;
    status: string;
    request_id: string | null;
    cost: string | null;
    currency: string | null;
    coins_spent?: number | null;
    points_spent?: number | null;
    duration_ms: number | null;
    input_metadata?: Record<string, any> | null;
    output_metadata: string[] | null;
    error?: string | null;
    created_at: string;
    template: { id: number; name: string; slug: string } | null;
};

export type InputMediaItem = {
    label: string;
    url: string;
    type: 'image' | 'video' | 'audio';
};

export function resolveGenerationModel(generation: {
    operation: string;
    input_metadata?: Record<string, any> | null;
    template?: { name: string } | null;
}): string {
    const meta = generation.input_metadata;
    if (meta?.model && typeof meta.model === 'string') {
        return meta.model;
    }

    if (meta) {
        if ('input_image_2' in meta) return 'multi-image-kontext-max';
        if ('guidance' in meta || 'num_inference_steps' in meta)
            return 'flux-kontext-dev';
        if ('image_input' in meta || 'optimize_prompt' in meta)
            return 'seedream-v5-lite-image-to-image';
        if ('output_compression' in meta || 'moderation' in meta)
            return 'gpt-image-1.5-edit';
        if ('output_resolution' in meta || 'response_modalities' in meta)
            return 'nano-banana-pro';
        if ('style_type' in meta || 'magic_prompt_option' in meta || 'mask' in meta)
            return 'ideogram-4.5-edit';
        if ('disable_safety_checker' in meta && 'image_urls' in meta)
            return 'p-image-edit';
        if ('image_url' in meta && generation.operation.includes('edit'))
            return 'kling-3-image2image';
        if ('image' in meta && generation.operation.includes('edit'))
            return 'bria-extract-object';
    }

    if (generation.operation === 'face-swap') return 'face-swap-v5';
    if (generation.operation === 'video-face-swap') return 'video-face-swap';

    return generation.template?.name || 'default';
}

export function extractInputMediaUrls(
    meta?: Record<string, any> | null,
): InputMediaItem[] {
    if (!meta) return [];
    const items: InputMediaItem[] = [];
    const seen = new Set<string>();

    const pushUrl = (
        label: string,
        val: unknown,
        defaultType: 'image' | 'video' | 'audio' = 'image',
    ) => {
        if (typeof val !== 'string' || !val.startsWith('http')) return;
        if (seen.has(val)) return;
        seen.add(val);
        const lower = val.toLowerCase();
        const type: 'image' | 'video' | 'audio' =
            lower.endsWith('.mp4') ||
            lower.endsWith('.webm') ||
            lower.endsWith('.mov')
                ? 'video'
                : lower.endsWith('.mp3') ||
                    lower.endsWith('.wav') ||
                    lower.endsWith('.m4a')
                  ? 'audio'
                  : defaultType;
        items.push({ label, url: val, type });
    };

    pushUrl('Input Image', meta.input_image);
    pushUrl('Image 1', meta.input_image_1);
    pushUrl('Image 2', meta.input_image_2);
    pushUrl('Image', meta.image);
    pushUrl('Image URL', meta.image_url);
    pushUrl('First Frame', meta.first_frame_url);
    pushUrl('Last Frame', meta.last_frame_url);
    pushUrl('Face Image', meta.face_image || meta.source_image);
    pushUrl('Target Image', meta.target_image);
    pushUrl('Mask Image', meta.mask);
    pushUrl('Source Video', meta.video || meta.video_url, 'video');

    if (Array.isArray(meta.elements)) {
        meta.elements.forEach((el, i) => {
            if (el && typeof el === 'object' && 'frontal_image_url' in el) {
                pushUrl(
                    `Element #${i + 1}`,
                    (el as { frontal_image_url?: unknown }).frontal_image_url,
                );
            }
        });
    }

    if (Array.isArray(meta.image_urls)) {
        meta.image_urls.forEach((u, i) => pushUrl(`Input #${i + 1}`, u));
    }
    if (Array.isArray(meta.image_input)) {
        meta.image_input.forEach((u, i) => pushUrl(`Input #${i + 1}`, u));
    }
    if (Array.isArray(meta.reference_images)) {
        meta.reference_images.forEach((u, i) =>
            pushUrl(`Ref Image #${i + 1}`, u),
        );
    }
    if (Array.isArray(meta.reference_videos)) {
        meta.reference_videos.forEach((u, i) =>
            pushUrl(`Ref Video #${i + 1}`, u, 'video'),
        );
    }
    if (Array.isArray(meta.reference_audios)) {
        meta.reference_audios.forEach((u, i) =>
            pushUrl(`Ref Audio #${i + 1}`, u, 'audio'),
        );
    }

    return items;
}

export function extractKeyInputParams(
    meta?: Record<string, any> | null,
): { key: string; value: string }[] {
    if (!meta) return [];
    const ignoredKeys = new Set([
        'model',
        'prompt',
        'negative_prompt',
        'system_prompt',
        'input_image',
        'input_image_1',
        'input_image_2',
        'image',
        'image_url',
        'image_urls',
        'image_input',
        'reference_images',
        'reference_videos',
        'reference_audios',
        'first_frame_url',
        'last_frame_url',
        'face_image',
        'source_image',
        'target_image',
        'target_video',
        'video',
        'video_url',
        'elements',
        'mask',
    ]);

    const params: { key: string; value: string }[] = [];
    for (const [k, v] of Object.entries(meta)) {
        if (ignoredKeys.has(k) || v === null || v === undefined || v === '') {
            continue;
        }
        if (typeof v === 'string' && v.startsWith('http')) {
            continue;
        }
        params.push({
            key: k.replace(/_/g, ' '),
            value: typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v),
        });
    }
    return params;
}

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
    | 'template'
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
    'gemini-omni-1.2-flash-image-to-video':
        'Google Gemini Omni 1.2 Flash I2V — Start/End Frame မှ 3s–15s ဗီဒီယိုကို Native Audio နှင့် စာလုံးမပျက် On-Screen Text ပါ ထုတ်ပေးသည် (Product/Promo များအတွက် အကောင်းဆုံး)။',
    'gemini-omni-1.2-flash-reference-to-video':
        'Google Gemini Omni 1.2 Flash Reference — Reference ပုံ (၁၀) ပုံ + Reference Video (၃) ခုအထိ (<IMAGE_REF_0>, <IMAGE_REF_1>) တွဲပြီး Brand/Product ကြော်ငြာဗီဒီယို ထုတ်ပေးသည်။',
    'veo-3.1-fast':
        'Google Veo 3.1 Fast — တကယ့် Camera ရိုက်ချက်ကဲ့သို့ Photorealistic လူ/သဘာဝ ဗီဒီယို (4s/6s/8s) ကို Native Audio နှင့် မြန်မြန်ဆန်ဆန် ထုတ်ပေးသည်။',
    'veo-3.1':
        'Google Veo 3.1 — Google Flagship Photorealistic Cinematic ဗီဒီယို + Synchronized Audio (4s/6s/8s) နှင့် First/Last Frame Transition ပါဝင်သည်။',
    'seedance-2.0-fast':
        'ByteDance Seedance 2.0 Fast — မြန်ဆန်ပြီး Reference Image/Video/Audio နှင့် First/Last Frame အားလုံး သုံးနိုင်သည် (အကြံပြုချက်)။',
    'seedance-2.0':
        'ByteDance Seedance 2.0 Standard — အရည်အသွေးအမြင့်ဆုံး Multimodal ဗီဒီယို မော်ဒယ် (Reference Image/Video/Audio + First/Last Frame)။',
    'seedance-2.5':
        'ByteDance Seedance 2.5 — ဇာတ်ကောင်မျက်နှာနှင့် လှုပ်ရှားမှု တိကျမှန်ကန်သော မော်ဒယ် (Reference Image/Video/Audio + First/Last Frame)။',
    'kling-o1-reference-image-to-video':
        'Kling O1 Reference — ပုံပါ ဇာတ်ကောင်ကို နမူနာယူပြီး ရုပ်ရှင်ဆန်သော ဗီဒီယိုဖန်တီးပေးသည့် မော်ဒယ်။',
    'kling-2.6-standard-motion-control':
        'Kling 2.6 Standard Motion Control (720p) — နမူနာဗီဒီယို (Reference Video) ထဲမှ ကကွက်နှင့် လှုပ်ရှားမှုအတိုင်း ပုံပါဇာတ်ကောင်ကို မူရင်းအသံ (Keep Original Sound) အပါအဝင် တိကျစွာ လှုပ်ရှားစေသည့် မော်ဒယ်။',
    'kling-2.6-pro-motion-control':
        'Kling 2.6 Pro Motion Control (1080p) — 1080p Full HD အရည်အသွေးဖြင့် နမူနာဗီဒီယိုထဲမှ ကကွက်နှင့် လှုပ်ရှားမှုအတိုင်း ပုံပါဇာတ်ကောင်ကို မူရင်းအသံအပါအဝင် ကူးပြောင်းပေးသည့် မော်ဒယ်။',
    'kling-3-motion-control-standard':
        'Kling 3.0 Standard Motion Control (720p) — Kling 3.0 မျိုးဆက်သစ် Motion Transfer မော်ဒယ် (ပုံ ၁ ပုံ + Reference Video တွဲတင်ပြီး မူရင်းဗီဒီယိုအသံနှင့် ကကွက်အတိုင်း 720p ထုတ်ပေးသည်)။',
    'kling-3-motion-control-pro':
        'Kling 3.0 Pro Motion Control (1080p) — အမြင့်ဆုံး 1080p Full HD အရည်အသွေးဖြင့် Reference Video ထဲမှ အကနှင့် လှုပ်ရှားမှုအတိုင်း ပုံပါလူကို မူရင်းအသံမပျက် တစ်ထပ်တည်း ကူးပြောင်းပေးသည့် မော်ဒယ်။',
    'kling-o3-video2video-edit':
        'Kling O3 Video-to-Video Edit — မူရင်းဗီဒီယို + အစားထိုးချင်သော ဇာတ်ကောင်ပုံ (@Element1, @Element2) တိုက်ရိုက်တင်ပြီး နောက်ခံ၊ လှုပ်ရှားမှု၊ ပစ္စည်းကိုင်တွယ်မှုနှင့် မူရင်းအသံ မပျက်ဘဲ ဗီဒီယိုထဲက လူကို တစ်ဆင့်တည်း တိုက်ရိုက်လဲပေးသည့် မော်ဒယ် (3s–15s)။',
    'kling-4-video-edit':
        'Kling 4.0 Video Edit — နောက်ဆုံးပေါ် Kling 4.0 ဗီဒီယိုပြုပြင်ရေး မော်ဒယ် (မူရင်းဗီဒီယို + @Image1, @Image2 ပုံများတွဲပြီး လူ/အရာဝတ္ထု/ရာသီဥတု တိုက်ရိုက်ပြောင်းလဲနိုင်သည်၊ 3s–30s / 720p–1080p)။',
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
