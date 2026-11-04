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

const SEED_PRESET_DESCRIPTIONS: Record<string, string> = {
    '-1': 'ထုတ်လုပ်တိုင်း မတူညီသော လှုပ်ရှားမှုနှင့် ကင်မရာရှုထောင့်အသစ်များ ထွက်လာပါမည် (အသစ်စမ်းသပ်ရန် အကောင်းဆုံး)။',
    '42': 'Prompt တူပါက လှုပ်ရှားမှုနှင့် အလင်းအမှောင် တူညီသော ရလဒ်ကို အတည်တကျ ပြန်ထုတ်ပေးပါမည် (Prompt ပြင်ပြီး နှိုင်းယှဉ်စမ်းသပ်ရန် အကောင်းဆုံး)။',
    '777': 'တူညီသော Prompt ကိုပင် ရုပ်ရှင်ဆန်သော ကင်မရာရှုထောင့်နှင့် လှုပ်ရှားမှု ပုံစံတစ်မျိုးဖြင့် အတည်တကျ ထုတ်ပေးပါမည်။',
    '2026': 'တူညီသော Prompt ကိုပင် အက်ရှင်နှင့် လှုပ်ရှားမှု ပိုမိုသွက်လက်သော ပုံစံတစ်မျိုးဖြင့် အတည်တကျ ထုတ်ပေးပါမည်။',
    custom: 'ယခင်ထုတ်လုပ်ခဲ့သော ဗီဒီယိုတစ်ခု၏ Seed ဂဏန်းကို ပြန်ရိုက်ထည့်ပြီး ပုံစံတူ ပြန်ထုတ်ယူနိုင်ပါသည်။',
};

const DURATION_DESCRIPTIONS: Record<string, string> = {
    '4s': '၄ စက္ကန့် — အမြန်ဆုံးထွက်ပြီး အတိုချုပ် လှုပ်ရှားမှု (Short Clip) အတွက် သင့်တော်ပါသည်။',
    '5s': '၅ စက္ကန့် — ပုံမှန် စံနှုန်းဖြစ်ပြီး လှုပ်ရှားမှု တိကျပြတ်သားပါသည် (အကြံပြုချက်)။',
    '6s': '၆ စက္ကန့် — တိုက်ခိုက်ခန်း (Action) နှင့် Camera Pan ရိုက်ချက်များအတွက် အသင့်တော်ဆုံး ဖြစ်ပါသည်။',
    '8s': '၈ စက္ကန့် — ဇာတ်ဝင်ခန်း အလတ်စား (Shot ၂ ခု ခွဲရိုက်ရန် သင့်တော်သည်)။',
    '10s': '၁၀ စက္ကန့် — ဇာတ်လမ်းရှည် (Shot 1, Shot 2, Shot 3 ခွဲပြီး ရိုက်ကူးရန် အကောင်းဆုံး)။',
    '12s': '၁၂ စက္ကန့် — Seedance 2.0 / MiniMax အတွက် ဇာတ်ဝင်ခန်းအရှည်။',
    '15s': '၁၅ စက္ကန့် — အရှည်ဆုံး Cinematic ဇာတ်ဝင်ခန်း (ထုတ်လုပ်ချိန် ပိုကြာနိုင်ပါသည်)။',
};

