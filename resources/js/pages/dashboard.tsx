import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Clock,
    Coins,
    Images,
    Sparkles,
    Wand2,
    Video,
} from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import { Badge } from '@/components/ui/badge';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes';

const stats = [
    {
        label: "Today's Cost",
        value: '$12.42',
        icon: Coins,
        hint: '+8.2% from yesterday',
        iconClassName:
            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
        label: 'Total Generations',
        value: '1,248',
        icon: Sparkles,
        hint: 'All time',
    },
    {
        label: 'Face Swaps',
        value: '342',
        icon: Wand2,
        hint: 'All time',
        iconClassName: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    },
    {
        label: 'Video Generations',
        value: '81',
        icon: Video,
        hint: 'All time',
        iconClassName: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
];

const recentActivity = [
    {
        id: 1,
        operation: 'Image Generation',
        model: 'segmind-turbo',
        status: 'completed' as const,
        time: '2 minutes ago',
    },
    {
        id: 2,
        operation: 'Face Swap',
        model: 'face-swap-v2',
        status: 'completed' as const,
        time: '18 minutes ago',
    },
    {
        id: 3,
        operation: 'Video Face Swap',
        model: 'video-model',
        status: 'processing' as const,
        time: '1 hour ago',
    },
];

export default function Dashboard() {
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

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((stat) => (
                        <StatCard key={stat.label} {...stat} />
                    ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <AnimatedCard className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Recent activity</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {recentActivity.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between gap-4 rounded-lg border bg-background px-4 py-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                            <Images className="size-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">
                                                {item.operation}
                                            </p>
                                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="size-3" />
                                                {item.time}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="hidden text-xs text-muted-foreground sm:block">
                                            {item.model}
                                        </span>
                                        <Badge
                                            variant={
                                                item.status === 'completed'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {item.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}

                            <Link
                                href="/admin/ai"
                                className="flex items-center gap-1 px-1 pt-1 text-sm font-medium text-primary hover:underline"
                            >
                                View all generations
                                <ArrowRight className="size-4" />
                            </Link>
                        </CardContent>
                    </AnimatedCard>

                    <AnimatedCard>
                        <CardHeader>
                            <CardTitle>Quick actions</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            <Link href="/admin/ai">
                                <AnimatedButton className="w-full">
                                    Generate image
                                </AnimatedButton>
                            </Link>
                            <Link href="/admin/providers">
                                <AnimatedButton
                                    variant="outline"
                                    className="w-full"
                                >
                                    Manage providers
                                </AnimatedButton>
                            </Link>
                            <Link href="/admin/api-playground">
                                <AnimatedButton
                                    variant="outline"
                                    className="w-full"
                                >
                                    API Playground
                                </AnimatedButton>
                            </Link>
                        </CardContent>
                    </AnimatedCard>
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
