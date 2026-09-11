import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Clock,
    Coins,
    Images,
    Sparkles,
    TrendingUp,
    Users,
    Wand2,
    Video,
} from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import { Badge } from '@/components/ui/badge';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes';

type Stats = {
    total_generations: number;
    today_cost: string;
    total_cost: string;
    face_swaps: number;
    video_swaps: number;
    image_gens: number;
    total_customers: number;
    active_customers: number;
};

type RecentGeneration = {
    id: number;
    operation: string;
    status: string;
    model: string;
    cost: string | null;
    customer_name: string;
    template_name: string | null;
    created_at: string;
};

type Today = {
    generations: number;
    cost: string;
};

type MonthlyData = {
    month: string;
    generations: number;
    cost: number;
};

type OperationData = {
    name: string;
    value: number;
};

type Props = {
    stats: Stats;
    recent: RecentGeneration[];
    today: Today;
    monthly: MonthlyData[];
    operations: OperationData[];
};

function formatCost(cost: string): string {
    const num = parseFloat(cost);

    if (isNaN(num) || num === 0) {
        return '$0.00';
    }

    return `$${num.toFixed(2)}`;
}

function formatNumber(num: number): string {
    return num.toLocaleString();
}

function timeAgo(dateStr: string): string {
    const seconds = Math.floor(
        (Date.now() - new Date(dateStr).getTime()) / 1000,
    );

    if (seconds < 60) {
        return 'Just now';
    }

    if (seconds < 3600) {
        return `${Math.floor(seconds / 60)}m ago`;
    }

    if (seconds < 86400) {
        return `${Math.floor(seconds / 3600)}h ago`;
    }

    return `${Math.floor(seconds / 86400)}d ago`;
}

function operationIcon(operation: string) {
    switch (operation) {
        case 'face-swap':
            return Wand2;
        case 'video-face-swap':
            return Video;
        case 'image-generation':
            return Images;
        default:
            return Sparkles;
    }
}

function operationLabel(operation: string): string {
    switch (operation) {
        case 'face-swap':
            return 'Face Swap';
        case 'video-face-swap':
            return 'Video Face Swap';
        case 'image-generation':
            return 'Image Generation';
        default:
            return operation;
    }
}

