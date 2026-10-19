import { Head, Link, router } from '@inertiajs/react';
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Clock,
    Coins,
    ExternalLink,
    Eye,
    Layers,
    Play,
    RefreshCw,
    RotateCw,
    Search,
    Server,
    Sparkles,
    Video,
    X,
} from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
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
    coins_spent: number | null;
    points_refunded: number | null;
    refunded_at: string | null;
    duration_ms: number | null;
    error: string | null;
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

export default function QueueMonitor({ metrics: initialMetrics, generations, filters }: Props) {
    const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedGeneration, setSelectedGeneration] = useState<GenerationItem | null>(null);
    const [search, setSearch] = useState(filters.search || '');
    const [isPending, startTransition] = useTransition();

    // Auto-refresh interval (every 5 seconds)
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetch('/admin/queue/metrics')
                .then((res) => res.json())
                .then((data: Metrics) => {
                    setMetrics(data);
                    // If jobs are queued or processing, refresh generation rows smoothly
                    if (data.queued_count > 0 || data.processing_count > 0) {
                        router.reload({ only: ['generations', 'metrics'], preserveScroll: true });
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
            preserveScroll: true,
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

        router.get('/admin/queue', query, { preserveState: true, replace: true });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleFilterChange('search', search);
    };

    const handleRetry = (generation: GenerationItem) => {
        if (!confirm(`Are you sure you want to re-queue Generation #${generation.id}?`)) {
            return;
        }

        router.post(`/admin/queue/${generation.id}/retry`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                if (selectedGeneration?.id === generation.id) {
                    setSelectedGeneration(null);
                }
            },
        });
    };

    const formatDuration = (ms: number | null) => {
        if (!ms) return '—';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    const formatRelativeTime = (isoString: string) => {
        try {
            const date = new Date(isoString);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
            return date.toLocaleDateString();
        } catch {
            return isoString;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'queued':
                return (
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-500 flex items-center gap-1">
                        <Clock className="h-3 w-3 animate-pulse" />
                        Queued
                    </Badge>
                );
            case 'processing':
                return (
                    <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-500 flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Processing
                    </Badge>
                );
            case 'completed':
                return (
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                    </Badge>
                );
            case 'failed':
                return (
                    <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-red-500 flex items-center gap-1">
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
                    <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/30">
                        <Sparkles className="h-3 w-3 mr-1 inline" /> Text-to-Image
                    </Badge>
                );
            case 'face-swap':
                return (
                    <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        Photo Swap
                    </Badge>
                );
            case 'image-editing':
            case 'image-edit':
                return (
                    <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                        Image Edit
                    </Badge>
                );
            case 'image-to-video':
                return (
                    <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <Video className="h-3 w-3 mr-1 inline" /> Image-to-Video
                    </Badge>
                );
            case 'video-face-swap':
                return (
                    <Badge className="bg-pink-500/10 text-pink-400 border border-pink-500/30">
                        <Video className="h-3 w-3 mr-1 inline" /> Video Swap
                    </Badge>
                );
            default:
                return <Badge variant="outline">{operation}</Badge>;
        }
    };

    return (
        <>
            <Head title="Queue Monitor — Admin" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
                {/* TOP HEADER */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Heading
                                title="Queue Monitor"
                                description="Real-time Redis background worker queues, pending tasks, and generation lifecycle."
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* REDIS HEALTH BADGE */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs">
                            <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                    metrics.redis_status === 'connected'
                                        ? 'bg-emerald-500 animate-pulse'
                                        : 'bg-amber-500'
                                }`}
                            />
                            <span className="font-medium">
                                Redis {metrics.redis_status === 'connected' ? 'Online' : 'Offline'}
                            </span>
                            <span className="text-muted-foreground">({metrics.queue_driver})</span>
                        </div>

                        {/* AUTO-REFRESH TOGGLE */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={autoRefresh ? 'border-primary/50 text-primary' : 'text-muted-foreground'}
                        >
                            <span className={`mr-1.5 h-2 w-2 rounded-full ${autoRefresh ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                            {autoRefresh ? 'Auto (5s)' : 'Paused'}
                        </Button>

                        {/* MANUAL REFRESH BUTTON */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleManualRefresh}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* KPI METRIC CARDS */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                    {/* QUEUED */}
                    <AnimatedCard className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Queued (Pending)
                                </span>
                                <Clock className="h-4 w-4 text-amber-500" />
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-amber-500">
                                    {metrics.queued_count}
                                </span>
                                {metrics.redis_queue_size !== null && (
                                    <span className="text-xs text-muted-foreground">
                                        ({metrics.redis_queue_size} in Redis)
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Waiting for worker</p>
                        </CardContent>
                    </AnimatedCard>

                    {/* PROCESSING */}
                    <AnimatedCard className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Processing
                                </span>
                                <Activity className="h-4 w-4 text-blue-500 animate-spin" />
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-blue-500">
                                    {metrics.processing_count}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Rendering in AI GPU</p>
                        </CardContent>
                    </AnimatedCard>

                    {/* COMPLETED TODAY */}
                    <AnimatedCard className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Completed Today
                                </span>
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-emerald-500">
                                    {metrics.completed_today}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Successfully delivered</p>
                        </CardContent>
                    </AnimatedCard>

                    {/* FAILED TODAY */}
                    <AnimatedCard className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Failed Today
                                </span>
                                <AlertCircle className="h-4 w-4 text-red-500" />
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-red-500">
                                    {metrics.failed_today}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Errors &amp; timeouts</p>
                        </CardContent>
                    </AnimatedCard>

                    {/* REFUNDED POINTS */}
                    <AnimatedCard className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent col-span-2 lg:col-span-1">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Points Refunded
                                </span>
                                <Coins className="h-4 w-4 text-emerald-500" />
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-emerald-500">
                                    {metrics.total_refunded_points_today}
                                </span>
                                <span className="text-xs text-muted-foreground">pts</span>
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
                                    onValueChange={(val) => handleFilterChange('status', val)}
                                >
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="queued">Queued ⏳</SelectItem>
                                        <SelectItem value="processing">Processing ⚙️</SelectItem>
                                        <SelectItem value="completed">Completed ✅</SelectItem>
                                        <SelectItem value="failed">Failed ❌</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* OPERATION FILTER */}
                                <Select
                                    value={filters.operation || 'all'}
                                    onValueChange={(val) => handleFilterChange('operation', val)}
                                >
                                    <SelectTrigger className="w-[170px]">
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="image-generation">Text-to-Image</SelectItem>
                                        <SelectItem value="face-swap">Photo Face Swap</SelectItem>
                                        <SelectItem value="image-editing">Image Editing</SelectItem>
                                        <SelectItem value="image-to-video">Image-to-Video</SelectItem>
                                        <SelectItem value="video-face-swap">Video Face Swap</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* SEARCH INPUT */}
                            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-sm w-full">
                                <div className="relative w-full">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search customer, ID, or prompt..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Button type="submit" variant="secondary" size="sm">
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
                                    <TableHead className="w-[80px]">ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Type &amp; Model</TableHead>
                                    <TableHead>Prompt / Input Preview</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Points &amp; Refund</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {generations.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                                            No generations match the current filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    generations.data.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-muted/30">
                                            {/* ID */}
                                            <TableCell className="font-mono text-xs font-semibold">
                                                #{item.id}
                                            </TableCell>

                                            {/* CUSTOMER */}
                                            <TableCell>
                                                {item.customer ? (
                                                    <div>
                                                        <div className="font-medium text-sm">
                                                            {item.customer.name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                                            {item.customer.email}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Guest / Admin</span>
                                                )}
                                            </TableCell>

                                            {/* TYPE & MODEL */}
                                            <TableCell>
                                                <div className="flex flex-col gap-1 items-start">
                                                    {getOperationBadge(item.operation)}
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {item.input_metadata?.model || item.template?.name || '—'}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* PROMPT / PREVIEW */}
                                            <TableCell className="max-w-[220px]">
                                                <div className="truncate text-xs font-medium text-foreground">
                                                    {item.input_metadata?.prompt ||
                                                        item.input_metadata?.prompt_enhancement ||
                                                        item.template?.name ||
                                                        '—'}
                                                </div>
                                                {item.error && (
                                                    <div className="truncate text-xs text-red-500 font-mono mt-0.5" title={item.error}>
                                                        Err: {item.error}
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* STATUS */}
                                            <TableCell>{getStatusBadge(item.status)}</TableCell>

                                            {/* POINTS & REFUND */}
                                            <TableCell>
                                                <div className="text-xs font-medium">
                                                    {item.coins_spent ? `${item.coins_spent} pts` : '0 pts'}
                                                </div>
                                                {item.points_refunded ? (
                                                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-[10px] px-1 py-0 mt-0.5">
                                                        Refunded ({item.points_refunded})
                                                    </Badge>
                                                ) : null}
                                            </TableCell>

                                            {/* DURATION */}
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {formatDuration(item.duration_ms)}
                                            </TableCell>

                                            {/* TIME */}
                                            <TableCell suppressHydrationWarning className="text-xs text-muted-foreground whitespace-nowrap">
                                                {formatRelativeTime(item.created_at)}
                                            </TableCell>

                                            {/* ACTIONS */}
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {item.status === 'failed' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 text-xs text-amber-500 hover:text-amber-400 border-amber-500/30"
                                                            onClick={() => handleRetry(item)}
                                                            title="Re-queue this job"
                                                        >
                                                            <RotateCw className="h-3.5 w-3.5 mr-1" />
                                                            Retry
                                                        </Button>
                                                    )}

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => setSelectedGeneration(item)}
                                                        title="View full details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* PAGINATION */}
                        {generations.last_page > 1 && (
                            <div className="flex items-center justify-between p-4 border-t border-border">
                                <span className="text-xs text-muted-foreground">
                                    Showing page {generations.current_page} of {generations.last_page} ({generations.total} total)
                                </span>
                                <div className="flex items-center gap-1">
                                    {generations.links.map((link, idx) => (
                                        <Link
                                            key={idx}
                                            href={link.url || '#'}
                                            className={`px-3 py-1 text-xs rounded border ${
                                                link.active
                                                    ? 'bg-primary text-primary-foreground border-primary font-semibold'
                                                    : link.url
                                                    ? 'border-border text-foreground hover:bg-muted'
                                                    : 'border-transparent text-muted-foreground pointer-events-none'
                                            }`}
                                            preserveScroll
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </AnimatedCard>

                {/* DETAILS MODAL */}
                <Dialog open={!!selectedGeneration} onOpenChange={(open) => !open && setSelectedGeneration(null)}>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <span>Generation #{selectedGeneration?.id}</span>
                                {selectedGeneration && getStatusBadge(selectedGeneration.status)}
                            </DialogTitle>
                            <DialogDescription>
                                Created on {selectedGeneration?.created_at ? new Date(selectedGeneration.created_at).toLocaleString() : ''}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedGeneration && (
                            <div className="space-y-4 text-sm">
                                {/* CUSTOMER INFO */}
                                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                                    <div className="font-semibold text-xs text-muted-foreground uppercase mb-1">
                                        Customer Identity
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-muted-foreground">Name: </span>
                                            <span className="font-medium">{selectedGeneration.customer?.name || 'Guest'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Email: </span>
                                            <span className="font-medium">{selectedGeneration.customer?.email || '—'}</span>
                                        </div>
                                        <div className="col-span-2 font-mono text-[11px] text-muted-foreground">
                                            Central Auth UUID: {selectedGeneration.customer?.central_auth_uuid || '—'}
                                        </div>
                                    </div>
                                </div>

                                {/* POINTS & IDEMPOTENCY */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-lg bg-muted/40 border border-border">
                                        <div className="font-semibold text-xs text-muted-foreground uppercase mb-1">
                                            Point Ledger
                                        </div>
                                        <div className="text-xs space-y-1">
                                            <div>Points Spent: <span className="font-bold">{selectedGeneration.coins_spent || 0} pts</span></div>
                                            <div>Refunded: <span className="font-bold text-emerald-500">{selectedGeneration.points_refunded || 0} pts</span></div>
                                            {selectedGeneration.refunded_at && (
                                                <div className="text-[11px] text-muted-foreground">
                                                    Refund Date: {new Date(selectedGeneration.refunded_at).toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-3 rounded-lg bg-muted/40 border border-border">
                                        <div className="font-semibold text-xs text-muted-foreground uppercase mb-1">
                                            Execution Timing
                                        </div>
                                        <div className="text-xs space-y-1">
                                            <div>Duration: <span className="font-mono">{formatDuration(selectedGeneration.duration_ms)}</span></div>
                                            <div>Status: <span className="font-semibold capitalize">{selectedGeneration.status}</span></div>
                                        </div>
                                    </div>
                                </div>

                                {/* PROMPT & INPUT METADATA */}
                                <div>
                                    <div className="font-semibold text-xs text-muted-foreground uppercase mb-1">
                                        Input Metadata &amp; Prompt
                                    </div>
                                    <pre className="p-3 rounded-lg bg-muted/60 border border-border font-mono text-xs overflow-x-auto whitespace-pre-wrap max-h-48">
                                        {JSON.stringify(selectedGeneration.input_metadata, null, 2)}
                                    </pre>
                                </div>

                                {/* OUTPUT PREVIEW */}
                                {selectedGeneration.output_metadata && selectedGeneration.output_metadata.length > 0 && (
                                    <div>
                                        <div className="font-semibold text-xs text-muted-foreground uppercase mb-2">
                                            Generated Output
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {selectedGeneration.output_metadata.map((url, idx) => (
                                                <div key={idx} className="relative group rounded-lg border border-border overflow-hidden bg-black/40">
                                                    {url.endsWith('.mp4') ? (
                                                        <video src={url} controls className="w-full h-40 object-cover" />
                                                    ) : (
                                                        <img src={url} alt={`Output ${idx}`} className="w-full h-40 object-cover" />
                                                    )}
                                                    <a
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="absolute bottom-2 right-2 p-1.5 rounded bg-black/70 text-white text-xs flex items-center gap-1 hover:bg-black"
                                                    >
                                                        <ExternalLink className="h-3 w-3" /> View
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ERROR TRACE IF FAILED */}
                                {selectedGeneration.error && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500">
                                        <div className="font-semibold text-xs uppercase mb-1 flex items-center gap-1">
                                            <AlertCircle className="h-3.5 w-3.5" /> Failure Trace
                                        </div>
                                        <div className="font-mono text-xs break-all">
                                            {selectedGeneration.error}
                                        </div>
                                    </div>
                                )}

                                {/* FOOTER ACTION */}
                                {selectedGeneration.status === 'failed' && (
                                    <div className="pt-2 flex justify-end">
                                        <Button
                                            variant="default"
                                            className="bg-amber-600 hover:bg-amber-500 text-white"
                                            onClick={() => handleRetry(selectedGeneration)}
                                        >
                                            <RotateCw className="h-4 w-4 mr-1.5" />
                                            Re-queue Generation #{selectedGeneration.id}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}
