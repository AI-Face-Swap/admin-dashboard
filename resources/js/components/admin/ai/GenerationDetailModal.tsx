import { router } from '@inertiajs/react';
import {
    BookmarkPlus,
    Check,
    Code2,
    Copy,
    Download,
    ExternalLink,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    extractInputMediaUrls,
    extractKeyInputParams,
    handleDownload,
    resolveGenerationModel,
    type Generation,
} from './types';

export function GenerationDetailModal({
    generation,
    onClose,
}: {
    generation: Generation;
    onClose: () => void;
}) {
    const outputUrls = generation.output_metadata ?? [];
    const modelName = resolveGenerationModel(generation);
    const inputMedia = extractInputMediaUrls(generation.input_metadata);
    const keyParams = extractKeyInputParams(generation.input_metadata);
    const promptText =
        generation.input_metadata?.prompt ||
        generation.input_metadata?.prompt_enhancement ||
        null;
    const negativePrompt = generation.input_metadata?.negative_prompt || null;
    const systemPrompt = generation.input_metadata?.system_prompt || null;

    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [showRawJson, setShowRawJson] = useState(false);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

    const handleCopyPrompt = () => {
        if (!promptText) return;
        navigator.clipboard.writeText(promptText);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 1800);
    };

    const handleSaveToTemplate = () => {
        setIsSavingTemplate(true);
        router.post(
            `/admin/templates/from-generation/${generation.id}`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setIsSavingTemplate(false),
            },
        );
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
            onClick={onClose}
        >
            <div
                className="relative max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border bg-background p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="mb-4 flex items-center gap-2.5">
                    <h2 className="text-lg font-bold">
                        Generation #{generation.id}
                    </h2>
                    <Badge
                        variant={
                            generation.status === 'completed'
                                ? 'default'
                                : generation.status === 'failed'
                                  ? 'destructive'
                                  : 'secondary'
                        }
                        className="px-2.5 py-0.5 text-xs"
                    >
                        {generation.status}
                    </Badge>
                </div>

                {/* Summary Badges */}
                <div className="mb-5 flex flex-wrap gap-2">
                    <Badge variant="outline" className="px-2.5 py-1 text-xs">
                        Operation: <strong className="ml-1">{generation.operation}</strong>
                    </Badge>
                    <Badge
                        variant="secondary"
                        className="border border-primary/20 bg-primary/10 px-2.5 py-1 font-mono text-xs text-primary"
                    >
                        Model: <strong className="ml-1">{modelName}</strong>
                    </Badge>
                    {generation.template && (
                        <Badge variant="outline" className="px-2.5 py-1 text-xs">
                            Template: <strong className="ml-1">{generation.template.name}</strong>
                        </Badge>
                    )}
                    {generation.cost && (
                        <Badge
                            variant="outline"
                            className="border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs text-emerald-600 dark:text-emerald-400"
                        >
                            API Cost: ${Number(generation.cost).toFixed(4)}{' '}
                            {generation.currency ?? 'USD'}
                        </Badge>
                    )}
                    {generation.coins_spent ? (
                        <Badge variant="outline" className="px-2.5 py-1 text-xs">
                            Points: {generation.coins_spent} pts
                        </Badge>
                    ) : null}
                    {generation.duration_ms && (
                        <Badge variant="outline" className="px-2.5 py-1 font-mono text-xs">
                            ⏱ {(generation.duration_ms / 1000).toFixed(2)}s (
                            {generation.duration_ms} ms)
                        </Badge>
                    )}
                </div>

                {/* INPUT DETAILS SECTION */}
                <div className="mb-5 space-y-3 rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Input Fields &amp; Model Configuration (ထည့်သွင်းထားသော အချက်အလက်များ)
                        </p>
                        {generation.input_metadata && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                                onClick={() => setShowRawJson((v) => !v)}
                            >
                                <Code2 className="h-3.5 w-3.5" />
                                {showRawJson ? 'Hide Raw JSON' : 'Raw JSON'}
                            </Button>
                        )}
                    </div>

                    {/* Prompt */}
                    {promptText && (
                        <div className="rounded-lg border bg-background p-3">
                            <div className="mb-1 flex items-center justify-between">
                                <span className="text-xs font-semibold text-muted-foreground">
                                    Prompt
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 gap-1 px-2 text-[11px]"
                                    onClick={handleCopyPrompt}
                                >
                                    {copiedPrompt ? (
                                        <>
                                            <Check className="h-3 w-3 text-emerald-500" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3 w-3" />
                                            Copy Prompt
                                        </>
                                    )}
                                </Button>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                                {promptText}
                            </p>
                        </div>
                    )}

                    {negativePrompt && (
                        <div className="rounded-lg border bg-background p-2.5 text-xs">
                            <span className="font-semibold text-muted-foreground">
                                Negative Prompt:{' '}
                            </span>
                            <span>{negativePrompt}</span>
                        </div>
                    )}

                    {systemPrompt && (
                        <div className="rounded-lg border bg-background p-2.5 text-xs">
                            <span className="font-semibold text-muted-foreground">
                                System Prompt:{' '}
                            </span>
                            <span>{systemPrompt}</span>
                        </div>
                    )}

                    {/* Input Media Preview (Reference Images / Mask / Video) */}
                    {inputMedia.length > 0 && (
                        <div>
                            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                                Input Reference Media ({inputMedia.length})
                            </p>
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                                {inputMedia.map((media, idx) => (
                                    <div
                                        key={idx}
                                        className="overflow-hidden rounded-lg border bg-background p-2"
                                    >
                                        <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                                            <span>{media.label}</span>
                                            <a
                                                href={media.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-0.5 text-primary hover:underline"
                                            >
                                                Open{' '}
                                                <ExternalLink className="h-2.5 w-2.5" />
                                            </a>
                                        </div>
                                        {media.type === 'image' && (
                                            <img
                                                src={media.url}
                                                alt={media.label}
                                                className="h-28 w-full rounded border object-cover"
                                            />
                                        )}
                                        {media.type === 'video' && (
                                            <video
                                                src={media.url}
                                                controls
                                                className="h-28 w-full rounded border object-cover"
                                            />
                                        )}
                                        {media.type === 'audio' && (
                                            <audio
                                                src={media.url}
                                                controls
                                                className="w-full"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Key Input Parameters */}
                    {keyParams.length > 0 && (
                        <div>
                            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">
                                Parameters
                            </p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {keyParams.map((param) => (
                                    <div
                                        key={param.key}
                                        className="rounded-lg border bg-background px-2.5 py-1.5 text-xs"
                                    >
                                        <span className="block text-[10px] text-muted-foreground uppercase">
                                            {param.key}
                                        </span>
                                        <span className="font-mono font-semibold text-foreground">
                                            {param.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {showRawJson && generation.input_metadata && (
                        <pre className="max-h-48 overflow-x-auto rounded-lg border bg-background p-3 font-mono text-xs whitespace-pre-wrap">
                            {JSON.stringify(generation.input_metadata, null, 2)}
                        </pre>
                    )}
                </div>

                {generation.request_id && (
                    <div className="mb-4">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                            Segmind Request ID
                        </p>
                        <code className="rounded bg-muted px-2.5 py-1 font-mono text-xs">
                            {generation.request_id}
                        </code>
                    </div>
                )}

                {/* OUTPUT FILES SECTION */}
                {outputUrls.length > 0 ? (
                    <div className="mb-4">
                        <p className="mb-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Generated Output ({outputUrls.length})
                        </p>
                        <div className="grid gap-3">
                            {outputUrls.map((url, index) => {
                                const isVideo =
                                    url.endsWith('.mp4') ||
                                    url.endsWith('.webm') ||
                                    url.endsWith('.mov') ||
                                    generation.operation.includes('video');

                                return (
                                    <div
                                        key={url}
                                        className="space-y-3 rounded-xl border bg-muted/20 p-3"
                                    >
                                        {isVideo ? (
                                            <video
                                                src={url}
                                                controls
                                                className="w-full rounded-lg border"
                                            />
                                        ) : (
                                            <img
                                                src={url}
                                                alt={`Output ${index + 1}`}
                                                className="max-h-[420px] w-full rounded-lg border object-contain"
                                            />
                                        )}
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-9 gap-1.5 px-3 text-xs"
                                                onClick={() => {
                                                    const ext = isVideo
                                                        ? 'mp4'
                                                        : 'png';
                                                    handleDownload(
                                                        url,
                                                        `${generation.operation}-${generation.id}${outputUrls.length > 1 ? `-${index + 1}` : ''}.${ext}`,
                                                        generation.id,
                                                        index,
                                                    );
                                                }}
                                            >
                                                <Download className="h-4 w-4" />
                                                Download{' '}
                                                {isVideo ? 'Video' : 'Image'}{' '}
                                                {outputUrls.length > 1
                                                    ? `#${index + 1}`
                                                    : ''}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="mb-4 rounded-xl bg-muted/50 p-8 text-center text-sm text-muted-foreground">
                        {generation.error
                            ? `Failed: ${generation.error}`
                            : 'No output files'}
                    </div>
                )}

                {/* FOOTER ACTIONS */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <div className="text-xs text-muted-foreground">
                        Created:{' '}
                        {new Date(generation.created_at).toLocaleString()}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {generation.status === 'completed' &&
                            outputUrls.length > 0 && (
                                <>
                                    <Button
                                        variant="default"
                                        className="h-10 gap-1.5 px-4 text-sm"
                                        disabled={isSavingTemplate}
                                        onClick={handleSaveToTemplate}
                                    >
                                        <BookmarkPlus className="h-4 w-4" />
                                        {isSavingTemplate
                                            ? 'Saving Template...'
                                            : 'Save to Template'}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="h-10 gap-1.5 px-4 text-sm"
                                        onClick={() => {
                                            const url = outputUrls[0];
                                            const isVideo =
                                                url.endsWith('.mp4') ||
                                                url.endsWith('.webm') ||
                                                url.endsWith('.mov') ||
                                                generation.operation.includes(
                                                    'video',
                                                );
                                            const ext = isVideo ? 'mp4' : 'png';
                                            handleDownload(
                                                url,
                                                `${generation.operation}-${generation.id}.${ext}`,
                                                generation.id,
                                                0,
                                            );
                                        }}
                                    >
                                        <Download className="h-4 w-4" />
                                        Download
                                    </Button>
                                </>
                            )}

                        <Button
                            variant="destructive"
                            className="h-10 gap-1.5 px-4 text-sm"
                            onClick={() => {
                                if (
                                    confirm(
                                        'Are you sure you want to delete this generation and its output file?',
                                    )
                                ) {
                                    router.delete(
                                        `/admin/ai/generations/${generation.id}`,
                                        {
                                            preserveScroll: true,
                                            onSuccess: () => onClose(),
                                        },
                                    );
                                }
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
