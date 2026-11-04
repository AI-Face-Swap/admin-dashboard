import { router } from '@inertiajs/react';
import { Download, Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { handleDownload, type GenerationResult } from './types';

export function ResultPopupModal({
    open,
    onClose,
    processing,
    processingText,
    result,
    isVideo,
    filenamePrefix,
    canSaveTemplate = false,
    onClearResult,
}: {
    open: boolean;
    onClose: () => void;
    processing: boolean;
    processingText: string;
    result: GenerationResult | null;
    isVideo: boolean;
    filenamePrefix: string;
    canSaveTemplate?: boolean;
    onClearResult?: () => void;
}) {
    if (!open || (!processing && !result)) {
        return null;
    }

    const outputs = result?.generation?.output ?? [];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
            onClick={onClose}
        >
            <div
                className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-background p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between border-b pb-3.5">
                    <div className="flex items-center gap-2.5">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-bold">
                            {processing && !result
                                ? 'AI ထုတ်လုပ်နေပါသည် (Generating...)'
                                : 'ထုတ်လုပ်ပြီးသော ရလဒ် (Generation Result)'}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {processing && !result && (
                    <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/20 p-6 text-center">
                        <div className="h-9 w-9 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                        <p className="text-base font-medium">{processingText}</p>
                        <p className="text-sm text-muted-foreground">
                            ဤ Popup ကို ပိတ်ထားလိုပါက ညာဘက်အပေါ်မှ (X) ကို နှိပ်နိုင်ပါသည်။
                        </p>
                    </div>
                )}

                {result && (
                    <div className="space-y-4">
                        {outputs.length > 0 ? (
                            <div className="grid gap-4">
                                {outputs.map((url) =>
                                    isVideo ? (
                                        <video
                                            key={url}
                                            src={url}
                                            controls
                                            autoPlay
                                            className="max-h-[480px] w-full rounded-xl border bg-black"
                                        />
                                    ) : (
                                        <img
                                            key={url}
                                            src={url}
                                            alt="Generated Output"
                                            className="max-h-[480px] w-full rounded-xl border bg-black/20 object-contain"
                                        />
                                    ),
                                )}
                            </div>
                        ) : (
                            <div className="flex h-40 items-center justify-center rounded-xl bg-muted/50 text-base text-muted-foreground">
                                No output returned ({result.generation.status}).
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 text-sm">
                            <Badge variant="default" className="px-2.5 py-1 text-xs">
                                status: {result.generation.status}
                            </Badge>
                            <Badge variant="outline" className="px-2.5 py-1 text-xs">
                                cost: {result.generation.cost ?? '—'}{' '}
                                {result.generation.currency ?? ''}
                            </Badge>
                            <Badge variant="outline" className="px-2.5 py-1 text-xs">
                                duration:{' '}
                                {result.generation.duration_ms
                                    ? `${(result.generation.duration_ms / 1000).toFixed(1)}s`
                                    : '—'}
                            </Badge>
                            {result.generation.request_id && (
                                <Badge variant="outline" className="px-2.5 py-1 font-mono text-xs">
                                    {result.generation.request_id}
                                </Badge>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-10 px-4 text-sm"
                                onClick={onClose}
                            >
                                Close
                            </Button>
                            <div className="flex flex-wrap items-center gap-2.5">
                                {outputs.length > 0 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-10 px-4 text-sm"
                                        onClick={() =>
                                            handleDownload(
                                                outputs[0],
                                                `${filenamePrefix}-${result.generation.id}.${isVideo ? 'mp4' : 'png'}`,
                                                result.generation.id,
                                                0,
                                            )
                                        }
                                    >
                                        <Download className="mr-1.5 h-4 w-4" />
                                        Download {isVideo ? 'Video' : 'Image'}
                                    </Button>
                                )}
                                {canSaveTemplate && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="h-10 px-4 text-sm"
                                        onClick={() =>
                                            router.post(
                                                `/admin/templates/from-generation/${result.generation.id}`,
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        Save to Templates
                                    </Button>
                                )}
                                {onClearResult && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        className="h-10 px-4 text-sm"
                                        onClick={() => {
                                            if (
                                                confirm(
                                                    'Are you sure you want to delete this generation and its output file?',
                                                )
                                            ) {
                                                router.delete(
                                                    `/admin/ai/generations/${result.generation.id}`,
                                                    {
                                                        preserveScroll: true,
                                                        onSuccess: () => {
                                                            onClearResult();
                                                            onClose();
                                                        },
                                                    },
                                                );
                                            }
                                        }}
                                    >
                                        Delete
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
