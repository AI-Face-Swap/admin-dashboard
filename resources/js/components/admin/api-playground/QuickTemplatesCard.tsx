import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ENDPOINT_TEMPLATES } from './endpoint-templates';
import {
    GROUP_COLORS,
    GROUP_LABELS,
    METHOD_COLORS,
    type EndpointTemplate,
} from './types';

interface QuickTemplatesCardProps {
    onApplyTemplate: (template: EndpointTemplate) => void;
}

export function QuickTemplatesCard({
    onApplyTemplate,
}: QuickTemplatesCardProps) {
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

    const grouped = ENDPOINT_TEMPLATES.reduce(
        (acc, t) => {
            (acc[t.group] ??= []).push(t);
            return acc;
        },
        {} as Record<string, EndpointTemplate[]>,
    );

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                    Quick Templates
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-0 pb-2">
                {Object.entries(grouped).map(([group, templates]) => (
                    <Collapsible
                        key={group}
                        open={openGroups.has(group)}
                        onOpenChange={() => {
                            setOpenGroups((prev) => {
                                const next = new Set(prev);
                                if (next.has(group)) {
                                    next.delete(group);
                                } else {
                                    next.add(group);
                                }
                                return next;
                            });
                        }}
                    >
                        <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/50">
                            {openGroups.has(group) ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <Badge
                                variant="outline"
                                className={`text-xs font-semibold tracking-wider uppercase ${GROUP_COLORS[group] ?? ''}`}
                            >
                                {GROUP_LABELS[group] ?? group}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                                {templates.length} endpoint
                                {templates.length !== 1 ? 's' : ''}
                            </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="flex flex-wrap gap-2 border-t px-4 py-3">
                                {templates.map((template) => (
                                    <AnimatedButton
                                        key={template.label}
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            onApplyTemplate(template)
                                        }
                                    >
                                        <Badge
                                            variant="secondary"
                                            className={`mr-2 text-xs ${METHOD_COLORS[template.method]}`}
                                        >
                                            {template.method}
                                        </Badge>
                                        {template.label}
                                    </AnimatedButton>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                ))}
            </CardContent>
        </Card>
    );
}
