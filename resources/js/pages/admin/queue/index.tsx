import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    AlertCircle,
    BookmarkPlus,
    CheckCircle2,
    Clock,
    Coins,
    DollarSign,
    Download,
    ExternalLink,
    Eye,
    RefreshCw,
    RotateCw,
    Search,
    Sparkles,
    Video,
    Wand2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    extractInputMediaUrls,
    extractKeyInputParams,
    handleDownload,
    resolveGenerationModel,
} from '@/components/admin/ai/types';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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

type Customer = {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    avatar_url?: string | null;
    central_auth_uuid: string | null;
};

type Template = {
    id: number;
    name: string;
    slug: string;
};

type GenerationItem = {
    id: number;
    operation: string;
    status: 'queued' | 'processing' | 'completed' | 'failed' | string;
    cost: string | null;
    currency: string | null;
    coins_spent: number | null;
    points_refunded: number | null;
    refunded_at: string | null;
    duration_ms: number | null;
    error: string | null;
    request_id?: string | null;
    client_idempotency_token: string | null;
    input_metadata: Record<string, any> | null;
    output_metadata: string[] | null;
    created_at: string;
    updated_at: string;
    customer: Customer | null;
    template: Template | null;
};

type Metrics = {
    queued_count: number;
    processing_count: number;
    completed_today: number;
    failed_today: number;
    total_refunded_points_today: number;
    total_cost_today?: number;
    total_cost_all_time?: number;
    total_points_spent_today?: number;
    redis_status: 'connected' | 'offline';
    redis_queue_size: number | null;
    queue_driver: string;
    refreshed_at: string;
};