const MODEL_GUIDE: Record<string, string> = {
    'seedance-2.0-fast':
        'ByteDance Seedance 2.0 Fast — မြန်ဆန်ပြီး Reference Image/Video/Audio နှင့် First/Last Frame အားလုံး သုံးနိုင်သည် (အကြံပြုချက်)။',
    'seedance-2.0':
        'ByteDance Seedance 2.0 Standard — အရည်အသွေးအမြင့်ဆုံး Multimodal ဗီဒီယို မော်ဒယ် (Reference Image/Video/Audio + First/Last Frame)။',
    'seedance-2.5':
        'ByteDance Seedance 2.5 — ဇာတ်ကောင်မျက်နှာနှင့် လှုပ်ရှားမှု တိကျမှန်ကန်သော မော်ဒယ် (Reference Image/Video/Audio + First/Last Frame)။',
    'kling-o1-reference-image-to-video':
        'Kling O1 Reference — ပုံပါ ဇာတ်ကောင်ကို နမူနာယူပြီး ရုပ်ရှင်ဆန်သော ဗီဒီယိုဖန်တီးပေးသည့် မော်ဒယ်။',
    'minimax-h3-max-reference-to-video':
        'MiniMax Hailuo H3 Max — လူပုံစံနှင့် ကုန်ပစ္စည်း (Product) ပုံစံ မပျက်ယွင်းစေဘဲ ဗီဒီယိုဖန်တီးပေးသည့် မော်ဒယ်။',
    'wan-2.2-i2v-flash':
        'Wan 2.2 Flash — ပုံကို အစပုံ (Starting Frame) အဖြစ်သုံးပြီး အမြန်နှုန်းဖြင့် ဗီဒီယိုထုတ်ပေးသည့် မော်ဒယ် (480p / 720p)။',
    'wan3.0-video-prime':
        'Wan 3.0 Video Prime — 1080P အရည်အသွေးဖြင့် အစပုံမှ ဆက်လက်လှုပ်ရှားစေသည့် မော်ဒယ်။',
    'ltx-2.5-pro':
        'LTX 2.5 Pro — ကင်မရာရွေ့လျားမှု (Camera Motion) ဦးစားပေး အစပုံအခြေခံ မော်ဒယ်။',
};

