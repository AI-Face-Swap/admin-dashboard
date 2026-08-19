import { Head } from '@inertiajs/react';
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

type TabType = 'image' | 'video';

export default function Index({
    templates,
    generations,
}: {
    templates: Template[];
    generations: Generation[];
}) {
    const [activeTab, setActiveTab] = useState<TabType>('image');

    return (
        <>
            <Head title="AI Generation" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="AI Generation"
                    description="Swap faces onto images or videos using the shared API."
                />

                {/* Tab Selector */}
                <div className="flex gap-2">
                    <Button
                        variant={activeTab === 'image' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('image')}
                    >
                        Image Face Swap
                    </Button>
                    <Button
                        variant={activeTab === 'video' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('video')}
                    >
                        Video Face Swap
                    </Button>
                </div>

                {activeTab === 'image' && (
                    <ImageFaceSwap templates={templates} />
                )}

                {activeTab === 'video' && (
                    <VideoFaceSwap templates={templates} />
                )}

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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {generations.map((generation) => (
                                    <TableRow key={generation.id}>
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
                                    </TableRow>
                                ))}
                                {generations.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
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
        </>
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
                                    variant={faceMode === 'upload' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setFaceMode('upload')}
                                >
                                    Upload
                                </Button>
                                <Button
                                    type="button"
                                    variant={faceMode === 'url' ? 'default' : 'outline'}
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
                                    onChange={(e) => onFaceFileChange(e.target.files?.[0] ?? null)}
                                />
                                <div
                                    className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {facePreview ? (
                                        <img src={facePreview} alt="Face preview" className="size-full object-contain" />
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
                                    variant={targetMode === 'template' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setTargetMode('template')}
                                >
                                    Template
                                </Button>
                                <Button
                                    type="button"
                                    variant={targetMode === 'url' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setTargetMode('url')}
                                >
                                    URL
                                </Button>
                            </div>
                        </div>

                        {targetMode === 'template' ? (
                            <Select value={templateSlug} onValueChange={setTemplateSlug}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pick a template" />
                                </SelectTrigger>
                                <SelectContent>
                                    {imageTemplates.map((template) => (
                                        <SelectItem key={template.id} value={template.slug}>
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

                    <AnimatedButton onClick={generate} disabled={processing} className="w-full">
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
                                {result.generation.output.map((url, index) => (
                                    <img
                                        key={url}
                                        src={url}
                                        alt={`Result ${index + 1}`}
                                        className="w-full rounded-lg border object-contain"
                                    />
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-2 text-sm">
                                <Badge variant="outline">status: {result.generation.status}</Badge>
                                <Badge variant="outline">cost: {result.generation.cost ?? '—'} {result.generation.currency ?? ''}</Badge>
                                <Badge variant="outline">duration: {result.generation.duration_ms ?? '—'} ms</Badge>
                                <Badge variant="outline" className="font-mono">{result.generation.request_id ?? '—'}</Badge>
                            </div>
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

    const [targetMode, setTargetMode] = useState<'template' | 'url'>('template');
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
            }
        } catch {
            // Ignore polling errors — retry on next interval
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
                                    variant={faceMode === 'upload' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setFaceMode('upload')}
                                >
                                    Upload
                                </Button>
                                <Button
                                    type="button"
                                    variant={faceMode === 'url' ? 'default' : 'outline'}
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
                                    onChange={(e) => onFaceFileChange(e.target.files?.[0] ?? null)}
                                />
                                <div
                                    className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {facePreview ? (
                                        <img src={facePreview} alt="Face preview" className="size-full object-contain" />
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
                                    variant={targetMode === 'template' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setTargetMode('template')}
                                >
                                    Template
                                </Button>
                                <Button
                                    type="button"
                                    variant={targetMode === 'url' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setTargetMode('url')}
                                >
                                    URL
                                </Button>
                            </div>
                        </div>

                        {targetMode === 'template' ? (
                            <Select value={templateSlug} onValueChange={setTemplateSlug}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pick a video template" />
                                </SelectTrigger>
                                <SelectContent>
                                    {videoTemplates.length > 0 ? (
                                        videoTemplates.map((template) => (
                                            <SelectItem key={template.id} value={template.slug}>
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
                                onChange={(e) => setTargetVideoUrl(e.target.value)}
                                placeholder="https://.../target.mp4"
                            />
                        )}
                    </div>

                    {error && (
                        <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    <AnimatedButton onClick={generate} disabled={processing} className="w-full">
                        {processing ? 'Generating...' : 'Generate Video Face Swap'}
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
                            <p>Video processing — this usually takes 5+ minutes...</p>
                            <p className="text-xs">Polling every 5 seconds for status updates.</p>
                        </div>
                    )}
                    {result && (
                        <div className="space-y-4">
                            {result.generation.output.length > 0 ? (
                                <div className="grid gap-4">
                                    {result.generation.output.map((url, index) => (
                                        <video
                                            key={url}
                                            src={url}
                                            controls
                                            className="w-full rounded-lg border"
                                            alt={`Result ${index + 1}`}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex h-40 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
                                    No output returned.
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2 text-sm">
                                <Badge variant="outline">status: {result.generation.status}</Badge>
                                <Badge variant="outline">cost: {result.generation.cost ?? '—'} {result.generation.currency ?? ''}</Badge>
                                <Badge variant="outline">duration: {result.generation.duration_ms ?? '—'} ms</Badge>
                                <Badge variant="outline" className="font-mono">{result.generation.request_id ?? '—'}</Badge>
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
