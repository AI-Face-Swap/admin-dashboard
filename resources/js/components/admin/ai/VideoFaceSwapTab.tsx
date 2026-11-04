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
import { csrfToken, type GenerationResult, type Template } from './types';

export function VideoFaceSwapTab({ templates }: { templates: Template[] }) {
    const videoTemplates = templates.filter((t) => t.type === 'video');

    const [faceMode, setFaceMode] = useState<'upload' | 'url'>('upload');
    const [faceFile, setFaceFile] = useState<File | null>(null);
    const [facePreview, setFacePreview] = useState<string | null>(null);
    const [faceUrl, setFaceUrl] = useState('');

    const [targetMode, setTargetMode] = useState<'template' | 'url'>(
        'template',
    );
    const [templateSlug, setTemplateSlug] = useState<string>('');
    const [targetVideoUrl, setTargetVideoUrl] = useState('');

    const [processing, setProcessing] = useState(false);
    const [polling, setPolling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<GenerationResult | null>(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [generationId, setGenerationId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const onFaceFileChange = (file: File | null) => {
        setFaceFile(file);
        setFacePreview(file ? URL.createObjectURL(file) : null);
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
                const contentType = response.headers.get('content-type') ?? '';
                if (contentType.includes('text/html')) {
                    setError(
                        'Polling failed — received HTML instead of JSON. Check authentication.',
                    );
                    setProcessing(false);
                    setPolling(false);
                    setGenerationId(null);

                    if (pollRef.current) {
                        clearInterval(pollRef.current);
                        pollRef.current = null;
                    }
                }
                return;
            }

            const contentType = response.headers.get('content-type') ?? '';
            if (!contentType.includes('application/json')) {
                setError('Polling failed — server returned non-JSON response.');
                setProcessing(false);
                setPolling(false);
                setGenerationId(null);
                setShowResultModal(true);

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
            setError('Polling failed — network error or invalid response.');
            setProcessing(false);
            setPolling(false);
            setGenerationId(null);

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
        setError(null);
        setResult(null);
        setGenerationId(null);
        setPolling(false);

        const form = new FormData();

        if (faceMode === 'upload') {
            if (!faceFile) {
                setError('Upload a face image first.');
                return;
            }
            form.append('face_image', faceFile);
        } else {
            form.append('face_image_url', faceUrl);
        }

        if (targetMode === 'template') {
            if (!templateSlug) {
                setError('Pick a video template first.');
                return;
            }
            form.append('template_slug', templateSlug);
        } else {
            form.append('target_video_url', targetVideoUrl);
        }

        setProcessing(true);

        try {
            const response = await fetch('/admin/ai/video-face-swap', {
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
                setError(message ?? 'Generation failed.');
                setProcessing(false);
                return;
            }

            setGenerationId(body.generation.id);
            setPolling(true);
            setShowResultModal(true);
        } catch {
            setError('Network error — is the server running?');
            setProcessing(false);
        }
    };

    return (
        <>
            <AnimatedCard className="w-full">
                <CardContent className="space-y-6 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
                        <div>
                            <h3 className="text-lg font-bold">
                                Video Face Swap
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Upload a face image and swap it onto a video template or custom video URL.
                            </p>
                        </div>
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

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4 rounded-xl border bg-muted/10 p-5">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">
                                    1. Source Face Image *
                                </Label>
                                <div className="flex gap-1.5">
                                    <Button
                                        type="button"
                                        variant={
                                            faceMode === 'upload'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        size="sm"
                                        className="h-8 px-3 text-xs"
                                        onClick={() => setFaceMode('upload')}
                                    >
                                        Upload
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={
                                            faceMode === 'url'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        size="sm"
                                        className="h-8 px-3 text-xs"
                                        onClick={() => setFaceMode('url')}
                                    >
                                        URL
                                    </Button>
                                </div>
                            </div>

                            {faceMode === 'upload' ? (
                                <>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) =>
                                            onFaceFileChange(
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                    <div
                                        className="flex h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-background/50 text-sm text-muted-foreground hover:bg-muted/30"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                    >
                                        {facePreview ? (
                                            <img
                                                src={facePreview}
                                                alt="Face preview"
                                                className="size-full object-contain p-2"
                                            />
                                        ) : (
                                            <>
                                                <ImageIcon className="h-7 w-7 opacity-50" />
                                                <span className="font-medium">
                                                    Click to upload face image
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <Input
                                    value={faceUrl}
                                    onChange={(e) => setFaceUrl(e.target.value)}
                                    placeholder="https://.../face.jpg"
                                    className="h-10 text-sm"
                                />
                            )}
                        </div>

                        <div className="flex flex-col justify-between space-y-4 rounded-xl border bg-muted/10 p-5">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-semibold">
                                        2. Target Video *
                                    </Label>
                                    <div className="flex gap-1.5">
                                        <Button
                                            type="button"
                                            variant={
                                                targetMode === 'template'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            size="sm"
                                            className="h-8 px-3 text-xs"
                                            onClick={() =>
                                                setTargetMode('template')
                                            }
                                        >
                                            Template
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={
                                                targetMode === 'url'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            size="sm"
                                            className="h-8 px-3 text-xs"
                                            onClick={() => setTargetMode('url')}
                                        >
                                            URL
                                        </Button>
                                    </div>
                                </div>

                                {targetMode === 'template' ? (
                                    <Select
                                        value={templateSlug}
                                        onValueChange={setTemplateSlug}
                                    >
                                        <SelectTrigger className="h-10 text-sm">
                                            <SelectValue placeholder="Pick a video template..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {videoTemplates.length > 0 ? (
                                                videoTemplates.map(
                                                    (template) => (
                                                        <SelectItem
                                                            key={template.id}
                                                            value={
                                                                template.slug
                                                            }
                                                            className="text-sm"
                                                        >
                                                            {template.name}
                                                        </SelectItem>
                                                    ),
                                                )
                                            ) : (
                                                <SelectItem
                                                    value="none"
                                                    disabled
                                                >
                                                    No video templates yet
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        value={targetVideoUrl}
                                        onChange={(e) =>
                                            setTargetVideoUrl(e.target.value)
                                        }
                                        placeholder="https://.../target.mp4"
                                        className="h-10 text-sm"
                                    />
                                )}
                            </div>

                            <div className="space-y-3 pt-4">
                                {error && (
                                    <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                                        {error}
                                    </p>
                                )}

                                <AnimatedButton
                                    onClick={generate}
                                    disabled={processing}
                                    className="h-11 w-full text-sm font-semibold"
                                >
                                    {processing
                                        ? 'Generating...'
                                        : 'Generate Video Face Swap'}
                                </AnimatedButton>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </AnimatedCard>

            <ResultPopupModal
                open={showResultModal}
                onClose={() => setShowResultModal(false)}
                processing={processing}
                processingText="Video processing — this usually takes 1–5 minutes (polling every 5s)..."
                result={result}
                isVideo={true}
                filenamePrefix="video-face-swap"
            />
        </>
    );
}
