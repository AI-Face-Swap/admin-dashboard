import { router } from '@inertiajs/react';
import { Image as ImageIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
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
import { csrfToken, type EditModel, type GenerationResult } from './types';

export function ImageEditingTab() {
    const [model, setModel] = useState<EditModel>('multi-image-kontext-max');
    const [prompt, setPrompt] = useState('');
    const [seed, setSeed] = useState('');
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

    // Common and model-specific parameters
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [outputFormat, setOutputFormat] = useState('jpg');

    // Multi-Image Kontext Max
    const [safetyTolerance, setSafetyTolerance] = useState('1');

    // Flux Kontext Dev
    const [guidance, setGuidance] = useState('7');
    const [inferenceSteps, setInferenceSteps] = useState('35');
    const [outputQuality, setOutputQuality] = useState('90');
    const [disableSafetyChecker, setDisableSafetyChecker] = useState(false);

    // Seedream 5.0 Lite I2I
    const [seedreamSize, setSeedreamSize] = useState('3K');
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

    const isSingleImageModel =
        model === 'flux-kontext-dev' ||
        model === 'kling-3-image2image' ||
        model === 'ideogram-4.5-edit' ||
        model === 'bria-extract-object';

    const generate = async () => {
        setError(null);
        setResult(null);

        if (!prompt.trim()) {
            setError('Please enter a prompt instruction.');
            return;
        }

        const form = new FormData();
        form.append('model', model);
        form.append('prompt', prompt.trim());

        if (seed.trim()) {
            form.append('seed', seed.trim());
        }

        if (img1Mode === 'upload') {
            if (!img1File) {
                setError(
                    isSingleImageModel
                        ? 'Upload an input image first.'
                        : 'Upload input image 1 first.',
                );
                return;
            }
            form.append('input_image_1', img1File);
            form.append('input_image', img1File);
        } else {
            if (!img1Url.trim()) {
                setError(
                    isSingleImageModel
                        ? 'Enter input image URL.'
                        : 'Enter input image 1 URL.',
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
                    setError('Multi-Image Kontext Max requires input image 2.');
                    return;
                }
                if (img2Mode === 'url' && !img2Url.trim()) {
                    setError(
                        'Multi-Image Kontext Max requires input image 2 URL.',
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
                <CardContent className="space-y-5 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
                        <div>
                            <h3 className="text-lg font-bold">
                                Image Editing Studio
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Transform, restyle, or combine reference images with AI instructions.
                            </p>
                        </div>
                        {result && (
                            <Button
                                type="button"
                                variant="outline"
                                className="h-10 px-4 text-sm"
                                onClick={() => setShowResultModal(true)}
                            >
                                View Latest Result
                            </Button>
                        )}
                    </div>

                    {/* Model Switcher */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">Model</Label>
                        <Select
                            value={model}
                            onValueChange={(val: EditModel) => {
                                setModel(val);
                                setError(null);
                                if (
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
                                <SelectItem value="multi-image-kontext-max">
                                    Multi-Image Kontext Max (2 reference images)
                                </SelectItem>
                                <SelectItem value="flux-kontext-dev">
                                    Flux Kontext Dev (Single image editing)
                                </SelectItem>
                                <SelectItem value="seedream-v5-lite-image-to-image">
                                    Seedream 5.0 Lite I2I (Fashion & Editorial)
                                </SelectItem>
                                <SelectItem value="gpt-image-1.5-edit">
                                    GPT Image 1.5 Edit (Intelligent Composition)
                                </SelectItem>
                                <SelectItem value="kling-3-image2image">
                                    Kling 3 Image-to-Image (Cinematic)
                                </SelectItem>
                                <SelectItem value="nano-banana-pro">
                                    Nano Banana Pro (Comic & Concept Art)
                                </SelectItem>
                                <SelectItem value="ideogram-4.5-edit">
                                    Ideogram 4.5 Edit (Precision Text & Style)
                                </SelectItem>
                                <SelectItem value="bria-extract-object">
                                    Bria Extract Object (Cutout PNG)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            {model === 'multi-image-kontext-max' &&
                                'Combine 2 reference images (model person + garment/style) guided by prompt instructions.'}
                            {model === 'flux-kontext-dev' &&
                                'Edit a single image (e.g. background replacement, subject restyling) while preserving pose and composition.'}
                            {model === 'seedream-v5-lite-image-to-image' &&
                                'High-resolution editorial & fashion photography image-to-image transformation (1 or 2 reference images).'}
                            {model === 'gpt-image-1.5-edit' &&
                                'Intelligent subject editing and photo composition based on reference images.'}
                            {model === 'kling-3-image2image' &&
                                'High-end cinematic image-to-image stylization and environmental transformation.'}
                            {model === 'nano-banana-pro' &&
                                'Multi-panel comic art, concept illustrations, and expressive stylized generation.'}
                            {model === 'ideogram-4.5-edit' &&
                                'Surgically edit elements or add clean legible typography while keeping the rest untouched.'}
                            {model === 'bria-extract-object' &&
                                'Intelligent AI cutout to isolate and extract named objects with transparent alpha channel.'}
                        </p>
                    </div>

                    {/* Prompt */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                            Prompt *
                        </Label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={
                                model === 'multi-image-kontext-max'
                                    ? 'put the green dress on the woman while maintaining the pose of the woman as it is'
                                    : model === 'flux-kontext-dev'
                                      ? 'Replace the background with a bokeh light effect, zooming in on the subject, keeping pose identical.'
                                      : model ===
                                          'seedream-v5-lite-image-to-image'
                                        ? 'Editorial street style fashion photograph of the model wearing an oversized brown wool coat...'
                                        : model === 'gpt-image-1.5-edit'
                                          ? 'A photorealistic wide shot of the person casually sitting across a London street...'
                                          : model === 'kling-3-image2image'
                                            ? 'Transform this garden into a magical winter wonderland with crystalline ice patterns...'
                                            : model === 'ideogram-4.5-edit'
                                              ? 'Paint the bold wordmark "RAMPWORKS" in a 1970s chrome script across the center...'
                                              : model === 'bria-extract-object'
                                                ? 'Name the object to extract (e.g., "sunglasses", "the cat", "the red dress")...'
                                                : 'Create a multi-panel GTA-style comic page featuring two coworkers on launch day...'
                            }
                            className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                        />
                    </div>

                    {/* System Prompt (for Nano Banana Pro) */}
                    {model === 'nano-banana-pro' && (
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                System Prompt (optional)
                            </Label>
                            <Input
                                value={systemPrompt}
                                onChange={(e) =>
                                    setSystemPrompt(e.target.value)
                                }
                                placeholder="Keep the composition polished, cheerful, and suitable for a campaign."
                                className="h-10 text-sm"
                            />
                        </div>
                    )}

                    {/* Reference Images Section */}
                    <div
                        className={`grid gap-5 ${
                            isSingleImageModel ? 'grid-cols-1' : 'md:grid-cols-2'
                        }`}
                    >
                        {/* Image 1 */}
                        <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">
                                    {isSingleImageModel
                                        ? 'Input Image *'
                                        : 'Input Image 1 *'}
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
                                                    Click to upload{' '}
                                                    {isSingleImageModel
                                                        ? 'Input Image'
                                                        : 'Image 1'}
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
                            <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-semibold">
                                        Input Image 2{' '}
                                        {model === 'multi-image-kontext-max'
                                            ? '*'
                                            : '(optional)'}
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
                                                        Click to upload Image 2
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
                    </div>

                    {/* Model Parameters */}
                    {model === 'multi-image-kontext-max' && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    Aspect Ratio
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
                                            1:1 (Square)
                                        </SelectItem>
                                        <SelectItem value="16:9">
                                            16:9 (Landscape)
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
                                    Safety Tolerance (1-6)
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
                                            1 (Strict)
                                        </SelectItem>
                                        <SelectItem value="2">2</SelectItem>
                                        <SelectItem value="3">3</SelectItem>
                                        <SelectItem value="4">4</SelectItem>
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="6">
                                            6 (Permissive)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {model === 'flux-kontext-dev' && (
                        <>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">
                                        Aspect Ratio
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
                                                Match Input Image
                                            </SelectItem>
                                            <SelectItem value="1:1">
                                                1:1 (Square)
                                            </SelectItem>
                                            <SelectItem value="16:9">
                                                16:9 (Landscape)
                                            </SelectItem>
                                            <SelectItem value="9:16">
                                                9:16 (Portrait)
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
                                        Guidance Scale
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
                                        Inference Steps (1-50)
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
                                        Output Quality (1-100)
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
                                    Disable Safety Checker
                                </Label>
                            </div>
                        </>
                    )}

                    {model === 'seedream-v5-lite-image-to-image' && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    Aspect Ratio
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
                                    Image Size
                                </Label>
                                <Select
                                    value={seedreamSize}
                                    onValueChange={setSeedreamSize}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1K">1K</SelectItem>
                                        <SelectItem value="2K">2K</SelectItem>
                                        <SelectItem value="3K">
                                            3K (Default)
                                        </SelectItem>
                                        <SelectItem value="4K">4K</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    Optimize Prompt
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
                                            Fast
                                        </SelectItem>
                                        <SelectItem value="standard">
                                            Standard
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2.5 pt-6">
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
                                    Add Watermark
                                </Label>
                            </div>
                        </div>
                    )}

                    {model === 'gpt-image-1.5-edit' && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    Resolution / Size
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
                                            Auto
                                        </SelectItem>
                                        <SelectItem value="1024x1024">
                                            1024x1024 (1:1)
                                        </SelectItem>
                                        <SelectItem value="1536x1024">
                                            1536x1024 (3:2)
                                        </SelectItem>
                                        <SelectItem value="1024x1536">
                                            1024x1536 (2:3)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    Quality
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
                                            High
                                        </SelectItem>
                                        <SelectItem value="medium">
                                            Medium
                                        </SelectItem>
                                        <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    Background
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
                                            Opaque
                                        </SelectItem>
                                        <SelectItem value="transparent">
                                            Transparent
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    Moderation
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
                                            Auto
                                        </SelectItem>
                                        <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {model === 'kling-3-image2image' && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    Resolution
                                </Label>
                                <Select
                                    value={klingResolution}
                                    onValueChange={setKlingResolution}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1K">1K</SelectItem>
                                        <SelectItem value="2K">2K</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    Aspect Ratio
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
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    Aspect Ratio
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
                                            1:1 (Square)
                                        </SelectItem>
                                        <SelectItem value="16:9">
                                            16:9 (Landscape)
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
                                    Output Resolution
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
                                            4K (Default)
                                        </SelectItem>
                                        <SelectItem value="2K">2K</SelectItem>
                                        <SelectItem value="1K">1K</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {model === 'ideogram-4.5-edit' && (
                        <div className="space-y-4 rounded-xl border p-4">
                            <h4 className="text-sm font-semibold">
                                Ideogram 4.5 Edit Settings
                            </h4>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">
                                    Quality Tier
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
                                            Medium (Standard)
                                        </SelectItem>
                                        <SelectItem value="high">
                                            High (Maximum Detail)
                                        </SelectItem>
                                        <SelectItem value="low">
                                            Low (Fast Draft)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Common Output Format & Seed */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                Output Format
                            </Label>
                            <Select
                                value={outputFormat}
                                onValueChange={setOutputFormat}
                            >
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="jpg">JPG</SelectItem>
                                    <SelectItem value="png">PNG</SelectItem>
                                    <SelectItem value="webp">WEBP</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                Seed (optional)
                            </Label>
                            <Input
                                value={seed}
                                onChange={(e) => setSeed(e.target.value)}
                                placeholder="e.g. 42"
                                type="number"
                                className="h-10 text-sm"
                            />
                        </div>
                    </div>

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
                            ? 'Editing Image...'
                            : 'Generate Edited Image'}
                    </AnimatedButton>
                </CardContent>
            </AnimatedCard>

            <ResultPopupModal
                open={showResultModal}
                onClose={() => setShowResultModal(false)}
                processing={processing}
                processingText="Editing image — this usually takes 10–25 seconds..."
                result={result}
                isVideo={false}
                filenamePrefix="image-edit"
                canSaveTemplate={true}
                onClearResult={() => setResult(null)}
            />
        </>
    );
}
