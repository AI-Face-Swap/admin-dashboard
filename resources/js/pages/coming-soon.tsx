import { Head, Link } from '@inertiajs/react';
import { Construction } from 'lucide-react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import { CardContent } from '@/components/ui/card';
import { dashboard } from '@/routes';

export default function ComingSoon({ title }: { title: string }) {
    return (
        <>
            <Head title={title} />

            <div className="flex h-full flex-1 items-center justify-center p-6">
                <AnimatedCard className="w-full max-w-md py-10 text-center">
                    <CardContent className="flex flex-col items-center gap-3 px-6">
                        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Construction className="size-6" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">
                            Coming soon
                        </p>
                        <h1 className="text-xl font-semibold">{title}</h1>
                        <p className="text-sm text-muted-foreground">
                            This section is part of the roadmap and will be
                            built in a later phase.
                        </p>
                        <Link href={dashboard()} className="mt-2">
                            <AnimatedButton variant="outline">
                                Back to Dashboard
                            </AnimatedButton>
                        </Link>
                    </CardContent>
                </AnimatedCard>
            </div>
        </>
    );
}

ComingSoon.layout = {
    breadcrumbs: [
        {
            title: 'Coming soon',
            href: dashboard(),
        },
    ],
};
