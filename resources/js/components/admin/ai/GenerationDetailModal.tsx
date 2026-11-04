import { router } from '@inertiajs/react';
import { Download, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { handleDownload, type Generation } from './types';

export function GenerationDetailModal({
    generation,
    onClose,
}: {
    generation: Generation;
    onClose: () => void;
}) {
    const outputUrls = generation.output_metadata ?? [];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
            onClick={onClose}
        >
            <div
                className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-background p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <X className="h-5 w-5" />
                </button>

                <h2 className="mb-4 text-lg font-bold">Generation Detail</h2>

                <div className="mb-4 flex flex-wrap gap-2">
                    <Badge
                        variant={
                            generation.status === 'completed'
                                ? 'default'
                                : generation.status === 'failed'
                                  ? 'destructive'
                                  : 'secondary'
                        }
                        className="px-2.5 py-1 text-xs"
                    >
                        {generation.status}
                    </Badge>
                    <Badge variant="outline" className="px-2.5 py-1 text-xs">
                        {generation.operation}
                    </Badge>
                    <Badge variant="outline" className="px-2.5 py-1 text-xs">
                        {generation.template?.name ?? 'No template'}
                    </Badge>
                    {generation.cost && (
                        <Badge variant="outline" className="px-2.5 py-1 text-xs">
                            cost: {generation.cost} {generation.currency ?? ''}
                        </Badge>
                    )}
                    {generation.duration_ms && (
                        <Badge variant="outline" className="px-2.5 py-1 text-xs">
                            {generation.duration_ms} ms
                        </Badge>
                    )}
                </div>

                {generation.request_id && (
                    <div className="mb-4">
                        <p className="mb-1 text-sm font-medium text-muted-foreground">
                            Request ID
                        </p>
                        <code className="rounded bg-muted px-2.5 py-1 font-mono text-xs">
                            {generation.request_id}
                        </code>
                    </div>
                )}

                {outputUrls.length > 0 ? (
                    <div className="mb-4">
                        <p className="mb-2 text-sm font-medium text-muted-foreground">
                            Output Files
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
                                        <div className="flex justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-9 gap-1.5 px-3 text-sm"
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
                        No output files
                    </div>
                )}

                <div className="mt-6 flex items-center justify-between border-t pt-4">
                    <div className="text-sm text-muted-foreground">
                        Created:{' '}
                        {new Date(generation.created_at).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2.5">
                        {outputUrls.length > 0 && (
                            <Button
                                variant="outline"
                                className="h-10 gap-1.5 px-4 text-sm"
                                onClick={() => {
                                    const url = outputUrls[0];
                                    const isVideo =
                                        url.endsWith('.mp4') ||
                                        url.endsWith('.webm') ||
                                        url.endsWith('.mov') ||
                                        generation.operation.includes('video');
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
                        )}
                        <Button
                            variant="destructive"
                            className="h-10 px-4 text-sm"
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
                            Delete
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
