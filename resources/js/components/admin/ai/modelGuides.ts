export interface ModelGuide {
    slug: string;
    name: string;
    provider: string;
    category: 'image-generation' | 'image-to-video' | 'image-editing';
    segmindUrl: string;
    summary: string;
    keyFeatures: string[];
    bestUseCases: string[];
    promptTips: string[];
}

export const MODEL_GUIDES: Record<string, ModelGuide> = {
    // ──────────────────────────────────────────────────────────────────────────
    // Image Generation (Text-to-Image)
    // ──────────────────────────────────────────────────────────────────────────
    'seedream-v5-lite-text-to-image': {
        slug: 'seedream-v5-lite-text-to-image',
        name: 'Seedream 5.0 Lite',
        provider: 'ByteDance',
        category: 'image-generation',
        segmindUrl: 'https://www.segmind.com/models/seedream-v5-lite-text-to-image',
        summary:
            'ByteDance မှ ထုတ်လုပ်ထားပြီး မြန်ဆန်သလို ပုံထွက်သဘာဝကျသော Text-to-Image Model ဖြစ်ပါသည်။ အရာဝတ္ထုများ၏ အနေအထားနှင့် အလင်းအမှောင်ကို နားလည်မှုကောင်းမွန်ပြီး စာသားပါဝင်သော ဒီဇိုင်းများအတွက်ပါ အဆင်ပြေပါသည်။',
        keyFeatures: [
            'မြန်ဆန်သော Render Speed နှင့် ကုန်ကျစရိတ်သက်သာမှု',
            'Prompt ထဲမှ စာသားနှင့် ပုံသဏ္ဌာန်အနေအထား (Spatial Logic) ကို တိကျစွာ ဖော်ပြနိုင်ခြင်း',
            'Aspect Ratio မျိုးစုံနှင့် အရည်အသွေးမြင့် Output ထုတ်ပေးနိုင်ခြင်း',
        ],
        bestUseCases: [
            'Social Media Post နှင့် နေ့စဉ် Marketing ပုံများ အမြန်ထုတ်လုပ်ခြင်း',
            'Concept Art နှင့် Product Idea စမ်းသပ်ခြင်း',
            'မြန်မာ/အင်္ဂလိပ် ယဉ်ကျေးမှုဆန်သော ဓာတ်ပုံစတိုင်များ ဖန်တီးခြင်း',
        ],
        promptTips: [
            'Subject, Lighting (ဥပမာ golden hour, studio light), Style (photorealistic, editorial) တို့ကို ရှင်းရှင်းလင်းလင်း ရေးပါ။',
            'ပုံထဲ စာထည့်လိုပါက "..." မျက်တောင်ကွင်းဖြင့် စာသားကို တိတိကျကျ ဖော်ပြပါ။',
        ],
    },
    'nano-banana-2-lite': {
        slug: 'nano-banana-2-lite',
        name: 'Nano Banana 2 Lite',
        provider: 'Google DeepMind',
        category: 'image-generation',
        segmindUrl: 'https://www.segmind.com/models/nano-banana-2-lite',
        summary:
            'Google DeepMind ၏ Gemini နည်းပညာအပေါ် အခြေခံထားသော အမြန်ဆုံး Image Generation Model ဖြစ်ပါသည်။ ၄ စက္ကန့်ဝန်းကျင်အတွင်း ပုံကြမ်းနှင့် Concept များကို လျင်မြန်စွာ ထုတ်ပေးနိုင်ပါသည်။',
        keyFeatures: [
            'အလွန်မြန်ဆန်သော Generation Speed (Low Latency)',
            'Prompt ညွှန်ကြားချက်များကို နားလည်မှုမြင့်မားခြင်း',
            'စမ်းသပ်မှု (Iteration) များစွာ လုပ်ရန် သင့်တော်ခြင်း',
        ],
        bestUseCases: [
            'Template နှင့် Prompt များကို အမြန်စမ်းသပ်ကြည့်ခြင်း',
            'Storyboard ပုံကြမ်းများနှင့် Social Content များ အမြန်ဖန်တီးခြင်း',
        ],
        promptTips: [
            'တိုတိုနှင့် လိုရင်းရောက်သော Visual Prompt များ ရေးသားပါ။',
            'အသေးစိတ်အချက်အလက်များ အလွန်လိုအပ်ပါက FLUX.1 Dev သို့မဟုတ် Recraft V4 Pro ကို ရွေးချယ်ပါ။',
        ],
    },
    'qwen-image-3': {
        slug: 'qwen-image-3',
        name: 'Qwen Image 3',
        provider: 'Alibaba Cloud (Qwen)',
        category: 'image-generation',
        segmindUrl: 'https://www.segmind.com/models/qwen-image-3',
        summary:
            'ပုံထဲတွင် စာသား (Text Rendering) နှင့် Layout များကို တိကျစွာ ထည့်သွင်းဖန်တီးနိုင်သော Alibaba ၏ Text-to-Image Model ဖြစ်ပါသည်။',
        keyFeatures: [
            'ပုံအတွင်း စာသားရေးသားမှု (Typography) တိကျကောင်းမွန်ခြင်း',
            'အာရှ/မြန်မာ မျက်နှာသွင်ပြင်နှင့် ဝတ်စားဆင်ယင်မှုများ သဘာဝကျခြင်း',
            'Complex Scene Composition များကို ကောင်းစွာ ဖန်တီးနိုင်ခြင်း',
        ],
        bestUseCases: [
            'ဆိုင်းဘုတ်၊ ပိုစတာ၊ Banner နှင့် စာသားပါဝင်သော ကြော်ငြာပုံများ',
            'အာရှ/မြန်မာ Style Portrait နှင့် Lifestyle ဓာတ်ပုံများ',
        ],
        promptTips: [
            'စာသားထည့်လိုလျှင် စာသား၏ အရောင်၊ Font စတိုင် (ဥပမာ bold gold 3D text) နှင့် တည်နေရာကိုပါ ထည့်ရေးပါ။',
        ],
    },
    'flux-schnell': {
        slug: 'flux-schnell',
        name: 'FLUX.1 Schnell',
        provider: 'Black Forest Labs',
        category: 'image-generation',
        segmindUrl: 'https://www.segmind.com/models/flux-schnell',
        summary:
            'Black Forest Labs ၏ အမြန်ဆုံး Open-weight Diffusion Model ဖြစ်ပြီး 1-4 Steps ဖြင့် အရည်အသွေးကောင်းသော ပုံများကို ချက်ချင်း ထုတ်ပေးနိုင်ပါသည်။',
        keyFeatures: [
            'Steps အနည်းငယ်ဖြင့် အလွန်မြန်ဆန်စွာ ထွက်ရှိခြင်း',
            'သဘာဝကျသော အလင်းအမှောင်နှင့် အရောင်အသွေး',
            'Prompt Adherence ကောင်းမွန်ခြင်း',
        ],
        bestUseCases: [
            'မြန်မြန်ဆန်ဆန် စမ်းသပ်ထုတ်လုပ်လိုသော Preview ပုံများ',
            'Blog Header နှင့် General Illustration များ',
        ],
        promptTips: [
            'Inference Steps ကို 4 ဝန်းကျင်ထားပြီး Guidance Scale ကို အလွန်မြင့်မထားပါနှင့်။',
        ],
    },
    sdxl: {
        slug: 'sdxl',
        name: 'Stable Diffusion XL (SDXL)',
        provider: 'Stability AI',
        category: 'image-generation',
        segmindUrl: 'https://www.segmind.com/models/sdxl',
        summary:
            'Stability AI ၏ လူသိများသော Classic High-Resolution Model ဖြစ်ပြီး ပန်းချီစတိုင်၊ ဓာတ်ပုံစတိုင်နှင့် Artistic Effect များအတွက် စွယ်စုံသုံးနိုင်ပါသည်။',
        keyFeatures: [
            '1024x1024 Native Resolution ဖြင့် အရောင်စိုပြည်သော ပုံထွက်',
            'Negative Prompt ဖြင့် မလိုချင်သော အရာများကို ထိန်းချုပ်နိုင်ခြင်း',
            'Artistic / Anime / Digital Painting စတိုင်များ စုံလင်ခြင်း',
        ],
        bestUseCases: [
            'Digital Art, Illustration နှင့် Fantasy / Anime စတိုင် ပုံများ',
            'Color tone စိုပြည်သော Artistic Visual များ',
        ],
        promptTips: [
            'Negative Prompt တွင် "blurry, low quality, deformed hands, watermark" စသည်တို့ ထည့်သုံးပါ။',
        ],
    },
    'flux-dev': {
        slug: 'flux-dev',
        name: 'FLUX.1 Dev',
        provider: 'Black Forest Labs',
        category: 'image-generation',
        segmindUrl: 'https://www.segmind.com/models/flux-dev',
        summary:
            'အနုစိတ်အရည်အသွေး (Fine Detail)၊ လူ့အသားအရေ Texture နှင့် ရုပ်ရှင်ဆန်သော Lighting များကို အမြင့်ဆုံးအဆင့် ထုတ်ပေးနိုင်သော Model ဖြစ်ပါသည်။',
        keyFeatures: [
            'Photorealistic Texture နှင့် Micro-detail အလွန်ကောင်းမွန်ခြင်း',
            'ရှုပ်ထွေးသော Prompt များကို တိကျစွာ လိုက်နာနိုင်ခြင်း',
            'လက်ချောင်းနှင့် မျက်နှာအချိုးအစား တည်ငြိမ်မှု မြင့်မားခြင်း',
        ],
        bestUseCases: [
            'High-end Editorial Portrait နှင့် Fashion Photography',
            'Product Photography နှင့် Cinematic Environment များ',
        ],
        promptTips: [
            'Camera lens (ဥပမာ 85mm f/1.8), Lighting နှင့် Material texture များကို အသေးစိတ် ထည့်ရေးပါ။',
        ],
    },
    'ideogram-4.5': {
        slug: 'ideogram-4.5',
        name: 'Ideogram 4.5',
        provider: 'Ideogram',
        category: 'image-generation',
        segmindUrl: 'https://www.segmind.com/models/ideogram-4.5',
        summary:
            'Logo၊ ပိုစတာ၊ T-shirt ဒီဇိုင်းနှင့် စာလုံး Typography များကို ပုံထဲတွင် မှားယွင်းမှုမရှိဘဲ အလှပဆုံး ဖန်တီးပေးနိုင်သော ထိပ်တန်း Model ဖြစ်ပါသည်။',
        keyFeatures: [
            'စာလုံးပေါင်း မှန်ကန်တိကျသော Typography Rendering',
            'Graphic Design, Badge, Poster Layout များ ကျွမ်းကျင်ခြင်း',
            'Magic Prompt နှင့် Style Control စုံလင်ခြင်း',
        ],
        bestUseCases: [
            'Brand Logo, Event Poster, Greeting Card နှင့် Flyer များ',
            'Quote ပုံများနှင့် Social Media Graphic Template များ',
        ],
        promptTips: [
            'ပုံထဲပေါ်စေချင်သော စာသားကို Double Quotes ("...") ထဲထည့်ပြီး Font style (serif, neon, gold foil) ကို တွဲရေးပါ။',
        ],
    },
    'recraft-v4-pro': {
        slug: 'recraft-v4-pro',
        name: 'Recraft V4 Pro',
        provider: 'Recraft AI',
        category: 'image-generation',
        segmindUrl: 'https://www.segmind.com/models/recraft-v4-pro',
        summary:
            'Professional Designer များအတွက် ရည်ရွယ်ထားပြီး 2K Resolution၊ Brand Style ညီညွတ်မှုနှင့် Vector/Print-ready ဒီဇိုင်းများ ထုတ်လုပ်ရာတွင် အထူးကောင်းမွန်ပါသည်။',
        keyFeatures: [
            '2K High-Resolution Print-ready အရည်အသွေး',
            'Clean Vector, Icon, Flat Illustration နှင့် Commercial Design များ',
            'Brand Color Palette နှင့် Layout ညီညွတ်မှု',
        ],
        bestUseCases: [
            'Marketing Banner, App Icon, Packaging နှင့် Print Material များ',
            'Professional Brand Visual Asset များ ဖန်တီးခြင်း',
        ],
        promptTips: [
            'Vector art, clean minimal design, flat illustration, commercial product photography စသည့် Design Keyword များ ထည့်သုံးပါ။',
        ],
    },
    'grok-imagine-image-2': {
        slug: 'grok-imagine-image-2',
        name: 'Grok Imagine 2',
        provider: 'xAI',
        category: 'image-generation',
        segmindUrl: 'https://www.segmind.com/models/grok-imagine-image-2',
        summary:
            'xAI မှ ထုတ်လုပ်ထားပြီး အစစ်အမှန်ဆန်သော လူပုံ၊ သဘာဝရှုခင်းနှင့် Creative Concept များကို အရည်အသွေးမြင့် ထုတ်ပေးနိုင်သော Model ဖြစ်ပါသည်။',
        keyFeatures: [
            'အစစ်အမှန်ဓာတ်ပုံနှင့် တူညီသော Realism အဆင့်မြင့်မားခြင်း',
            'Creative နှင့် Abstract Idea များကိုပါ လိုက်လျောညီထွေ ဖန်တီးနိုင်ခြင်း',
        ],
        bestUseCases: [
            'Realistic Lifestyle နှင့် Nature ဓာတ်ပုံများ',
            'Creative Storytelling Visual များ',
        ],
        promptTips: [
            'သဘာဝကျသော ဓာတ်ပုံဖြစ်စေရန် Candid photography, natural daylight, realistic skin texture စသည်တို့ ထည့်ရေးပါ။',
        ],
    },

    // ──────────────────────────────────────────────────────────────────────────
    // Image to Video & Video Editing
    // ──────────────────────────────────────────────────────────────────────────
    'veo-3.1-fast': {
        slug: 'veo-3.1-fast',
        name: 'Google Veo 3.1 Fast',
        provider: 'Google DeepMind',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/veo-3.1-fast',
        summary:
            'Google DeepMind မှ ဖန်တီးထားပြီး Static ဓာတ်ပုံများမှ 1080p အရည်အသွေးမြင့် ဗီဒီယိုများကို သဘာဝကျသော အသံ (Audio, Music, Dialogue & Lip-sync) နှင့်တကွ မြန်မြန်ဆန်ဆန် ထုတ်ပေးနိုင်သော Image-to-Video Model ဖြစ်ပါသည်။',
        keyFeatures: [
            '1080p Full HD အထိ ကြည်လင်ပြတ်သားသော Cinematic Video ထုတ်ပေးနိုင်ခြင်း',
            'ဗီဒီယိုနှင့် ကိုက်ညီသော ပတ်ဝန်းကျင်အသံ (Ambient), တေးဂီတနှင့် စကားပြော Lip-sync အသံပါ ထည့်ပေးနိုင်ခြင်း',
            '16:9 (Desktop/YouTube) နှင့် 9:16 (TikTok/Reels) Aspect Ratio နှစ်မျိုးလုံး ထောက်ပံ့ခြင်း',
            'ဗီဒီယိုကြာချိန် 4, 6, သို့မဟုတ် 8 စက္ကန့် ရွေးချယ်နိုင်ခြင်း',
            'Negative Prompt, Fixed Seed နှင့် Silent Video (အသံပိတ်) ရွေးချယ်ခွင့် ပါဝင်ခြင်း',
        ],
        bestUseCases: [
            'Social Media Content: TikTok, Reels, YouTube Shorts ဗီဒီယိုတိုများ ဖန်တီးခြင်း',
            'Marketing & Advertising: Product ဓာတ်ပုံများကို ကြော်ငြာဗီဒီယိုအဖြစ် ပြောင်းလဲခြင်း',
            'Storytelling: Storyboard ပုံများမှ Dialogue ပါဝင်သော ဇာတ်ဝင်ခန်းများ ထုတ်လုပ်ခြင်း',
            'Concept Visualization & Digital Art: ဗိသုကာဒီဇိုင်းနှင့် ပန်းချီပုံများကို အသက်သွင်းခြင်း',
        ],
        promptTips: [
            'လှုပ်ရှားမှု (Motion) နှင့် ပတ်ဝန်းကျင်အခြေအနေ (Atmosphere) ကို ရှင်းရှင်းလင်းလင်း ရေးပါ။',
            'Mobile အတွက် 9:16၊ Desktop/YouTube အတွက် 16:9 ရွေးချယ်ပါ။',
            'စမ်းသပ်နေစဉ် အမြန်ရလိုပါက 720p Resolution ကို ရွေးသုံးပြီး အချောထုတ်မှ 1080p သုံးပါ။',
            'ရလဒ်တူညီမှု လိုအပ်ပါက Seed ကို Fixed ထားပြီး မလိုချင်တာဖယ်ရန် Negative Prompt သုံးပါ။',
        ],
    },
    'veo-3.1': {
        slug: 'veo-3.1',
        name: 'Google Veo 3.1',
        provider: 'Google DeepMind',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/veo-3.1',
        summary:
            'Google DeepMind ၏ Flagship Photorealistic Cinema Video Model ဖြစ်ပြီး အမြင့်ဆုံး ရုပ်ရှင်အရည်အသွေး၊ Start/End Frame ထိန်းချုပ်မှုနှင့် Native Audio Sync တို့ကို ပေးစွမ်းနိုင်ပါသည်။',
        keyFeatures: [
            'Flagship Cinematic Photorealism နှင့် 1080p အရည်အသွေး',
            'Native Audio (Dialogue, Sound Effects, Ambient Audio) တစ်ပါတည်း ပါဝင်ခြင်း',
            '4s, 6s, 8s ကြာချိန်နှင့် First/Last Frame ထိန်းချုပ်နိုင်ခြင်း',
            'Camera Motion နှင့် Physics များ အလွန်သဘာဝကျခြင်း',
        ],
        bestUseCases: [
            'High-end Brand Commercials နှင့် ရုပ်ရှင်ဆန်သော ကြော်ငြာဗီဒီယိုများ',
            'အရည်အသွေး အမြင့်ဆုံး လိုအပ်သော Hero Video Production များ',
        ],
        promptTips: [
            'Camera angle (slow dolly in, aerial pan), Lighting နှင့် Audio mood ကိုပါ Prompt ထဲ ထည့်ရေးပေးပါ။',
            'အမြန်စမ်းသပ်လိုလျှင် Veo 3.1 Fast ဖြင့် အရင်စမ်းပြီးမှ Veo 3.1 ဖြင့် Final ထုတ်ပါ။',
        ],
    },
    'kling-o3-video2video-edit': {
        slug: 'kling-o3-video2video-edit',
        name: 'Kling O3 Video-to-Video Edit',
        provider: 'Kuaishou (Kling)',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/kling-o3-video2video-edit',
        summary:
            'ရှိပြီးသား ဗီဒီယိုထဲက လူ၊ အရာဝတ္ထု သို့မဟုတ် နောက်ခံကို Prompt ဖြင့် တိုက်ရိုက် ပြုပြင်ပြောင်းလဲနိုင်သော Video-to-Video Editing Model ဖြစ်ပါသည်။',
        keyFeatures: [
            'ဗီဒီယိုထဲက လူ/အရာဝတ္ထုကို @Element1, @Element2 ဖြင့် တိုက်ရိုက်အစားထိုးနိုင်ခြင်း',
            'Mask ဆွဲစရာမလိုဘဲ နောက်ခံ၊ အလင်းအမှောင်နှင့် စတိုင်ကို စာသားဖြင့် ပြောင်းနိုင်ခြင်း',
            'မူရင်းဗီဒီယို၏ Audio (keep_audio) ကို ထိန်းသိမ်းထားနိုင်ခြင်း',
        ],
        bestUseCases: [
            'ဗီဒီယိုထဲက မော်ဒယ်လ်/ဇာတ်ကောင်ကို ကိုယ်ပိုင် Reference ပုံဖြင့် အစားထိုးခြင်း',
            'ရိုက်ကူးပြီးသား ဗီဒီယို၏ နောက်ခံနှင့် ဝတ်စုံစတိုင် ပြောင်းလဲခြင်း',
        ],
        promptTips: [
            'Reference Element များကို Prompt ထဲတွင် @Element1, @Element2 ဟု တိကျစွာ ညွှန်းဆိုရေးသားပါ။',
            'မူရင်းအသံ ဆက်လိုချင်ပါက Keep Audio ကို True ထားပါ။',
        ],
    },
    'kling-4-video-edit': {
        slug: 'kling-4-video-edit',
        name: 'Kling 4.0 Video Edit',
        provider: 'Kuaishou (Kling)',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/kling-4-video-edit',
        summary:
            'Kling မျိုးဆက်သစ် Video Edit Model ဖြစ်ပြီး ဗီဒီယိုတစ်လျှောက် Temporal Consistency (တုန်ခါမှုမရှိ တည်ငြိမ်မှု) နှင့် အရာဝတ္ထုပြုပြင်မှု ပိုမိုတိကျကောင်းမွန်ပါသည်။',
        keyFeatures: [
            '@Image1, @Image2 များကို ညွှန်းဆို၍ ဗီဒီယိုအတွင်း တိုက်ရိုက်ပြုပြင်နိုင်ခြင်း',
            'Motion Trajectory နှင့် Frame-by-frame တည်ငြိမ်မှု ပိုမိုကောင်းမွန်ခြင်း',
            'Std နှင့် Pro Mode များ ရွေးချယ်နိုင်ခြင်း',
        ],
        bestUseCases: [
            'Product Placement (ဗီဒီယိုထဲ ထုတ်ကုန်ပစ္စည်းအသစ် ထည့်သွင်းခြင်း)',
            'Commercial Video Restyling နှင့် Background Replacement',
        ],
        promptTips: [
            'ပြောင်းလဲလိုသော Reference ပုံများကို Prompt ထဲတွင် @Image1, @Image2 ဖြင့် ချိတ်ဆက်ဖော်ပြပါ။',
        ],
    },
    'gemini-omni-1.2-flash-image-to-video': {
        slug: 'gemini-omni-1.2-flash-image-to-video',
        name: 'Gemini Omni 1.2 Flash I2V',
        provider: 'Google DeepMind',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/gemini-omni-1.2-flash-image-to-video',
        summary:
            'Google ၏ Multimodal Flash Video Model ဖြစ်ပြီး ပုံ ၁ ပုံ (သို့) First/Last Frame ၂ ပုံမှ 3s-15s အထိ ကြော်ငြာဗီဒီယိုများကို အသံနှင့်တကွ မြန်မြန်ဆန်ဆန် ထုတ်ပေးနိုင်ပါသည်။',
        keyFeatures: [
            '3 စက္ကန့်မှ 15 စက္ကန့်အထိ ရှည်လျားသော ဗီဒီယိုများ ဖန်တီးနိုင်ခြင်း',
            'First Frame နှင့် Last Frame နှစ်ခုလုံး သတ်မှတ်၍ Transition ဖန်တီးနိုင်ခြင်း',
            'Native Audio နှင့် မြန်ဆန်သော Processing Speed',
        ],
        bestUseCases: [
            'E-commerce နှင့် Social Media ကြော်ငြာဗီဒီယိုများ',
            'Before / After သို့မဟုတ် Start-to-End Transition ဗီဒီယိုများ',
        ],
        promptTips: [
            'First Frame မှ Last Frame သို့ မည်သို့ပြောင်းလဲသွားမည်ကို Action အဆင့်ဆင့် ရေးပြပါ။',
        ],
    },
    'gemini-omni-1.2-flash-reference-to-video': {
        slug: 'gemini-omni-1.2-flash-reference-to-video',
        name: 'Gemini Omni 1.2 Flash Reference',
        provider: 'Google DeepMind',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/gemini-omni-1.2-flash-reference-to-video',
        summary:
            'ပုံနှင့် ဗီဒီယို Reference များစွာကို စာသား Prompt နှင့် ပေါင်းစပ်ပြီး 3s-15s ဗီဒီယိုအသစ် ဖန်တီးနိုင်သော Multi-Reference Model ဖြစ်ပါသည်။',
        keyFeatures: [
            'Multi-Reference (ပုံများ + Reference Video) တွဲဖက်အသုံးပြုနိုင်ခြင်း',
            '3-15 စက္ကန့်အထိ ကြာချိန်နှင့် Native Audio ပါဝင်ခြင်း',
            'ဇာတ်ကောင်နှင့် Brand Asset များကို မပျက်စီးအောင် ထိန်းပေးနိုင်ခြင်း',
        ],
        bestUseCases: [
            'ဇာတ်ကောင်/ပစ္စည်း ၂ ခု ၃ ခုကို ဇာတ်ဝင်ခန်းတစ်ခုတည်းမှာ တွဲဖက်ပြသခြင်း',
            'Storytelling နှင့် Brand Video များ ဖန်တီးခြင်း',
        ],
        promptTips: [
            'Reference ပုံတစ်ခုချင်းစီက ဗီဒီယိုထဲမှာ ဘာလုပ်ရမလဲဆိုတာ ရှင်းရှင်းလင်းလင်း ခွဲရေးပါ။',
        ],
    },
    'seedance-2.0-fast': {
        slug: 'seedance-2.0-fast',
        name: 'Seedance 2.0 Fast',
        provider: 'ByteDance',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/seedance-2.0-fast',
        summary:
            'ByteDance ၏ မြန်ဆန်ပြီး စွယ်စုံသုံး Multimodal Video Model ဖြစ်ပါသည်။ ပုံ၊ ဗီဒီယိုနှင့် အသံ Reference များကို ပေါင်းစပ်၍ ဗီဒီယိုအမြန် ထုတ်လုပ်နိုင်ပါသည်။',
        keyFeatures: [
            'Quad-Modal (Text, Image, Video, Audio) Reference ထောက်ပံ့ခြင်း',
            'Native Audio Sync နှင့် Lip-sync ပါဝင်ခြင်း',
            'Standard ထက် ပိုမိုမြန်ဆန်ပြီး စမ်းသပ်မှုများအတွက် သင့်တော်ခြင်း',
        ],
        bestUseCases: [
            'TikTok / Reels ဗီဒီယိုတိုများ အမြန်ထုတ်လုပ်ခြင်း',
            'Product Showcase နှင့် Character Animation များ',
        ],
        promptTips: [
            'Prompt ထဲတွင် @Image1, @Video1 စသည်ဖြင့် Reference Asset များကို ညွှန်းဆိုနိုင်ပါသည်။',
        ],
    },
    'seedance-2.0': {
        slug: 'seedance-2.0',
        name: 'Seedance 2.0 Standard',
        provider: 'ByteDance',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/seedance-2.0',
        summary:
            'ByteDance ၏ အရည်အသွေးမြင့် Multimodal Director Video Engine ဖြစ်ပြီး Multi-shot Camera Angle များနှင့် Native Audio တို့ကို တစ်ပြိုင်နက် ဖန်တီးပေးနိုင်ပါသည်။',
        keyFeatures: [
            'Multi-Shot Generation (ကင်မရာရှုထောင့် ပြောင်းလဲမှုများ အလိုအလျောက် ဖန်တီးခြင်း)',
            'Reference Asset များစွာဖြင့် Character/Style Locking ကောင်းမွန်ခြင်း',
            'Phoneme-level Lip-sync နှင့် Rich Audio Generation',
        ],
        bestUseCases: [
            'Short Film, Music Video နှင့် ဇာတ်လမ်းတို ကြော်ငြာများ',
            'အရည်အသွေးအမြင့်ဆုံး Multimodal ဗီဒီယို ထုတ်လုပ်မှုများ',
        ],
        promptTips: [
            'Shot 1, Shot 2 စသည်ဖြင့် ရှုထောင့်ပြောင်းလဲပုံကို ဖော်ပြပေးပါက Multi-shot ပိုကောင်းမွန်စွာ ထွက်ပါသည်။',
        ],
    },
    'seedance-2.5': {
        slug: 'seedance-2.5',
        name: 'Seedance 2.5',
        provider: 'ByteDance',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/seedance-2.5',
        summary:
            'Seedance မျိုးဆက်သစ် Model ဖြစ်ပြီး လူ့မျက်နှာအမူအရာ၊ ခန္ဓာကိုယ်လှုပ်ရှားမှုနှင့် Physics တို့ကို သဘာဝအကျဆုံးနှင့် အကြည်လင်ဆုံး ထုတ်ပေးနိုင်ပါသည်။',
        keyFeatures: [
            'Facial Expression နှင့် Natural Body Motion အလွန်သဘာဝကျခြင်း',
            'High-fidelity Video Quality နှင့် တည်ငြိမ်သော Character Consistency',
            'Native Audio နှင့် Multi-aspect Ratio ထောက်ပံ့ခြင်း',
        ],
        bestUseCases: [
            'Human Portrait Animation နှင့် Lifestyle Presenter ဗီဒီယိုများ',
            'Fashion Model Walk နှင့် Emotion ပါဝင်သော ဇာတ်ဝင်ခန်းများ',
        ],
        promptTips: [
            'မျက်နှာအမူအရာ (smiling softly, looking toward camera) နှင့် လှုပ်ရှားမှုအရှိန်ကို တိတိကျကျ ရေးပေးပါ။',
        ],
    },
    'kling-o1-reference-image-to-video': {
        slug: 'kling-o1-reference-image-to-video',
        name: 'Kling O1 Reference I2V',
        provider: 'Kuaishou (Kling)',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/kling-o1-reference-image-to-video',
        summary:
            'Reference ဓာတ်ပုံထဲက ဇာတ်ကောင် (သို့) ပစ္စည်းပုံစံကို မပျက်စီးစေဘဲ ရုပ်ရှင်ဆန်သော ဗီဒီယိုအဖြစ် ဖန်တီးပေးနိုင်သော Kling O1 Model ဖြစ်ပါသည်။',
        keyFeatures: [
            'Reference Subject Identity ကို ခိုင်ခိုင်မာမာ ထိန်းသိမ်းပေးခြင်း',
            'Cinematic Lighting နှင့် Smooth Camera Movement',
        ],
        bestUseCases: [
            'Character Storytelling နှင့် Brand Mascot Animation',
            'ပုံထဲက လူပုံစံမပျက်ဘဲ နေရာအသစ်မှာ လှုပ်ရှားစေခြင်း',
        ],
        promptTips: [
            'Reference ပုံထဲက Subject ကို ဘယ်လို Action လုပ်စေချင်လဲဆိုတာ ရှင်းရှင်းလင်းလင်း ရေးပါ။',
        ],
    },
    'kling-2.6-standard-motion-control': {
        slug: 'kling-2.6-standard-motion-control',
        name: 'Kling 2.6 Standard Motion Control',
        provider: 'Kuaishou (Kling)',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/kling-2.6-standard-motion-control',
        summary:
            'Reference ဗီဒီယိုထဲက ကကွက် (သို့) ကိုယ်ဟန်လှုပ်ရှားမှုကို ဓာတ်ပုံထဲက လူပေါ်သို့ ကူးပြောင်းပေးနိုင်သော 720p Motion Transfer Model ဖြစ်ပါသည်။',
        keyFeatures: [
            'Driving Video ထဲက အကနှင့် လှုပ်ရှားမှုများကို Target Image သို့ ကူးပြောင်းပေးခြင်း',
            '720p Standard Resolution ဖြင့် ကုန်ကျစရိတ်သက်သာစွာ စမ်းသပ်နိုင်ခြင်း',
        ],
        bestUseCases: [
            'TikTok Dance Trend ဗီဒီယိုများ ဖန်တီးခြင်း',
            'Avatar / Character များကို လူအစစ်လှုပ်ရှားမှုအတိုင်း ကစေခြင်း',
        ],
        promptTips: [
            'Reference Video နှင့် Character Image တို့၏ ကိုယ်ဟန်တည်နေရာ (Orientation: image/video) ကို မှန်အောင် ရွေးပါ။',
        ],
    },
    'kling-2.6-pro-motion-control': {
        slug: 'kling-2.6-pro-motion-control',
        name: 'Kling 2.6 Pro Motion Control',
        provider: 'Kuaishou (Kling)',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/kling-2.6-pro-motion-control',
        summary:
            'Kling 2.6 Motion Control ၏ Pro Version ဖြစ်ပြီး 1080p အကြည်လင်ဆုံး အရည်အသွေးဖြင့် ကကွက်နှင့် ခန္ဓာကိုယ်လှုပ်ရှားမှုများကို တိကျစွာ ကူးပြောင်းပေးပါသည်။',
        keyFeatures: [
            '1080p Pro Quality Motion Transfer',
            'လက်ချောင်းနှင့် ခန္ဓာကိုယ်အသေးစိတ် လှုပ်ရှားမှုများ ပိုမိုတိကျခြင်း',
        ],
        bestUseCases: [
            'Commercial Dance & Fitness Animation များ',
            'အရည်အသွေးမြင့် AI Influencer ဗီဒီယိုများ',
        ],
        promptTips: [
            'အလင်းအမှောင်ညီပြီး ခန္ဓာကိုယ်အပြည့်ပေါ်သော Target Image ကို သုံးပါက ရလဒ်ပိုလှပါသည်။',
        ],
    },
    'kling-3-motion-control-standard': {
        slug: 'kling-3-motion-control-standard',
        name: 'Kling 3.0 Standard Motion Control',
        provider: 'Kuaishou (Kling)',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/kling-3-motion-control-standard',
        summary:
            'Kling 3.0 မျိုးဆက်သစ် Motion Control Model ဖြစ်ပြီး 720p Resolution ဖြင့် ပိုမိုချောမွေ့သော ခန္ဓာကိုယ်နှင့် မျက်နှာလှုပ်ရှားမှု ကူးပြောင်းခြင်းကို ပေးစွမ်းပါသည်။',
        keyFeatures: [
            'Kling 2.6 ထက် ပိုမိုတည်ငြိမ်သော Frame Consistency',
            'လျင်မြန်သော လှုပ်ရှားမှုများတွင် Blur ဖြစ်မှု နည်းပါးခြင်း',
        ],
        bestUseCases: [
            'မြန်ဆန်သော အကနှင့် Action လှုပ်ရှားမှုများ ကူးပြောင်းခြင်း',
            '720p Social Media Motion Content များ',
        ],
        promptTips: [
            'Driving Video ထဲက လူနဲ့ ပုံစံတူ Framing (Full body / Half body) ရှိတဲ့ ပုံကို သုံးပေးပါ။',
        ],
    },
    'kling-3-motion-control-pro': {
        slug: 'kling-3-motion-control-pro',
        name: 'Kling 3.0 Pro Motion Control',
        provider: 'Kuaishou (Kling)',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/kling-3-motion-control-pro',
        summary:
            'အမြင့်ဆုံး 1080p Kling 3.0 Pro Motion Control Model ဖြစ်ပြီး ရှုပ်ထွေးသော ကကွက်များနှင့် အဝတ်အစားလှုပ်ရှားမှု Physics များကို အသက်ဝင်ဆုံး ဖန်တီးပေးပါသည်။',
        keyFeatures: [
            '1080p Ultra-smooth Pro Motion Transfer',
            'အဝတ်အစား၊ ဆံပင်နှင့် မျက်နှာအမူအရာ Physics သဘာဝကျမှု အမြင့်ဆုံး',
        ],
        bestUseCases: [
            'High-budget Music Video နှင့် Brand Campaign များ',
            'Professional Character Performance Capture',
        ],
        promptTips: [
            'Keep Original Sound ဖွင့်ထားပါက Reference ဗီဒီယိုထဲက သီချင်း/အသံအတိုင်း ထွက်လာပါမည်။',
        ],
    },
    'minimax-h3-max-reference-to-video': {
        slug: 'minimax-h3-max-reference-to-video',
        name: 'MiniMax H3 Max I2V',
        provider: 'MiniMax (Hailuo)',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/minimax-h3-max-reference-to-video',
        summary:
            'MiniMax Hailuo ၏ Reference-to-Video Model ဖြစ်ပြီး လူပုံ (သို့) ကုန်ပစ္စည်းပုံစံ မပျက်စီးစေဘဲ ဇာတ်ဝင်ခန်းအသစ်များထဲတွင် ဗီဒီယိုအဖြစ် ဖန်တီးပေးနိုင်ပါသည်။',
        keyFeatures: [
            'Subject Identity နှင့် Product Detail ကို မပျက်အောင် ထိန်းပေးနိုင်ခြင်း',
            'Camera Movement နှင့် Action Prompt များကို တိကျစွာ လိုက်နာခြင်း',
        ],
        bestUseCases: [
            'E-commerce Product Showcase ဗီဒီယိုများ',
            'Character Consistency လိုအပ်သော ဇာတ်လမ်းတိုများ',
        ],
        promptTips: [
            'Subject ၏ အပြုအမူနှင့် ပတ်ဝန်းကျင် Setting ကို တိကျစွာ တွဲရေးပါ။',
        ],
    },
    'wan-2.2-i2v-flash': {
        slug: 'wan-2.2-i2v-flash',
        name: 'Wan 2.2 I2V Flash',
        provider: 'Alibaba Cloud (Wan)',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/wan-2.2-i2v-flash',
        summary:
            'Alibaba ၏ အမြန်ဆုံး Image-to-Video Flash Model ဖြစ်ပြီး အစပုံ (First Frame) မှ ဗီဒီယိုအတိုများကို ကုန်ကျစရိတ်သက်သာစွာ အမြန်ဆုံး ထုတ်ပေးနိုင်ပါသည်။',
        keyFeatures: [
            'အလွန်မြန်ဆန်သော Video Generation Speed',
            'အစပုံ၏ အရောင်နှင့် Composition ကို တည်ငြိမ်စွာ ထိန်းပေးခြင်း',
        ],
        bestUseCases: [
            'Template Preview နှင့် Prompt စမ်းသပ်ခြင်း',
            'ရိုးရှင်းသော Motion Background နှင့် Loop ဗီဒီယိုတိုများ',
        ],
        promptTips: [
            'Subtle camera zoom in, gentle wind blowing hair စသည့် ရိုးရှင်းသော Motion Prompt များနှင့် အထူးကိုက်ညီပါသည်။',
        ],
    },
    'wan3.0-video-prime': {
        slug: 'wan3.0-video-prime',
        name: 'Wan 3.0 Video Prime',
        provider: 'Alibaba Cloud (Wan)',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/wan3.0-video-prime',
        summary:
            'Alibaba ၏ Production-grade 1080p Model ဖြစ်ပြီး Product Texture၊ သဘာဝလှုပ်ရှားမှုနှင့် Native Audio/Lip-sync တို့ကို မြန်မြန်ဆန်ဆန် ထုတ်ပေးနိုင်ပါသည်။',
        keyFeatures: [
            '480p, 720p, 1080p Resolution များ ရွေးချယ်နိုင်ခြင်း',
            'Product Material နှင့် Natural Motion အရည်အသွေးကောင်းမွန်ခြင်း',
            'Native Audio Generation ထောက်ပံ့ခြင်း',
        ],
        bestUseCases: [
            'Commercial Product ဗီဒီယိုများနှင့် Social Ads',
            '1080p အကြည် Image-to-Video ဖန်တီးမှုများ',
        ],
        promptTips: [
            'ပစ္စည်း၏ Texture (glass reflection, water droplets, fabric flow) များကို ထည့်ရေးပါ။',
        ],
    },
    'ltx-2.5-pro': {
        slug: 'ltx-2.5-pro',
        name: 'LTX 2.5 Pro',
        provider: 'Lightricks',
        category: 'image-to-video',
        segmindUrl: 'https://www.segmind.com/models/ltx-2.5-pro',
        summary:
            'Filmmaker များအတွက် ဖန်တီးထားပြီး ကင်မရာရွေ့လျားမှု (Camera Motion Control)၊ Keyframe ထိန်းချုပ်မှုနှင့် Native Audio တို့ကို အသားပေးထားသော Model ဖြစ်ပါသည်။',
        keyFeatures: [
            'Camera Motion Controls (Dolly, Pan, Zoom, Focus Shift) တိကျခြင်း',
            '1080p Resolution နှင့် 10 စက္ကန့်အထိ ဖန်တီးနိုင်ခြင်း',
            'Multi-shot နှင့် Synchronized Audio ပါဝင်ခြင်း',
        ],
        bestUseCases: [
            'Camera Movement အသားပေး ရုပ်ရှင်ရိုက်ချက်များ',
            'Real Estate / Architecture / Scenic Flythrough ဗီဒီယိုများ',
        ],
        promptTips: [
            'Camera movement စကားလုံးများ (slow dolly in, smooth pan left, rack focus) ကို ဦးစားပေး ထည့်ရေးပါ။',
        ],
    },

    // ──────────────────────────────────────────────────────────────────────────
    // Image Editing
    // ──────────────────────────────────────────────────────────────────────────
    'p-image-edit': {
        slug: 'p-image-edit',
        name: 'Pruna P Image Edit',
        provider: 'Pruna AI',
        category: 'image-editing',
        segmindUrl: 'https://www.segmind.com/models/p-image-edit',
        summary:
            'Pruna AI ၏ အလွန်မြန်ဆန်သော Image Editing Model ဖြစ်ပြီး ပုံ ၁-၂ ပုံကို ပေါင်းစပ်ပြုပြင်ခြင်း၊ အရာဝတ္ထုထည့်/ဖျက်ခြင်းနှင့် စတိုင်ပြောင်းခြင်းတို့ကို စက္ကန့်ပိုင်းအတွင်း ပြုလုပ်နိုင်ပါသည်။',
        keyFeatures: [
            'Sub-second Latency နီးပါး အလွန်မြန်ဆန်သော Processing',
            'ပုံ ၁ ပုံ (သို့) ၂ ပုံ ပေါင်းစပ်၍ Natural Language Prompt ဖြင့် ပြင်နိုင်ခြင်း',
            'Prompt ညွှန်ကြားချက် တိကျစွာ လိုက်နာခြင်း',
        ],
        bestUseCases: [
            'Virtual Try-on (ပုံ ၁ ထဲက လူကို ပုံ ၂ ထဲက အဝတ်အစား ဝတ်ပေးခြင်း)',
            'Object Add/Remove နှင့် မြန်ဆန်သော Photo Retouching',
        ],
        promptTips: [
            'ပုံ ၂ ပုံသုံးပါက "image 1" နှင့် "image 2" ဟု ခွဲခြားညွှန်းဆိုပြီး ဘာလုပ်ရမည်ကို ရိုးရိုးရှင်းရှင်း ရေးပါ။',
        ],
    },
    'multi-image-kontext-max': {
        slug: 'multi-image-kontext-max',
        name: 'Multi-Image Kontext Max',
        provider: 'Black Forest Labs',
        category: 'image-editing',
        segmindUrl: 'https://www.segmind.com/models/multi-image-kontext-max',
        summary:
            'လူပုံနှင့် အဝတ်အစား/ပစ္စည်းပုံ ၂ ပုံကို မျက်နှာနှင့် ကိုယ်ဟန်အနေအထား မပျက်စီးစေဘဲ အရည်အသွေးအမြင့်ဆုံး ပေါင်းစပ်ပေးနိုင်သော Kontext Max Model ဖြစ်ပါသည်။',
        keyFeatures: [
            'မူရင်းလူ၏ မျက်နှာနှင့် Pose ကို ခိုင်ခိုင်မာမာ ထိန်းသိမ်းပေးခြင်း',
            'ပစ္စည်း ၂ ခု ပေါင်းစပ်မှုတွင် Lighting နှင့် Shadow ကိုက်ညီမှု မြင့်မားခြင်း',
        ],
        bestUseCases: [
            'Fashion Try-on နှင့် Jewelry / Bag / Product Compositing',
            'မတူညီသော ပုံ ၂ ပုံမှ Subject များကို Scene တစ်ခုတည်း ပေါင်းစပ်ခြင်း',
        ],
        promptTips: [
            'မူရင်း Pose နှင့် Face မပြောင်းလိုလျှင် "maintaining the exact pose and face identity" ဟု ထည့်ရေးပါ။',
        ],
    },
    'flux-kontext-dev': {
        slug: 'flux-kontext-dev',
        name: 'Flux Kontext Dev',
        provider: 'Black Forest Labs',
        category: 'image-editing',
        segmindUrl: 'https://www.segmind.com/models/flux-kontext-dev',
        summary:
            'ပုံ ၁ ပုံတည်းကို Prompt ဖြင့် နောက်ခံပြောင်းခြင်း၊ အဝတ်အစားအရောင်ပြောင်းခြင်း၊ ရာသီဥတုနှင့် စတိုင်ပြောင်းခြင်းတို့ကို တိကျစွာ လုပ်ဆောင်ပေးသော Model ဖြစ်ပါသည်။',
        keyFeatures: [
            'Single-image Context-aware Editing ကျွမ်းကျင်ခြင်း',
            'Mask မလိုဘဲ ပြင်လိုသော အစိတ်အပိုင်းကို Prompt ဖြင့် ပြင်နိုင်ခြင်း',
            'Match Input Image Aspect Ratio ထောက်ပံ့ခြင်း',
        ],
        bestUseCases: [
            'Background Replacement (နောက်ခံမြင်ကွင်း ပြောင်းလဲခြင်း)',
            'Photo Restyling (နေ့မှ ညပြောင်းခြင်း၊ Bokeh effect ထည့်ခြင်း)',
        ],
        promptTips: [
            'မပြောင်းလဲလိုသော အရာများကိုပါ တွဲပြောပါ (ဥပမာ - "Replace background with sunset beach, keeping the person identical")။',
        ],
    },
    'seedream-v5-lite-image-to-image': {
        slug: 'seedream-v5-lite-image-to-image',
        name: 'Seedream 5.0 Lite I2I',
        provider: 'ByteDance',
        category: 'image-editing',
        segmindUrl: 'https://www.segmind.com/models/seedream-v5-lite-image-to-image',
        summary:
            'ByteDance ၏ High-Resolution (3K/4K) Image-to-Image Model ဖြစ်ပြီး ဖက်ရှင်၊ အလှအပဓာတ်ပုံနှင့် Editorial Style ပြောင်းလဲမှုများအတွက် အထူးကောင်းမွန်ပါသည်။',
        keyFeatures: [
            '3K / 4K အထိ အရည်အသွေးမြင့် ထုတ်ပေးနိုင်ခြင်း',
            'Multi-reference Support နှင့် Visual Detail ကြည်လင်ပြတ်သားမှု',
        ],
        bestUseCases: [
            'Fashion Editorial Makeover နှင့် Studio Portrait Enhancement',
            'High-resolution Poster / Lookbook ဓာတ်ပုံများ ပြင်ဆင်ခြင်း',
        ],
        promptTips: [
            'ဖက်ရှင်စတိုင်၊ အထည်သားနှင့် Studio Lighting များကို အသေးစိတ် ထည့်ရေးပါ။',
        ],
    },
    'gpt-image-1.5-edit': {
        slug: 'gpt-image-1.5-edit',
        name: 'GPT Image 1.5 Edit',
        provider: 'OpenAI',
        category: 'image-editing',
        segmindUrl: 'https://www.segmind.com/models/gpt-image-1.5-edit',
        summary:
            'OpenAI ၏ Instruction-following အားအကောင်းဆုံး Image Edit Model ဖြစ်ပြီး ရှုပ်ထွေးသော ညွှန်ကြားချက်များ၊ Inpainting Mask နှင့် Transparent Background (PNG) များပါ ထုတ်ပေးနိုင်ပါသည်။',
        keyFeatures: [
            'ရှုပ်ထွေးပြီး အဆင့်များစွာပါဝင်သော Editing Prompt များကို နားလည်မှု အမြင့်ဆုံး',
            'Transparent Background PNG Output ထောက်ပံ့ခြင်း',
            'Mask ဖြင့် တိကျသော နေရာကွက်ပြင်ဆင်မှု (Inpainting) လုပ်နိုင်ခြင်း',
        ],
        bestUseCases: [
            'Complex Scene Manipulation နှင့် Multi-step Editing',
            'Sticker, Logo, Product Cutout (နောက်ခံအကြည် PNG) များ ထုတ်လုပ်ခြင်း',
        ],
        promptTips: [
            'မြန်မာလိုဖြစ်စေ အင်္ဂလိပ်လိုဖြစ်စေ အသေးစိတ် Instruction များကို ရှင်းရှင်းလင်းလင်း ရေးသားနိုင်ပါသည်။',
        ],
    },
    'kling-3-image2image': {
        slug: 'kling-3-image2image',
        name: 'Kling 3 Image-to-Image',
        provider: 'Kuaishou (Kling)',
        category: 'image-editing',
        segmindUrl: 'https://www.segmind.com/models/kling-3-image2image',
        summary:
            'Kling 3.0 Engine ကို အခြေခံထားပြီး ဓာတ်ပုံ၏ ရုပ်ရှင်အလင်းအမှောင် (Cinematic Lighting)၊ ရာသီဥတုနှင့် ပတ်ဝန်းကျင်မြင်ကွင်းတစ်ခုလုံးကို အဆင့်မြင့် ပြောင်းလဲပေးနိုင်ပါသည်။',
        keyFeatures: [
            'Cinematic Color Grading နှင့် Dramatic Lighting ပြောင်းလဲမှု ကောင်းမွန်ခြင်း',
            '4K အထိ High Resolution Output ထောက်ပံ့ခြင်း',
        ],
        bestUseCases: [
            'သာမန်ဓာတ်ပုံများကို Movie Poster / Cinematic Scene အဖြစ် ပြောင်းလဲခြင်း',
            'Winter, Rain, Golden Hour စသည့် Environment Transformation များ',
        ],
        promptTips: [
            'Cinematic atmosphere, dramatic shadows, volumetric lighting စသည့် စကားလုံးများ ထည့်သုံးပါ။',
        ],
    },
    'nano-banana-pro': {
        slug: 'nano-banana-pro',
        name: 'Nano Banana Pro',
        provider: 'Google DeepMind',
        category: 'image-editing',
        segmindUrl: 'https://www.segmind.com/models/nano-banana-pro',
        summary:
            'Google Gemini 3 Pro Image ကို အခြေခံထားပြီး မျက်နှာ Identity လုံးဝမပျက်ဘဲ 4K အရည်အသွေးမြင့် ဓာတ်ပုံပြင်ဆင်ခြင်း၊ ဘာသာစကားစုံ စာသားထည့်ခြင်းနှင့် စတိုင်ပြောင်းခြင်းတို့တွင် ထူးချွန်ပါသည်။',
        keyFeatures: [
            'မျက်နှာ Identity ထိန်းသိမ်းမှု အလွန်တိကျခြင်း',
            'System Prompt ဖြင့် အထူးစည်းမျဉ်းများ ထပ်ဆင့်ထိန်းချုပ်နိုင်ခြင်း',
            '4K Output နှင့် 3D/Anime/Cartoon စတိုင်ပြောင်းလဲမှု ကောင်းမွန်ခြင်း',
        ],
        bestUseCases: [
            'AI Portrait Filter များ (မြန်မာ့ရိုးရာဝတ်စုံ၊ Anime, 3D Figurine စတိုင်များ)',
            'Poster နှင့် Greeting Card များပေါ်တွင် မျက်နှာအစစ် ထည့်သွင်းခြင်း',
        ],
        promptTips: [
            'System Prompt တွင် "Keep facial identity 100% faithful to the reference image" ဟု ထည့်သုံးပါက မျက်နှာပိုတူပါသည်။',
        ],
    },
    'ideogram-4.5-edit': {
        slug: 'ideogram-4.5-edit',
        name: 'Ideogram 4.5 Edit',
        provider: 'Ideogram',
        category: 'image-editing',
        segmindUrl: 'https://www.segmind.com/models/ideogram-4.5-edit',
        summary:
            'ရှိပြီးသား ပုံ (သို့) Mask နေရာပေါ်တွင် စာလုံး၊ Brand Name နှင့် Logo များကို စာလုံးပေါင်းမမှားဘဲ တိတိကျကျ ရေးထိုးပြုပြင်ပေးနိုင်သော Model ဖြစ်ပါသည်။',
        keyFeatures: [
            'ပုံပေါ်ရှိ စာသားပြင်ဆင်ခြင်း/အသစ်ရေးထိုးခြင်းတွင် အတိကျဆုံး',
            'Mask Region Editing (Inpainting) ထောက်ပံ့ခြင်း',
        ],
        bestUseCases: [
            'Product Packaging / T-shirt / Signboard ပေါ်က စာသားများကို ပြင်ဆင်ပြောင်းလဲခြင်း',
            'Poster ပေါ်တွင် ခေါင်းစဉ်စာသား အသစ်ရေးထိုးခြင်း',
        ],
        promptTips: [
            'ရေးထိုးလိုသော စာသားကို "..." ထဲထည့်ပြီး Mask ပုံတင်ပေးပါက လိုချင်တဲ့နေရာမှာပဲ တိတိကျကျ ပေါ်လာပါမည်။',
        ],
    },
    'bria-extract-object': {
        slug: 'bria-extract-object',
        name: 'Bria Extract Object',
        provider: 'Bria AI',
        category: 'image-editing',
        segmindUrl: 'https://www.segmind.com/models/bria-extract-object',
        summary:
            'ပုံထဲမှ ကိုယ်လိုချင်သော အရာဝတ္ထု (ဥပမာ - လူ၊ မျက်မှန်၊ ဖိနပ်၊ အိတ်) ကိုသာ နောက်ခံဖျောက် (Transparent PNG) အဖြစ် သန့်သန့်ရှင်းရှင်း ဖြတ်ထုတ်ပေးနိုင်သော Model ဖြစ်ပါသည်။',
        keyFeatures: [
            'စာသား Prompt ဖြင့် ဖြတ်ထုတ်လိုသော Object ကို ရွေးချယ်နိုင်ခြင်း',
            'အနားသတ် သန့်ရှင်းသော Transparent PNG Output ရရှိခြင်း',
        ],
        bestUseCases: [
            'E-commerce Product Cutout နှင့် Background Removal',
            'Sticker နှင့် Design Asset များ ဖြတ်ထုတ်ခြင်း',
        ],
        promptTips: [
            'ဖြတ်ထုတ်လိုသော အရာဝတ္ထုအမည်ကို တိုတိုတုတ်တုတ် ရေးပါ (ဥပမာ - "the person", "red dress", "sunglasses")။',
        ],
    },
};

export function getModelGuide(slug?: string | null): ModelGuide | null {
    if (!slug) {
        return null;
    }
    return MODEL_GUIDES[slug] ?? null;
}

export function getModelsByCategory(
    category: ModelGuide['category'],
): ModelGuide[] {
    return Object.values(MODEL_GUIDES).filter((m) => m.category === category);
}
