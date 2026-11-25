import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type SliderTemplateOption = {
    id: number;
    name: string;
    slug: string;
};

type DestinationKind = 'none' | 'template' | 'chat' | 'external';

function detectKind(value: string): DestinationKind {
    const trimmed = value.trim();
    if (!trimmed) {
        return 'none';
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
        return 'external';
    }
    const lower = trimmed.toLowerCase().replace(/^\/+|\/+$/g, '');
    if (lower === 'chat' || lower === 'chat-home') {
        return 'chat';
    }
    if (lower.startsWith('templates/') || lower.startsWith('template/')) {
        return 'template';
    }
    return 'external';
}

function extractTemplateSlug(value: string): string {
    const trimmed = value.trim().replace(/^\/+|\/+$/g, '');
    return trimmed.replace(/^templates?\//i, '');
}

type Props = {
    value: string;
    onChange: (nextMobileUrl: string, suggestedWebUrl?: string) => void;
    templates: SliderTemplateOption[];
    error?: string;
};

export function MobileCtaPicker({ value, onChange, templates, error }: Props) {
    const kind = detectKind(value);
    const currentSlug = kind === 'template' ? extractTemplateSlug(value) : '';

    const handleKindChange = (nextKind: DestinationKind) => {
        if (nextKind === 'none') {
            onChange('');
        } else if (nextKind === 'chat') {
            onChange('/chat', '/chat');
        } else if (nextKind === 'template') {
            const firstSlug = templates[0]?.slug ?? '';
            onChange(
                firstSlug ? `/templates/${firstSlug}` : '/templates/',
                firstSlug ? `/templates/${firstSlug}` : undefined,
            );
        } else {
            onChange(
                /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : 'https://',
            );
        }
    };

    return (
        <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
            <div className="flex flex-col gap-1">
                <Label>CTA Mobile Destination (App)</Label>
                <p className="text-xs text-muted-foreground">
                    Supported by HTUT AI app: <code>/templates/&#123;slug&#125;</code>,{' '}
                    <code>/chat</code>, external <code>https://</code> URL, or No action.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label className="text-xs">Destination Type</Label>
                    <Select
                        value={kind}
                        onValueChange={(v) =>
                            handleKindChange(v as DestinationKind)
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No action (Banner only)</SelectItem>
                            <SelectItem value="template">
                                Template Detail (/templates/&#123;slug&#125;)
                            </SelectItem>
                            <SelectItem value="chat">AI Chat Tab (/chat)</SelectItem>
                            <SelectItem value="external">
                                External URL (https://...)
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {kind === 'template' && (
                    <div className="space-y-1.5">
                        <Label className="text-xs">Select Template</Label>
                        <Select
                            value={currentSlug}
                            onValueChange={(slug) =>
                                onChange(
                                    `/templates/${slug}`,
                                    `/templates/${slug}`,
                                )
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a template..." />
                            </SelectTrigger>
                            <SelectContent>
                                {templates.map((tpl) => (
                                    <SelectItem key={tpl.id} value={tpl.slug}>
                                        {tpl.name} ({tpl.slug})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {kind === 'external' && (
                    <div className="space-y-1.5">
                        <Label htmlFor="cta_mobile_url" className="text-xs">
                            External URL
                        </Label>
                        <Input
                            id="cta_mobile_url"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder="https://htut.com/promo"
                        />
                    </div>
                )}
            </div>

            <div className="text-xs text-muted-foreground">
                Value sent to app:{' '}
                <code className="rounded bg-muted px-1.5 py-0.5">
                    {value.trim() ? value.trim() : 'null'}
                </code>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