function BarChart({ data }: { data: MonthlyData[] }) {
    const maxGenerations = Math.max(...data.map((d) => d.generations), 1);

    return (
        <div className="flex h-[180px] items-end gap-2">
            {data.map((d) => {
                const height =
                    maxGenerations > 0
                        ? (d.generations / maxGenerations) * 100
                        : 0;

                return (
                    <div
                        key={d.month}
                        className="flex flex-1 flex-col items-center gap-1"
                    >
                        <div
                            className="flex w-full flex-col items-center justify-end"
                            style={{ height: '140px' }}
                        >
                            {d.generations > 0 && (
                                <span className="mb-1 text-[10px] text-muted-foreground">
                                    {d.generations}
                                </span>
                            )}
                            <div
                                className="w-full max-w-[40px] rounded-t-md bg-primary/80 transition-all duration-500"
                                style={{ height: `${Math.max(height, 2)}%` }}
                            />
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground">
                            {d.month}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function DonutChart({ data }: { data: OperationData[] }) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const colors = ['bg-blue-500', 'bg-violet-500', 'bg-amber-500'];

    if (total === 0) {
        return (
            <div className="flex h-[140px] items-center justify-center text-sm text-muted-foreground">
                No data yet
            </div>
        );
    }

    // Pre-calculate cumulative offsets using reduce
    const positioned = data.reduce<{
        offset: number;
        items: ((typeof data)[number] & { offset: number; color: string; percent: number })[];
    }>(
        (acc, d, i) => {
            const percent = (d.value / total) * 100;
            const item = {
                ...d,
                offset: acc.offset,
                color: colors[i],
                percent,
            };

            return {
                offset: acc.offset + percent,
                items: [...acc.items, item],
            };
        },
        { offset: 0, items: [] },
    ).items;

    return (
        <div className="flex items-center gap-6">
            {/* Donut */}
            <div className="relative size-[120px] shrink-0">
                <svg viewBox="0 0 36 36" className="size-full -rotate-90">
                    {positioned.map((s) => (
                        <circle
                            key={s.name}
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="none"
                            className={s.color}
                            strokeWidth="3.5"
                            strokeDasharray={`${s.percent} ${100 - s.percent}`}
                            strokeDashoffset={100 - s.offset}
                            strokeLinecap="round"
                        />
                    ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">
                        {formatNumber(total)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        total
                    </span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-2">
                {data.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                        <div className={`size-2.5 rounded-full ${colors[i]}`} />
                        <span className="text-sm text-muted-foreground">
                            {d.name}
                        </span>
                        <span className="ml-auto text-sm font-medium">
                            {d.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Dashboard({
    stats,
    recent,
    today,
    monthly,
    operations,
}: Props) {
    const statCards = [
        {
            label: "Today's Cost",
            value: formatCost(stats.today_cost),
            icon: Coins,
            hint: `${today.generations} generations today`,
            iconClassName:
                'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        },
        {
            label: 'Total Generations',
            value: formatNumber(stats.total_generations),
            icon: Sparkles,
            hint: `All time — ${formatCost(stats.total_cost)} total cost`,
        },
        {
            label: 'Face Swaps',
            value: formatNumber(stats.face_swaps),
            icon: Wand2,
            hint: 'All time',
            iconClassName:
                'bg-violet-500/10 text-violet-600 dark:text-violet-400',
        },
        {
            label: 'Video Generations',
            value: formatNumber(stats.video_swaps),
            icon: Video,
            hint: 'All time',
            iconClassName: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        },
        {
            label: 'Image Generations',
            value: formatNumber(stats.image_gens),
            icon: Images,
            hint: 'All time',
            iconClassName: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        },
        {
            label: 'Total Customers',
            value: formatNumber(stats.total_customers),
            icon: Users,
            hint: `${stats.active_customers} active`,
            iconClassName: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
        },
    ];

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Dashboard
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Overview of your AI generation usage and costs.
                        </p>
                    </div>
                    <Link href="/admin/ai">
                        <AnimatedButton>
                            <Sparkles className="size-4" />
                            New Generation
                        </AnimatedButton>
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {statCards.map((stat) => (
                        <StatCard key={stat.label} {...stat} />
                    ))}
                </div>

                {/* Charts + Recent Activity */}
                <div className="grid gap-4 lg:grid-cols-3">
                    {/* Recent Activity */}
                    <AnimatedCard className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Recent Generations</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {recent.length === 0 ? (
                                <div className="flex h-[100px] items-center justify-center text-muted-foreground">
                                    <p className="text-sm">
                                        No generations yet. Create your first
                                        one.
                                    </p>
                                </div>
                            ) : (
                                recent.map((item) => {
                                    const Icon = operationIcon(item.operation);

                                    return (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between gap-4 rounded-lg border bg-background px-4 py-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                                    <Icon className="size-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {operationLabel(
                                                            item.operation,
                                                        )}
                                                    </p>
                                                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Clock className="size-3" />
                                                        {timeAgo(
                                                            item.created_at,
                                                        )}
                                                        <span className="mx-1">
                                                            ·
                                                        </span>
                                                        {item.customer_name}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {item.template_name && (
                                                    <span className="hidden text-xs text-muted-foreground sm:block">
                                                        {item.template_name}
                                                    </span>
                                                )}
                                                <span className="hidden text-xs text-muted-foreground sm:block">
                                                    {item.model}
                                                </span>
                                                {item.cost &&
                                                    parseFloat(item.cost) >
                                                        0 && (
                                                        <span className="text-xs font-medium text-muted-foreground">
                                                            $
                                                            {parseFloat(
                                                                item.cost,
                                                            ).toFixed(3)}
                                                        </span>
                                                    )}
                                                <Badge
                                                    variant={
                                                        item.status ===
                                                        'completed'
                                                            ? 'default'
                                                            : item.status ===
                                                                'failed'
                                                              ? 'destructive'
                                                              : 'secondary'
                                                    }
                                                >
                                                    {item.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            {recent.length > 0 && (
                                <Link
                                    href="/admin/ai"
                                    className="flex items-center gap-1 px-1 pt-1 text-sm font-medium text-primary hover:underline"
                                >
                                    View all generations
                                    <ArrowRight className="size-4" />
                                </Link>
                            )}
                        </CardContent>
                    </AnimatedCard>

                    {/* Charts */}
                    <div className="flex flex-col gap-4">
                        {/* Monthly Generations Chart */}
                        <AnimatedCard>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">
                                        Monthly Generations
                                    </CardTitle>
                                    <TrendingUp className="size-4 text-muted-foreground" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <BarChart data={monthly} />
                            </CardContent>
                        </AnimatedCard>

                        {/* Operation Breakdown */}
                        <AnimatedCard>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">
                                    Operation Breakdown
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <DonutChart data={operations} />
                            </CardContent>
                        </AnimatedCard>
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
