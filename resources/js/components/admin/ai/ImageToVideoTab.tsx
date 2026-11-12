import { router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronUp,
    Image as ImageIcon,
    Plus,
    SlidersHorizontal,
    Trash2,
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

interface ExtraRefImageItem {
    id: string;
    source: 'upload' | 'url';
    file: File | null;
    preview: string | null;
    url: string;
}

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

    // Additional Reference Images (@Image 2 .. @Image 9) for Seedance multi-reference mode
    const [extraRefImages, setExtraRefImages] = useState<ExtraRefImageItem[]>(
        [],
    );

    // Optional Second Character Image (for 2-person swaps on Kling O3 / Kling 4.0 Video Edit)
    const [secondImageSource, setSecondImageSource] = useState<
        'upload' | 'url'
    >('upload');
    const [secondImageFile, setSecondImageFile] = useState<File | null>(null);
    const [secondImagePreview, setSecondImagePreview] = useState<string | null>(
        null,
    );
    const [secondImageUrl, setSecondImageUrl] = useState('');
    const [klingEditMode, setKlingEditMode] = useState<'std' | 'pro'>('std');

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
    const extraFilesInputRef = useRef<HTMLInputElement>(null);
    const secondImageInputRef = useRef<HTMLInputElement>(null);
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

    const isKlingVideoEditModel = [
        'kling-o3-video2video-edit',
        'kling-4-video-edit',
    ].includes(model);

    const supportsReferenceVideo =
        (isSeedanceModel && imageInputType === 'reference') ||
        isKlingMotionControlModel ||
        isKlingVideoEditModel;

    const onImageFileChange = (file: File | null) => {
        setImageFile(file);
        setImagePreview(file ? URL.createObjectURL(file) : null);
    };

    const onSecondImageFileChange = (file: File | null) => {
        setSecondImageFile(file);
        setSecondImagePreview(file ? URL.createObjectURL(file) : null);
    };

    const onLastFrameFileChange = (file: File | null) => {
        setLastFrameFile(file);
        setLastFramePreview(file ? URL.createObjectURL(file) : null);
    };

    const onExtraFilesSelected = (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) {
            return;
        }
        const incoming = Array.from(fileList);
        setExtraRefImages((prev) => {
            const remainingSlots = Math.max(0, 8 - prev.length);
            const toAdd: ExtraRefImageItem[] = incoming
                .slice(0, remainingSlots)
                .map((file) => ({
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    source: 'upload',
                    file,
                    preview: URL.createObjectURL(file),
                    url: '',
                }));
            return [...prev, ...toAdd];
        });
    };

    const addExtraRefUrlRow = () => {
        setExtraRefImages((prev) => {
            if (prev.length >= 8) {
                return prev;
            }
            return [
                ...prev,
                {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    source: 'url',
                    file: null,
                    preview: null,
                    url: '',
                },
            ];
        });
    };

    const updateExtraRefUrl = (id: string, url: string) => {
        setExtraRefImages((prev) =>
            prev.map((item) => (item.id === id ? { ...item, url } : item)),
        );
    };

    const removeExtraRefImage = (id: string) => {
        setExtraRefImages((prev) => prev.filter((item) => item.id !== id));
    };

    const insertTagIntoPrompt = (tag: string) => {
        setPrompt((prev) => {
            const trimmed = prev.trimEnd();
            return trimmed ? `${trimmed} ${tag} ` : `${tag} `;
        });
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

        if (!isKlingVideoEditModel) {
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
        }

        if (
            (isKlingMotionControlModel || isKlingVideoEditModel) &&
            ((refVideoSource === 'upload' && !refVideoFile) ||
                (refVideoSource === 'url' && !refVideoUrl.trim()))
        ) {
            setError(
                isKlingVideoEditModel
                    ? 'Kling Video Edit အတွက် မူရင်းဗီဒီယို (Upload သို့မဟုတ် URL) ထည့်ပေးရန် လိုအပ်ပါသည်။'
                    : 'Kling Motion Control အတွက် Reference Video (Upload သို့မဟုတ် URL) ထည့်ပေးရန် လိုအပ်ပါသည်။',
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
        } else if (imageMode === 'url' && imageUrl.trim()) {
            form.append('image_url', imageUrl.trim());
        }

        if (isKlingVideoEditModel) {
            if (secondImageSource === 'upload' && secondImageFile) {
                form.append('second_image', secondImageFile);
            } else if (secondImageSource === 'url' && secondImageUrl.trim()) {
                form.append('second_image_url', secondImageUrl.trim());
            }
            if (model === 'kling-o3-video2video-edit') {
                form.append('mode', klingEditMode);
                form.append('keep_audio', String(keepOriginalSound));
            }
        }

        if (isSeedanceModel && imageInputType === 'reference') {
            let slot = 0;
            extraRefImages.forEach((item) => {
                if (item.source === 'upload' && item.file) {
                    form.append(`extra_image_files[${slot}]`, item.file);
                    slot += 1;
                } else if (item.source === 'url' && item.url.trim()) {
                    form.append(`extra_image_urls[${slot}]`, item.url.trim());
                    slot += 1;
                }
            });
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
                            <Select
                                value={model}
                                onValueChange={(v) => {
                                    setModel(v);
                                    if (v === 'kling-o3-video2video-edit') {
                                        setRefVideoSource('upload');
                                        setAspectRatio('9:16');
                                    } else if (v === 'kling-4-video-edit') {
                                        setRefVideoSource('upload');
                                        setAspectRatio('adaptive');
                                    }
                                }}
                            >
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="kling-o3-video2video-edit">
                                        Kling O3 Video-to-Video Edit — ဗီဒီယိုထဲက လူကို တိုက်ရိုက်လဲရန် (@Element1/@Element2)
                                    </SelectItem>
                                    <SelectItem value="kling-4-video-edit">
                                        Kling 4.0 Video Edit — Kling 4.0 ဗီဒီယိုတိုက်ရိုက်ပြုပြင်ရန် (@Image1/@Image2)
                                    </SelectItem>
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
                            isSeedanceModel ||
                            isKlingMotionControlModel ||
                            isKlingVideoEditModel
                                ? 'md:grid-cols-2'
                                : 'grid-cols-1'
                        }`}
                    >
                        {/* Primary Image */}
                        <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">
                                    {isKlingVideoEditModel
                                        ? model === 'kling-o3-video2video-edit'
                                            ? '၃။ ဇာတ်ကောင် (၁) ပုံ (@Element1 — Optional)'
                                            : '၃။ ဇာတ်ကောင် (၁) ပုံ (@Image1 — Optional)'
                                        : imageInputType === 'reference'
                                          ? isSeedanceModel
                                              ? '၃။ Reference Image 1 (@Image 1 — အဓိကပုံ) *'
                                              : '၃။ Reference Image (အဓိက နမူနာပုံ) *'
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

                            {isSeedanceModel && imageInputType === 'reference' && (
                                <div className="space-y-2.5 border-t pt-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <Label className="text-xs font-semibold">
                                            🖼️ ထပ်ဆောင်း Reference ပုံများ ({extraRefImages.length}/8 — စုစုပေါင်း ၉ ပုံအထိ)
                                        </Label>
                                        <div className="flex gap-1.5">
                                            <input
                                                ref={extraFilesInputRef}
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={(e) => {
                                                    onExtraFilesSelected(
                                                        e.target.files,
                                                    );
                                                    e.target.value = '';
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                disabled={
                                                    extraRefImages.length >= 8
                                                }
                                                className="h-7 gap-1 px-2.5 text-xs"
                                                onClick={() =>
                                                    extraFilesInputRef.current?.click()
                                                }
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                ပုံတင်ရန်
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                disabled={
                                                    extraRefImages.length >= 8
                                                }
                                                className="h-7 gap-1 px-2.5 text-xs"
                                                onClick={addExtraRefUrlRow}
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                URL
                                            </Button>
                                        </div>
                                    </div>

                                    {extraRefImages.length > 0 && (
                                        <div className="space-y-2">
                                            {extraRefImages.map((item, idx) => {
                                                const tagLabel = `@Image ${idx + 2}`;
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center gap-2 rounded-lg border bg-background/70 p-2"
                                                    >
                                                        <Badge
                                                            variant="secondary"
                                                            className="shrink-0 cursor-pointer font-mono text-[11px] hover:bg-primary/20"
                                                            onClick={() =>
                                                                insertTagIntoPrompt(
                                                                    tagLabel,
                                                                )
                                                            }
                                                            title="Prompt ထဲသို့ ထည့်ရန် နှိပ်ပါ"
                                                        >
                                                            {tagLabel}
                                                        </Badge>

                                                        {item.source ===
                                                        'upload' ? (
                                                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                                                {item.preview && (
                                                                    <img
                                                                        src={
                                                                            item.preview
                                                                        }
                                                                        alt={
                                                                            tagLabel
                                                                        }
                                                                        className="h-9 w-9 shrink-0 rounded border object-cover"
                                                                    />
                                                                )}
                                                                <span className="truncate text-xs text-foreground">
                                                                    {item.file
                                                                        ?.name ??
                                                                        'Uploaded image'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <Input
                                                                value={item.url}
                                                                onChange={(e) =>
                                                                    updateExtraRefUrl(
                                                                        item.id,
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder={`https://example.com/image-${idx + 2}.jpg`}
                                                                className="h-8 flex-1 text-xs"
                                                            />
                                                        )}

                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                                                            onClick={() =>
                                                                removeExtraRefImage(
                                                                    item.id,
                                                                )
                                                            }
                                                            title="ဖယ်ရှားရန်"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                                        💡 Prompt ထဲတွင်{' '}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                insertTagIntoPrompt('@Image 1')
                                            }
                                            className="font-mono font-medium text-primary underline-offset-2 hover:underline"
                                        >
                                            @Image 1
                                        </button>
                                        , <span className="font-mono">@Image 2</span>,{' '}
                                        <span className="font-mono">@Image 3</span>{' '}
                                        ဟု ရည်ညွှန်းရေးနိုင်သည် (Tag ပေါ်နှိပ်၍လည်း Prompt ထဲ တန်းထည့်နိုင်ပါသည်)။
                                    </p>
                                </div>
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
                                            🎬{' '}
                                            {isKlingVideoEditModel
                                                ? 'Source Video (ပြင်ဆင်မည့် မူရင်းဗီဒီယို — Required *)'
                                                : `Reference Video (လှုပ်ရှားမှု နမူနာ ${
                                                      isKlingMotionControlModel
                                                          ? '— Required *'
                                                          : '— Optional'
                                                  })`}
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
                                    {isKlingVideoEditModel && (
                                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                                            {model === 'kling-o3-video2video-edit'
                                                ? '💡 Kling O3 Video Edit သည် 3–10 စက္ကန့် မူရင်းဗီဒီယို (အနံ ≥ 720px) အတွက် ဖြစ်ပါသည်။ 10 စက္ကန့်ထက်ရှည်သော (15s–30s) ဗီဒီယိုဆိုလျှင် Kling 4.0 Video Edit ကို ရွေးချယ်ပါ။'
                                                : '💡 Kling 4.0 Video Edit သည် 3–30 စက္ကန့် မူရင်းဗီဒီယိုအရှည်များ (အနံ ≥ 720px) ကို အပြည့်လက်ခံပါသည်။'}
                                        </p>
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

                                {isKlingVideoEditModel && (
                                    <div className="space-y-3 border-t pt-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-semibold">
                                                👥{' '}
                                                {model ===
                                                'kling-o3-video2video-edit'
                                                    ? 'ဇာတ်ကောင် (၂) ပုံ (@Element2 — Optional)'
                                                    : 'ဇာတ်ကောင် (၂) ပုံ (@Image2 — Optional)'}
                                            </Label>
                                            <div className="flex gap-1.5">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="h-7 px-2.5 text-xs"
                                                    variant={
                                                        secondImageSource ===
                                                        'upload'
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    onClick={() =>
                                                        setSecondImageSource(
                                                            'upload',
                                                        )
                                                    }
                                                >
                                                    Upload
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="h-7 px-2.5 text-xs"
                                                    variant={
                                                        secondImageSource ===
                                                        'url'
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    onClick={() =>
                                                        setSecondImageSource(
                                                            'url',
                                                        )
                                                    }
                                                >
                                                    URL
                                                </Button>
                                            </div>
                                        </div>

                                        {secondImageSource === 'upload' ? (
                                            <>
                                                <input
                                                    ref={secondImageInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) =>
                                                        onSecondImageFileChange(
                                                            e.target
                                                                .files?.[0] ??
                                                                null,
                                                        )
                                                    }
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-10 w-full text-xs"
                                                    onClick={() =>
                                                        secondImageInputRef.current?.click()
                                                    }
                                                >
                                                    {secondImageFile
                                                        ? `ရွေးထားသည်: ${secondImageFile.name}`
                                                        : secondImagePreview
                                                          ? 'ဒုတိယ ဇာတ်ကောင်ပုံ ပြောင်းရန်'
                                                          : 'ဒုတိယ ဇာတ်ကောင်ပုံ တင်ရန် (လူ ၂ ယောက်လဲလျှင်)'}
                                                </Button>
                                            </>
                                        ) : (
                                            <Input
                                                value={secondImageUrl}
                                                onChange={(e) =>
                                                    setSecondImageUrl(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="https://example.com/character-2.jpg (Optional)"
                                                className="h-9 text-xs"
                                            />
                                        )}

                                        {model ===
                                            'kling-o3-video2video-edit' && (
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold">
                                                        Quality Mode
                                                    </Label>
                                                    <Select
                                                        value={klingEditMode}
                                                        onValueChange={(v) =>
                                                            setKlingEditMode(
                                                                v as
                                                                    | 'std'
                                                                    | 'pro',
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger className="h-9 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="std">
                                                                Standard (မြန်ဆန်ပြီး စရိတ်သက်သာသည်)
                                                            </SelectItem>
                                                            <SelectItem value="pro">
                                                                Pro (အကြည်ဆုံးနှင့် အငြိမ်ဆုံး)
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold">
                                                        မူရင်းအသံ (Keep Audio)
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
                            placeholder={
                                model === 'kling-o3-video2video-edit'
                                    ? 'ဥပမာ - Change the woman in pink on the left to @Element1 and change the man in black on the right to @Element2. Keep the kitchen background, black mug, coffee powder, milk pouring action, and camera framing intact.'
                                    : model === 'kling-4-video-edit'
                                      ? 'ဥပမာ - Change the woman in pink on the left to @Image1 and change the man in black on the right to @Image2. Keep the kitchen background, black mug, coffee powder, milk pouring action, and locked camera framing exactly as in the source.'
                                      : 'ဥပမာ - ပုံထဲက ဇာတ်ကောင်က ရှေးဟောင်းဘုရားကျောင်းဝင်းထဲမှာ ကွန်ဖူးကစားနေပုံ၊ ရုပ်ရှင်အလင်းအမှောင်...'
                            }
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
