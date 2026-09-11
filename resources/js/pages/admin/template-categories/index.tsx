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

type Category = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
    templates_count: number;
};

export default function Index({ categories }: { categories: Category[] }) {
    const { can } = usePermissions();

    return (
        <>
            <Head title="Template Categories" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading
                        title="Template Categories"
                        description="Group templates — e.g. Superhero, Football, Anime."
                    />
                    {can('templates.manage') && (
                        <Link href="/admin/template-categories/create">
                            <AnimatedButton>Add Category</AnimatedButton>
                        </Link>
                    )}
                </div>

                <AnimatedCard>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Templates</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell>
                                            <div className="font-medium">
                                                {category.name}
                                            </div>
                                            {category.description && (
                                                <div className="text-xs text-muted-foreground">
                                                    {category.description}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {category.slug}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {category.templates_count}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    category.is_active
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {category.is_active
                                                    ? 'active'
                                                    : 'hidden'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {can('templates.manage') && (
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={`/admin/template-categories/${category.id}/edit`}
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
                                                                    `Delete category "${category.name}"?`,
                                                                )
                                                            ) {
                                                                router.delete(
                                                                    `/admin/template-categories/${category.id}`,
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
        { title: 'Templates', href: admin.templates.index() },
        { title: 'Categories', href: admin.templateCategories.index() },
    ],
};
