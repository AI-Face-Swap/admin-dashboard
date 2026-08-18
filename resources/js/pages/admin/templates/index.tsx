import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { usePermissions } from '@/hooks/use-permissions';
import admin from '@/routes/admin';

type TemplateCategory = { id: number; name: string; slug: string };

type Template = {
    id: number;
    name: string;
    slug: string;
    type: 'image' | 'video';
    file_url: string;
    thumbnail_url: string | null;
    is_active: boolean;
    category: { id: number; name: string } | null;
    tags: { id: number; name: string }[];
};

type Props = {
    templates: {
        data: Template[];
    };
    categories: TemplateCategory[];
    filters: { search?: string; category?: string };
};

export default function Index({ templates, categories, filters }: Props) {
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search ?? '');
    const [category, setCategory] = useState(filters.category ?? 'all');

    const onFilter = (next: { search?: string; category?: string }) => {
        router.get(
            '/admin/templates',
            {
                search: next.search ?? search,
                category: next.category && next.category !== 'all' ? next.category : undefined,
            },
            { preserveState: true, replace: true },
        );
    };

    return (
        <>
            <Head title="Templates" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading
                        title="Templates"
                        description="Face-swap source files. Customers pick these by slug."
                    />
                    {can('templates.manage') && (
                        <div className="flex gap-2">
                            <Link href="/admin/template-categories">
                                <AnimatedButton variant="outline">Categories</AnimatedButton>
                            </Link>
                            <Link href="/admin/template-tags">
                                <AnimatedButton variant="outline">Tags</AnimatedButton>
                            </Link>
                            <Link href="/admin/templates/create">
                                <AnimatedButton>Upload Template</AnimatedButton>
                            </Link>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                        placeholder="Search name, slug, or tag..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            onFilter({ search: e.target.value });
                        }}
                        className="max-w-sm"
                    />
                    <Select
                        value={category}
                        onValueChange={(value) => {
                            setCategory(value);
                            onFilter({ category: value });
                        }}
                    >
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={String(cat.id)}>
                                    {cat.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <AnimatedButton
                        variant="outline"
                        onClick={() => {
                            setSearch('');
                            setCategory('all');
                            onFilter({ search: '', category: 'all' });
                        }}
                    >
                        Reset
                    </AnimatedButton>
                </div>

                {templates.data.length === 0 && (
                    <AnimatedCard>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            No templates found.
                        </CardContent>
                    </AnimatedCard>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {templates.data.map((template) => (
                        <AnimatedCard key={template.id} className="overflow-hidden">
                            <div className="aspect-video bg-muted">
                                {template.thumbnail_url || template.type === 'image' ? (
                                    <img
                                        src={template.thumbnail_url ?? template.file_url}
                                        alt={template.name}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <div className="flex size-full items-center justify-center text-4xl">
                                        🎬
                                    </div>
                                )}
                            </div>
                            <CardContent className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-medium">{template.name}</p>
                                        <p className="font-mono text-xs text-muted-foreground">
                                            {template.slug}
                                        </p>
                                    </div>
                                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                                        {template.is_active ? 'active' : 'hidden'}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline">{template.type}</Badge>
                                    {template.category && (
                                        <span className="text-xs text-muted-foreground">
                                            {template.category.name}
                                        </span>
                                    )}
                                </div>
                                {template.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {template.tags.map((tag) => (
                                            <span
                                                key={tag.id}
                                                className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                                            >
                                                #{tag.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {can('templates.manage') && (
                                    <div className="flex gap-2 pt-1">
                                        <Link href={`/admin/templates/${template.id}/edit`}>
                                            <AnimatedButton variant="outline" size="sm">
                                                Edit
                                            </AnimatedButton>
                                        </Link>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => {
                                                if (confirm(`Delete template "${template.name}"?`)) {
                                                    router.delete(`/admin/templates/${template.id}`);
                                                }
                                            }}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </AnimatedCard>
                    ))}
                </div>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        { title: 'Templates', href: admin.templates.index() },
    ],
};
