import { router } from '@inertiajs/react';
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
import { csrfToken, type GenerationResult } from './types';

export function ImageGenerationTab() {
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [model, setModel] = useState('seedream-v5-lite-text-to-image');
    const [width, setWidth] = useState('1024');
    const [height, setHeight] = useState('1024');
    const [processing, setProcessing] = useState(false);
    const [polling, setPolling] = useState(false);
    const [generationId, setGenerationId] = useState<number | null>(null);
    const [result, setResult] = useState<GenerationResult | null>(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [error, setError] = useState('');
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

    const generate = async () => {
        if (!prompt.trim()) {
            return;
        }

        setProcessing(true);
        setError('');
        setResult(null);
        setGenerationId(null);
        setPolling(false);
        setShowResultModal(true);

        try {
            const response = await fetch('/admin/ai/images', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': csrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    negative_prompt: negativePrompt.trim() || undefined,
                    model,
                    width: parseInt(width),
                    height: parseInt(height),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Generation failed.');
                setProcessing(false);
                setShowResultModal(false);
                return;
            }

            if (data.status === 'queued' && data.generation?.id) {
                setGenerationId(data.generation.id);
                setPolling(true);
                setShowResultModal(true);
                return;
            }

            setResult(data);
            setProcessing(false);
            setShowResultModal(true);
        } catch {
            setError('Network error — please try again.');
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
                                Text-to-Image Generation
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Generate high-resolution images from text prompts using Segmind models.
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

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                Model
                            </Label>
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="seedream-v5-lite-text-to-image">
                                        Seedream 5.0 Lite
                                    </SelectItem>
                                    <SelectItem value="nano-banana-2-lite">
                                        Nano Banana 2 Lite
                                    </SelectItem>
                                    <SelectItem value="qwen-image-3">
                                        Qwen Image 3
                                    </SelectItem>
                                    <SelectItem value="flux-schnell">
                                        FLUX.1 Schnell
                                    </SelectItem>
                                    <SelectItem value="sdxl">
                                        Stable Diffusion XL
                                    </SelectItem>
                                    <SelectItem value="flux-dev">
                                        FLUX.1 Dev
                                    </SelectItem>
                                    <SelectItem value="ideogram-4.5">
                                        Ideogram 4.5
                                    </SelectItem>
                                    <SelectItem value="recraft-v4-pro">
                                        Recraft V4 Pro
                                    </SelectItem>
                                    <SelectItem value="grok-imagine-image-2">
                                        Grok Imagine 2
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                Width
                            </Label>
                            <Select value={width} onValueChange={setWidth}>
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="512">512</SelectItem>
                                    <SelectItem value="768">768</SelectItem>
                                    <SelectItem value="1024">1024</SelectItem>
                                    <SelectItem value="1536">1536</SelectItem>
                                    <SelectItem value="2048">2048</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                Height
                            </Label>
                            <Select value={height} onValueChange={setHeight}>
                                <SelectTrigger className="h-10 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="512">512</SelectItem>
                                    <SelectItem value="768">768</SelectItem>
                                    <SelectItem value="1024">1024</SelectItem>
                                    <SelectItem value="1536">1536</SelectItem>
                                    <SelectItem value="2048">2048</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                            Prompt *
                        </Label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={3}
                            placeholder="A superhero flying over a city at sunset, cinematic lighting, detailed"
                            className="flex min-h-[100px] w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                            Negative Prompt (optional)
                        </Label>
                        <Input
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            placeholder="blurry, low quality, distorted"
                            className="h-10 text-sm"
                        />
                    </div>

                    {error && (
                        <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    <AnimatedButton
                        onClick={generate}
                        disabled={processing || !prompt.trim()}
                        className="h-11 w-full text-sm font-semibold"
                    >
                        {processing ? 'Generating...' : 'Generate Image'}
                    </AnimatedButton>
                </CardContent>
            </AnimatedCard>

            <ResultPopupModal
                open={showResultModal}
                onClose={() => setShowResultModal(false)}
                processing={processing}
                processingText="Generating image..."
                result={result}
                isVideo={false}
                filenamePrefix="image-gen"
                canSaveTemplate={true}
            />
        </>
    );
}
