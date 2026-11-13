import { router } from '@inertiajs/react';
import { Image as ImageIcon, Layers } from 'lucide-react';
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
import { csrfToken, type GenerationResult, type Template } from './types';

export function TemplateGenerationTab({
    templates,
}: {
    templates: Template[];
}) {
    const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState('');
    const [templateSlug, setTemplateSlug] = useState<string>('');

    const [processing, setProcessing] = useState(false);
    const [polling, setPolling] = useState(false);
    const [generationId, setGenerationId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<GenerationResult | null>(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const selectedTemplate = templates.find((t) => t.slug === templateSlug);

    const onFileChange = (file: File | null) => {
        setImageFile(file);
        setImagePreview(file ? URL.createObjectURL(file) : null);
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
            }, 4000);
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

        if (!templateSlug) {
            setError('Please select a template first.');
            return;
        }

        const form = new FormData();
        form.append('template_slug', templateSlug);

        if (imageMode === 'upload') {
            if (!imageFile) {
                setError('Please upload an input image first.');
                return;
            }
            form.append('image', imageFile);
        } else {
            if (!imageUrl.trim()) {
                setError('Please enter an image URL first.');
                return;
            }
            form.append('image_url', imageUrl.trim());
        }

        setProcessing(true);
        setShowResultModal(true);

        try {
            const response = await fetch(
                `/admin/ai/templates/${templateSlug}/generate`,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': csrfToken(),
                    },
                    credentials: 'same-origin',
                    body: form,
                },
            );

            const body = await response.json();

            if (!response.ok) {
                const message = body.errors
                    ? Object.values(body.errors).flat().join(' ')
                    : body.message;
                setError(message ?? 'Template generation failed.');
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
            setError('Network error — is the server running?');
            setProcessing(false);
            setShowResultModal(false);
        }
    };

    const isVideoResult =
        result?.generation?.operation === 'video-face-swap' ||
        result?.generation?.operation === 'image-to-video' ||
        selectedTemplate?.type === 'video';

    return (
        <>
            <AnimatedCard className="w-full">
                <CardContent className="space-y-6 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
                        <div>
                            <h3 className="flex items-center gap-2 text-lg font-bold">
                                <Layers className="h-5 w-5 text-primary" />
                                Unified Template Generation
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Test any template by slug — automatically routes
                                to Seedance (Image-to-Video), P-Image-Edit,
                                Video Face Swap, or Image Face Swap based on the
                                template&apos;s configured Generation Type &amp;
                                AI Model.
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
                                    1. User Input Photo *
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
                                            onFileChange(
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
                                        {imagePreview ? (
                                            <img
                                                src={imagePreview}
                                                alt="Input preview"
                                                className="size-full object-contain p-2"
                                            />
                                        ) : (
                                            <>
                                                <ImageIcon className="h-7 w-7 opacity-50" />
                                                <span className="font-medium">
                                                    Click to upload user photo
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
                                    placeholder="https://.../photo.jpg"
                                    className="h-10 text-sm"
                                />
                            )}
                        </div>

                        <div className="flex flex-col justify-between space-y-4 rounded-xl border bg-muted/10 p-5">
                            <div className="space-y-4">
                                <Label className="text-sm font-semibold">
                                    2. Select Template *
                                </Label>

                                <Select
                                    value={templateSlug}
                                    onValueChange={setTemplateSlug}
                                >
                                    <SelectTrigger className="h-10 text-sm">
                                        <SelectValue placeholder="Pick any active template..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates.map((template) => (
                                            <SelectItem
                                                key={template.id}
                                                value={template.slug}
                                                className="text-sm"
                                            >
                                                #{template.id} {template.name} (
                                                {template.ai_model
                                                    ?.model_name ??
                                                    template.model ??
                                                    template.type}
                                                )
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {selectedTemplate && (
                                    <div className="space-y-2 rounded-lg border bg-background/60 p-3 text-xs">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="secondary">
                                                {selectedTemplate.type.toUpperCase()}
                                            </Badge>
                                            {selectedTemplate.generation_type && (
                                                <Badge variant="outline">
                                                    {
                                                        selectedTemplate
                                                            .generation_type
                                                            .name
                                                    }
                                                </Badge>
                                            )}
                                            {(selectedTemplate.ai_model
                                                ?.model_name ||
                                                selectedTemplate.model) && (
                                                <>
                                                    <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                                                        {selectedTemplate
                                                            .ai_model
                                                            ?.model_name ??
                                                            selectedTemplate.model}
                                                    </Badge>
                                                    <ModelInfoButton
                                                        compact
                                                        model={
                                                            selectedTemplate
                                                                .ai_model
                                                                ?.model_name ??
                                                            selectedTemplate.model ??
                                                            ''
                                                        }
                                                    />
                                                </>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground">
                                            Slug:{' '}
                                            <code className="text-foreground">
                                                {selectedTemplate.slug}
                                            </code>
                                        </p>
                                    </div>
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
                                        ? 'Generating from Template...'
                                        : 'Generate with Template'}
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
                processingText="Generating from template — polling every 4s..."
                result={result}
                isVideo={isVideoResult}
                filenamePrefix="template-generation"
            />
        </>
    );
}
