import type { LucideIcon } from 'lucide-react';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import { CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatCardProps = {
    label: string;
    value: string;
    icon: LucideIcon;
    hint?: string;
    iconClassName?: string;
};

export function StatCard({
    label,
    value,
    icon: Icon,
    hint,
    iconClassName,
}: StatCardProps) {
    return (
        <AnimatedCard className="py-5">
            <CardContent className="flex items-start justify-between gap-4 px-5">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                        {label}
                    </p>
                    <p className="text-2xl font-semibold tracking-tight">
                        {value}
                    </p>
                    {hint && (
                        <p className="text-xs text-muted-foreground/80">
                            {hint}
                        </p>
                    )}
                </div>
                <div
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary',
                        iconClassName,
                    )}
                >
                    <Icon className="size-5" />
                </div>
            </CardContent>
        </AnimatedCard>
    );
}