function ImageToVideo() {
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
    const [bitrateMode, setBitrateMode] = useState<'standard' | 'high'>(
        'standard',
    );
    const [autoResize, setAutoResize] = useState(true);
    const [seedPreset, setSeedPreset] = useState<string>('-1');
    const [customSeed, setCustomSeed] = useState('');

    const [processing, setProcessing] = useState(false);
    const [polling, setPolling] = useState(false);
    const [result, setResult] = useState<GenerationResult | null>(null);
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
            setError('ကျေးဇူးပြု၍ ပုံတစ်ပုံ အရင်တင်ပေးပါ (Upload an image first).');

            return;
        }

        if (imageMode === 'url' && !imageUrl.trim()) {
            setError('ကျေးဇူးပြု၍ ပုံ URL ထည့်ပေးပါ (Enter an image URL).');

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

        if (isSeedanceModel && imageInputType === 'reference') {
            if (refVideoSource === 'upload' && refVideoFile) {
                form.append('reference_video', refVideoFile);
            } else if (refVideoSource === 'url' && refVideoUrl.trim()) {
                form.append('reference_video_url', refVideoUrl.trim());
            }

            if (refAudioSource === 'upload' && refAudioFile) {
                form.append('reference_audio', refAudioFile);
            } else if (refAudioSource === 'url' && refAudioUrl.trim()) {
                form.append('reference_audio_url', refAudioUrl.trim());
            }
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
                <CardContent className="space-y-5">
                    {/* 1. Model Selection with Myanmar Guide */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                            ၁။ AI Video Model ရွေးချယ်ရန် (Model)
                        </Label>
                        <Select value={model} onValueChange={setModel}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="seedance-2.0-fast">
                                    Seedance 2.0 Fast (အမြန်ဆုံး Multimodal — အကြံပြုချက်)
                                </SelectItem>
                                <SelectItem value="seedance-2.0">
                                    Seedance 2.0 Standard (အရည်အသွေးအမြင့်ဆုံး Multimodal)
                                </SelectItem>
                                <SelectItem value="seedance-2.5">
                                    Seedance 2.5 (Expressive Motion & Reference)
                                </SelectItem>
                                <SelectItem value="kling-o1-reference-image-to-video">
                                    Kling Reference I2V (Cinematic Reference)
                                </SelectItem>
                                <SelectItem value="minimax-h3-max-reference-to-video">
                                    MiniMax H3 Max I2V (Character & Product Reference)
                                </SelectItem>
                                <SelectItem value="wan-2.2-i2v-flash">
                                    Wan 2.2 I2V Flash (Fast Starting Frame)
                                </SelectItem>
                                <SelectItem value="wan3.0-video-prime">
                                    Wan 3.0 Video Prime (1080P Starting Frame)
                                </SelectItem>
                                <SelectItem value="ltx-2.5-pro">
                                    LTX 2.5 Pro (Camera Trajectory Starting Frame)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        {MODEL_GUIDE[model] && (
                            <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                                💡 {MODEL_GUIDE[model]}
                            </p>
                        )}
                    </div>

                    {/* 2. Image Mode Selector (Default = Reference) */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                            ၂။ ဓာတ်ပုံ အသုံးပြုမည့် ပုံစံ (Image Mode — Default: Reference)
                        </Label>
                        <Select
                            value={imageInputType}
                            onValueChange={(v) =>
                                setImageInputType(
                                    v as 'reference' | 'first_frame_url',
                                )
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="reference">
                                    Reference Image (ပုံပါ လူ/အရာဝတ္ထုကို နမူနာယူပြီး ဖန်တီးမည် — Default)
                                </SelectItem>
                                <SelectItem value="first_frame_url">
                                    First Frame (first_frame_url — ဗီဒီယို၏ အစပုံအဖြစ် သုံးမည်)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {imageInputType === 'reference'
                                ? '✅ Reference Mode: ပုံထဲက လူရဲ့ မျက်နှာ၊ အဝတ်အစားနဲ့ ပုံစံကို မပြောင်းလဲဘဲ Prompt ထဲကအတိုင်း လှုပ်ရှားမှုအသစ် ဖန်တီးပေးပါမည်။'
                                : '🎬 First Frame Mode: တင်လိုက်သောပုံကို ဗီဒီယို၏ ပထမဆုံး စက္ကန့် (Starting Frame) အဖြစ် ထားပြီး ဆက်လက်လှုပ်ရှားစေပါမည်။'}
                        </p>
                    </div>

                    {/* 3. Primary Input Image */}
                    <div className="space-y-3 rounded-lg border p-3.5">
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold">
                                {imageInputType === 'reference'
                                    ? '၃။ နမူနာယူမည့် အဓိကပုံ (Reference Image) *'
                                    : '၃။ ဗီဒီယို စတင်မည့် ပထမဆုံးပုံ (First Frame Image) *'}
                            </Label>
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
                                    ဖိုင်တင်မည် (Upload)
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
                                    လင့်ခ်ထည့်မည် (URL)
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
                                    className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted/30"
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
                                        'ပုံရွေးချယ်ရန် ဤနေရာကို နှိပ်ပါ (JPG, PNG, WebP)'
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

                    {/* 3B. Optional Last Frame Image (Only in first_frame_url mode for Seedance models) */}
                    {isSeedanceModel && imageInputType === 'first_frame_url' && (
                        <div className="space-y-3 rounded-lg border border-dashed p-3.5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="font-semibold">
                                        ဗီဒီယို အဆုံးသတ်ပုံ (Last Frame Image — Optional)
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        ထည့်သွင်းထားပါက အစပုံ (First Frame) မှ ယခု အဆုံးပုံ (Last Frame) သို့ ချောမွေ့စွာ ကူးပြောင်းသွားသော ဗီဒီယိုကို ဖန်တီးပေးပါမည်။
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        variant={
                                            lastFrameSource === 'upload'
                                                ? 'default'
                                                : 'outline'
                                        }
                                        size="sm"
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
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                    <div
                                        className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted/30"
                                        onClick={() =>
                                            lastFrameInputRef.current?.click()
                                        }
                                    >
                                        {lastFramePreview ? (
                                            <img
                                                src={lastFramePreview}
                                                alt="Last Frame Preview"
                                                className="size-full object-contain"
                                            />
                                        ) : (
                                            'အဆုံးသတ်ပုံ (Last Frame) တင်လိုပါက ဤနေရာကို နှိပ်ပါ (မထည့်လည်း ရပါသည်)'
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
                                />
                            )}
                        </div>
                    )}

                    {/* 3C. Optional Reference Video & Audio (Only in reference mode for Seedance models) */}
                    {isSeedanceModel && imageInputType === 'reference' && (
                        <div className="grid gap-4 rounded-lg border border-dashed p-3.5 md:grid-cols-2">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold">
                                        လှုပ်ရှားမှု နမူနာ ဗီဒီယို (Reference Video — Optional)
                                    </Label>
                                    <div className="flex gap-1">
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
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
                                            className="h-6 px-2 text-xs"
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
                                <p className="text-[11px] text-muted-foreground">
                                    အခြားဗီဒီယို၏ လှုပ်ရှားမှု/ကင်မရာရိုက်ချက်ကို နမူနာယူလိုပါက ထည့်နိုင်သည် (`@Video 1`)။
                                </p>
                                {refVideoSource === 'url' ? (
                                    <Input
                                        value={refVideoUrl}
                                        onChange={(e) =>
                                            setRefVideoUrl(e.target.value)
                                        }
                                        placeholder="https://example.com/motion-ref.mp4"
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
                                                    e.target.files?.[0] ?? null,
                                                )
                                            }
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full text-xs"
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

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold">
                                        အသံစည်းချက် နမူနာ (Reference Audio — Optional)
                                    </Label>
                                    <div className="flex gap-1">
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
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
                                            className="h-6 px-2 text-xs"
                                            variant={
                                                refAudioSource === 'upload'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            onClick={() =>
                                                setRefAudioSource('upload')
                                            }
                                        >
                                            Upload
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    အသံဖိုင်/စကားပြောသံ စည်းချက်အတိုင်း ဗီဒီယိုထုတ်လိုပါက ထည့်နိုင်သည် (`@Audio 1`)။
                                </p>
                                {refAudioSource === 'url' ? (
                                    <Input
                                        value={refAudioUrl}
                                        onChange={(e) =>
                                            setRefAudioUrl(e.target.value)
                                        }
                                        placeholder="https://example.com/audio-ref.mp3"
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
                                                    e.target.files?.[0] ?? null,
                                                )
                                            }
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full text-xs"
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
                        </div>
                    )}

                    {/* 4. Prompt & Negative Prompt */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                            ၄။ ဖန်တီးလိုသည့် ဇာတ်ဝင်ခန်း ညွှန်ကြားချက် (Prompt) *
                        </Label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="ဥပမာ - ပုံထဲက ဇာတ်ကောင်က ရှေးဟောင်းဘုရားကျောင်းဝင်းထဲမှာ ကွန်ဖူးကစားနေပုံ၊ ရုပ်ရှင်အလင်းအမှောင်..."
                            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                            မပါဝင်စေလိုသော အချက်များ (Negative Prompt — Optional)
                        </Label>
                        <Input
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            placeholder="blurry, low quality, face change, text overlays (ဝေဝါးခြင်း၊ မျက်နှာပြောင်းလဲခြင်း မပါစေရန်)"
                        />
                    </div>

                    {/* 5. Aspect Ratio, Resolution, Duration */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                ဗီဒီယို အချိုးအစား (Aspect Ratio)
                            </Label>
                            <Select
                                value={aspectRatio}
                                onValueChange={setAspectRatio}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="16:9">
                                        16:9 — အလျားလိုက် (YouTube / TV)
                                    </SelectItem>
                                    <SelectItem value="9:16">
                                        9:16 — ဒေါင်လိုက် (TikTok / Reels)
                                    </SelectItem>
                                    <SelectItem value="1:1">
                                        1:1 — ပတ်လည် စတုရန်း (Facebook Post)
                                    </SelectItem>
                                    <SelectItem value="4:3">
                                        4:3 — ရိုးရာ အလျားလိုက်
                                    </SelectItem>
                                    <SelectItem value="3:4">
                                        3:4 — ရိုးရာ ဒေါင်လိုက်
                                    </SelectItem>
                                    <SelectItem value="adaptive">
                                        Adaptive — မူရင်းပုံအချိုးအတိုင်း အလိုအလျောက်ထားမည်
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                ကြည်လင်ပြတ်သားမှု (Resolution)
                            </Label>
                            <Select
                                value={resolution}
                                onValueChange={setResolution}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="480p">
                                        480p — အမြန်စမ်းသပ်ရန် (Fast Draft)
                                    </SelectItem>
                                    <SelectItem value="720p">
                                        720p — HD ပုံမှန်အကြည် (Balanced)
                                    </SelectItem>
                                    <SelectItem value="1080p">
                                        1080p — Full HD အကြည်လင်ဆုံး
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                ဗီဒီယို ကြာချိန် (Duration)
                            </Label>
                            <Select
                                value={duration}
                                onValueChange={setDuration}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="4s">
                                        4 စက္ကန့် (အမြန်ဆုံး Short Clip)
                                    </SelectItem>
                                    <SelectItem value="5s">
                                        5 စက္ကန့် (ပုံမှန် စံနှုန်း — Default)
                                    </SelectItem>
                                    <SelectItem value="6s">
                                        6 စက္ကန့် (Action / Camera Pan အတွက်)
                                    </SelectItem>
                                    <SelectItem value="8s">
                                        8 စက္ကန့် (ဇာတ်ဝင်ခန်း အလတ်စား)
                                    </SelectItem>
                                    <SelectItem value="10s">
                                        10 စက္ကန့် (Multi-shot ဇာတ်လမ်းရှည်)
                                    </SelectItem>
                                    <SelectItem value="12s">
                                        12 စက္ကန့် (Seedance 2.0 / MiniMax)
                                    </SelectItem>
                                    <SelectItem value="15s">
                                        15 စက္ကန့် (အရှည်ဆုံး Cinematic Scene)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {DURATION_DESCRIPTIONS[duration] && (
                                <p className="text-[11px] text-muted-foreground">
                                    ⏱️ {DURATION_DESCRIPTIONS[duration]}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* 6. Human-Friendly Seed Selector with Burmese Explanation */}
                    <div className="space-y-2 rounded-lg border bg-muted/20 p-3.5">
                        <Label className="text-sm font-semibold">
                            ရလဒ် ပုံစံထိန်းချုပ်မှု (Seed — ဗီဒီယိုထွက်ပုံ ကျပန်း သို့မဟုတ် ပုံသေသတ်မှတ်ခြင်း)
                        </Label>
                        <div className="grid gap-3 md:grid-cols-2">
                            <Select
                                value={seedPreset}
                                onValueChange={setSeedPreset}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="-1">
                                        🎲 ကျပန်းပုံစံအသစ် (-1 / Random — Default)
                                    </SelectItem>
                                    <SelectItem value="42">
                                        ⚖️ တည်ငြိမ်သော စံနှုန်း (Seed #42 — နှိုင်းယှဉ်စမ်းသပ်ရန်)
                                    </SelectItem>
                                    <SelectItem value="777">
                                        🎥 ရုပ်ရှင်ဆန်သော ရှုထောင့် (Seed #777 — Cinematic)
                                    </SelectItem>
                                    <SelectItem value="2026">
                                        ⚡ သွက်လက်သော အက်ရှင်ပုံစံ (Seed #2026 — Dynamic)
                                    </SelectItem>
                                    <SelectItem value="custom">
                                        🔢 စိတ်ကြိုက် Seed ဂဏန်း ရိုက်ထည့်မည် (Custom)
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {seedPreset === 'custom' && (
                                <Input
                                    value={customSeed}
                                    onChange={(e) =>
                                        setCustomSeed(e.target.value)
                                    }
                                    placeholder="ဥပမာ - 123456 (0 မှ 4294967295 အတွင်း)"
                                    type="number"
                                />
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            ℹ️ {SEED_PRESET_DESCRIPTIONS[seedPreset]}
                        </p>
                    </div>

                    {/* 7. Seedance Advanced Controls (Audio, Bitrate, Auto-Resize, Prompt Extend) */}
                    <div className="grid gap-4 rounded-lg border p-3.5 md:grid-cols-2">
                        {isSeedanceModel && (
                            <>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">
                                        AI အသံ တစ်ပါတည်း ဖန်တီးမှု (Generate Audio)
                                    </Label>
                                    <Select
                                        value={generateAudio ? 'true' : 'false'}
                                        onValueChange={(v) =>
                                            setGenerateAudio(v === 'true')
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">
                                                🔊 အသံပါ ထည့်သွင်းမည် (BGM / SFX / စကားပြောသံ — Default)
                                            </SelectItem>
                                            <SelectItem value="false">
                                                🔇 အသံမပါသော ဗီဒီယိုသီးသန့် (Silent Video)
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">
                                        ဗီဒီယို Bitrate အရည်အသွေး (Bitrate Mode)
                                    </Label>
                                    <Select
                                        value={bitrateMode}
                                        onValueChange={(v) =>
                                            setBitrateMode(
                                                v as 'standard' | 'high',
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standard">
                                                Standard — ပုံမှန် အရည်အသွေး (ဖိုင်ဆိုဒ်သင့်တင့်ပြီး မြန်ဆန်သည်)
                                            </SelectItem>
                                            <SelectItem value="high">
                                                High Bitrate — ၅ ဆ ပိုမိုကြည်လင်ပြတ်သားသော ရုပ်ရှင်အဆင့်
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}

                        <div className="flex items-start gap-2.5 pt-1">
                            <input
                                type="checkbox"
                                id="promptExtend"
                                checked={promptExtend}
                                onChange={(e) =>
                                    setPromptExtend(e.target.checked)
                                }
                                className="mt-1 h-4 w-4"
                            />
                            <div>
                                <Label
                                    htmlFor="promptExtend"
                                    className="text-xs font-semibold"
                                >
                                    Prompt အလိုအလျောက် အသေးစိတ်ဖြည့်စွက်မည် (Prompt Extend)
                                </Label>
                                <p className="text-[11px] text-muted-foreground">
                                    သင်ရေးလိုက်သော စာသားတိုနေပါက AI မှ အလင်းအမှောင်နှင့် ကင်မရာရိုက်ချက် အသေးစိတ်ကို ကူညီဖြည့်စွက်ပေးပါမည်။
                                </p>
                            </div>
                        </div>

                        {isSeedanceModel && (
                            <div className="flex items-start gap-2.5 pt-1">
                                <input
                                    type="checkbox"
                                    id="autoResize"
                                    checked={autoResize}
                                    onChange={(e) =>
                                        setAutoResize(e.target.checked)
                                    }
                                    className="mt-1 h-4 w-4"
                                />
                                <div>
                                    <Label
                                        htmlFor="autoResize"
                                        className="text-xs font-semibold"
                                    >
                                        ပုံအရွယ်အစား အလိုအလျောက် ချိန်ညှိမည် (Auto Resize)
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        တင်လိုက်သောပုံ အရွယ်အစား မကိုက်ညီပါက Error မတက်စေဘဲ AI မှ အလိုအလျောက် ချိန်ညှိပေးပါမည်။
                                    </p>
                                </div>
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
                        disabled={processing || !prompt.trim()}
                        className="w-full"
                    >
                        {processing
                            ? 'ဗီဒီယို ထုတ်လုပ်နေပါသည် (Generating...)...'
                            : 'ဗီဒီယို စတင်ထုတ်လုပ်မည် (Generate Video)'}
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
    | 'nano-banana-pro'
    | 'ideogram-4.5-edit'
    | 'bria-extract-object';

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

            case 'ideogram-4.5-edit':
                form.append('quality', ideogramQuality);
                break;

            case 'bria-extract-object':
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
                                } else if (val === 'gpt-image-1.5-edit' || val === 'ideogram-4.5-edit' || val === 'bria-extract-object') {
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
                                <SelectItem value="ideogram-4.5-edit">
                                    Ideogram 4.5 Edit (Precision Text & Style)
                                </SelectItem>
                                <SelectItem value="bria-extract-object">
                                    Bria Extract Object (Cutout PNG)
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
                            {model === 'ideogram-4.5-edit' &&
                                'Surgically edit elements or add clean legible typography while keeping the rest untouched.'}
                            {model === 'bria-extract-object' &&
                                'Intelligent AI cutout to isolate and extract named objects with transparent alpha channel.'}
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
                                            : model === 'ideogram-4.5-edit'
                                              ? 'Paint the bold wordmark "RAMPWORKS" in a 1970s chrome script across the center...'
                                              : model === 'bria-extract-object'
                                                ? 'Name the object to extract (e.g., "sunglasses", "the cat", "the red dress")...'
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

                    {/* Ideogram 4.5 Edit Settings */}
                    {model === 'ideogram-4.5-edit' && (
                        <div className="space-y-4 rounded-lg border p-4">
                            <h4 className="font-medium text-sm">Ideogram 4.5 Edit Settings</h4>
                            <div className="space-y-2">
                                <Label>Quality Tier</Label>
                                <Select value={ideogramQuality} onValueChange={setIdeogramQuality}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="medium">Medium (Standard)</SelectItem>
                                        <SelectItem value="high">High (Maximum Detail)</SelectItem>
                                        <SelectItem value="low">Low (Fast Draft)</SelectItem>
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
