import { router } from '@inertiajs/react';
import { Image as ImageIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ModelInfoButton } from './ModelInfoButton';
import { ResultPopupModal } from './ResultPopupModal';
import {
    csrfToken,
    IMAGE_EDIT_MODEL_GUIDE,
    SEED_PRESET_DESCRIPTIONS,
    type EditModel,
    type GenerationResult,
} from './types';

export function ImageEditingTab() {
    const [model, setModel] = useState<EditModel>('p-image-edit');
    const [prompt, setPrompt] = useState('');
    const [seedPreset, setSeedPreset] = useState<string>('42');
    const [customSeed, setCustomSeed] = useState('');
    const [processing, setProcessing] = useState(false);
    const [polling, setPolling] = useState(false);
    const [generationId, setGenerationId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<GenerationResult | null>(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const pollStatus = useCallback(async (id: number) => {
        try {
            const response = await fetch(`/admin/ai/generations/${id}`, {
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': csrfToken(),
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                return;
            }

            const data = await response.json();

            if (data.status === 'completed' || data.status === 'failed') {
                setResult({
                    status: data.status,
                    generation: {
                        id: data.id,
                        request_id: data.request_id,
                        operation: data.operation,
                        status: data.status,
                        cost: data.cost,
                        currency: data.currency,
                        duration_ms: data.duration_ms,
                        output: data.output ?? [],
                    },
                });
                setProcessing(false);
                setPolling(false);
                setGenerationId(null);
                setShowResultModal(true);

                if (pollRef.current) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                }

                router.reload({ only: ['generations'] });
            }
        } catch {
            // Keep polling on transient error
        }
    }, []);

    useEffect(() => {
        if (generationId && polling) {
            pollRef.current = setInterval(() => {
                pollStatus(generationId);
            }, 3000);
        }

        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [generationId, polling, pollStatus]);

    // Image 1 inputs (used by all models)
    const [img1Mode, setImg1Mode] = useState<'upload' | 'url'>('upload');
    const [img1File, setImg1File] = useState<File | null>(null);
    const [img1Preview, setImg1Preview] = useState<string | null>(null);
    const [img1Url, setImg1Url] = useState('');
    const file1InputRef = useRef<HTMLInputElement>(null);

    // Image 2 inputs (used by multi-image models)
    const [img2Mode, setImg2Mode] = useState<'upload' | 'url'>('upload');
    const [img2File, setImg2File] = useState<File | null>(null);
    const [img2Preview, setImg2Preview] = useState<string | null>(null);
    const [img2Url, setImg2Url] = useState('');
    const file2InputRef = useRef<HTMLInputElement>(null);

    // Optional Mask image for Ideogram 4.5 Edit
    const [maskMode, setMaskMode] = useState<'upload' | 'url'>('upload');
    const [maskFile, setMaskFile] = useState<File | null>(null);
    const [maskPreview, setMaskPreview] = useState<string | null>(null);
    const [maskUrl, setMaskUrl] = useState('');
    const maskInputRef = useRef<HTMLInputElement>(null);

    // Common and model-specific parameters
    const [aspectRatio, setAspectRatio] = useState('match_input_image');
    const [outputFormat, setOutputFormat] = useState('jpg');

    // Multi-Image Kontext Max
    const [safetyTolerance, setSafetyTolerance] = useState('1');

    // Flux Kontext Dev & Pruna P Image Edit
    const [guidance, setGuidance] = useState('7');
    const [inferenceSteps, setInferenceSteps] = useState('35');
    const [outputQuality, setOutputQuality] = useState('90');
    const [disableSafetyChecker, setDisableSafetyChecker] = useState(false);

    // Seedream 5.0 Lite I2I
    const [seedreamSize, setSeedreamSize] = useState('3K');
    const [maxImages, setMaxImages] = useState('1');
    const [optimizePrompt, setOptimizePrompt] = useState('fast');
    const [watermark, setWatermark] = useState(false);

    // GPT Image 1.5 Edit
    const [gptSize, setGptSize] = useState('auto');
    const [gptQuality, setGptQuality] = useState('high');
    const [gptBackground, setGptBackground] = useState('opaque');
    const [gptCompression, setGptCompression] = useState('100');
    const [gptModeration, setGptModeration] = useState('auto');

    // Kling 3 Image-to-Image
    const [klingResolution, setKlingResolution] = useState('1K');

    // Nano Banana Pro
    const [nanoResolution, setNanoResolution] = useState('4K');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [responseModalities] = useState('TEXT_AND_IMAGE');

    // Ideogram 4.5 Edit
    const [ideogramQuality, setIdeogramQuality] = useState('medium');

    const onImg1Change = (file: File | null) => {
        setImg1File(file);
        setImg1Preview(file ? URL.createObjectURL(file) : null);
    };

    const onImg2Change = (file: File | null) => {
        setImg2File(file);
        setImg2Preview(file ? URL.createObjectURL(file) : null);
    };

    const onMaskChange = (file: File | null) => {
        setMaskFile(file);
        setMaskPreview(file ? URL.createObjectURL(file) : null);
    };

    const isSingleImageModel =
        model === 'flux-kontext-dev' ||
        model === 'kling-3-image2image' ||
        model === 'ideogram-4.5-edit' ||
        model === 'bria-extract-object';

    const generate = async () => {
        setError(null);
        setResult(null);

        if (!prompt.trim()) {
            setError('ကျေးဇူးပြု၍ Prompt ညွှန်ကြားချက် ရေးထည့်ပေးပါ။');
            return;
        }

        const form = new FormData();
        form.append('model', model);
        form.append('prompt', prompt.trim());

        const resolvedSeed =
            seedPreset === 'custom' ? customSeed.trim() : seedPreset;
        if (resolvedSeed !== '') {
            const numericSeed = Number(resolvedSeed);
            if (model === 'p-image-edit' || numericSeed >= 0) {
                form.append('seed', String(numericSeed));
            }
        }

        if (img1Mode === 'upload') {
            if (!img1File) {
                setError(
                    isSingleImageModel
                        ? 'ကျေးဇူးပြု၍ ပုံတစ်ပုံ အရင်တင်ပေးပါ (Upload an input image).'
                        : 'ကျေးဇူးပြု၍ ပုံ (၁) ကို အရင်တင်ပေးပါ (Upload input image 1).',
                );
                return;
            }
            form.append('input_image_1', img1File);
            form.append('input_image', img1File);
        } else {
            if (!img1Url.trim()) {
                setError(
                    isSingleImageModel
                        ? 'ကျေးဇူးပြု၍ ပုံ URL ထည့်ပေးပါ (Enter input image URL).'
                        : 'ကျေးဇူးပြု၍ ပုံ (၁) URL ထည့်ပေးပါ (Enter input image 1 URL).',
                );
                return;
            }
            form.append('input_image_1_url', img1Url.trim());
            form.append('input_image_url', img1Url.trim());
            form.append('image_url', img1Url.trim());
        }

        if (!isSingleImageModel) {
            if (model === 'multi-image-kontext-max') {
                if (img2Mode === 'upload' && !img2File) {
                    setError(
                        'Multi-Image Kontext Max အတွက် ဒုတိယပုံ (Image 2) မဖြစ်မနေ လိုအပ်ပါသည်။',
                    );
                    return;
                }
                if (img2Mode === 'url' && !img2Url.trim()) {
                    setError(
                        'Multi-Image Kontext Max အတွက် ဒုတိယပုံ (Image 2 URL) မဖြစ်မနေ လိုအပ်ပါသည်။',
                    );
                    return;
                }
            }

            if (img2Mode === 'upload' && img2File) {
                form.append('input_image_2', img2File);
            } else if (img2Mode === 'url' && img2Url.trim()) {
                form.append('input_image_2_url', img2Url.trim());
            }
        }

        switch (model) {
            case 'p-image-edit':
                form.append('aspect_ratio', aspectRatio || 'match_input_image');
                form.append(
                    'disable_safety_checker',
                    String(disableSafetyChecker),
                );
                break;

            case 'multi-image-kontext-max':
                form.append('aspect_ratio', aspectRatio);
                form.append('output_format', outputFormat);
                form.append('safety_tolerance', safetyTolerance);
                break;

            case 'flux-kontext-dev':
                form.append('aspect_ratio', aspectRatio || 'match_input_image');
                form.append('guidance', guidance);
                form.append('num_inference_steps', inferenceSteps);
                form.append('output_format', outputFormat || 'png');
                form.append('output_quality', outputQuality);
                form.append(
                    'disable_safety_checker',
                    String(disableSafetyChecker),
                );
                break;

            case 'seedream-v5-lite-image-to-image':
                form.append('aspect_ratio', aspectRatio || '16:9');
                form.append('size', seedreamSize);
                form.append('max_images', maxImages);
                form.append('optimize_prompt', optimizePrompt);
                form.append('watermark', String(watermark));
                break;

            case 'gpt-image-1.5-edit':
                form.append('size', gptSize);
                form.append('quality', gptQuality);
                form.append('background', gptBackground);
                form.append('output_compression', gptCompression);
                form.append('output_format', outputFormat || 'png');
                form.append('moderation', gptModeration);
                break;

            case 'kling-3-image2image':
                form.append('resolution', klingResolution);
                form.append('aspect_ratio', aspectRatio || '16:9');
                form.append('output_format', outputFormat || 'png');
                break;

            case 'nano-banana-pro':
                form.append('aspect_ratio', aspectRatio || '1:1');
                form.append('output_resolution', nanoResolution);
                form.append('output_format', outputFormat || 'jpg');
                form.append('response_modalities', responseModalities);
                if (systemPrompt.trim()) {
                    form.append('system_prompt', systemPrompt.trim());
                }
                break;

            case 'ideogram-4.5-edit':
                form.append('quality', ideogramQuality);
                if (maskMode === 'upload' && maskFile) {
                    form.append('mask', maskFile);
                } else if (maskMode === 'url' && maskUrl.trim()) {
                    form.append('mask_url', maskUrl.trim());
                }
                break;

            case 'bria-extract-object':
                break;
        }

        setProcessing(true);
        setGenerationId(null);
        setPolling(false);
        setShowResultModal(true);

        try {
            const response = await fetch('/admin/ai/image-edit', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': csrfToken(),
                },
                credentials: 'same-origin',
                body: form,
            });

            const body = await response.json();

            if (!response.ok) {
                const message = body.errors
                    ? Object.values(body.errors).flat().join(' ')
                    : body.message;
                setError(message ?? 'Image editing failed.');
                setProcessing(false);
                setShowResultModal(false);
                return;
            }

            if (body.status === 'queued' && body.generation?.id) {
                setGenerationId(body.generation.id);
                setPolling(true);
                setShowResultModal(true);
                return;
            }

            setResult(body);
            setProcessing(false);
            setShowResultModal(true);
        } catch {
            setError(
                'Network error — please check your connection and try again.',
            );
            setProcessing(false);
            setShowResultModal(false);
        }
    };

    return (
        <>
            <AnimatedCard className="w-full">
                <CardContent className="space-y-6 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold">
                                Image Editing Studio (ပုံပြုပြင်ခြင်းနှင့် ပေါင်းစပ်ခြင်း)
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                💡 {IMAGE_EDIT_MODEL_GUIDE[model]}
                            </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <Badge
                                variant="outline"
                                className="px-3 py-1 text-xs font-medium"
                            >
                                {isSingleImageModel
                                    ? 'Single Image (ပုံ ၁ ပုံသုံး)'
                                    : 'Multi-Image (ပုံ ၁-၂ ပုံ ပေါင်းသုံး)'}
                            </Badge>
                            {(result || processing) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 px-4 text-sm"
                                    onClick={() => setShowResultModal(true)}
                                >
                                    {processing
                                        ? 'View Progress'
                                        : 'View Latest Result'}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Step 1: Model Switcher with concise Burmese descriptions next to each model name */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <Label className="text-sm font-semibold">
                                ၁။ AI Image Editing Model ရွေးချယ်ရန်
                            </Label>
                            <ModelInfoButton
                                model={model}
                                category="image-editing"
                                onSelectModel={(slug) =>
                                    setModel(slug as EditModel)
                                }
                            />
                        </div>
                        <Select
                            value={model}
                            onValueChange={(val: EditModel) => {
                                setModel(val);
                                setError(null);
                                if (val === 'p-image-edit') {
                                    setAspectRatio('match_input_image');
                                    setOutputFormat('jpg');
                                } else if (
                                    val === 'multi-image-kontext-max' ||
                                    val === 'nano-banana-pro'
                                ) {
                                    setAspectRatio('1:1');
                                    setOutputFormat('jpg');
                                } else if (
                                    val === 'seedream-v5-lite-image-to-image' ||
                                    val === 'kling-3-image2image'
                                ) {
                                    setAspectRatio('16:9');
                                    setOutputFormat(
                                        val ===
                                            'seedream-v5-lite-image-to-image'
                                            ? 'jpg'
                                            : 'png',
                                    );
                                } else if (val === 'flux-kontext-dev') {
                                    setAspectRatio('match_input_image');
                                    setOutputFormat('png');
                                } else if (
                                    val === 'gpt-image-1.5-edit' ||
                                    val === 'ideogram-4.5-edit' ||
                                    val === 'bria-extract-object'
                                ) {
                                    setOutputFormat('png');
                                }
                            }}
                        >
                            <SelectTrigger className="h-10 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="p-image-edit">
                                    Pruna P Image Edit — ပုံ ၁-၂ ပုံ ပေါင်းစပ်ပြုပြင်ရန် (မြန်ဆန်/အကြံပြုချက်)
                                </SelectItem>
                                <SelectItem value="multi-image-kontext-max">
                                    Multi-Image Kontext Max — လူပုံ + အဝတ်အစား/ပစ္စည်း ၂ ပုံပေါင်းရန်
                                </SelectItem>
                                <SelectItem value="flux-kontext-dev">
                                    Flux Kontext Dev — ပုံ ၁ ပုံတည်း နောက်ခံနှင့် စတိုင်ပြောင်းရန်
                                </SelectItem>
                                <SelectItem value="seedream-v5-lite-image-to-image">
                                    Seedream 5.0 Lite I2I — ဖက်ရှင်နှင့် အလှဓာတ်ပုံ 3K/4K အကြည်ပြောင်းရန်
                                </SelectItem>
                                <SelectItem value="gpt-image-1.5-edit">
                                    GPT Image 1.5 Edit — ရှုပ်ထွေးသော Prompt နှင့် နောက်ခံအကြည် (PNG) ထုတ်ရန်
                                </SelectItem>
                                <SelectItem value="kling-3-image2image">
                                    Kling 3 Image-to-Image — ရုပ်ရှင်အလင်းအမှောင်နှင့် ပတ်ဝန်းကျင်ပြောင်းရန်
                                </SelectItem>
                                <SelectItem value="nano-banana-pro">
                                    Nano Banana Pro — မျက်နှာမပျက် 4K ပုံရိပ်နှင့် ကာတွန်းစတိုင်ပြောင်းရန်
                                </SelectItem>
                                <SelectItem value="ideogram-4.5-edit">
                                    Ideogram 4.5 Edit — ပုံပေါ်တွင် စာလုံး/Logo အတိအကျ ရေးထိုးပြုပြင်ရန်
                                </SelectItem>
                                <SelectItem value="bria-extract-object">
                                    Bria Extract Object — ပုံထဲမှ လိုချင်သောအရာကိုသာ နောက်ခံဖျောက်ဖြတ်ထုတ်ရန်
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Step 2: Reference Images Section */}
                    <div
                        className={`grid gap-5 ${
                            isSingleImageModel && model !== 'ideogram-4.5-edit'
                                ? 'grid-cols-1'
                                : 'md:grid-cols-2'
                        }`}
                    >
                        {/* Image 1 */}
                        <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">
                                    {isSingleImageModel
                                        ? '၂။ မူရင်းပုံ (Input Image) *'
                                        : '၂။ ပထမပုံ / အဓိကပုံ (Image 1) *'}
                                </Label>
                                <div className="flex gap-1.5">
                                    <Button
                                        type="button"
                                        variant={
                                            img1Mode === 'upload'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        size="sm"
                                        className="h-8 px-3 text-xs"
                                        onClick={() => setImg1Mode('upload')}
                                    >
                                        Upload
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={
                                            img1Mode === 'url'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        size="sm"
                                        className="h-8 px-3 text-xs"
                                        onClick={() => setImg1Mode('url')}
                                    >
                                        URL
                                    </Button>
                                </div>
                            </div>

                            {img1Mode === 'upload' ? (
                                <>
                                    <input
                                        ref={file1InputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) =>
                                            onImg1Change(
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                    <div
                                        className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-background/50 text-sm text-muted-foreground hover:bg-muted/30"
                                        onClick={() =>
                                            file1InputRef.current?.click()
                                        }
                                    >
                                        {img1Preview ? (
                                            <img
                                                src={img1Preview}
                                                alt="Preview 1"
                                                className="size-full object-contain p-2"
                                            />
                                        ) : (
                                            <>
                                                <ImageIcon className="h-6 w-6 opacity-50" />
                                                <span className="font-medium">
                                                    {isSingleImageModel
                                                        ? 'မူရင်းပုံ တင်ရန် နှိပ်ပါ (JPG / PNG / WebP)'
                                                        : 'ပထမပုံ (Image 1) တင်ရန် နှိပ်ပါ'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <Input
                                    value={img1Url}
                                    onChange={(e) => setImg1Url(e.target.value)}
                                    placeholder="https://.../image1.jpg"
                                    className="h-10 text-sm"
                                />
                            )}
                        </div>

                        {/* Image 2 (Multi-image models) */}
                        {!isSingleImageModel && (
                            <div className="space-y-3 rounded-xl border border-dashed bg-muted/10 p-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-semibold">
                                        {model === 'multi-image-kontext-max'
                                            ? 'ဒုတိယပုံ / တွဲဖက်ပုံ (Image 2 — မဖြစ်မနေ) *'
                                            : 'ဒုတိယပုံ / တွဲဖက်ပုံ (Image 2 — Optional)'}
                                    </Label>
                                    <div className="flex gap-1.5">
                                        <Button
                                            type="button"
                                            variant={
                                                img2Mode === 'upload'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            size="sm"
                                            className="h-8 px-3 text-xs"
                                            onClick={() =>
                                                setImg2Mode('upload')
                                            }
                                        >
                                            Upload
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={
                                                img2Mode === 'url'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            size="sm"
                                            className="h-8 px-3 text-xs"
                                            onClick={() => setImg2Mode('url')}
                                        >
                                            URL
                                        </Button>
                                    </div>
                                </div>

                                {img2Mode === 'upload' ? (
                                    <>
                                        <input
                                            ref={file2InputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) =>
                                                onImg2Change(
                                                    e.target.files?.[0] ?? null,
                                                )
                                            }
                                        />
                                        <div
                                            className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-background/50 text-sm text-muted-foreground hover:bg-muted/30"
                                            onClick={() =>
                                                file2InputRef.current?.click()
                                            }
                                        >
                                            {img2Preview ? (
                                                <img
                                                    src={img2Preview}
                                                    alt="Preview 2"
                                                    className="size-full object-contain p-2"
                                                />
                                            ) : (
                                                <>
                                                    <ImageIcon className="h-6 w-6 opacity-50" />
                                                    <span className="font-medium">
                                                        ဒုတိယပုံ (Image 2) တင်ရန် နှိပ်ပါ (အဝတ်အစား/နောက်ခံ/Logo)
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <Input
                                        value={img2Url}
                                        onChange={(e) =>
                                            setImg2Url(e.target.value)
                                        }
                                        placeholder="https://.../image2.png"
                                        className="h-10 text-sm"
                                    />
                                )}
                            </div>
                        )}

                        {/* Optional Mask for Ideogram 4.5 Edit */}
                        {model === 'ideogram-4.5-edit' && (
                            <div className="space-y-3 rounded-xl border border-dashed bg-muted/10 p-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-semibold">
                                        Mask ပုံ (ပြင်လိုသောနေရာ ကွက်ပြင်ရန် — Optional)
                                    </Label>
                                    <div className="flex gap-1.5">
                                        <Button
                                            type="button"
                                            variant={
                                                maskMode === 'upload'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            size="sm"
                                            className="h-8 px-3 text-xs"
                                            onClick={() =>
                                                setMaskMode('upload')
                                            }
                                        >
                                            Upload
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={
                                                maskMode === 'url'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            size="sm"
                                            className="h-8 px-3 text-xs"
                                            onClick={() => setMaskMode('url')}
                                        >
                                            URL
                                        </Button>
                                    </div>
                                </div>

                                {maskMode === 'upload' ? (
                                    <>
                                        <input
                                            ref={maskInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) =>
                                                onMaskChange(
                                                    e.target.files?.[0] ?? null,
                                                )
                                            }
                                        />
                                        <div
                                            className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-background/50 text-sm text-muted-foreground hover:bg-muted/30"
                                            onClick={() =>
                                                maskInputRef.current?.click()
                                            }
                                        >
                                            {maskPreview ? (
                                                <img
                                                    src={maskPreview}
                                                    alt="Mask Preview"
                                                    className="size-full object-contain p-2"
                                                />
                                            ) : (
                                                <>
                                                    <ImageIcon className="h-6 w-6 opacity-50" />
                                                    <span className="font-medium">
                                                        Mask ပုံ တင်ရန် နှိပ်ပါ (မထည့်ပါက ပုံတစ်ခုလုံးကို ပြင်ပေးပါမည်)
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <Input
                                        value={maskUrl}
                                        onChange={(e) =>
                                            setMaskUrl(e.target.value)
                                        }
                                        placeholder="https://.../mask.png (Optional)"
                                        className="h-10 text-sm"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Step 3: Prompt */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                            ၃။ ပြုပြင်လိုသည့် ညွှန်ကြားချက် (Prompt) *
                        </Label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={
                                model === 'p-image-edit'
                                    ? 'ဥပမာ - Make the character from image 1 wear the traditional outfit from image 2 in a golden pagoda sunset...'
                                    : model === 'multi-image-kontext-max'
                                      ? 'ဥပမာ - put the green dress on the woman while maintaining the pose of the woman as it is'
                                      : model === 'flux-kontext-dev'
                                        ? 'ဥပမာ - Replace the background with a bokeh light effect, keeping the person pose identical.'
                                        : model ===
                                            'seedream-v5-lite-image-to-image'
                                          ? 'ဥပမာ - Editorial street style fashion photograph of the model wearing an oversized coat...'
                                          : model === 'gpt-image-1.5-edit'
                                            ? 'ဥပမာ - A photorealistic wide shot of the person casually sitting across a street...'
                                            : model === 'kling-3-image2image'
                                              ? 'ဥပမာ - Transform this scene into a magical winter wonderland with cinematic lighting...'
                                              : model === 'ideogram-4.5-edit'
                                                ? 'ဥပမာ - Paint the bold wordmark "HTUT AI" in a gold 3D script across the center...'
                                                : model ===
                                                    'bria-extract-object'
                                                  ? 'ဥပမာ - ဖြတ်ထုတ်လိုသော အရာဝတ္ထုအမည် ရေးပါ ("the person", "sunglasses", "the red dress")...'
                                                  : 'ဥပမာ - Transform the portrait into a realistic Myanmar traditional festival scene...'
                            }
                            className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                        />
                    </div>

                    {/* System Prompt (for Nano Banana Pro) */}
                    {model === 'nano-banana-pro' && (
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                အထူးညွှန်ကြားချက် (System Prompt — Optional)
                            </Label>
                            <Input
                                value={systemPrompt}
                                onChange={(e) =>
                                    setSystemPrompt(e.target.value)
                                }
                                placeholder="ဥပမာ - Keep the face identity 100% accurate and composition suitable for a poster."
                                className="h-10 text-sm"
                            />
                        </div>
                    )}

                    {/* Step 4: Model-Specific Segmind Features */}
                    {model === 'p-image-edit' && (
                        <div className="grid grid-cols-1 gap-4 rounded-xl border bg-muted/15 p-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    ပုံအချိုးအစား (Aspect Ratio)
                                </Label>
                                <Select
                                    value={aspectRatio}
                                    onValueChange={setAspectRatio}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="match_input_image">
                                            Match Input Image (မူရင်းပုံအချိုးအတိုင်း — Default)
                                        </SelectItem>
                                        <SelectItem value="1:1">
                                            1:1 (Square — ပတ်လည်)
                                        </SelectItem>
                                        <SelectItem value="16:9">
                                            16:9 (Landscape — အလျားလိုက်)
                                        </SelectItem>
                                        <SelectItem value="9:16">
                                            9:16 (Portrait / Reels — ဒေါင်လိုက်)
                                        </SelectItem>
                                        <SelectItem value="4:3">
                                            4:3 (Classic Landscape)
                                        </SelectItem>
                                        <SelectItem value="3:4">
                                            3:4 (Classic Portrait)
                                        </SelectItem>
                                        <SelectItem value="3:2">
                                            3:2 (DSLR Landscape)
                                        </SelectItem>
                                        <SelectItem value="2:3">
                                            2:3 (DSLR Portrait)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col justify-center space-y-1.5 pt-2 sm:pt-5">
                                <div className="flex items-center gap-2.5">
                                    <input
                                        type="checkbox"
                                        id="pImageDisableSafety"
                                        checked={disableSafetyChecker}
                                        onChange={(e) =>
                                            setDisableSafetyChecker(
                                                e.target.checked,
                                            )
                                        }
                                        className="h-4 w-4 rounded"
                                    />
                                    <Label
                                        htmlFor="pImageDisableSafety"
                                        className="cursor-pointer text-sm font-medium"
                                    >
                                        Safety Checker ပိတ်မည် (Disable Safety Filter)
                                    </Label>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    ပုံမှန်အားဖြင့် ပိတ်ထားရန် မလိုပါ။ Creative / Fashion ပုံများ စစ်ဆေးမှု တင်းကျပ်နေပါက ဖွင့်သုံးနိုင်ပါသည်။
                                </p>
                            </div>
                        </div>
                    )}

                    {model === 'multi-image-kontext-max' && (
                        <div className="grid grid-cols-1 gap-4 rounded-xl border bg-muted/15 p-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    ပုံအချိုးအစား (Aspect Ratio)
                                </Label>
                                <Select
                                    value={aspectRatio}
                                    onValueChange={setAspectRatio}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1:1">
                                            1:1 (Square — ပတ်လည်)
                                        </SelectItem>
                                        <SelectItem value="16:9">
                                            16:9 (Landscape — အလျားလိုက်)
                                        </SelectItem>
                                        <SelectItem value="9:16">
                                            9:16 (Portrait — ဒေါင်လိုက်)
                                        </SelectItem>
                                        <SelectItem value="4:3">4:3</SelectItem>
                                        <SelectItem value="3:4">3:4</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    စစ်ဆေးမှု အတိုင်းအတာ (Safety Tolerance 1–6)
                                </Label>
                                <Select
                                    value={safetyTolerance}
                                    onValueChange={setSafetyTolerance}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">
                                            1 — အတင်းကျပ်ဆုံး (Strict)
                                        </SelectItem>
                                        <SelectItem value="2">
                                            2 — ပုံမှန် (Balanced)
                                        </SelectItem>
                                        <SelectItem value="3">3</SelectItem>
                                        <SelectItem value="4">4</SelectItem>
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="6">
                                            6 — အလွတ်လပ်ဆုံး (Permissive)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {model === 'flux-kontext-dev' && (
                        <div className="space-y-4 rounded-xl border bg-muted/15 p-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">
                                        ပုံအချိုးအစား (Aspect Ratio)
                                    </Label>
                                    <Select
                                        value={aspectRatio}
                                        onValueChange={setAspectRatio}
                                    >
                                        <SelectTrigger className="h-10 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="match_input_image">
                                                Match Input Image (မူရင်းပုံအတိုင်း)
                                            </SelectItem>
                                            <SelectItem value="1:1">
                                                1:1 (Square — ပတ်လည်)
                                            </SelectItem>
                                            <SelectItem value="16:9">
                                                16:9 (Landscape — အလျားလိုက်)
                                            </SelectItem>
                                            <SelectItem value="9:16">
                                                9:16 (Portrait — ဒေါင်လိုက်)
                                            </SelectItem>
                                            <SelectItem value="4:3">
                                                4:3
                                            </SelectItem>
                                            <SelectItem value="3:4">
                                                3:4
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">
                                        Prompt လိုက်နာမှုအား (Guidance 1–20)
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        min="1"
                                        max="20"
                                        value={guidance}
                                        onChange={(e) =>
                                            setGuidance(e.target.value)
                                        }
                                        placeholder="7"
                                        className="h-10 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">
                                        အနုစိတ် အဆင့်အရေအတွက် (Steps 1–50)
                                    </Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={inferenceSteps}
                                        onChange={(e) =>
                                            setInferenceSteps(e.target.value)
                                        }
                                        placeholder="35"
                                        className="h-10 text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">
                                        ပုံထွက် အရည်အသွေး (Quality 1–100)
                                    </Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={outputQuality}
                                        onChange={(e) =>
                                            setOutputQuality(e.target.value)
                                        }
                                        placeholder="90"
                                        className="h-10 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <input
                                    type="checkbox"
                                    id="disableSafetyChecker"
                                    checked={disableSafetyChecker}
                                    onChange={(e) =>
                                        setDisableSafetyChecker(
                                            e.target.checked,
                                        )
                                    }
                                    className="h-4 w-4 rounded"
                                />
                                <Label
                                    htmlFor="disableSafetyChecker"
                                    className="cursor-pointer text-sm font-medium"
                                >
                                    Safety Checker ပိတ်မည် (Disable Safety Filter)
                                </Label>
                            </div>
                        </div>
                    )}

                    {model === 'seedream-v5-lite-image-to-image' && (
                        <div className="grid grid-cols-1 gap-4 rounded-xl border bg-muted/15 p-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    ပုံအချိုးအစား (Aspect Ratio)
                                </Label>
                                <Select
                                    value={aspectRatio}
                                    onValueChange={setAspectRatio}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="16:9">
                                            16:9 (Landscape)
                                        </SelectItem>
                                        <SelectItem value="1:1">
                                            1:1 (Square)
                                        </SelectItem>
                                        <SelectItem value="9:16">
                                            9:16 (Portrait)
                                        </SelectItem>
                                        <SelectItem value="4:3">4:3</SelectItem>
                                        <SelectItem value="3:4">3:4</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    အကြည်နှုန်း (Image Size)
                                </Label>
                                <Select
                                    value={seedreamSize}
                                    onValueChange={setSeedreamSize}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1K">
                                            1K (Standard)
                                        </SelectItem>
                                        <SelectItem value="2K">
                                            2K (HD)
                                        </SelectItem>
                                        <SelectItem value="3K">
                                            3K (Ultra — Default)
                                        </SelectItem>
                                        <SelectItem value="4K">
                                            4K (Max Detail)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    ထုတ်မည့် ပုံအရေအတွက် (Max Images)
                                </Label>
                                <Select
                                    value={maxImages}
                                    onValueChange={setMaxImages}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">
                                            ၁ ပုံ (1 Image)
                                        </SelectItem>
                                        <SelectItem value="2">
                                            ၂ ပုံ (2 Images)
                                        </SelectItem>
                                        <SelectItem value="3">
                                            ၃ ပုံ (3 Images)
                                        </SelectItem>
                                        <SelectItem value="4">
                                            ၄ ပုံ (4 Images)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    Prompt မြှင့်တင်မှု (Optimize)
                                </Label>
                                <Select
                                    value={optimizePrompt}
                                    onValueChange={setOptimizePrompt}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fast">
                                            Fast (အမြန်နှုန်း)
                                        </SelectItem>
                                        <SelectItem value="standard">
                                            Standard (အသေးစိတ်)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2.5 sm:col-span-2 lg:col-span-4">
                                <input
                                    type="checkbox"
                                    id="seedreamWatermark"
                                    checked={watermark}
                                    onChange={(e) =>
                                        setWatermark(e.target.checked)
                                    }
                                    className="h-4 w-4 rounded"
                                />
                                <Label
                                    htmlFor="seedreamWatermark"
                                    className="cursor-pointer text-sm font-medium"
                                >
                                    Watermark ထည့်မည် (Add Watermark)
                                </Label>
                            </div>
                        </div>
                    )}

                    {model === 'gpt-image-1.5-edit' && (
                        <div className="grid grid-cols-1 gap-4 rounded-xl border bg-muted/15 p-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    အရွယ်အစား (Size)
                                </Label>
                                <Select
                                    value={gptSize}
                                    onValueChange={setGptSize}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">
                                            Auto (အလိုအလျောက်)
                                        </SelectItem>
                                        <SelectItem value="1024x1024">
                                            1024×1024 (1:1 ပတ်လည်)
                                        </SelectItem>
                                        <SelectItem value="1536x1024">
                                            1536×1024 (3:2 အလျားလိုက်)
                                        </SelectItem>
                                        <SelectItem value="1024x1536">
                                            1024×1536 (2:3 ဒေါင်လိုက်)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    အရည်အသွေး (Quality)
                                </Label>
                                <Select
                                    value={gptQuality}
                                    onValueChange={setGptQuality}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="high">
                                            High (အမြင့်ဆုံး)
                                        </SelectItem>
                                        <SelectItem value="medium">
                                            Medium (အလယ်အလတ်)
                                        </SelectItem>
                                        <SelectItem value="low">
                                            Low (အမြန်)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    နောက်ခံပုံစံ (Background)
                                </Label>
                                <Select
                                    value={gptBackground}
                                    onValueChange={setGptBackground}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="opaque">
                                            Opaque (နောက်ခံအပြည့်)
                                        </SelectItem>
                                        <SelectItem value="transparent">
                                            Transparent (နောက်ခံအကြည် PNG)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    စစ်ဆေးမှု (Moderation)
                                </Label>
                                <Select
                                    value={gptModeration}
                                    onValueChange={setGptModeration}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">
                                            Auto (ပုံမှန်)
                                        </SelectItem>
                                        <SelectItem value="low">
                                            Low (လျှော့ပေါ့)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    Compression (1–100%)
                                </Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={gptCompression}
                                    onChange={(e) =>
                                        setGptCompression(e.target.value)
                                    }
                                    placeholder="100"
                                    className="h-10 text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {model === 'kling-3-image2image' && (
                        <div className="grid grid-cols-1 gap-4 rounded-xl border bg-muted/15 p-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    အကြည်နှုန်း (Resolution)
                                </Label>
                                <Select
                                    value={klingResolution}
                                    onValueChange={setKlingResolution}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1K">
                                            1K (Standard HD)
                                        </SelectItem>
                                        <SelectItem value="2K">
                                            2K (Ultra HD)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    ပုံအချိုးအစား (Aspect Ratio)
                                </Label>
                                <Select
                                    value={aspectRatio}
                                    onValueChange={setAspectRatio}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="16:9">
                                            16:9 (Landscape)
                                        </SelectItem>
                                        <SelectItem value="1:1">
                                            1:1 (Square)
                                        </SelectItem>
                                        <SelectItem value="9:16">
                                            9:16 (Portrait)
                                        </SelectItem>
                                        <SelectItem value="4:3">4:3</SelectItem>
                                        <SelectItem value="3:4">3:4</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {model === 'nano-banana-pro' && (
                        <div className="grid grid-cols-1 gap-4 rounded-xl border bg-muted/15 p-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    ပုံအချိုးအစား (Aspect Ratio)
                                </Label>
                                <Select
                                    value={aspectRatio}
                                    onValueChange={setAspectRatio}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1:1">
                                            1:1 (Square — ပတ်လည်)
                                        </SelectItem>
                                        <SelectItem value="16:9">
                                            16:9 (Landscape — အလျားလိုက်)
                                        </SelectItem>
                                        <SelectItem value="9:16">
                                            9:16 (Portrait — ဒေါင်လိုက်)
                                        </SelectItem>
                                        <SelectItem value="4:3">4:3</SelectItem>
                                        <SelectItem value="3:4">3:4</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    အကြည်နှုန်း (Output Resolution)
                                </Label>
                                <Select
                                    value={nanoResolution}
                                    onValueChange={setNanoResolution}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="4K">
                                            4K (အကြည်ဆုံး — Default)
                                        </SelectItem>
                                        <SelectItem value="2K">
                                            2K (HD)
                                        </SelectItem>
                                        <SelectItem value="1K">
                                            1K (Fast)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {model === 'ideogram-4.5-edit' && (
                        <div className="space-y-2 rounded-xl border bg-muted/15 p-4">
                            <Label className="text-sm font-semibold">
                                အရည်အသွေး အဆင့် (Ideogram Quality Tier)
                            </Label>
                            <Select
                                value={ideogramQuality}
                                onValueChange={setIdeogramQuality}
                            >
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="medium">
                                        Medium — ပုံမှန် စံနှုန်း (Standard)
                                    </SelectItem>
                                    <SelectItem value="high">
                                        High — အသေးစိတ် အမြင့်ဆုံး (Maximum Detail)
                                    </SelectItem>
                                    <SelectItem value="low">
                                        Low — အမြန်စမ်းသပ်ရန် (Fast Draft)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {model === 'bria-extract-object' && (
                        <div className="rounded-xl border bg-muted/15 p-4 text-sm text-muted-foreground">
                            ✂️ <strong>Bria Extract Object:</strong> Prompt တွင် ရေးပေးလိုက်သော အရာဝတ္ထု သို့မဟုတ် လူကို အလိုအလျောက် ရွေးထုတ်ပြီး နောက်ခံအကြည် (Transparent Cutout PNG) အဖြစ် ထုတ်ပေးပါမည်။
                        </div>
                    )}

                    {/* Common Output Format & Seed */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                ပုံဖိုင် အမျိုးအစား (Output Format)
                            </Label>
                            <Select
                                value={outputFormat}
                                onValueChange={setOutputFormat}
                            >
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="jpg">
                                        JPG (ဖိုင်ဆိုဒ်သေးပြီး ပေါ့ပါးသည်)
                                    </SelectItem>
                                    <SelectItem value="png">
                                        PNG (အကြည်လင်ဆုံး / Transparent ရသည်)
                                    </SelectItem>
                                    <SelectItem value="webp">
                                        WEBP (Web အတွက် အသင့်တော်ဆုံး)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                ပုံစံထိန်းချုပ်မှု (Seed)
                            </Label>
                            <Select
                                value={seedPreset}
                                onValueChange={setSeedPreset}
                            >
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="-1">
                                        🎲 ကျပန်း (-1 Random — ထုတ်တိုင်းပုံစံသစ်)
                                    </SelectItem>
                                    <SelectItem value="42">
                                        ⚖️ စံနှုန်း (Seed #42 — Default)
                                    </SelectItem>
                                    <SelectItem value="777">
                                        🎥 ရုပ်ရှင်စတိုင် (Seed #777)
                                    </SelectItem>
                                    <SelectItem value="2026">
                                        ⚡ တောက်ပပြတ်သား (Seed #2026)
                                    </SelectItem>
                                    <SelectItem value="custom">
                                        🔢 စိတ်ကြိုက်ဂဏန်း ရိုက်ထည့်မည်...
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {seedPreset === 'custom' && (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                                value={customSeed}
                                onChange={(e) => setCustomSeed(e.target.value)}
                                placeholder="စိတ်ကြိုက် Seed ဂဏန်း ရိုက်ထည့်ပါ (ဥပမာ - 42)"
                                type="number"
                                className="h-10 max-w-sm text-sm"
                            />
                            <span className="text-sm text-muted-foreground">
                                {SEED_PRESET_DESCRIPTIONS.custom}
                            </span>
                        </div>
                    )}

                    {error && (
                        <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    <AnimatedButton
                        type="button"
                        onClick={generate}
                        disabled={processing || !prompt.trim()}
                        className="h-11 w-full text-sm font-semibold"
                    >
                        {processing
                            ? 'ပုံပြုပြင်နေပါသည် (Editing Image...)...'
                            : 'ပုံစတင်ပြုပြင်မည် (Generate Edited Image)'}
                    </AnimatedButton>
                </CardContent>
            </AnimatedCard>

            <ResultPopupModal
                open={showResultModal}
                onClose={() => setShowResultModal(false)}
                processing={processing}
                processingText="ပုံပြုပြင်နေပါသည် — ပုံမှန် ၆ စက္ကန့်မှ ၂၅ စက္ကန့်ခန့် ကြာနိုင်ပါသည်..."
                result={result}
                isVideo={false}
                filenamePrefix="image-edit"
                canSaveTemplate={true}
                onClearResult={() => setResult(null)}
            />
        </>
    );
}
