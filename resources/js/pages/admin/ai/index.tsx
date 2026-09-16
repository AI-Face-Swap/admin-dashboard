import { Head, router } from '@inertiajs/react';
import { Download, X } from 'lucide-react';
import { useRef, useState, useCallback, useEffect } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import admin from '@/routes/admin';

type Template = {
    id: number;
    name: string;
    slug: string;
    type: 'image' | 'video';
    thumbnail_path: string | null;
    file_path: string;
};

type Generation = {
    id: number;
    operation: string;
    status: string;
    request_id: string | null;
    cost: string | null;
    currency: string | null;
    duration_ms: number | null;
    output_metadata: string[] | null;
    created_at: string;
    template: { id: number; name: string; slug: string } | null;
};

type GenerationResult = {
    status: string;
    generation: {
        id: number;
        request_id: string | null;
        operation: string;
        status: string;
        cost: string | null;
        currency: string | null;
        duration_ms: number | null;
        output: string[];
        message?: string;
    };
};

function csrfToken(): string {
    const cookie = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith('XSRF-TOKEN='));

    return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
}

async function handleDownload(
    url: string,
    defaultFilename?: string,
    generationId?: number,
    index: number = 0,
) {
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (response.ok) {
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download =
                defaultFilename ||
                url.split('/').pop()?.split('?')[0] ||
                'generation';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            return;
        }
    } catch {
        // Fallback to server route or direct link
    }

    if (generationId) {
        const downloadUrl = `/admin/ai/generations/${generationId}/download?index=${index}`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = defaultFilename || 'generation';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
}

type TabType = 'image' | 'video' | 'generate' | 'image-to-video' | 'image-edit';

