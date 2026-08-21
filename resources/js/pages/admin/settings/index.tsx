import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/hooks/use-permissions';
import admin from '@/routes/admin';

type CoinCosts = {
    image_generation: number;
    face_swap: number;
    video_face_swap: number;
};

type Props = {
    coinCosts: CoinCosts;
};

export default function Index({ coinCosts }: Props) {
    const { can } = usePermissions();
    const flash = usePage().props.flash as { success?: string } | undefined;

    const [costs, setCosts] = useState<CoinCosts>(coinCosts);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const handleChange = (key: keyof CoinCosts, value: string) => {
        const numValue = parseInt(value, 10);

        if (value === '' || !isNaN(numValue)) {
            setCosts((prev) => ({
                ...prev,
                [key]: value === '' ? 0 : numValue,
            }));
            setHasChanges(true);
        }
    };

    const handleSave = () => {
        setSaving(true);

        router.put(
            '/admin/settings',
            { coin_costs: costs },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setHasChanges(false);
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const handleReset = () => {
        setCosts(coinCosts);
        setHasChanges(false);
    };

    if (!can('settings.manage')) {
        return (
            <div className="flex flex-1 items-center justify-center p-6">
                <p className="text-muted-foreground">
                    You don't have permission to view settings.
                </p>
            </div>
        );
    }

    return (
        <>
            <Head title="Settings" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="Settings"
                    description="Configure application-wide settings for AI operations and coin costs."
                />

                {flash?.success && (
                    <AnimatedCard>
                        <CardContent className="border-l-4 border-green-500 bg-green-50 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">
                            {flash.success}
                        </CardContent>
                    </AnimatedCard>
                )}

                {/* Coin Costs Section */}
                <AnimatedCard>
                    <CardContent className="space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-lg font-semibold">
                                💰 AI Coin Costs
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Default coin costs per operation. Templates can override with their own cost.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="image_generation" className="text-sm font-medium">
                                    Image Generation
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="image_generation"
                                        type="number"
                                        min={0}
                                        max={1000}
                                        value={costs.image_generation}
                                        onChange={(e) =>
                                            handleChange('image_generation', e.target.value)
                                        }
                                        className="w-[120px] font-mono text-sm"
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        coins per request
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Text → Image generation via Segmind
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="face_swap" className="text-sm font-medium">
                                    Face Swap
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="face_swap"
                                        type="number"
                                        min={0}
                                        max={1000}
                                        value={costs.face_swap}
                                        onChange={(e) =>
                                            handleChange('face_swap', e.target.value)
                                        }
                                        className="w-[120px] font-mono text-sm"
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        coins per request
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Image face swap via Segmind
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="video_face_swap" className="text-sm font-medium">
                                    Video Face Swap
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="video_face_swap"
                                        type="number"
                                        min={0}
                                        max={1000}
                                        value={costs.video_face_swap}
                                        onChange={(e) =>
                                            handleChange('video_face_swap', e.target.value)
                                        }
                                        className="w-[120px] font-mono text-sm"
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        coins per request
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Video face swap via Segmind (takes 5+ minutes)
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 border-t pt-4">
                            <AnimatedButton
                                onClick={handleSave}
                                disabled={saving || !hasChanges}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </AnimatedButton>

                            {hasChanges && (
                                <AnimatedButton
                                    onClick={handleReset}
                                    variant="outline"
                                    disabled={saving}
                                >
                                    Reset
                                </AnimatedButton>
                            )}

                            {hasChanges && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Unsaved changes
                                </p>
                            )}
                        </div>
                    </CardContent>
                </AnimatedCard>

                {/* Info Section */}
                <AnimatedCard>
                    <CardContent className="space-y-3">
                        <h3 className="text-sm font-semibold">ℹ️ How Coin Costs Work</h3>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                            <li>• These are the <strong>default</strong> costs for each operation</li>
                            <li>• Templates can override with their own cost (set in Templates page)</li>
                            <li>• Template-level costs take priority over these defaults</li>
                            <li>• Changes take effect immediately for new requests</li>
                            <li>• Existing generations are not affected by cost changes</li>
                        </ul>
                    </CardContent>
                </AnimatedCard>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Settings', href: admin.settings.index().url }],
};
