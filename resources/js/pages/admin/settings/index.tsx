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
    image_to_video_480p: number;
    image_to_video_720p: number;
    // face_swap and video_face_swap use template.cost, not global setting
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

                            <div className="border-t pt-4">
                                <p className="mb-3 text-sm font-medium text-muted-foreground">
                                    Image to Video (Wan 2.2 I2V Flash)
                                </p>

                                <div className="space-y-2">
                                    <Label htmlFor="image_to_video_480p" className="text-sm font-medium">
                                        480p Resolution
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="image_to_video_480p"
                                            type="number"
                                            min={0}
                                            max={1000}
                                            value={costs.image_to_video_480p}
                                            onChange={(e) =>
                                                handleChange('image_to_video_480p', e.target.value)
                                            }
                                            className="w-[120px] font-mono text-sm"
                                        />
                                        <span className="text-sm text-muted-foreground">
                                            coins per request
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Faster generation, lower quality
                                    </p>
                                </div>

                                <div className="mt-3 space-y-2">
                                    <Label htmlFor="image_to_video_720p" className="text-sm font-medium">
                                        720p Resolution
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="image_to_video_720p"
                                            type="number"
                                            min={0}
                                            max={1000}
                                            value={costs.image_to_video_720p}
                                            onChange={(e) =>
                                                handleChange('image_to_video_720p', e.target.value)
                                            }
                                            className="w-[120px] font-mono text-sm"
                                        />
                                        <span className="text-sm text-muted-foreground">
                                            coins per request
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Higher quality, slower generation
                                    </p>
                                </div>
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
