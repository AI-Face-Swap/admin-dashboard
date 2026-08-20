import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { usePermissions } from '@/hooks/use-permissions';

type Provider = {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    config: Record<string, unknown> | null;
    created_at: string;
    generations_count: number;
    completed_count: number;
    failed_count: number;
    total_cost: string | null;
};

export default function Index({ providers }: { providers: Provider[] }) {
    const { can } = usePermissions();

    return (
        <>
            <Head title="Providers" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="AI Providers"
                    description="Manage external AI services (Segmind, Replicate, ...). Toggle active providers and view usage stats."
                />

                {providers.length === 0 && (
                    <AnimatedCard>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            No providers configured.
                        </CardContent>
                    </AnimatedCard>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {providers.map((provider) => (
                        <ProviderCard
                            key={provider.id}
                            provider={provider}
                            canToggle={can('providers.manage')}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}

function ProviderCard({
    provider,
    canToggle,
}: {
    provider: Provider;
    canToggle: boolean;
}) {
    const [isActive, setIsActive] = useState(provider.is_active);
    const [processing, setProcessing] = useState(false);
    const [showConfig, setShowConfig] = useState(false);

    const toggle = () => {
        setProcessing(true);
        setIsActive(!isActive); // optimistic update

        router.patch(
            `/admin/providers/${provider.id}/toggle`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload({ only: ['providers'] });
                },
                onError: () => {
                    setIsActive(isActive); // rollback on error
                    setProcessing(false);
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    const cost = provider.total_cost
        ? `$${Number(provider.total_cost).toFixed(2)}`
        : '—';

    return (
        <AnimatedCard>
            <CardContent className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                            {provider.slug}
                        </p>
                    </div>
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                        {isActive ? 'active' : 'inactive'}
                    </Badge>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <p className="text-muted-foreground">Generations</p>
                        <p className="font-medium">
                            {provider.generations_count.toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p className="font-medium text-green-600 dark:text-green-400">
                            {provider.completed_count.toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Failed</p>
                        <p className="font-medium text-destructive">
                            {provider.failed_count.toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Total cost</p>
                        <p className="font-medium">{cost}</p>
                    </div>
                </div>

                {/* Config (collapsible) */}
                {provider.config && Object.keys(provider.config).length > 0 && (
                    <div>
                        <button
                            type="button"
                            onClick={() => setShowConfig((s) => !s)}
                            className="text-xs text-muted-foreground underline"
                        >
                            {showConfig ? 'Hide config' : 'Show config'}
                        </button>
                        {showConfig && (
                            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-muted p-3 text-xs">
                                {JSON.stringify(provider.config, null, 2)}
                            </pre>
                        )}
                    </div>
                )}

                {/* Toggle */}
                {canToggle && (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm">Enabled</span>
                        <Switch
                            checked={isActive}
                            disabled={processing}
                            onCheckedChange={toggle}
                        />
                    </div>
                )}

                {/* Footer */}
                <p className="text-xs text-muted-foreground">
                    Added {new Date(provider.created_at).toLocaleDateString()}
                </p>
            </CardContent>
        </AnimatedCard>
    );
}
