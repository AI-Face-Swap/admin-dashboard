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

type Tag = {
    id: number;
    name: string;
    slug: string;
    templates_count: number;
};

export default function Index({ tags }: { tags: Tag[] }) {
    const { can } = usePermissions();

    return (
        <>
            <Head title="Template Tags" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading
                        title="Template Tags"
                        description="Searchable keywords — e.g. superman, anime, hd."
                    />
                    {can('templates.manage') && (
                        <Link href="/admin/template-tags/create">
                            <AnimatedButton>Add Tag</AnimatedButton>
                        </Link>
                    )}
                </div>

                <AnimatedCard>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tag</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Templates</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tags.map((tag) => (
                                    <TableRow key={tag.id}>
                                        <TableCell className="font-medium">#{tag.name}</TableCell>
                                        <TableCell className="font-mono text-xs">{tag.slug}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{tag.templates_count}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {can('templates.manage') && (
                                                <div className="flex justify-end gap-2">
                                                    <Link href={`/admin/template-tags/${tag.id}/edit`}>
                                                        <AnimatedButton variant="outline" size="sm">
                                                            Edit
                                                        </AnimatedButton>
                                                    </Link>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (confirm(`Delete tag "${tag.name}"?`)) {
                                                                router.delete(`/admin/template-tags/${tag.id}`);
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
        { title: 'Tags', href: admin.templateTags.index() },
    ],
};