type Props = {
    metrics: Metrics;
    generations: {
        data: GenerationItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    filters: {
        status?: string;
        operation?: string;
        search?: string;
    };
};

export default function QueueMonitor({
    metrics: initialMetrics,
    generations,
    filters,
}: Props) {
    const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedGeneration, setSelectedGeneration] =
        useState<GenerationItem | null>(null);
    const [search, setSearch] = useState(filters.search || '');
    const [savingTemplateId, setSavingTemplateId] = useState<number | null>(
        null,
    );

    // Auto-refresh interval (every 5 seconds)
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetch('/admin/queue/metrics')
                .then((res) => res.json())
                .then((data: Metrics) => {
                    setMetrics(data);
                    if (data.queued_count > 0 || data.processing_count > 0) {
                        router.reload({ only: ['generations', 'metrics'] });
                    }
                })
                .catch(() => {});
        }, 5000);

        return () => clearInterval(interval);
    }, [autoRefresh]);

    const handleManualRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['generations', 'metrics'],
            onFinish: () => setIsRefreshing(false),
        });
    };

    const handleFilterChange = (key: string, value: string) => {
        const query: Record<string, string> = {
            status: filters.status || 'all',
            operation: filters.operation || 'all',
            search: search,
            [key]: value,
        };

        if (query.status === 'all') delete query.status;
        if (query.operation === 'all') delete query.operation;
        if (!query.search) delete query.search;

        router.get('/admin/queue', query, {
            preserveState: true,
            replace: true,
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleFilterChange('search', search);
    };

    const handleRetry = (generation: GenerationItem) => {
        if (
            !confirm(
                `Are you sure you want to re-queue Generation #${generation.id}?`,
            )
        ) {
            return;
        }

        router.post(
            `/admin/queue/${generation.id}/retry`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (selectedGeneration?.id === generation.id) {
                        setSelectedGeneration(null);
                    }
                },
            },
        );
    };

    const handleSaveToTemplate = (
        generationId: number,
        e?: React.MouseEvent,
    ) => {
        if (e) e.stopPropagation();
        setSavingTemplateId(generationId);
        router.post(
            `/admin/templates/from-generation/${generationId}`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setSavingTemplateId(null),
            },
        );
    };

    const formatDuration = (ms: number | null) => {
        if (!ms) return '—';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    const formatCost = (cost: string | number | null | undefined, currency?: string | null) => {
        if (cost === null || cost === undefined || cost === '') return '—';
        const num = Number(cost);
        if (Number.isNaN(num)) return String(cost);
        return `$${num.toFixed(4)} ${currency || 'USD'}`;
    };

    const formatRelativeTime = (isoString: string) => {
        try {
            const date = new Date(isoString);
            const now = new Date();
            const diffInSeconds = Math.floor(
                (now.getTime() - date.getTime()) / 1000,
            );

            if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
            if (diffInSeconds < 3600)
                return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400)
                return `${Math.floor(diffInSeconds / 3600)}h ago`;
            return date.toLocaleDateString();
        } catch {
            return isoString;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'queued':
                return (
                    <Badge
                        variant="outline"
                        className="flex items-center gap-1 border-amber-500/40 bg-amber-500/10 text-amber-500"
                    >
                        <Clock className="h-3 w-3 animate-pulse" />
                        Queued
                    </Badge>
                );
            case 'processing':
                return (
                    <Badge
                        variant="outline"
                        className="flex items-center gap-1 border-blue-500/40 bg-blue-500/10 text-blue-500"
                    >
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Processing
                    </Badge>
                );
            case 'completed':
                return (
                    <Badge
                        variant="outline"
                        className="flex items-center gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                    >
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                    </Badge>
                );
            case 'failed':
                return (
                    <Badge
                        variant="outline"
                        className="flex items-center gap-1 border-red-500/40 bg-red-500/10 text-red-500"
                    >
                        <AlertCircle className="h-3 w-3" />
                        Failed
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getOperationBadge = (operation: string) => {
        switch (operation) {
            case 'text-to-image':
            case 'image-generation':
                return (
                    <Badge className="border border-purple-500/30 bg-purple-500/10 text-purple-400">
                        <Sparkles className="mr-1 inline h-3 w-3" />{' '}
                        Text-to-Image
                    </Badge>
                );
            case 'face-swap':
                return (
                    <Badge className="border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                        Photo Swap
                    </Badge>
                );
            case 'image-editing':
            case 'image-edit':
                return (
                    <Badge className="border border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
                        <Wand2 className="mr-1 inline h-3 w-3" /> Image Edit
                    </Badge>
                );
            case 'image-to-video':
                return (
                    <Badge className="border border-amber-500/30 bg-amber-500/10 text-amber-400">
                        <Video className="mr-1 inline h-3 w-3" /> Image-to-Video
                    </Badge>
                );
            case 'video-face-swap':
                return (
                    <Badge className="border border-pink-500/30 bg-pink-500/10 text-pink-400">
                        <Video className="mr-1 inline h-3 w-3" /> Video Swap
                    </Badge>
                );
            default:
                return <Badge variant="outline">{operation}</Badge>;
        }
    };

    const selectedInputMedia = selectedGeneration
        ? extractInputMediaUrls(selectedGeneration.input_metadata)
        : [];
    const selectedKeyParams = selectedGeneration
        ? extractKeyInputParams(selectedGeneration.input_metadata)
        : [];

    return (
        <>
            <Head title="Queue Monitor — Admin" />

            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-6">
                {/* TOP HEADER */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Heading
                            title="Queue Monitor & Generations History"
                            description="Real-time Redis background worker queues, Segmind API cost tracking, input parameters, and template creation."
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            href="/admin/ai"
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 text-xs font-semibold text-primary transition hover:bg-primary/10"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            AI Studio
                        </Link>

                        {/* REDIS HEALTH BADGE */}
                        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
                            <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                    metrics.redis_status === 'connected'
                                        ? 'animate-pulse bg-emerald-500'
                                        : 'bg-amber-500'
                                }`}
                            />
                            <span className="font-medium">
                                Redis{' '}
                                {metrics.redis_status === 'connected'
                                    ? 'Online'
                                    : 'Offline'}
                            </span>
                            <span className="text-muted-foreground">
                                ({metrics.queue_driver})
                            </span>
                        </div>

                        {/* AUTO-REFRESH TOGGLE */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={
                                autoRefresh
                                    ? 'border-primary/50 text-primary'
                                    : 'text-muted-foreground'
                            }
                        >
                            <span
                                className={`mr-1.5 h-2 w-2 rounded-full ${autoRefresh ? 'animate-pulse bg-primary' : 'bg-muted'}`}
                            />
                            {autoRefresh ? 'Auto (5s)' : 'Paused'}
                        </Button>

                        {/* MANUAL REFRESH BUTTON */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleManualRefresh}
                            disabled={isRefreshing}
                        >
                            <RefreshCw
                                className={`mr-1.5 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                            />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* KPI METRIC CARDS */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
                    {/* QUEUED */}
                    <AnimatedCard className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                    Queued
                                </span>
                                <Clock className="h-4 w-4 text-amber-500" />
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-amber-500">
                                    {metrics.queued_count}
                                </span>
                                {metrics.redis_queue_size !== null && (
                                    <span className="text-xs text-muted-foreground">
                                        ({metrics.redis_queue_size} Redis)
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Waiting for worker
                            </p>
                        </CardContent>
                    </AnimatedCard>

                    {/* PROCESSING */}
                    <AnimatedCard className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                    Processing
                                </span>
                                <Activity className="h-4 w-4 animate-spin text-blue-500" />
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-blue-500">
                                    {metrics.processing_count}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Rendering in AI GPU
                            </p>
                        </CardContent>
                    </AnimatedCard>

                    {/* COMPLETED TODAY */}
                    <AnimatedCard className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                    Completed Today
                                </span>
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-emerald-500">
                                    {metrics.completed_today}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {metrics.total_points_spent_today
                                    ? `${metrics.total_points_spent_today} pts spent today`
                                    : 'Successfully delivered'}
                            </p>
                        </CardContent>
                    </AnimatedCard>

                    {/* FAILED TODAY */}
                    <AnimatedCard className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                    Failed Today
                                </span>
                                <AlertCircle className="h-4 w-4 text-red-500" />
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-red-500">
                                    {metrics.failed_today}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Errors &amp; timeouts
                            </p>
                        </CardContent>
                    </AnimatedCard>

                    {/* API COST TODAY ($ USD) */}
                    <AnimatedCard className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                    API Cost Today
                                </span>
                                <DollarSign className="h-4 w-4 text-purple-500" />
                            </div>
                            <div className="mt-2 flex items-baseline gap-1.5">
                                <span className="font-mono text-2xl font-bold text-purple-500">
                                    $
                                    {Number(
                                        metrics.total_cost_today ?? 0,
                                    ).toFixed(4)}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                    USD
                                </span>
                            </div>
                            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                                Total: $
                                {Number(
                                    metrics.total_cost_all_time ?? 0,
                                ).toFixed(2)}{' '}
                                USD
                            </p>
                        </CardContent>
                    </AnimatedCard>

                    {/* REFUNDED POINTS */}
                    <AnimatedCard className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                                    Points Refunded
                                </span>
                                <Coins className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-emerald-500">
                                    {metrics.total_refunded_points_today}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    pts
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-emerald-600/80 dark:text-emerald-400/80">
                                100% money-back safe
                            </p>
                        </CardContent>
                    </AnimatedCard>
                </div>

                {/* FILTERS & SEARCH BAR */}
                <AnimatedCard>
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                                {/* STATUS FILTER */}
                                <Select
                                    value={filters.status || 'all'}
                                    onValueChange={(val) =>
                                        handleFilterChange('status', val)
                                    }
                                >
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Statuses
                                        </SelectItem>
                                        <SelectItem value="queued">
                                            Queued ⏳
                                        </SelectItem>
                                        <SelectItem value="processing">
                                            Processing ⚙️
                                        </SelectItem>
                                        <SelectItem value="completed">
                                            Completed ✅
                                        </SelectItem>
                                        <SelectItem value="failed">
                                            Failed ❌
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* OPERATION FILTER */}
                                <Select
                                    value={filters.operation || 'all'}
                                    onValueChange={(val) =>
                                        handleFilterChange('operation', val)
                                    }
                                >
                                    <SelectTrigger className="w-[170px]">
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Types
                                        </SelectItem>
                                        <SelectItem value="image-generation">
                                            Text-to-Image
                                        </SelectItem>
                                        <SelectItem value="face-swap">
                                            Photo Face Swap
                                        </SelectItem>
                                        <SelectItem value="image-editing">
                                            Image Editing
                                        </SelectItem>
                                        <SelectItem value="image-to-video">
                                            Image-to-Video
                                        </SelectItem>
                                        <SelectItem value="video-face-swap">
                                            Video Face Swap
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* SEARCH INPUT */}
                            <form
                                onSubmit={handleSearchSubmit}
                                className="flex w-full max-w-sm items-center gap-2"
                            >
                                <div className="relative w-full">
                                    <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search customer, ID, model, or prompt..."
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(e.target.value)
                                        }
                                        className="pl-9"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    variant="secondary"
                                    size="sm"
                                >
                                    Search
                                </Button>
                            </form>
                        </div>
                    </CardContent>
                </AnimatedCard>

                {/* GENERATIONS TABLE */}
                <AnimatedCard>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[75px]">
                                        ID
                                    </TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Type &amp; Model</TableHead>
                                    <TableHead className="min-w-[240px]">
                                        Input Fields (Prompt &amp; Media)
                                    </TableHead>
                                    <TableHead className="w-[75px]">
                                        Output
                                    </TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>
                                        Points &amp; API Cost ($)
                                    </TableHead>
                                    <TableHead>Duration &amp; Time</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {generations.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={9}
                                            className="py-10 text-center text-muted-foreground"
                                        >
                                            No generations match the current
                                            filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    generations.data.map((item) => {
                                        const modelName =
                                            resolveGenerationModel(item);
                                        const inputMedia =
                                            extractInputMediaUrls(
                                                item.input_metadata,
                                            );
                                        const keyParams = extractKeyInputParams(
                                            item.input_metadata,
                                        );
                                        const firstOutput =
                                            item.output_metadata?.[0] ?? null;
                                        const isVideoOutput =
                                            firstOutput &&
                                            (firstOutput.endsWith('.mp4') ||
                                                firstOutput.endsWith('.webm') ||
                                                firstOutput.endsWith('.mov') ||
                                                item.operation.includes(
                                                    'video',
                                                ));

                                        return (
                                            <TableRow
                                                key={item.id}
                                                className="cursor-pointer hover:bg-muted/30"
                                                onClick={() =>
                                                    setSelectedGeneration(item)
                                                }
                                            >
                                                {/* ID */}
                                                <TableCell className="align-top font-mono text-xs font-semibold">
                                                    #{item.id}
                                                </TableCell>

                                                {/* CUSTOMER */}
                                                <TableCell className="align-top">
                                                    {item.customer ? (
                                                        <div>
                                                            <div className="text-sm font-medium">
                                                                {
                                                                    item
                                                                        .customer
                                                                        .name
                                                                }
                                                            </div>
                                                            <div className="max-w-[140px] truncate text-xs text-muted-foreground">
                                                                {
                                                                    item
                                                                        .customer
                                                                        .email
                                                                }
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">
                                                            Admin / Studio
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* TYPE & MODEL */}
                                                <TableCell className="align-top">
                                                    <div className="flex flex-col items-start gap-1">
                                                        {getOperationBadge(
                                                            item.operation,
                                                        )}
                                                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                                                            {modelName}
                                                        </code>
                                                        {item.template && (
                                                            <span className="text-[11px] text-muted-foreground">
                                                                Template:{' '}
                                                                {
                                                                    item
                                                                        .template
                                                                        .name
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* PROMPT / INPUT PREVIEW */}
                                                <TableCell className="max-w-[280px] align-top">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="line-clamp-2 text-xs font-medium text-foreground">
                                                            {item.input_metadata
                                                                ?.prompt ||
                                                                item
                                                                    .input_metadata
                                                                    ?.prompt_enhancement ||
                                                                item.template
                                                                    ?.name ||
                                                                '—'}
                                                        </div>

                                                        {inputMedia.length >
                                                            0 && (
                                                            <div className="flex flex-wrap items-center gap-1">
                                                                {inputMedia
                                                                    .slice(0, 3)
                                                                    .map(
                                                                        (
                                                                            m,
                                                                            i,
                                                                        ) => (
                                                                            <div
                                                                                key={
                                                                                    i
                                                                                }
                                                                                className="flex items-center gap-1 rounded border bg-muted/40 p-0.5 pr-1.5 text-[10px]"
                                                                            >
                                                                                {m.type ===
                                                                                'image' ? (
                                                                                    <img
                                                                                        src={
                                                                                            m.url
                                                                                        }
                                                                                        alt={
                                                                                            m.label
                                                                                        }
                                                                                        className="h-5 w-5 rounded object-cover"
                                                                                    />
                                                                                ) : (
                                                                                    <span className="px-1">
                                                                                        {m.type ===
                                                                                        'video'
                                                                                            ? '🎬'
                                                                                            : '🎵'}
                                                                                    </span>
                                                                                )}
                                                                                <span className="text-muted-foreground">
                                                                                    {
                                                                                        m.label
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                        ),
                                                                    )}
                                                            </div>
                                                        )}

                                                        {keyParams.length >
                                                            0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {keyParams
                                                                    .slice(0, 3)
                                                                    .map(
                                                                        (p) => (
                                                                            <span
                                                                                key={
                                                                                    p.key
                                                                                }
                                                                                className="rounded border bg-muted/30 px-1 py-0.5 font-mono text-[10px] text-muted-foreground"
                                                                            >
                                                                                {
                                                                                    p.key
                                                                                }
                                                                                :{' '}
                                                                                <strong className="text-foreground">
                                                                                    {
                                                                                        p.value
                                                                                    }
                                                                                </strong>
                                                                            </span>
                                                                        ),
                                                                    )}
                                                            </div>
                                                        )}

                                                        {item.error && (
                                                            <div
                                                                className="mt-0.5 truncate font-mono text-xs text-red-500"
                                                                title={
                                                                    item.error
                                                                }
                                                            >
                                                                Err:{' '}
                                                                {item.error}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* OUTPUT THUMBNAIL */}
                                                <TableCell className="align-top">
                                                    {firstOutput ? (
                                                        <div className="h-11 w-11 overflow-hidden rounded-lg border bg-black/20">
                                                            {isVideoOutput ? (
                                                                <video
                                                                    src={
                                                                        firstOutput
                                                                    }
                                                                    className="h-full w-full object-cover"
                                                                    muted
                                                                />
                                                            ) : (
                                                                <img
                                                                    src={
                                                                        firstOutput
                                                                    }
                                                                    alt={`#${item.id}`}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* STATUS */}
                                                <TableCell className="align-top">
                                                    {getStatusBadge(
                                                        item.status,
                                                    )}
                                                </TableCell>

                                                {/* POINTS & API COST */}
                                                <TableCell className="align-top">
                                                    <div className="flex flex-col items-start gap-1">
                                                        <div className="text-xs font-semibold">
                                                            {item.coins_spent
                                                                ? `${item.coins_spent} pts`
                                                                : '0 pts (Admin)'}
                                                        </div>
                                                        {item.cost ? (
                                                            <Badge
                                                                variant="outline"
                                                                className="border-purple-500/30 bg-purple-500/10 px-1.5 py-0 font-mono text-[10px] text-purple-600 dark:text-purple-400"
                                                            >
                                                                {formatCost(
                                                                    item.cost,
                                                                    item.currency,
                                                                )}
                                                            </Badge>
                                                        ) : (
                                                            <span className="font-mono text-[10px] text-muted-foreground">
                                                                API: —
                                                            </span>
                                                        )}
                                                        {item.points_refunded ? (
                                                            <Badge
                                                                variant="outline"
                                                                className="border-emerald-500/30 px-1 py-0 text-[10px] text-emerald-500"
                                                            >
                                                                Refunded (
                                                                {
                                                                    item.points_refunded
                                                                }
                                                                )
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                </TableCell>

                                                {/* DURATION & TIME */}
                                                <TableCell className="align-top">
                                                    <div className="flex flex-col gap-0.5 text-xs">
                                                        <span className="font-mono font-medium text-foreground">
                                                            {formatDuration(
                                                                item.duration_ms,
                                                            )}
                                                        </span>
                                                        <span
                                                            suppressHydrationWarning
                                                            className="whitespace-nowrap text-[11px] text-muted-foreground"
                                                        >
                                                            {formatRelativeTime(
                                                                item.created_at,
                                                            )}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* ACTIONS */}
                                                <TableCell
                                                    className="align-top text-right"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <div className="flex flex-wrap items-center justify-end gap-1">
                                                        {item.status ===
                                                            'failed' && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 border-amber-500/30 px-2 text-xs text-amber-500 hover:text-amber-400"
                                                                onClick={() =>
                                                                    handleRetry(
                                                                        item,
                                                                    )
                                                                }
                                                                title="Re-queue this job"
                                                            >
                                                                <RotateCw className="mr-1 h-3.5 w-3.5" />
                                                                Retry
                                                            </Button>
                                                        )}

                                                        {item.status ===
                                                            'completed' &&
                                                            firstOutput && (
                                                                <>
                                                                    <Button
                                                                        variant="secondary"
                                                                        size="sm"
                                                                        disabled={
                                                                            savingTemplateId ===
                                                                            item.id
                                                                        }
                                                                        className="h-8 gap-1 border border-primary/20 bg-primary/10 px-2 text-xs text-primary hover:bg-primary/20"
                                                                        onClick={(
                                                                            e,
                                                                        ) =>
                                                                            handleSaveToTemplate(
                                                                                item.id,
                                                                                e,
                                                                            )
                                                                        }
                                                                        title="Save as reusable Template"
                                                                    >
                                                                        <BookmarkPlus className="h-3.5 w-3.5" />
                                                                        <span className="hidden xl:inline">
                                                                            {savingTemplateId ===
                                                                            item.id
                                                                                ? 'Saving...'
                                                                                : 'Template'}
                                                                        </span>
                                                                    </Button>

                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0"
                                                                        onClick={() => {
                                                                            const ext =
                                                                                isVideoOutput
                                                                                    ? 'mp4'
                                                                                    : 'png';
                                                                            handleDownload(
                                                                                firstOutput,
                                                                                `${item.operation}-${item.id}.${ext}`,
                                                                                item.id,
                                                                                0,
                                                                            );
                                                                        }}
                                                                        title="Download output"
                                                                    >
                                                                        <Download className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </>
                                                            )}

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() =>
                                                                setSelectedGeneration(
                                                                    item,
                                                                )
                                                            }
                                                            title="View full details"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>

                        {/* PAGINATION */}
                        {generations.last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-border p-4">
                                <span className="text-xs text-muted-foreground">
                                    Showing page {generations.current_page} of{' '}
                                    {generations.last_page} ({generations.total}{' '}
                                    total)
                                </span>
                                <div className="flex items-center gap-1">
                                    {generations.links.map((link, idx) => (
                                        <Link
                                            key={idx}
                                            href={link.url || '#'}
                                            className={`rounded border px-3 py-1 text-xs ${
                                                link.active
                                                    ? 'border-primary bg-primary font-semibold text-primary-foreground'
                                                    : link.url
                                                      ? 'border-border text-foreground hover:bg-muted'
                                                      : 'pointer-events-none border-transparent text-muted-foreground'
                                            }`}
                                            preserveScroll
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </AnimatedCard>

                {/* DETAILS MODAL */}
                <Dialog
                    open={!!selectedGeneration}
                    onOpenChange={(open) =>
                        !open && setSelectedGeneration(null)
                    }
                >
                    <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <span>
                                    Generation #{selectedGeneration?.id}
                                </span>
                                {selectedGeneration &&
                                    getStatusBadge(selectedGeneration.status)}
                            </DialogTitle>
                            <DialogDescription>
                                Created on{' '}
                                {selectedGeneration?.created_at
                                    ? new Date(
                                          selectedGeneration.created_at,
                                      ).toLocaleString()
                                    : ''}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedGeneration && (
                            <div className="space-y-4 text-sm">
                                {/* CUSTOMER INFO */}
                                <div className="rounded-lg border border-border bg-muted/40 p-3">
                                    <div className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
                                        Customer Identity
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-muted-foreground">
                                                Name:{' '}
                                            </span>
                                            <span className="font-medium">
                                                {selectedGeneration.customer
                                                    ?.name || 'Admin / Studio'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">
                                                Email:{' '}
                                            </span>
                                            <span className="font-medium">
                                                {selectedGeneration.customer
                                                    ?.email || '—'}
                                            </span>
                                        </div>
                                        <div className="col-span-2 font-mono text-[11px] text-muted-foreground">
                                            Central Auth UUID:{' '}
                                            {selectedGeneration.customer
                                                ?.central_auth_uuid || '—'}
                                        </div>
                                    </div>
                                </div>

                                {/* POINTS, API COST & TIMING */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                                        <div className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
                                            Points &amp; Provider API Cost
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            <div>
                                                Points Spent:{' '}
                                                <span className="font-bold">
                                                    {selectedGeneration.coins_spent ||
                                                        0}{' '}
                                                    pts
                                                </span>
                                            </div>
                                            <div>
                                                Segmind API Cost:{' '}
                                                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                                                    {formatCost(
                                                        selectedGeneration.cost,
                                                        selectedGeneration.currency,
                                                    )}
                                                </span>
                                            </div>
                                            <div>
                                                Refunded:{' '}
                                                <span className="font-bold text-emerald-500">
                                                    {selectedGeneration.points_refunded ||
                                                        0}{' '}
                                                    pts
                                                </span>
                                            </div>
                                            {selectedGeneration.refunded_at && (
                                                <div className="text-[11px] text-muted-foreground">
                                                    Refund Date:{' '}
                                                    {new Date(
                                                        selectedGeneration.refunded_at,
                                                    ).toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-border bg-muted/40 p-3">
                                        <div className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
                                            Model &amp; Execution Timing
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            <div>
                                                Model:{' '}
                                                <code className="rounded bg-muted px-1.5 py-0.5 font-mono font-bold text-primary">
                                                    {resolveGenerationModel(
                                                        selectedGeneration,
                                                    )}
                                                </code>
                                            </div>
                                            <div>
                                                Duration:{' '}
                                                <span className="font-mono">
                                                    {formatDuration(
                                                        selectedGeneration.duration_ms,
                                                    )}
                                                </span>
                                            </div>
                                            <div>
                                                Status:{' '}
                                                <span className="font-semibold capitalize">
                                                    {selectedGeneration.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* INPUT MEDIA THUMBNAILS */}
                                {selectedInputMedia.length > 0 && (
                                    <div>
                                        <div className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase">
                                            Input Reference Media (
                                            {selectedInputMedia.length})
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {selectedInputMedia.map(
                                                (media, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="rounded-lg border bg-muted/30 p-2"
                                                    >
                                                        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                                                            <span>
                                                                {media.label}
                                                            </span>
                                                            <a
                                                                href={media.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-primary hover:underline"
                                                            >
                                                                Open
                                                            </a>
                                                        </div>
                                                        {media.type ===
                                                            'image' && (
                                                            <img
                                                                src={media.url}
                                                                alt={
                                                                    media.label
                                                                }
                                                                className="h-24 w-full rounded object-cover"
                                                            />
                                                        )}
                                                        {media.type ===
                                                            'video' && (
                                                            <video
                                                                src={media.url}
                                                                controls
                                                                className="h-24 w-full rounded object-cover"
                                                            />
                                                        )}
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* KEY INPUT PARAMETERS */}
                                {selectedKeyParams.length > 0 && (
                                    <div>
                                        <div className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase">
                                            Input Parameters
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {selectedKeyParams.map((p) => (
                                                <div
                                                    key={p.key}
                                                    className="rounded border bg-muted/30 px-2.5 py-1.5 text-xs"
                                                >
                                                    <span className="block text-[10px] text-muted-foreground uppercase">
                                                        {p.key}
                                                    </span>
                                                    <span className="font-mono font-semibold">
                                                        {p.value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* PROMPT & INPUT METADATA */}
                                <div>
                                    <div className="mb-1 text-xs font-semibold text-muted-foreground uppercase">
                                        Raw Input Metadata &amp; Prompt
                                    </div>
                                    <pre className="max-h-44 overflow-x-auto rounded-lg border border-border bg-muted/60 p-3 font-mono text-xs whitespace-pre-wrap">
                                        {JSON.stringify(
                                            selectedGeneration.input_metadata,
                                            null,
                                            2,
                                        )}
                                    </pre>
                                </div>

                                {/* OUTPUT PREVIEW */}
                                {selectedGeneration.output_metadata &&
                                    selectedGeneration.output_metadata.length >
                                        0 && (
                                        <div>
                                            <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                                                Generated Output
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {selectedGeneration.output_metadata.map(
                                                    (url, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="group relative overflow-hidden rounded-lg border border-border bg-black/40"
                                                        >
                                                            {url.endsWith(
                                                                '.mp4',
                                                            ) ? (
                                                                <video
                                                                    src={url}
                                                                    controls
                                                                    className="h-44 w-full object-cover"
                                                                />
                                                            ) : (
                                                                <img
                                                                    src={url}
                                                                    alt={`Output ${idx}`}
                                                                    className="h-44 w-full object-cover"
                                                                />
                                                            )}
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="absolute right-2 bottom-2 flex items-center gap-1 rounded bg-black/70 p-1.5 text-xs text-white hover:bg-black"
                                                            >
                                                                <ExternalLink className="h-3 w-3" />{' '}
                                                                View
                                                            </a>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* ERROR TRACE IF FAILED */}
                                {selectedGeneration.error && (
                                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-500">
                                        <div className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase">
                                            <AlertCircle className="h-3.5 w-3.5" />{' '}
                                            Failure Trace
                                        </div>
                                        <div className="font-mono text-xs break-all">
                                            {selectedGeneration.error}
                                        </div>
                                    </div>
                                )}

                                {/* FOOTER ACTIONS */}
                                <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
                                    {selectedGeneration.status ===
                                        'completed' &&
                                        selectedGeneration.output_metadata &&
                                        selectedGeneration.output_metadata
                                            .length > 0 && (
                                            <>
                                                <Button
                                                    variant="default"
                                                    disabled={
                                                        savingTemplateId ===
                                                        selectedGeneration.id
                                                    }
                                                    onClick={() =>
                                                        handleSaveToTemplate(
                                                            selectedGeneration.id,
                                                        )
                                                    }
                                                    className="gap-1.5"
                                                >
                                                    <BookmarkPlus className="h-4 w-4" />
                                                    {savingTemplateId ===
                                                    selectedGeneration.id
                                                        ? 'Saving Template...'
                                                        : 'Save to Template'}
                                                </Button>

                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        const url =
                                                            selectedGeneration
                                                                .output_metadata![0];
                                                        const isVideo =
                                                            url.endsWith(
                                                                '.mp4',
                                                            ) ||
                                                            selectedGeneration.operation.includes(
                                                                'video',
                                                            );
                                                        handleDownload(
                                                            url,
                                                            `${selectedGeneration.operation}-${selectedGeneration.id}.${isVideo ? 'mp4' : 'png'}`,
                                                            selectedGeneration.id,
                                                            0,
                                                        );
                                                    }}
                                                    className="gap-1.5"
                                                >
                                                    <Download className="h-4 w-4" />
                                                    Download
                                                </Button>
                                            </>
                                        )}

                                    {selectedGeneration.status === 'failed' && (
                                        <Button
                                            variant="default"
                                            className="bg-amber-600 text-white hover:bg-amber-500"
                                            onClick={() =>
                                                handleRetry(selectedGeneration)
                                            }
                                        >
                                            <RotateCw className="mr-1.5 h-4 w-4" />
                                            Re-queue Generation #
                                            {selectedGeneration.id}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}
