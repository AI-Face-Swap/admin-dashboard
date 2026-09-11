import { Head, Link, router } from '@inertiajs/react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { usePermissions } from '@/hooks/use-permissions';
import admin from '@/routes/admin';

type Provider = {
    id: number;
    name: string;
};

type GenerationType = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    default_provider?: Provider | null;
};

export default function Index({
    generationTypes,
}: {
    generationTypes: GenerationType[];
}) {
    const { can } = usePermissions();

    return (
        <>
            <Head title="Generation Types" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading
                        title="Generation Types"
                        description="Manage AI capabilities like Image Face Swap, Image to Video, etc."
                    />
                    {can('settings.manage') && (
                        <Link href={admin.generationTypes.create()}>
                            <AnimatedButton>Add Type</AnimatedButton>
                        </Link>
                    )}
                </div>

                <AnimatedCard>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Provider</TableHead>
                                    <TableHead>Order</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {generationTypes.map((type) => (
                                    <TableRow key={type.id}>
                                        <TableCell>
                                            <div className="font-medium">
                                                {type.name}
                                            </div>
                                            {type.description && (
                                                <div className="text-xs text-muted-foreground">
                                                    {type.description}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {type.slug}
                                        </TableCell>
                                        <TableCell>
                                            {type.default_provider ? (
                                                <Badge variant="outline">
                                                    {type.default_provider.name}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    None
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>{type.sort_order}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    type.is_active
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {type.is_active
                                                    ? 'active'
                                                    : 'hidden'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {can('settings.manage') && (
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={admin.generationTypes.edit(
                                                            {
                                                                generationType:
                                                                    type.id,
                                                            },
                                                        )}
                                                    >
                                                        <AnimatedButton
                                                            variant="outline"
                                                            size="sm"
                                                        >
                                                            Edit
                                                        </AnimatedButton>
                                                    </Link>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (
                                                                confirm(
                                                                    `Delete generation type "${type.name}"?`,
                                                                )
                                                            ) {
                                                                router.delete(
                                                                    admin.generationTypes.destroy(
                                                                        {
                                                                            generationType:
                                                                                type.id,
                                                                        },
                                                                    ),
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </AnimatedCard>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Settings', href: admin.settings.index() },
        { title: 'Generation Types', href: admin.generationTypes.index() },
    ],
};
