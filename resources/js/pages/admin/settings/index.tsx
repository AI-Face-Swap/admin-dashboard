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

type FooterSettings = {
    about_text?: string;
    contact_email?: string;
    social_facebook?: string;
    social_twitter?: string;
    social_discord?: string;
    social_youtube?: string;
    link_terms?: string;
    link_privacy?: string;
    link_faq?: string;
    copyright_text?: string;
};

type Props = {
    coinCosts: CoinCosts;
    footerSettings: FooterSettings;
};

export default function Index({ coinCosts, footerSettings }: Props) {
    const { can } = usePermissions();
    const flash = usePage().props.flash as { success?: string } | undefined;

    const [costs, setCosts] = useState<CoinCosts>(coinCosts);
    const [footer, setFooter] = useState<FooterSettings>(footerSettings || {});
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

    const handleFooterChange = (key: keyof FooterSettings, value: string) => {
        setFooter((prev) => ({
            ...prev,
            [key]: value,
        }));
        setHasChanges(true);
    };

    const handleSave = () => {
        setSaving(true);

        router.put(
            '/admin/settings',
            { coin_costs: costs, footer_settings: footer },
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
        setFooter(footerSettings || {});
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
                                Default coin costs per operation. Templates can
                                override with their own cost.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="image_generation"
                                    className="text-sm font-medium"
                                >
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
                                            handleChange(
                                                'image_generation',
                                                e.target.value,
                                            )
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
                                    <Label
                                        htmlFor="image_to_video_480p"
                                        className="text-sm font-medium"
                                    >
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
                                                handleChange(
                                                    'image_to_video_480p',
                                                    e.target.value,
                                                )
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
                                    <Label
                                        htmlFor="image_to_video_720p"
                                        className="text-sm font-medium"
                                    >
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
                                                handleChange(
                                                    'image_to_video_720p',
                                                    e.target.value,
                                                )
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

                        {/* Footer Settings */}
                        <div className="mt-6 border-t pt-6">
                            <h3 className="mb-4 text-lg font-semibold">
                                Footer Settings
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="about_text">
                                        About Text
                                    </Label>
                                    <textarea
                                        id="about_text"
                                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                        value={footer.about_text || ''}
                                        onChange={(e) =>
                                            handleFooterChange(
                                                'about_text',
                                                e.target.value,
                                            )
                                        }
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact_email">
                                        Contact Email
                                    </Label>
                                    <Input
                                        id="contact_email"
                                        value={footer.contact_email || ''}
                                        onChange={(e) =>
                                            handleFooterChange(
                                                'contact_email',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="copyright_text">
                                        Copyright Text
                                    </Label>
                                    <Input
                                        id="copyright_text"
                                        value={footer.copyright_text || ''}
                                        onChange={(e) =>
                                            handleFooterChange(
                                                'copyright_text',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="social_facebook">
                                            Facebook URL
                                        </Label>
                                        <Input
                                            id="social_facebook"
                                            value={footer.social_facebook || ''}
                                            onChange={(e) =>
                                                handleFooterChange(
                                                    'social_facebook',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="social_twitter">
                                            Twitter URL
                                        </Label>
                                        <Input
                                            id="social_twitter"
                                            value={footer.social_twitter || ''}
                                            onChange={(e) =>
                                                handleFooterChange(
                                                    'social_twitter',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="social_discord">
                                            Discord URL
                                        </Label>
                                        <Input
                                            id="social_discord"
                                            value={footer.social_discord || ''}
                                            onChange={(e) =>
                                                handleFooterChange(
                                                    'social_discord',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="social_youtube">
                                            YouTube URL
                                        </Label>
                                        <Input
                                            id="social_youtube"
                                            value={footer.social_youtube || ''}
                                            onChange={(e) =>
                                                handleFooterChange(
                                                    'social_youtube',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="link_terms">
                                            Terms URL
                                        </Label>
                                        <Input
                                            id="link_terms"
                                            value={footer.link_terms || ''}
                                            onChange={(e) =>
                                                handleFooterChange(
                                                    'link_terms',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="link_privacy">
                                            Privacy URL
                                        </Label>
                                        <Input
                                            id="link_privacy"
                                            value={footer.link_privacy || ''}
                                            onChange={(e) =>
                                                handleFooterChange(
                                                    'link_privacy',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="link_faq">
                                            FAQ URL
                                        </Label>
                                        <Input
                                            id="link_faq"
                                            value={footer.link_faq || ''}
                                            onChange={(e) =>
                                                handleFooterChange(
                                                    'link_faq',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
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
                        <h3 className="text-sm font-semibold">
                            ℹ️ How Coin Costs Work
                        </h3>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                            <li>
                                • These are the <strong>default</strong> costs
                                for each operation
                            </li>
                            <li>
                                • Templates can override with their own cost
                                (set in Templates page)
                            </li>
                            <li>
                                • Template-level costs take priority over these
                                defaults
                            </li>
                            <li>
                                • Changes take effect immediately for new
                                requests
                            </li>
                            <li>
                                • Existing generations are not affected by cost
                                changes
                            </li>
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