export default function Index({
    templates,
    generations,
}: {
    templates: Template[];
    generations: Generation[];
}) {
    const [activeTab, setActiveTab] = useState<TabType>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab') as TabType;
            if (tab && ['image', 'video', 'generate', 'image-to-video', 'image-edit'].includes(tab)) {
                return tab;
            }
        }
        return 'image';
    });

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tab);
            window.history.replaceState({}, '', url.toString());
        }
    };

    const [selectedGeneration, setSelectedGeneration] =
        useState<Generation | null>(null);

    return (
        <>
            <Head title="AI Generation" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="AI Generation"
                    description="Swap faces onto images or videos using the shared API."
                />

                {/* Tab Selector */}
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant={activeTab === 'image' ? 'default' : 'outline'}
                        onClick={() => handleTabChange('image')}
                    >
                        Image Face Swap
                    </Button>
                    <Button
                        variant={activeTab === 'video' ? 'default' : 'outline'}
                        onClick={() => handleTabChange('video')}
                    >
                        Video Face Swap
                    </Button>
                    <Button
                        variant={
                            activeTab === 'generate' ? 'default' : 'outline'
                        }
                        onClick={() => handleTabChange('generate')}
                    >
                        Image Generation
                    </Button>
                    <Button
                        variant={
                            activeTab === 'image-to-video'
                                ? 'default'
                                : 'outline'
                        }
                        onClick={() => handleTabChange('image-to-video')}
                    >
                        Image to Video
                    </Button>
                    <Button
                        variant={
                            activeTab === 'image-edit' ? 'default' : 'outline'
                        }
                        onClick={() => handleTabChange('image-edit')}
                    >
                        Image Editing
                    </Button>
                </div>

                {activeTab === 'image' && (
                    <ImageFaceSwap templates={templates} />
                )}

                {activeTab === 'video' && (
                    <VideoFaceSwap templates={templates} />
                )}

                {activeTab === 'generate' && <ImageGeneration />}

                {activeTab === 'image-to-video' && <ImageToVideo />}

                {activeTab === 'image-edit' && <ImageEditing />}

                <AnimatedCard>
                    <CardContent>
                        <p className="mb-3 font-medium">Recent generations</p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Operation</TableHead>
                                    <TableHead>Template</TableHead>
                                    <TableHead>Cost</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {generations.map((generation) => (
                                    <TableRow
                                        key={generation.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() =>
                                            setSelectedGeneration(generation)
                                        }
                                    >
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    generation.status ===
                                                    'completed'
                                                        ? 'default'
                                                        : generation.status ===
                                                            'failed'
                                                          ? 'destructive'
                                                          : 'secondary'
                                                }
                                            >
                                                {generation.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {generation.operation}
                                        </TableCell>
                                        <TableCell>
                                            {generation.template?.name ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            {generation.cost
                                                ? `${generation.cost} ${generation.currency ?? ''}`
                                                : '—'}
                                        </TableCell>
                                        <TableCell>
                                            {generation.duration_ms
                                                ? `${generation.duration_ms} ms`
                                                : '—'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(
                                                generation.created_at,
                                            ).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {generation.status === 'completed' &&
                                            generation.output_metadata &&
                                            generation.output_metadata.length > 0 ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 gap-1.5 px-2.5 text-xs"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const url = generation.output_metadata![0];
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
                                                    <Download className="h-3.5 w-3.5" />
                                                    Download
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {generations.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="text-center text-muted-foreground"
                                        >
                                            No generations yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </AnimatedCard>
            </div>

            {/* Generation Detail Modal */}
            {selectedGeneration && (
                <GenerationDetailModal
                    generation={selectedGeneration}
                    onClose={() => setSelectedGeneration(null)}
                />
            )}
        </>
    );
}

function GenerationDetailModal({
    generation,
    onClose,
}: {
    generation: Generation;
    onClose: () => void;
}) {
    const outputUrls = generation.output_metadata ?? [];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={onClose}
        >
            <div
                className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-background p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                    <X className="h-5 w-5" />
                </button>

                <h2 className="mb-4 text-lg font-semibold">
                    Generation Detail
                </h2>

                {/* Status + Badges */}
                <div className="mb-4 flex flex-wrap gap-2">
                    <Badge
                        variant={
                            generation.status === 'completed'
                                ? 'default'
                                : generation.status === 'failed'
                                  ? 'destructive'
                                  : 'secondary'
                        }
                    >
                        {generation.status}
                    </Badge>
                    <Badge variant="outline">{generation.operation}</Badge>
                    <Badge variant="outline">
                        {generation.template?.name ?? 'No template'}
                    </Badge>
                    {generation.cost && (
                        <Badge variant="outline">
                            cost: {generation.cost} {generation.currency ?? ''}
                        </Badge>
                    )}
                    {generation.duration_ms && (
                        <Badge variant="outline">
                            {generation.duration_ms} ms
                        </Badge>
                    )}
                </div>

                {/* Request ID */}
                {generation.request_id && (
                    <div className="mb-4">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                            Request ID
                        </p>
                        <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                            {generation.request_id}
                        </code>
                    </div>
                )}

                {/* Output Files */}
                {outputUrls.length > 0 && (
                    <div className="mb-4">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
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
                                    <div key={url} className="space-y-2 rounded-lg border bg-muted/20 p-2">
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
                                                className="max-h-[400px] w-full rounded-lg border object-contain"
                                            />
                                        )}
                                        <div className="flex justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5 text-xs"
                                                onClick={() => {
                                                    const ext = isVideo ? 'mp4' : 'png';
                                                    handleDownload(
                                                        url,
                                                        `${generation.operation}-${generation.id}${outputUrls.length > 1 ? `-${index + 1}` : ''}.${ext}`,
                                                        generation.id,
                                                        index,
                                                    );
                                                }}
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                Download {isVideo ? 'Video' : 'Image'} {outputUrls.length > 1 ? `#${index + 1}` : ''}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {outputUrls.length === 0 && (
                    <div className="mb-4 rounded-lg bg-muted/50 p-8 text-center text-sm text-muted-foreground">
                        No output files
                    </div>
                )}

                {/* Timestamps & Actions */}
                <div className="mt-6 flex items-center justify-between border-t pt-4">
                    <div className="text-xs text-muted-foreground">
                        Created:{' '}
                        {new Date(generation.created_at).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                        {outputUrls.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
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
                            size="sm"
                            onClick={() => {
                                if (
                                    confirm(
                                        'Are you sure you want to delete this generation and its output file?',
                                    )
                                ) {
                                    router.delete(
                                        `/api/v1/ai/generations/${generation.id}`,
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

function ImageFaceSwap({ templates }: { templates: Template[] }) {
    const imageTemplates = templates.filter((t) => t.type === 'image');

    const [faceMode, setFaceMode] = useState<'upload' | 'url'>('upload');
    const [faceFile, setFaceFile] = useState<File | null>(null);
    const [facePreview, setFacePreview] = useState<string | null>(null);
    const [faceUrl, setFaceUrl] = useState('');

    const [targetMode, setTargetMode] = useState<'template' | 'url'>(
        'template',
    );
    const [templateSlug, setTemplateSlug] = useState<string>('');
    const [targetUrl, setTargetUrl] = useState('');

    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<GenerationResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onFaceFileChange = (file: File | null) => {
        setFaceFile(file);
        setFacePreview(file ? URL.createObjectURL(file) : null);
    };

    const generate = async () => {
        setError(null);
        setResult(null);

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
                setError('Pick a template first.');

                return;
            }

            form.append('template_slug', templateSlug);
        } else {
            form.append('target_image_url', targetUrl);
        }

        setProcessing(true);

        try {
            const response = await fetch('/api/v1/ai/face-swap', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': csrfToken(),
                },
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

            setResult(body);
        } catch {
            setError('Network error — is the server running?');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="grid gap-6 xl:grid-cols-5">
            <AnimatedCard className="xl:col-span-2">
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Face image</Label>
                            <div className="flex gap-1">
                                <Button
                                    type="button"
                                    variant={
                                        faceMode === 'upload'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    size="sm"
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
                                    className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                >
                                    {facePreview ? (
                                        <img
                                            src={facePreview}
                                            alt="Face preview"
                                            className="size-full object-contain"
                                        />
                                    ) : (
                                        'Click to upload the face image'
                                    )}
                                </div>
                            </>
                        ) : (
                            <Input
                                value={faceUrl}
                                onChange={(e) => setFaceUrl(e.target.value)}
                                placeholder="https://.../face.jpg"
                            />
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Target</Label>
                            <div className="flex gap-1">
                                <Button
                                    type="button"
                                    variant={
                                        targetMode === 'template'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    size="sm"
                                    onClick={() => setTargetMode('template')}
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
                                <SelectTrigger>
                                    <SelectValue placeholder="Pick a template" />
                                </SelectTrigger>
                                <SelectContent>
                                    {imageTemplates.map((template) => (
                                        <SelectItem
                                            key={template.id}
                                            value={template.slug}
                                        >
                                            {template.name} ({template.type})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                value={targetUrl}
                                onChange={(e) => setTargetUrl(e.target.value)}
                                placeholder="https://.../target.jpg"
                            />
                        )}
                    </div>

                    {error && (
                        <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    <AnimatedButton
                        onClick={generate}
                        disabled={processing}
                        className="w-full"
                    >
                        {processing ? 'Generating...' : 'Generate Face Swap'}
                    </AnimatedButton>
                </CardContent>
            </AnimatedCard>

            <AnimatedCard className="xl:col-span-3">
                <CardContent>
                    <p className="mb-3 font-medium">Result</p>
                    {!result && !processing && (
                        <div className="flex h-64 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
                            Run a generation to see the result here.
                        </div>
                    )}
                    {processing && (
                        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                            Generating — this usually takes 10–30 seconds...
                        </div>
                    )}
                    {result && (
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                {result.generation.output.map((url) => (
                                    <img
                                        key={url}
                                        src={url}
                                        className="w-full rounded-lg border object-contain"
                                    />
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm">
                                <Badge variant="outline">
                                    status: {result.generation.status}
                                </Badge>
                                <Badge variant="outline">
                                    cost: {result.generation.cost ?? '—'}{' '}
                                    {result.generation.currency ?? ''}
                                </Badge>
                                <Badge variant="outline">
                                    duration:{' '}
                                    {result.generation.duration_ms ?? '—'} ms
                                </Badge>
                                <Badge variant="outline" className="font-mono">
                                    {result.generation.request_id ?? '—'}
                                </Badge>
                            </div>
                            {result.generation.output.length > 0 && (
                                <div className="flex items-center gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            handleDownload(
                                                result.generation.output[0],
                                                `face-swap-${result.generation.id}.png`,
                                                result.generation.id,
                                                0,
                                            )
                                        }
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Image
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </AnimatedCard>
        </div>
    );
}

function VideoFaceSwap({ templates }: { templates: Template[] }) {
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
    const [generationId, setGenerationId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const onFaceFileChange = (file: File | null) => {
        setFaceFile(file);
        setFacePreview(file ? URL.createObjectURL(file) : null);
    };

    // Poll for generation status
    const pollStatus = useCallback(async (id: number) => {
        try {
            const response = await fetch(`/api/v1/ai/generations/${id}`, {
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': csrfToken(),
                },
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

                if (pollRef.current) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                }

                // Refresh the generations table from the server
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

    // Start polling when generationId changes
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
            const response = await fetch('/api/v1/ai/video-face-swap', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': csrfToken(),
                },
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

            // Job dispatched — start polling
            setGenerationId(body.generation.id);
            setPolling(true);
        } catch {
            setError('Network error — is the server running?');
            setProcessing(false);
        }
    };

    return (
        <div className="grid gap-6 xl:grid-cols-5">
            <AnimatedCard className="xl:col-span-2">
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Face image</Label>
                            <div className="flex gap-1">
                                <Button
                                    type="button"
                                    variant={
                                        faceMode === 'upload'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    size="sm"
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
                                    className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                >
                                    {facePreview ? (
                                        <img
                                            src={facePreview}
                                            alt="Face preview"
                                            className="size-full object-contain"
                                        />
                                    ) : (
                                        'Click to upload the face image'
                                    )}
                                </div>
                            </>
                        ) : (
                            <Input
                                value={faceUrl}
                                onChange={(e) => setFaceUrl(e.target.value)}
                                placeholder="https://.../face.jpg"
                            />
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Target video</Label>
                            <div className="flex gap-1">
                                <Button
                                    type="button"
                                    variant={
                                        targetMode === 'template'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    size="sm"
                                    onClick={() => setTargetMode('template')}
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
                                <SelectTrigger>
                                    <SelectValue placeholder="Pick a video template" />
                                </SelectTrigger>
                                <SelectContent>
                                    {videoTemplates.length > 0 ? (
                                        videoTemplates.map((template) => (
                                            <SelectItem
                                                key={template.id}
                                                value={template.slug}
                                            >
                                                {template.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="none" disabled>
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
                            />
                        )}
                    </div>

                    {error && (
                        <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    <AnimatedButton
                        onClick={generate}
                        disabled={processing}
                        className="w-full"
                    >
                        {processing
                            ? 'Generating...'
                            : 'Generate Video Face Swap'}
                    </AnimatedButton>
                </CardContent>
            </AnimatedCard>

            <AnimatedCard className="xl:col-span-3">
                <CardContent>
                    <p className="mb-3 font-medium">Result</p>
                    {!result && !processing && (
                        <div className="flex h-64 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
                            Run a generation to see the result here.
                        </div>
                    )}
                    {processing && !result && (
                        <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <p>
                                Video processing — this usually takes 5+
                                minutes...
                            </p>
                            <p className="text-xs">
                                Polling every 5 seconds for status updates.
                            </p>
                        </div>
                    )}
                    {result && (
                        <div className="space-y-4">
                            {result.generation.output.length > 0 ? (
                                <div className="grid gap-4">
                                    {result.generation.output.map((url) => (
                                        <video
                                            key={url}
                                            src={url}
                                            controls
                                            className="w-full rounded-lg border"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex h-40 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
                                    No output returned.
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2 text-sm">
                                <Badge variant="outline">
                                    status: {result.generation.status}
                                </Badge>
                                <Badge variant="outline">
                                    cost: {result.generation.cost ?? '—'}{' '}
                                    {result.generation.currency ?? ''}
                                </Badge>
                                <Badge variant="outline">
                                    duration:{' '}
                                    {result.generation.duration_ms ?? '—'} ms
                                </Badge>
                                <Badge variant="outline" className="font-mono">
                                    {result.generation.request_id ?? '—'}
                                </Badge>
                            </div>
                            {result.generation.output.length > 0 && (
                                <div className="flex items-center gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            handleDownload(
                                                result.generation.output[0],
                                                `video-face-swap-${result.generation.id}.mp4`,
                                                result.generation.id,
                                                0,
                                            )
                                        }
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Video
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </AnimatedCard>
        </div>
    );
}

function ImageGeneration() {
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [model, setModel] = useState('seedream-v5-lite-text-to-image');
    const [width, setWidth] = useState('1024');
    const [height, setHeight] = useState('1024');
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<GenerationResult | null>(null);
    const [error, setError] = useState('');

    const generate = async () => {
        if (!prompt.trim()) {
            return;
        }

        setProcessing(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch('/api/v1/ai/images', {
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

                return;
            }

            setResult(data);
        } catch {
            setError('Network error — please try again.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="grid gap-6 xl:grid-cols-3">
            <AnimatedCard className="xl:col-span-2">
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Prompt</Label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="A superhero flying over a city at sunset, cinematic lighting, detailed"
                            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Negative Prompt (optional)</Label>
                        <Input
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            placeholder="blurry, low quality, distorted"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Model</Label>
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger>
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
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Width</Label>
                                <Select value={width} onValueChange={setWidth}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="512">512</SelectItem>
                                        <SelectItem value="768">768</SelectItem>
                                        <SelectItem value="1024">
                                            1024
                                        </SelectItem>
                                        <SelectItem value="1536">
                                            1536
                                        </SelectItem>
                                        <SelectItem value="2048">
                                            2048
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Height</Label>
                                <Select
                                    value={height}
                                    onValueChange={setHeight}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="512">512</SelectItem>
                                        <SelectItem value="768">768</SelectItem>
                                        <SelectItem value="1024">
                                            1024
                                        </SelectItem>
                                        <SelectItem value="1536">
                                            1536
                                        </SelectItem>
                                        <SelectItem value="2048">
                                            2048
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    <AnimatedButton
                        onClick={generate}
                        disabled={processing || !prompt.trim()}
                        className="w-full"
                    >
                        {processing ? 'Generating...' : 'Generate Image'}
                    </AnimatedButton>
                </CardContent>
            </AnimatedCard>

            <AnimatedCard>
                <CardContent>
                    <p className="mb-3 font-medium">Result</p>
                    {!result && !processing && (
                        <div className="flex h-64 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
                            Run a generation to see the result here.
                        </div>
                    )}
                    {processing && !result && (
                        <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <p>Generating image...</p>
                        </div>
                    )}
                    {result && (
                        <div className="space-y-4">
                            {result.generation.output.length > 0 ? (
                                <div className="grid gap-4">
                                    {result.generation.output.map((url) => (
                                        <img
                                            key={url}
                                            src={url}
                                            className="w-full rounded-lg border"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex h-40 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
                                    No output returned.
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2 text-sm">
                                <Badge variant="outline">
                                    status: {result.generation.status}
                                </Badge>
                                <Badge variant="outline">
                                    cost: {result.generation.cost ?? '—'}{' '}
                                    {result.generation.currency ?? ''}
                                </Badge>
                                <Badge variant="outline">
                                    duration:{' '}
                                    {result.generation.duration_ms ?? '—'} ms
                                </Badge>
                            </div>
                            {result.generation.output.length > 0 && (
                                <div className="flex items-center gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            handleDownload(
                                                result.generation.output[0],
                                                `image-gen-${result.generation.id}.png`,
                                                result.generation.id,
                                                0,
                                            )
                                        }
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Image
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </AnimatedCard>
        </div>
    );
}

function ImageToVideo() {
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState('');
    const [model, setModel] = useState('kling-o1-reference-image-to-video');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [resolution, setResolution] = useState('720p');
    const [promptExtend, setPromptExtend] = useState(true);
    const [seed, setSeed] = useState('');
    const [processing, setProcessing] = useState(false);
    const [polling, setPolling] = useState(false);
    const [result, setResult] = useState<GenerationResult | null>(null);
    const [error, setError] = useState('');
    const [generationId, setGenerationId] = useState<number | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onImageFileChange = (file: File | null) => {
        setImageFile(file);
        setImagePreview(file ? URL.createObjectURL(file) : null);
    };

    const pollStatus = useCallback(async (id: number) => {
        try {
            const response = await fetch(`/api/v1/ai/generations/${id}`, {
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': csrfToken(),
                },
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
        if (!prompt.trim()) {
            return;
        }

        if (imageMode === 'upload' && !imageFile) {
            setError('Upload an image first.');

            return;
        }

        if (imageMode === 'url' && !imageUrl.trim()) {
            setError('Enter an image URL.');

            return;
        }

        setProcessing(true);
        setError('');
        setResult(null);
        setGenerationId(null);
        setPolling(false);

        const form = new FormData();
        form.append('prompt', prompt.trim());

        if (imageMode === 'upload' && imageFile) {
            form.append('image', imageFile);
        } else {
            form.append('image_url', imageUrl.trim());
        }

        if (negativePrompt.trim()) {
            form.append('negative_prompt', negativePrompt.trim());
        }

        form.append('resolution', resolution);
        form.append('model', model);
        form.append('aspect_ratio', aspectRatio);
        form.append('prompt_extend', String(promptExtend));

        if (seed) {
            form.append('seed', seed);
        }

        try {
            const response = await fetch('/api/v1/ai/image-to-video', {
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

            // Job dispatched — start polling
            setGenerationId(data.generation.id);
            setPolling(true);
        } catch {
            setError('Network error — please try again.');
            setProcessing(false);
        }
    };

    return (
        <div className="grid gap-6 xl:grid-cols-3">
            <AnimatedCard className="xl:col-span-2">
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Prompt *</Label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Slow cinematic pan around the subject, soft lighting, dramatic atmosphere"
                            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Input Image *</Label>
                            <div className="flex gap-1">
                                <Button
                                    type="button"
                                    variant={
                                        imageMode === 'upload'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    size="sm"
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
                                    className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                >
                                    {imagePreview ? (
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="size-full object-contain"
                                        />
                                    ) : (
                                        'Click to upload the input image'
                                    )}
                                </div>
                            </>
                        ) : (
                            <Input
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="https://example.com/input-image.jpg"
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Negative Prompt (optional)</Label>
                        <Input
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            placeholder="blurry, low quality, text overlays"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Model</Label>
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="kling-o1-reference-image-to-video">
                                        Kling (Default)
                                    </SelectItem>
                                    <SelectItem value="wan2.7-r2v">
                                        Wan 2.7 R2V
                                    </SelectItem>
                                    <SelectItem value="seedance-2.5">
                                        Seedance 2.5
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Aspect Ratio</Label>
                            <Select
                                value={aspectRatio}
                                onValueChange={setAspectRatio}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="16:9">
                                        16:9 (Landscape)
                                    </SelectItem>
                                    <SelectItem value="9:16">
                                        9:16 (Portrait)
                                    </SelectItem>
                                    <SelectItem value="1:1">
                                        1:1 (Square)
                                    </SelectItem>
                                    <SelectItem value="4:3">4:3</SelectItem>
                                    <SelectItem value="3:4">3:4</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Resolution</Label>
                            <Select
                                value={resolution}
                                onValueChange={setResolution}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="480p">480p</SelectItem>
                                    <SelectItem value="720p">720p</SelectItem>
                                    <SelectItem value="1080p">1080p</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Seed (optional)</Label>
                            <Input
                                value={seed}
                                onChange={(e) => setSeed(e.target.value)}
                                placeholder="Random"
                                type="number"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="promptExtend"
                            checked={promptExtend}
                            onChange={(e) => setPromptExtend(e.target.checked)}
                            className="h-4 w-4"
                        />
                        <Label htmlFor="promptExtend">
                            Prompt Extend (auto-enhance)
                        </Label>
                    </div>

                    {error && (
                        <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    <AnimatedButton
                        onClick={generate}
                        disabled={processing || !prompt.trim()}
                        className="w-full"
                    >
                        {processing
                            ? 'Generating...'
                            : 'Generate Video from Image'}
                    </AnimatedButton>
                </CardContent>
            </AnimatedCard>

            <AnimatedCard>
                <CardContent>
                    <p className="mb-3 font-medium">Result</p>
                    {!result && !processing && (
                        <div className="flex h-64 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
                            Run a generation to see the result here.
                        </div>
                    )}
                    {processing && !result && (
                        <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <p>
                                Video processing — this usually takes 1-3
                                minutes...
                            </p>
                            <p className="text-xs">
                                Polling every 5 seconds for status updates.
                            </p>
                        </div>
                    )}
                    {result && (
                        <div className="space-y-4">
                            {result.generation.output.length > 0 ? (
                                <div className="grid gap-4">
                                    {result.generation.output.map((url) => (
                                        <video
                                            key={url}
                                            src={url}
                                            controls
                                            className="w-full rounded-lg border"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex h-40 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
                                    No output returned.
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2 text-sm">
                                <Badge variant="outline">
                                    status: {result.generation.status}
                                </Badge>
                                <Badge variant="outline">
                                    cost: {result.generation.cost ?? '—'}{' '}
                                    {result.generation.currency ?? ''}
                                </Badge>
                                <Badge variant="outline">
                                    duration:{' '}
                                    {result.generation.duration_ms ?? '—'} ms
                                </Badge>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                {result.generation.output.length > 0 && (
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            handleDownload(
                                                result.generation.output[0],
                                                `image-to-video-${result.generation.id}.mp4`,
                                                result.generation.id,
                                                0,
                                            )
                                        }
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Video
                                    </Button>
                                )}
                                <Button
                                    variant="secondary"
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
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        if (
                                            confirm(
                                                'Are you sure you want to delete this generation and its output file?',
                                            )
                                        ) {
                                            router.delete(
                                                `/api/v1/ai/generations/${result.generation.id}`,
                                                {
                                                    preserveScroll: true,
                                                    onSuccess: () =>
                                                        setResult(null),
                                                },
                                            );
                                        }
                                    }}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </AnimatedCard>
        </div>
    );
}

type EditModel =
    | 'multi-image-kontext-max'
    | 'flux-kontext-dev'
    | 'seedream-v5-lite-image-to-image'
    | 'gpt-image-1.5-edit'
    | 'kling-3-image2image'
    | 'nano-banana-pro';

function ImageEditing() {
    const [model, setModel] = useState<EditModel>('multi-image-kontext-max');
    const [prompt, setPrompt] = useState('');
    const [seed, setSeed] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<GenerationResult | null>(null);

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
    const [responseModalities, setResponseModalities] = useState('TEXT_AND_IMAGE');

    const onImg1Change = (file: File | null) => {
        setImg1File(file);
        setImg1Preview(file ? URL.createObjectURL(file) : null);
    };

    const onImg2Change = (file: File | null) => {
        setImg2File(file);
        setImg2Preview(file ? URL.createObjectURL(file) : null);
    };

    const isSingleImageModel = model === 'flux-kontext-dev' || model === 'kling-3-image2image';

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

        // Image 1 validation & append
        if (img1Mode === 'upload') {
            if (!img1File) {
                setError(isSingleImageModel ? 'Upload an input image first.' : 'Upload input image 1 first.');
                return;
            }
            form.append('input_image_1', img1File);
            form.append('input_image', img1File);
        } else {
            if (!img1Url.trim()) {
                setError(isSingleImageModel ? 'Enter input image URL.' : 'Enter input image 1 URL.');
                return;
            }
            form.append('input_image_1_url', img1Url.trim());
            form.append('input_image_url', img1Url.trim());
            form.append('image_url', img1Url.trim());
        }

        // Image 2 validation & append (for multi-image models)
        if (!isSingleImageModel) {
            if (model === 'multi-image-kontext-max') {
                if (img2Mode === 'upload' && !img2File) {
                    setError('Multi-Image Kontext Max requires input image 2.');
                    return;
                }
                if (img2Mode === 'url' && !img2Url.trim()) {
                    setError('Multi-Image Kontext Max requires input image 2 URL.');
                    return;
                }
            }

            if (img2Mode === 'upload' && img2File) {
                form.append('input_image_2', img2File);
            } else if (img2Mode === 'url' && img2Url.trim()) {
                form.append('input_image_2_url', img2Url.trim());
            }
        }

        // Model-specific payload parameters
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
                form.append('disable_safety_checker', String(disableSafetyChecker));
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
        }

        setProcessing(true);

        try {
            const response = await fetch('/api/v1/ai/image-edit', {
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
                return;
            }

            setResult(body);
        } catch {
            setError('Network error — please check your connection and try again.');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="grid gap-6 xl:grid-cols-3">
            <AnimatedCard className="xl:col-span-2">
                <CardContent className="space-y-6">
                    {/* Model Switcher */}
                    <div className="space-y-2">
                        <Label>Model</Label>
                        <Select
                            value={model}
                            onValueChange={(val: EditModel) => {
                                setModel(val);
                                setError(null);
                                // Set model-appropriate defaults
                                if (val === 'multi-image-kontext-max' || val === 'nano-banana-pro') {
                                    setAspectRatio('1:1');
                                    setOutputFormat('jpg');
                                } else if (val === 'seedream-v5-lite-image-to-image' || val === 'kling-3-image2image') {
                                    setAspectRatio('16:9');
                                    setOutputFormat(val === 'seedream-v5-lite-image-to-image' ? 'jpg' : 'png');
                                } else if (val === 'flux-kontext-dev') {
                                    setAspectRatio('match_input_image');
                                    setOutputFormat('png');
                                } else if (val === 'gpt-image-1.5-edit') {
                                    setOutputFormat('png');
                                }
                            }}
                        >
                            <SelectTrigger>
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
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
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
                        </p>
                    </div>

                    {/* Prompt */}
                    <div className="space-y-2">
                        <Label>Prompt *</Label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={
                                model === 'multi-image-kontext-max'
                                    ? 'put the green dress on the woman while maintaining the pose of the woman as it is'
                                    : model === 'flux-kontext-dev'
                                      ? 'Replace the background with a bokeh light effect, zooming in on the subject, keeping pose identical.'
                                      : model === 'seedream-v5-lite-image-to-image'
                                        ? 'Editorial street style fashion photograph of the model wearing an oversized brown wool coat...'
                                        : model === 'gpt-image-1.5-edit'
                                          ? 'A photorealistic wide shot of the person casually sitting across a London street...'
                                          : model === 'kling-3-image2image'
                                            ? 'Transform this garden into a magical winter wonderland with crystalline ice patterns...'
                                            : 'Create a multi-panel GTA-style comic page featuring two coworkers on launch day...'
                            }
                            className="flex min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                    </div>

                    {/* System Prompt (for Nano Banana Pro) */}
                    {model === 'nano-banana-pro' && (
                        <div className="space-y-2">
                            <Label>System Prompt (optional)</Label>
                            <Input
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                placeholder="Keep the composition polished, cheerful, and suitable for a campaign."
                            />
                        </div>
                    )}

                    {/* Reference Images Section */}
                    <div className={`grid gap-4 ${isSingleImageModel ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                        {/* Image 1 */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label>{isSingleImageModel ? 'Input Image *' : 'Input Image 1 *'}</Label>
                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        variant={img1Mode === 'upload' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setImg1Mode('upload')}
                                    >
                                        Upload
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={img1Mode === 'url' ? 'default' : 'outline'}
                                        size="sm"
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
                                        onChange={(e) => onImg1Change(e.target.files?.[0] ?? null)}
                                    />
                                    <div
                                        className="flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted/30"
                                        onClick={() => file1InputRef.current?.click()}
                                    >
                                        {img1Preview ? (
                                            <img
                                                src={img1Preview}
                                                alt="Preview 1"
                                                className="size-full object-contain"
                                            />
                                        ) : (
                                            `Click to upload ${isSingleImageModel ? 'Input Image' : 'Image 1'}`
                                        )}
                                    </div>
                                </>
                            ) : (
                                <Input
                                    value={img1Url}
                                    onChange={(e) => setImg1Url(e.target.value)}
                                    placeholder="https://.../image1.jpg"
                                />
                            )}
                        </div>

                        {/* Image 2 (Multi-image models) */}
                        {!isSingleImageModel && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>
                                        Input Image 2{' '}
                                        {model === 'multi-image-kontext-max' ? '*' : '(optional)'}
                                    </Label>
                                    <div className="flex gap-1">
                                        <Button
                                            type="button"
                                            variant={img2Mode === 'upload' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setImg2Mode('upload')}
                                        >
                                            Upload
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={img2Mode === 'url' ? 'default' : 'outline'}
                                            size="sm"
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
                                            onChange={(e) => onImg2Change(e.target.files?.[0] ?? null)}
                                        />
                                        <div
                                            className="flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted/30"
                                            onClick={() => file2InputRef.current?.click()}
                                        >
                                            {img2Preview ? (
                                                <img
                                                    src={img2Preview}
                                                    alt="Preview 2"
                                                    className="size-full object-contain"
                                                />
                                            ) : (
                                                'Click to upload Image 2'
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <Input
                                        value={img2Url}
                                        onChange={(e) => setImg2Url(e.target.value)}
                                        placeholder="https://.../image2.png"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Model Parameters */}
                    {model === 'multi-image-kontext-max' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Aspect Ratio</Label>
                                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1:1">1:1 (Square)</SelectItem>
                                        <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                                        <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                                        <SelectItem value="4:3">4:3</SelectItem>
                                        <SelectItem value="3:4">3:4</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Safety Tolerance (1-6)</Label>
                                <Select value={safetyTolerance} onValueChange={setSafetyTolerance}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 (Strict)</SelectItem>
                                        <SelectItem value="2">2</SelectItem>
                                        <SelectItem value="3">3</SelectItem>
                                        <SelectItem value="4">4</SelectItem>
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="6">6 (Permissive)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {model === 'flux-kontext-dev' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Aspect Ratio</Label>
                                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="match_input_image">Match Input Image</SelectItem>
                                            <SelectItem value="1:1">1:1 (Square)</SelectItem>
                                            <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                                            <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                                            <SelectItem value="4:3">4:3</SelectItem>
                                            <SelectItem value="3:4">3:4</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Guidance Scale</Label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        min="1"
                                        max="20"
                                        value={guidance}
                                        onChange={(e) => setGuidance(e.target.value)}
                                        placeholder="7"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Inference Steps (1-50)</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={inferenceSteps}
                                        onChange={(e) => setInferenceSteps(e.target.value)}
                                        placeholder="35"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Output Quality (1-100)</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={outputQuality}
                                        onChange={(e) => setOutputQuality(e.target.value)}
                                        placeholder="90"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="disableSafetyChecker"
                                    checked={disableSafetyChecker}
                                    onChange={(e) => setDisableSafetyChecker(e.target.checked)}
                                    className="h-4 w-4"
                                />
                                <Label htmlFor="disableSafetyChecker">Disable Safety Checker</Label>
                            </div>
                        </>
                    )}

                    {model === 'seedream-v5-lite-image-to-image' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Aspect Ratio</Label>
                                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                                        <SelectItem value="1:1">1:1 (Square)</SelectItem>
                                        <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                                        <SelectItem value="4:3">4:3</SelectItem>
                                        <SelectItem value="3:4">3:4</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Image Size</Label>
                                <Select value={seedreamSize} onValueChange={setSeedreamSize}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1K">1K</SelectItem>
                                        <SelectItem value="2K">2K</SelectItem>
                                        <SelectItem value="3K">3K (Default)</SelectItem>
                                        <SelectItem value="4K">4K</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Optimize Prompt</Label>
                                <Select value={optimizePrompt} onValueChange={setOptimizePrompt}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fast">Fast</SelectItem>
                                        <SelectItem value="standard">Standard</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2 pt-6">
                                <input
                                    type="checkbox"
                                    id="seedreamWatermark"
                                    checked={watermark}
                                    onChange={(e) => setWatermark(e.target.checked)}
                                    className="h-4 w-4"
                                />
                                <Label htmlFor="seedreamWatermark">Add Watermark</Label>
                            </div>
                        </div>
                    )}

                    {model === 'gpt-image-1.5-edit' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Resolution / Size</Label>
                                <Select value={gptSize} onValueChange={setGptSize}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">Auto</SelectItem>
                                        <SelectItem value="1024x1024">1024x1024 (1:1)</SelectItem>
                                        <SelectItem value="1536x1024">1536x1024 (3:2)</SelectItem>
                                        <SelectItem value="1024x1536">1024x1536 (2:3)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Quality</Label>
                                <Select value={gptQuality} onValueChange={setGptQuality}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Background</Label>
                                <Select value={gptBackground} onValueChange={setGptBackground}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="opaque">Opaque</SelectItem>
                                        <SelectItem value="transparent">Transparent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Moderation</Label>
                                <Select value={gptModeration} onValueChange={setGptModeration}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">Auto</SelectItem>
                                        <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {model === 'kling-3-image2image' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Resolution</Label>
                                <Select value={klingResolution} onValueChange={setKlingResolution}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1K">1K</SelectItem>
                                        <SelectItem value="2K">2K</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Aspect Ratio</Label>
                                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                                        <SelectItem value="1:1">1:1 (Square)</SelectItem>
                                        <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                                        <SelectItem value="4:3">4:3</SelectItem>
                                        <SelectItem value="3:4">3:4</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {model === 'nano-banana-pro' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Aspect Ratio</Label>
                                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1:1">1:1 (Square)</SelectItem>
                                        <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                                        <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                                        <SelectItem value="4:3">4:3</SelectItem>
                                        <SelectItem value="3:4">3:4</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Output Resolution</Label>
                                <Select value={nanoResolution} onValueChange={setNanoResolution}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="4K">4K (Default)</SelectItem>
                                        <SelectItem value="2K">2K</SelectItem>
                                        <SelectItem value="1K">1K</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Common Output Format & Seed */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Output Format</Label>
                            <Select value={outputFormat} onValueChange={setOutputFormat}>
                                <SelectTrigger>
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
                            <Label>Seed (optional)</Label>
                            <Input
                                value={seed}
                                onChange={(e) => setSeed(e.target.value)}
                                placeholder="e.g. 42"
                                type="number"
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
                        className="w-full"
                    >
                        {processing ? 'Editing Image...' : 'Generate Edited Image'}
                    </AnimatedButton>
                </CardContent>
            </AnimatedCard>

            {/* Result Card */}
            <AnimatedCard>
                <CardContent>
                    <p className="mb-3 font-medium">Result</p>
                    {!result && !processing && (
                        <div className="flex h-64 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
                            Run an image edit to see the result here.
                        </div>
                    )}
                    {processing && !result && (
                        <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <p>Editing image — this usually takes 10–25 seconds...</p>
                        </div>
                    )}
                    {result && (
                        <div className="space-y-4">
                            {result.generation.output.length > 0 ? (
                                <div className="grid gap-4">
                                    {result.generation.output.map((url) => (
                                        <img
                                            key={url}
                                            src={url}
                                            alt="Edited Result"
                                            className="max-h-[400px] w-full rounded-lg border object-contain"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex h-40 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
                                    No output returned.
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 text-sm">
                                <Badge variant="outline">
                                    status: {result.generation.status}
                                </Badge>
                                <Badge variant="outline">
                                    cost: {result.generation.cost ?? '—'}{' '}
                                    {result.generation.currency ?? ''}
                                </Badge>
                                <Badge variant="outline">
                                    duration:{' '}
                                    {result.generation.duration_ms ?? '—'} ms
                                </Badge>
                                {result.generation.request_id && (
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {result.generation.request_id}
                                    </Badge>
                                )}
                            </div>

                            {/* Action Buttons: Save to Templates + Delete */}
                            <div className="flex items-center gap-2 pt-2">
                                {result.generation.output.length > 0 && (
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            handleDownload(
                                                result.generation.output[0],
                                                `image-edit-${result.generation.id}.png`,
                                                result.generation.id,
                                                0,
                                            )
                                        }
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Image
                                    </Button>
                                )}
                                <Button
                                    variant="secondary"
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
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        if (
                                            confirm(
                                                'Are you sure you want to delete this generation and its output file?',
                                            )
                                        ) {
                                            router.delete(
                                                `/api/v1/ai/generations/${result.generation.id}`,
                                                {
                                                    preserveScroll: true,
                                                    onSuccess: () => setResult(null),
                                                },
                                            );
                                        }
                                    }}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </AnimatedCard>
        </div>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'AI Generation', href: admin.ai.index() }],
};
