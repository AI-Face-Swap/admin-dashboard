import { Head, Link, router } from '@inertiajs/react';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type AIModel = {
    id: number;
    provider_name: string;
    model_name: string;
    docs_link: string | null;
    sort_order: number;
    description: string | null;
    created_at: string;
};

type Props = {
    aiModels: {
        data: AIModel[];
        current_page: number;
        last_page: number;
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
};

export default function Index({ aiModels }: Props) {
    const handleDelete = (aiModel: AIModel) => {
        if (
            confirm(
                `Delete "${aiModel.provider_name} / ${aiModel.model_name}"? This cannot be undone.`,
            )
        ) {
            router.delete(`/admin/ai-models/${aiModel.id}`);
        }
    };

    return (
        <>
            <Head title="AI Models" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <Heading
                        title="AI Models"
                        description="Manage AI model identifiers used by templates."
                    />
                    <Link href="/admin/ai-models/create">
                        <AnimatedButton>
                            <Plus className="mr-2 size-4" />
                            New AI Model
                        </AnimatedButton>
                    </Link>
                </div>

                <AnimatedCard>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60px]">
                                        Sort
                                    </TableHead>
                                    <TableHead>Provider</TableHead>
                                    <TableHead>Model Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Docs</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {aiModels.data.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            No AI models yet. Create your first
                                            one.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {aiModels.data.map((aiModel) => (
                                    <TableRow key={aiModel.id}>
                                        <TableCell>
                                            <span className="font-mono text-sm font-medium">
                                                {aiModel.sort_order}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {aiModel.provider_name}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-sm">
                                                {aiModel.model_name}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {aiModel.description ? (
                                                <p className="max-w-[260px] truncate text-sm text-muted-foreground">
                                                    {aiModel.description}
                                                </p>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {aiModel.docs_link ? (
                                                <a
                                                    href={aiModel.docs_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                                >
                                                    Docs{' '}
                                                    <ExternalLink className="size-3" />
                                                </a>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    href={`/admin/ai-models/${aiModel.id}/edit`}
                                                >
                                                    <AnimatedButton
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        <Pencil className="size-4" />
                                                    </AnimatedButton>
                                                </Link>
                                                <AnimatedButton
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleDelete(aiModel)
                                                    }
                                                >
                                                    <Trash2 className="size-4" />
                                                </AnimatedButton>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {aiModels.last_page > 1 && (
                            <div className="mt-4 flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    Page {aiModels.current_page} of{' '}
                                    {aiModels.last_page} ({aiModels.total}{' '}
                                    entries)
                                </p>
                                <div className="flex gap-1">
                                    {aiModels.links.map((link, index) => {
                                        const path = link.url
                                            ? new URL(link.url).pathname +
                                              new URL(link.url).search
                                            : '';

                                        return (
                                            <AnimatedButton
                                                key={index}
                                                variant={
                                                    link.active
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                size="sm"
                                                disabled={!link.url}
                                                onClick={() =>
                                                    link.url &&
                                                    router.get(
                                                        path,
                                                        {},
                                                        { preserveState: true },
                                                    )
                                                }
                                                className="h-8 text-xs"
                                            >
                                                {link.label ===
                                                '&laquo; Previous'
                                                    ? '← Prev'
                                                    : link.label ===
                                                        'Next &raquo;'
                                                      ? 'Next →'
                                                      : link.label}
                                            </AnimatedButton>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </AnimatedCard>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'AI Models', href: '/admin/ai-models' }],
};
