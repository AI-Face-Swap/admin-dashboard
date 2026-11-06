import { router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronUp,
    Image as ImageIcon,
    SlidersHorizontal,
} from 'lucide-react';
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
import { ResultPopupModal } from './ResultPopupModal';
import {
    csrfToken,
    DURATION_DESCRIPTIONS,
    MODEL_GUIDE,
    SEED_PRESET_DESCRIPTIONS,
    type GenerationResult,
} from './types';

export function ImageToVideoTab() {
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
    const [imageInputType, setImageInputType] = useState<
        'reference' | 'first_frame_url'
    >('reference');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState('');

    // Optional Last Frame (for first_frame_url mode on Seedance)
    const [lastFrameSource, setLastFrameSource] = useState<'upload' | 'url'>(
        'upload',
    );
    const [lastFrameFile, setLastFrameFile] = useState<File | null>(null);
    const [lastFramePreview, setLastFramePreview] = useState<string | null>(
        null,
    );
    const [lastFrameUrl, setLastFrameUrl] = useState('');

    // Optional Reference Video & Audio (for reference mode on Seedance)
    const [refVideoSource, setRefVideoSource] = useState<'upload' | 'url'>(
        'url',
    );
    const [refVideoFile, setRefVideoFile] = useState<File | null>(null);
    const [refVideoUrl, setRefVideoUrl] = useState('');
    const [refAudioSource, setRefAudioSource] = useState<'upload' | 'url'>(
        'url',
    );
    const [refAudioFile, setRefAudioFile] = useState<File | null>(null);
    const [refAudioUrl, setRefAudioUrl] = useState('');

    const [model, setModel] = useState('seedance-2.0-fast');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [resolution, setResolution] = useState('720p');
    const [duration, setDuration] = useState('5s');
    const [promptExtend, setPromptExtend] = useState(true);
    const [generateAudio, setGenerateAudio] = useState(true);
    const [characterOrientation, setCharacterOrientation] = useState<
        'video' | 'image'
    >('video');
    const [keepOriginalSound, setKeepOriginalSound] = useState(true);
    const [bitrateMode, setBitrateMode] = useState<'standard' | 'high'>(
        'standard',
    );
    const [autoResize, setAutoResize] = useState(true);
    const [seedPreset, setSeedPreset] = useState<string>('-1');
    const [customSeed, setCustomSeed] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [processing, setProcessing] = useState(false);
    const [polling, setPolling] = useState(false);
    const [result, setResult] = useState<GenerationResult | null>(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [error, setError] = useState('');
    const [generationId, setGenerationId] = useState<number | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const lastFrameInputRef = useRef<HTMLInputElement>(null);
    const refVideoInputRef = useRef<HTMLInputElement>(null);
    const refAudioInputRef = useRef<HTMLInputElement>(null);

    const isSeedanceModel = [
        'seedance-2.0',
        'seedance-2.0-fast',
        'seedance-2.5',
    ].includes(model);

    const isKlingMotionControlModel = [
        'kling-2.6-standard-motion-control',
        'kling-2.6-pro-motion-control',
        'kling-3-motion-control-standard',
        'kling-3-motion-control-pro',
    ].includes(model);

    const supportsReferenceVideo =
        (isSeedanceModel && imageInputType === 'reference') ||
        isKlingMotionControlModel;

    const onImageFileChange = (file: File | null) => {
        setImageFile(file);
        setImagePreview(file ? URL.createObjectURL(file) : null);
    };

    const onLastFrameFileChange = (file: File | null) => {
        setLastFrameFile(file);
        setLastFramePreview(file ? URL.createObjectURL(file) : null);
    };

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
                setError('Polling failed — check authentication.');
                setProcessing(false);
                setPolling(false);

                if (pollRef.current) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                }
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
            setError('Polling failed — network error.');
            setProcessing(false);
            setPolling(false);

            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        }
    }, []);

    useEffect(() => {
        if (generationId && polling) {
            pollRef.current = setInterval(() => {
                pollStatus(generationId);
            }, 5000);
        }

        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [generationId, polling, pollStatus]);

    const generate = async () => {
        if (!prompt.trim() && !isKlingMotionControlModel) {
            return;
        }

        if (imageMode === 'upload' && !imageFile) {
            setError(
                'ကျေးဇူးပြု၍ ပုံတစ်ပုံ အရင်တင်ပေးပါ (Upload an image first).',
            );
            return;
        }

        if (imageMode === 'url' && !imageUrl.trim()) {
            setError(
                'ကျေးဇူးပြု၍ ပုံ URL ထည့်ပေးပါ (Enter an image URL).',
            );
            return;
        }

        if (
            isKlingMotionControlModel &&
            ((refVideoSource === 'upload' && !refVideoFile) ||
                (refVideoSource === 'url' && !refVideoUrl.trim()))
        ) {
            setError(
                'Kling Motion Control အတွက် Reference Video (Upload သို့မဟုတ် URL) ထည့်ပေးရန် လိုအပ်ပါသည်။',
            );
            return;
        }

        setProcessing(true);
        setError('');
        setResult(null);
        setGenerationId(null);
        setPolling(false);

        const form = new FormData();
        form.append('prompt', prompt.trim());
        form.append('image_mode', imageInputType);

        if (imageMode === 'upload' && imageFile) {
            form.append('image', imageFile);
        } else {
            form.append('image_url', imageUrl.trim());
        }

        if (isSeedanceModel && imageInputType === 'first_frame_url') {
            if (lastFrameSource === 'upload' && lastFrameFile) {
                form.append('last_frame_image', lastFrameFile);
            } else if (lastFrameSource === 'url' && lastFrameUrl.trim()) {
                form.append('last_frame_url', lastFrameUrl.trim());
            }
        }

        if (supportsReferenceVideo) {
            if (refVideoSource === 'upload' && refVideoFile) {
                form.append('reference_video', refVideoFile);
            } else if (refVideoSource === 'url' && refVideoUrl.trim()) {
                form.append('reference_video_url', refVideoUrl.trim());
            }

            if (isSeedanceModel) {
                if (refAudioSource === 'upload' && refAudioFile) {
                    form.append('reference_audio', refAudioFile);
                } else if (refAudioSource === 'url' && refAudioUrl.trim()) {
                    form.append('reference_audio_url', refAudioUrl.trim());
                }
            }
        }

        if (isKlingMotionControlModel) {
            form.append('character_orientation', characterOrientation);
            form.append('keep_original_sound', String(keepOriginalSound));
        }

        if (negativePrompt.trim()) {
            form.append('negative_prompt', negativePrompt.trim());
        }

        form.append('resolution', resolution);
        form.append('model', model);
        form.append('aspect_ratio', aspectRatio);
        form.append('duration', duration);
        form.append('prompt_extend', String(promptExtend));
        form.append('generate_audio', String(generateAudio));
        form.append('bitrate_mode', bitrateMode);
        form.append('auto_resize', String(autoResize));

        const resolvedSeed =
            seedPreset === 'custom' ? customSeed.trim() : seedPreset;
        if (resolvedSeed !== '') {
            form.append('seed', resolvedSeed);
        }

        try {
            const response = await fetch('/admin/ai/image-to-video', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': csrfToken(),
                },
                credentials: 'same-origin',
                body: form,
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Generation failed.');
                setProcessing(false);
                return;
            }

            setGenerationId(data.generation.id);
            setPolling(true);
            setShowResultModal(true);
        } catch {
            setError('Network error — please try again.');
            setProcessing(false);
        }
    };

    return (
        <>
            <AnimatedCard className="w-full">
                <CardContent className="space-y-6 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold">
                                Image to Video Studio
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                💡 {MODEL_GUIDE[model]}
                            </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <Badge variant="outline" className="px-3 py-1 text-xs font-medium">
                                {imageInputType === 'reference'
                                    ? 'Reference Mode (Default)'
                                    : 'First Frame Mode'}
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

                    {/* Row 1: AI Model + Image Mode side-by-side */}
                    <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                ၁။ AI Video Model
                            </Label>
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="seedance-2.0-fast">
                                        Seedance 2.0 Fast — မြန်ဆန်ပြီး ပုံ/ဗီဒီယို/အသံ အစုံသုံးနိုင်သည် (အကြံပြုချက်)
                                    </SelectItem>
                                    <SelectItem value="seedance-2.0">
                                        Seedance 2.0 Standard — အရည်အသွေးအမြင့်ဆုံး Multimodal ဗီဒီယိုထုတ်ရန်
                                    </SelectItem>
                                    <SelectItem value="seedance-2.5">
                                        Seedance 2.5 — မျက်နှာနှင့် လှုပ်ရှားမှု သဘာဝအကျဆုံး ဗီဒီယိုထုတ်ရန်
                                    </SelectItem>
                                    <SelectItem value="kling-o1-reference-image-to-video">
                                        Kling Reference I2V — ပုံပါဇာတ်ကောင်အတိုင်း ရုပ်ရှင်ဆန်သော ဗီဒီယိုထုတ်ရန်
                                    </SelectItem>
                                    <SelectItem value="kling-2.6-standard-motion-control">
                                        Kling 2.6 Standard Motion Control — ကကွက်/လှုပ်ရှားမှု ကူးပြောင်းရန် (720p)
                                    </SelectItem>
                                    <SelectItem value="kling-2.6-pro-motion-control">
                                        Kling 2.6 Pro Motion Control — ကကွက်/လှုပ်ရှားမှု ကူးပြောင်းရန် (1080p Pro)
                                    </SelectItem>
                                    <SelectItem value="kling-3-motion-control-standard">
                                        Kling 3.0 Standard Motion Control — မျိုးဆက်သစ် ကကွက်ကူးပြောင်းမှု (720p)
                                    </SelectItem>
                                    <SelectItem value="kling-3-motion-control-pro">
                                        Kling 3.0 Pro Motion Control — အမြင့်ဆုံး 1080p ကကွက်ကူးပြောင်းမှု (Pro)
                                    </SelectItem>
                                    <SelectItem value="minimax-h3-max-reference-to-video">
                                        MiniMax H3 Max I2V — လူနှင့် ကုန်ပစ္စည်းပုံစံ မပျက်ဘဲ ဗီဒီယိုထုတ်ရန်
                                    </SelectItem>
                                    <SelectItem value="wan-2.2-i2v-flash">
                                        Wan 2.2 I2V Flash — အစပုံမှ အမြန်ဆုံး ဗီဒီယိုအတိုထုတ်ရန်
                                    </SelectItem>
                                    <SelectItem value="wan3.0-video-prime">
                                        Wan 3.0 Video Prime — အစပုံမှ 1080P အကြည် ဗီဒီယိုထုတ်ရန်
                                    </SelectItem>
                                    <SelectItem value="ltx-2.5-pro">
                                        LTX 2.5 Pro — ကင်မရာရွေ့လျားမှု (Camera Motion) အသားပေးရိုက်ချက်အတွက်
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                ၂။ ဓာတ်ပုံ အသုံးပြုမည့် ပုံစံ (Image Mode)
                            </Label>
                            <Select
                                value={imageInputType}
                                onValueChange={(v) =>
                                    setImageInputType(
                                        v as 'reference' | 'first_frame_url',
                                    )
                                }
                            >
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="reference">
                                        Reference Image (ပုံပါ လူ/အရာဝတ္ထု နမူနာယူမည် — Default)
                                    </SelectItem>
                                    <SelectItem value="first_frame_url">
                                        First Frame (first_frame_url — ဗီဒီယို အစပုံအဖြစ် သုံးမည်)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 2: Media Inputs side-by-side */}
                    <div
                        className={`grid gap-5 ${
                            isSeedanceModel || isKlingMotionControlModel
                                ? 'md:grid-cols-2'
                                : 'grid-cols-1'
                        }`}
                    >
                        {/* Primary Image */}
                        <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">
                                    {imageInputType === 'reference'
                                        ? '၃။ Reference Image (အဓိက နမူနာပုံ) *'
                                        : '၃။ First Frame (အစပုံ) *'}
                                </Label>
                                <div className="flex gap-1.5">
                                    <Button
                                        type="button"
                                        variant={
                                            imageMode === 'upload'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        size="sm"
                                        className="h-8 px-3 text-xs"
                                        onClick={() => setImageMode('upload')}
                                    >
                                        Upload
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={
                                            imageMode === 'url'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        size="sm"
                                        className="h-8 px-3 text-xs"
                                        onClick={() => setImageMode('url')}
                                    >
                                        URL
                                    </Button>
                                </div>
                            </div>

                            {imageMode === 'upload' ? (
                                <>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) =>
                                            onImageFileChange(
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                    <div
                                        className="flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-background/50 text-sm text-muted-foreground hover:bg-muted/30"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                    >
                                        {imagePreview ? (
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="size-full object-contain p-2"
                                            />
                                        ) : (
                                            <>
                                                <ImageIcon className="h-6 w-6 opacity-60" />
                                                <span className="font-medium">
                                                    ပုံရွေးချယ်ရန် နှိပ်ပါ (JPG / PNG / WebP)
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <Input
                                    value={imageUrl}
                                    onChange={(e) =>
                                        setImageUrl(e.target.value)
                                    }
                                    placeholder="https://example.com/input-image.jpg"
                                    className="h-10 text-sm"
                                />
                            )}
                        </div>

                        {/* Secondary Media Box for Seedance: Last Frame OR Reference Video/Audio */}
                        {isSeedanceModel &&
                            imageInputType === 'first_frame_url' && (
                                <div className="space-y-3 rounded-xl border border-dashed bg-muted/10 p-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-semibold">
                                            Last Frame (အဆုံးသတ်ပုံ — Optional)
                                        </Label>
                                        <div className="flex gap-1.5">
                                            <Button
                                                type="button"
                                                variant={
                                                    lastFrameSource === 'upload'
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                size="sm"
                                                className="h-8 px-3 text-xs"
                                                onClick={() =>
                                                    setLastFrameSource('upload')
                                                }
                                            >
                                                Upload
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={
                                                    lastFrameSource === 'url'
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                size="sm"
                                                className="h-8 px-3 text-xs"
                                                onClick={() =>
                                                    setLastFrameSource('url')
                                                }
                                            >
                                                URL
                                            </Button>
                                        </div>
                                    </div>

                                    {lastFrameSource === 'upload' ? (
                                        <>
                                            <input
                                                ref={lastFrameInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) =>
                                                    onLastFrameFileChange(
                                                        e.target.files?.[0] ??
                                                            null,
                                                    )
                                                }
                                            />
                                            <div
                                                className="flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-background/50 text-sm text-muted-foreground hover:bg-muted/30"
                                                onClick={() =>
                                                    lastFrameInputRef.current?.click()
                                                }
                                            >
                                                {lastFramePreview ? (
                                                    <img
                                                        src={lastFramePreview}
                                                        alt="Last Frame Preview"
                                                        className="size-full object-contain p-2"
                                                    />
                                                ) : (
                                                    <span className="font-medium">
                                                        အဆုံးသတ်ပုံ (Last Frame) တင်ရန် နှိပ်ပါ
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <Input
                                            value={lastFrameUrl}
                                            onChange={(e) =>
                                                setLastFrameUrl(e.target.value)
                                            }
                                            placeholder="https://example.com/last-frame.jpg (Optional)"
                                            className="h-10 text-sm"
                                        />
                                    )}
                                </div>
                            )}

                        {supportsReferenceVideo && (
                            <div className="flex flex-col justify-between gap-4 rounded-xl border border-dashed bg-muted/10 p-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-semibold">
                                            🎬 Reference Video (လှုပ်ရှားမှု နမူနာ{' '}
                                            {isKlingMotionControlModel
                                                ? '— Required *'
                                                : '— Optional'}
                                            )
                                        </Label>
                                        <div className="flex gap-1.5">
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="h-7 px-2.5 text-xs"
                                                variant={
                                                    refVideoSource === 'url'
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                onClick={() =>
                                                    setRefVideoSource('url')
                                                }
                                            >
                                                URL
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="h-7 px-2.5 text-xs"
                                                variant={
                                                    refVideoSource === 'upload'
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                onClick={() =>
                                                    setRefVideoSource('upload')
                                                }
                                            >
                                                Upload
                                            </Button>
                                        </div>
                                    </div>
                                    {refVideoSource === 'url' ? (
                                        <Input
                                            value={refVideoUrl}
                                            onChange={(e) =>
                                                setRefVideoUrl(e.target.value)
                                            }
                                            placeholder="https://.../motion-ref.mp4 (@Video 1)"
                                            className="h-10 text-sm"
                                        />
                                    ) : (
                                        <>
                                            <input
                                                ref={refVideoInputRef}
                                                type="file"
                                                accept="video/mp4,video/quicktime,video/webm"
                                                className="hidden"
                                                onChange={(e) =>
                                                    setRefVideoFile(
                                                        e.target.files?.[0] ??
                                                            null,
                                                    )
                                                }
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-10 w-full text-sm"
                                                onClick={() =>
                                                    refVideoInputRef.current?.click()
                                                }
                                            >
                                                {refVideoFile
                                                    ? `ရွေးထားသည်: ${refVideoFile.name}`
                                                    : 'ဗီဒီယိုဖိုင် ရွေးချယ်ရန် (MP4/MOV)'}
                                            </Button>
                                        </>
                                    )}
                                </div>

                                {isSeedanceModel && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm font-semibold">
                                                🎵 Reference Audio (အသံစည်းချက် — Optional)
                                            </Label>
                                            <div className="flex gap-1.5">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="h-7 px-2.5 text-xs"
                                                    variant={
                                                        refAudioSource === 'url'
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    onClick={() =>
                                                        setRefAudioSource('url')
                                                    }
                                                >
                                                    URL
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="h-7 px-2.5 text-xs"
                                                    variant={
                                                        refAudioSource ===
                                                        'upload'
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    onClick={() =>
                                                        setRefAudioSource(
                                                            'upload',
                                                        )
                                                    }
                                                >
                                                    Upload
                                                </Button>
                                            </div>
                                        </div>
                                        {refAudioSource === 'url' ? (
                                            <Input
                                                value={refAudioUrl}
                                                onChange={(e) =>
                                                    setRefAudioUrl(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="https://.../audio-ref.mp3 (@Audio 1)"
                                                className="h-10 text-sm"
                                            />
                                        ) : (
                                            <>
                                                <input
                                                    ref={refAudioInputRef}
                                                    type="file"
                                                    accept="audio/mpeg,audio/mp3,audio/wav"
                                                    className="hidden"
                                                    onChange={(e) =>
                                                        setRefAudioFile(
                                                            e.target
                                                                .files?.[0] ??
                                                                null,
                                                        )
                                                    }
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-10 w-full text-sm"
                                                    onClick={() =>
                                                        refAudioInputRef.current?.click()
                                                    }
                                                >
                                                    {refAudioFile
                                                        ? `ရွေးထားသည်: ${refAudioFile.name}`
                                                        : 'အသံဖိုင် ရွေးချယ်ရန် (MP3/WAV)'}
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                )}

                                {isKlingMotionControlModel && (
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold">
                                                Character Orientation
                                            </Label>
                                            <Select
                                                value={characterOrientation}
                                                onValueChange={(v) =>
                                                    setCharacterOrientation(
                                                        v as 'video' | 'image',
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="h-9 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="video">
                                                        Video (ဗီဒီယို လှုပ်ရှားမှုအတိုင်း — 30s အထိ)
                                                    </SelectItem>
                                                    <SelectItem value="image">
                                                        Image (ပုံပါ အနေအထားအတိုင်း — 10s အထိ)
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold">
                                                မူရင်းအသံ (Keep Original Sound)
                                            </Label>
                                            <Select
                                                value={
                                                    keepOriginalSound
                                                        ? 'true'
                                                        : 'false'
                                                }
                                                onValueChange={(v) =>
                                                    setKeepOriginalSound(
                                                        v === 'true',
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="h-9 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="true">
                                                        🔊 မူရင်းဗီဒီယိုအသံ ယူမည် (True)
                                                    </SelectItem>
                                                    <SelectItem value="false">
                                                        🔇 အသံမယူပါ (False)
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Row 3: Prompt */}
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <Label className="text-sm font-semibold">
                                ၄။ ဇာတ်ဝင်ခန်း ညွှန်ကြားချက် (Prompt) *
                            </Label>
                            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                                <input
                                    type="checkbox"
                                    checked={promptExtend}
                                    onChange={(e) =>
                                        setPromptExtend(e.target.checked)
                                    }
                                    className="h-4 w-4 rounded"
                                />
                                <span>
                                    AI Prompt ချဲ့ထွင်မည် (Prompt Extend)
                                </span>
                            </label>
                        </div>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={3}
                            placeholder="ဥပမာ - ပုံထဲက ဇာတ်ကောင်က ရှေးဟောင်းဘုရားကျောင်းဝင်းထဲမှာ ကွန်ဖူးကစားနေပုံ၊ ရုပ်ရှင်အလင်းအမှောင်..."
                            className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                        />
                    </div>

                    {/* Row 4: 4-Column Core Parameters */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                အချိုးအစား (Ratio)
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
                                    <SelectItem value="9:16">
                                        9:16 (Portrait/Reels)
                                    </SelectItem>
                                    <SelectItem value="1:1">
                                        1:1 (Square)
                                    </SelectItem>
                                    <SelectItem value="4:3">4:3</SelectItem>
                                    <SelectItem value="3:4">3:4</SelectItem>
                                    <SelectItem value="adaptive">
                                        Adaptive (ပုံအတိုင်း)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                အကြည်နှုန်း (Resolution)
                            </Label>
                            <Select
                                value={resolution}
                                onValueChange={setResolution}
                            >
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="480p">
                                        480p (Fast Draft)
                                    </SelectItem>
                                    <SelectItem value="720p">
                                        720p (HD Balanced)
                                    </SelectItem>
                                    <SelectItem value="1080p">
                                        1080p (Full HD)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                ကြာချိန် (Duration)
                            </Label>
                            <Select
                                value={duration}
                                onValueChange={setDuration}
                            >
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="4s">
                                        4s (Short Clip)
                                    </SelectItem>
                                    <SelectItem value="5s">
                                        5s (Default စံနှုန်း)
                                    </SelectItem>
                                    <SelectItem value="6s">
                                        6s (Action Scene)
                                    </SelectItem>
                                    <SelectItem value="8s">
                                        8s (Medium Scene)
                                    </SelectItem>
                                    <SelectItem value="10s">
                                        10s (Multi-shot)
                                    </SelectItem>
                                    <SelectItem value="12s">
                                        12s (Extended)
                                    </SelectItem>
                                    <SelectItem value="15s">
                                        15s (Max Cinematic)
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
                                        🎲 ကျပန်း (-1 Random)
                                    </SelectItem>
                                    <SelectItem value="42">
                                        ⚖️ စံနှုန်း (Seed #42)
                                    </SelectItem>
                                    <SelectItem value="777">
                                        🎥 ရုပ်ရှင် (Seed #777)
                                    </SelectItem>
                                    <SelectItem value="2026">
                                        ⚡ အက်ရှင် (Seed #2026)
                                    </SelectItem>
                                    <SelectItem value="custom">
                                        🔢 စိတ်ကြိုက်ဂဏန်း...
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
                                placeholder="စိတ်ကြိုက် Seed ဂဏန်း ရိုက်ထည့်ပါ (0 မှ 4294967295)"
                                type="number"
                                className="h-10 max-w-sm text-sm"
                            />
                            <span className="text-sm text-muted-foreground">
                                {SEED_PRESET_DESCRIPTIONS.custom}
                            </span>
                        </div>
                    )}

                    {/* Row 5: Collapsible Advanced Settings */}
                    <div className="rounded-xl border bg-muted/20">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced((v) => !v)}
                            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/40"
                        >
                            <span className="inline-flex items-center gap-2">
                                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                                အသေးစိတ် ချိန်ညှိချက်များ (Negative Prompt, Audio, Bitrate, Auto-Resize)
                            </span>
                            <div className="flex items-center gap-2.5">
                                {isSeedanceModel && (
                                    <span className="text-xs font-normal text-muted-foreground">
                                        {generateAudio
                                            ? '🔊 Audio ON'
                                            : '🔇 Silent'}{' '}
                                        •{' '}
                                        {bitrateMode === 'high'
                                            ? 'High Bitrate'
                                            : 'Standard'}
                                    </span>
                                )}
                                {showAdvanced ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                            </div>
                        </button>

                        {showAdvanced && (
                            <div className="space-y-4 border-t p-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">
                                        မပါဝင်စေလိုသော အချက်များ (Negative Prompt)
                                    </Label>
                                    <Input
                                        value={negativePrompt}
                                        onChange={(e) =>
                                            setNegativePrompt(e.target.value)
                                        }
                                        placeholder="blurry, low quality, face change, text overlays"
                                        className="h-10 text-sm"
                                    />
                                </div>

                                {isSeedanceModel && (
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold">
                                                AI အသံ (Generate Audio)
                                            </Label>
                                            <Select
                                                value={
                                                    generateAudio
                                                        ? 'true'
                                                        : 'false'
                                                }
                                                onValueChange={(v) =>
                                                    setGenerateAudio(
                                                        v === 'true',
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="h-10 text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="true">
                                                        🔊 အသံပါ ထည့်မည် (BGM/SFX)
                                                    </SelectItem>
                                                    <SelectItem value="false">
                                                        🔇 အသံမပါ (Silent)
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold">
                                                Bitrate အရည်အသွေး
                                            </Label>
                                            <Select
                                                value={bitrateMode}
                                                onValueChange={(v) =>
                                                    setBitrateMode(
                                                        v as
                                                            | 'standard'
                                                            | 'high',
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="h-10 text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="standard">
                                                        Standard (ပုံမှန် အရည်အသွေး)
                                                    </SelectItem>
                                                    <SelectItem value="high">
                                                        High Bitrate (ရုပ်ရှင်အဆင့်)
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex items-center gap-2.5 pt-7">
                                            <input
                                                type="checkbox"
                                                id="autoResize"
                                                checked={autoResize}
                                                onChange={(e) =>
                                                    setAutoResize(
                                                        e.target.checked,
                                                    )
                                                }
                                                className="h-4 w-4 rounded"
                                            />
                                            <Label
                                                htmlFor="autoResize"
                                                className="cursor-pointer text-sm font-medium"
                                            >
                                                ပုံအရွယ်အစား အလိုအလျောက်ညှိမည် (Auto Resize)
                                            </Label>
                                        </div>
                                    </div>
                                )}

                                <p className="text-sm text-muted-foreground">
                                    ⏱️ {DURATION_DESCRIPTIONS[duration]} • ℹ️{' '}
                                    {SEED_PRESET_DESCRIPTIONS[seedPreset]}
                                </p>
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    <AnimatedButton
                        onClick={generate}
                        disabled={
                            processing ||
                            (!prompt.trim() && !isKlingMotionControlModel)
                        }
                        className="h-11 w-full text-sm font-semibold"
                    >
                        {processing
                            ? 'ဗီဒီယို ထုတ်လုပ်နေပါသည် (Generating...)...'
                            : 'ဗီဒီယို စတင်ထုတ်လုပ်မည် (Generate Video)'}
                    </AnimatedButton>
                </CardContent>
            </AnimatedCard>

            <ResultPopupModal
                open={showResultModal}
                onClose={() => setShowResultModal(false)}
                processing={processing}
                processingText="ဗီဒီယို ထုတ်လုပ်နေပါသည် — ပုံမှန် ၁ မိနစ်မှ ၃ မိနစ်ခန့် ကြာနိုင်ပါသည် (၅ စက္ကန့်တစ်ကြိမ် အလိုအလျောက် စစ်ဆေးပေးနေပါသည်)..."
                result={result}
                isVideo={true}
                filenamePrefix="image-to-video"
                canSaveTemplate={true}
                onClearResult={() => setResult(null)}
            />
        </>
    );
}
