import { Head, router, useForm } from '@inertiajs/react';
import {
    Check,
    Copy,
    ExternalLink,
    Film,
    Search,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface VideoItem {
    id: number;
    title: string;
    original_filename: string;
    url: string;
    mime_type: string | null;
    size_bytes: number;
    uploaded_by: string | null;
    created_at: string | null;
}

interface Props {
    videos: {
        data: VideoItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    filters: {
        search?: string;
    };
}

function formatBytes(bytes: number): string {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
        return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${mb.toFixed(1)} MB`;
}

export default function VideoUploadsIndex({ videos, filters }: Props) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [search, setSearch] = useState(filters.search || '');
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const { data, setData, post, processing, progress, errors, reset } =
        useForm<{
            title: string;
            video: File | null;
        }>({
            title: '',
            video: null,
        });

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.video) {
            toast.error('Please select a video file first.');
            return;
        }

        post('/admin/video-uploads', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Video uploaded to Spaces.');
                reset();
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
            onError: () => {
                toast.error('Failed to upload video.');
            },
        });
    };

    const handleCopy = async (video: VideoItem) => {
        await navigator.clipboard.writeText(video.url);
        setCopiedId(video.id);
        toast.success('Video URL copied! Paste it into Image to Video.');
        setTimeout(() => setCopiedId(null), 1800);
    };

    const handleDelete = (video: VideoItem) => {
        if (!confirm(`Delete "${video.title}" from Spaces and library?`)) {
            return;
        }

        router.delete(`/admin/video-uploads/${video.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Video deleted.'),
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/admin/video-uploads',
            { search: search.trim() || undefined },
            { preserveState: true, preserveScroll: true },
        );
    };

    const clearSearch = () => {
        setSearch('');
        router.get(
            '/admin/video-uploads',
            {},
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Video Uploads" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading
                        title="Video Uploads"
                        description="Upload reference videos to DigitalOcean Spaces once and copy their URLs for AI Image-to-Video generation."
                    />
                    <Badge variant="secondary" className="w-fit font-mono">
                        {videos.total} {videos.total === 1 ? 'video' : 'videos'}
                    </Badge>
                </div>

                <AnimatedCard>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Upload className="h-4 w-4" />
                            Upload Video to Spaces
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={handleUpload}
                            className="grid gap-4 md:grid-cols-12 md:items-end"
                        >
                            <div className="space-y-1.5 md:col-span-4">
                                <Label htmlFor="video-title">
                                    Title (optional)
                                </Label>
                                <Input
                                    id="video-title"
                                    type="text"
                                    value={data.title}
                                    onChange={(e) =>
                                        setData('title', e.target.value)
                                    }
                                    placeholder="e.g. Runway walk 10s"
                                    disabled={processing}
                                />
                                {errors.title && (
                                    <p className="text-xs text-destructive">
                                        {errors.title}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5 md:col-span-5">
                                <Label htmlFor="video-file">
                                    Video File (MP4, MOV, WEBM, AVI — max 100MB)
                                </Label>
                                <Input
                                    ref={fileInputRef}
                                    id="video-file"
                                    type="file"
                                    accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,.mp4,.mov,.webm,.avi,.m4v"
                                    onChange={(e) =>
                                        setData(
                                            'video',
                                            e.target.files?.[0] ?? null,
                                        )
                                    }
                                    disabled={processing}
                                />
                                {errors.video && (
                                    <p className="text-xs text-destructive">
                                        {errors.video}
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-3">
                                <AnimatedButton
                                    type="submit"
                                    className="w-full"
                                    disabled={processing || !data.video}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    {processing
                                        ? `Uploading${progress ? ` (${progress.percentage}%)` : '...'}`
                                        : 'Upload Video'}
                                </AnimatedButton>
                            </div>
                        </form>

                        {processing && progress && (
                            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full bg-primary transition-all duration-150"
                                    style={{
                                        width: `${progress.percentage ?? 0}%`,
                                    }}
                                />
                            </div>
                        )}
                    </CardContent>
                </AnimatedCard>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <form
                        onSubmit={handleSearch}
                        className="relative w-full sm:max-w-sm"
                    >
                        <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search title, filename, or URL..."
                            className="pr-8 pl-9"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground"
                                title="Clear search"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </form>
                </div>

                {videos.data.length === 0 ? (
                    <AnimatedCard>
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <Film className="mb-3 h-10 w-10 text-muted-foreground" />
                            <p className="font-medium">
                                No uploaded videos found
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Upload a video above to get a reusable public
                                Spaces URL.
                            </p>
                        </CardContent>
                    </AnimatedCard>
                ) : (
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                        {videos.data.map((video) => (
                            <AnimatedCard
                                key={video.id}
                                className="overflow-hidden"
                            >
                                <div className="h-36 w-full bg-black">
                                    <video
                                        src={video.url}
                                        controls
                                        preload="metadata"
                                        className="h-full w-full object-contain"
                                    />
                                </div>
                                <CardContent className="space-y-2 p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className="truncate text-sm font-semibold">
                                                {video.title}
                                            </h3>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {video.original_filename} ·{' '}
                                                {formatBytes(video.size_bytes)}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(video)}
                                            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                            title="Delete video"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        <Input
                                            readOnly
                                            value={video.url}
                                            className="h-7 px-2 font-mono text-[11px]"
                                            onClick={(e) =>
                                                e.currentTarget.select()
                                            }
                                        />
                                        <AnimatedButton
                                            type="button"
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleCopy(video)}
                                            className="h-7 shrink-0 px-2 text-xs"
                                        >
                                            {copiedId === video.id ? (
                                                <>
                                                    <Check className="mr-1 h-3 w-3 text-emerald-500" />
                                                    Copied
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="mr-1 h-3 w-3" />
                                                    Copy
                                                </>
                                            )}
                                        </AnimatedButton>
                                        <a
                                            href={video.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-input bg-background hover:bg-accent"
                                            title="Open video in new tab"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                        <span>
                                            {video.uploaded_by
                                                ? `By ${video.uploaded_by}`
                                                : 'Admin'}
                                        </span>
                                        <span>{video.created_at}</span>
                                    </div>
                                </CardContent>
                            </AnimatedCard>
                        ))}
                    </div>
                )}

                {videos.last_page > 1 && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {videos.links.map((link, idx) => (
                            <button
                                key={idx}
                                type="button"
                                disabled={!link.url}
                                onClick={() =>
                                    link.url &&
                                    router.visit(link.url, {
                                        preserveScroll: true,
                                    })
                                }
                                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                                    link.active
                                        ? 'bg-primary text-primary-foreground'
                                        : 'border border-input bg-background hover:bg-accent disabled:opacity-40'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
