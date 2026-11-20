import { Head, useForm } from '@inertiajs/react';
import { ExternalLink, KeyRound, ShieldCheck } from 'lucide-react';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type Props = {
    enabled: boolean;
    has_password: boolean;
    docs_url: string;
    unlock_url: string;
};

export default function ApiDocsSettings({ enabled, has_password, docs_url, unlock_url }: Props) {
    const form = useForm({
        enabled,
        password: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put('/admin/settings/api-docs', {
            preserveScroll: true,
            onSuccess: () => {
                form.setData('password', '');
            },
        });
    };

    return (
        <>
            <Head title="API Docs Access" />

            <div className="space-y-6 max-w-2xl">
                <Heading
                    title="API Docs Access"
                    description="Control public password-protected access to /docs/api and /docs/api.json for mobile developers."
                />

                <AnimatedCard>
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="api-docs-enabled" className="text-base font-semibold">
                                            Enable Public Endpoint
                                        </Label>
                                        <Badge variant={enabled ? 'default' : 'secondary'}>
                                            {enabled ? 'Enabled' : 'Disabled'}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        When disabled, /docs/api and /docs/api.json return 403 Forbidden and all active developer sessions are revoked.
                                    </p>
                                </div>
                                <Switch
                                    id="api-docs-enabled"
                                    checked={form.data.enabled}
                                    onCheckedChange={(checked) => form.setData('enabled', checked)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="api-docs-password" className="inline-flex items-center gap-1.5">
                                    <KeyRound className="h-4 w-4" />
                                    Set Docs Access Password
                                </Label>
                                <Input
                                    id="api-docs-password"
                                    type="password"
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                    placeholder={
                                        has_password
                                            ? 'Leave blank to keep current password, or enter a new password'
                                            : 'Enter access password for mobile developers...'
                                    }
                                />
                                {form.errors.password && (
                                    <p className="text-xs text-destructive">{form.errors.password}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Changing the password immediately logs out all existing developer sessions.
                                </p>
                            </div>

                            <div className="rounded-xl border bg-muted/40 p-4 space-y-2 text-xs">
                                <div className="flex items-center gap-1.5 font-medium">
                                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                    <span>Developer Links</span>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-muted-foreground">Docs URL: {docs_url}</span>
                                    <a
                                        href={docs_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:underline"
                                    >
                                        Open <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                                <div className="text-muted-foreground">Unlock URL: {unlock_url}</div>
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={form.processing}>
                                    Save Settings
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </AnimatedCard>
            </div>
        </>
    );
}
