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
    generation_type_id: number | null;
    generation_type?: {
        id: number;
        name: string;
        slug: string;
    } | null;
    provider_name: string;
    model_name: string;
    name: string | null;
    coin_cost: number;
    resolution_costs: Record<string, number> | null;
    duration_costs: Record<string, number> | null;
    is_active: boolean;
    is_default: boolean;
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
                `Delete "${aiModel.name || aiModel.model_name}"? This cannot be undone.`,
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
                        description="Manage AI models, dynamic coin pricing, and resolution/duration tiers."
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
                                    <TableHead>Model / Name</TableHead>
                                    <TableHead>Generation Type</TableHead>
                                    <TableHead>Base Cost</TableHead>
                                    <TableHead>Pricing Tiers</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {aiModels.data.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
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
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-foreground">
                                                        {aiModel.name || aiModel.model_name}
                                                    </span>
                                                    {aiModel.is_default && (
                                                        <Badge variant="secondary" className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                            Default
                                                        </Badge>
                                                    )}
                                                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                                        {aiModel.provider_name}
                                                    </Badge>
                                                </div>
                                                <span className="font-mono text-xs text-muted-foreground">
                                                    {aiModel.model_name}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {aiModel.generation_type ? (
                                                <Badge variant="outline" className="text-xs">
                                                    {aiModel.generation_type.name}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className="bg-amber-500/20 text-amber-300 font-semibold hover:bg-amber-500/25 border-amber-500/30">
                                                {aiModel.coin_cost} coins
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 text-xs">
                                                {aiModel.resolution_costs && Object.keys(aiModel.resolution_costs).length > 0 && (
                                                    <div className="flex flex-wrap gap-1 items-center">
                                                        <span className="text-muted-foreground text-[10px]">Res:</span>
                                                        {Object.entries(aiModel.resolution_costs).map(([res, cost]) => (
                                                            <span key={res} className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10px]">
                                                                {res}: {cost}c
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {aiModel.duration_costs && Object.keys(aiModel.duration_costs).length > 0 && (
                                                    <div className="flex flex-wrap gap-1 items-center">
                                                        <span className="text-muted-foreground text-[10px]">Dur:</span>
                                                        {Object.entries(aiModel.duration_costs).map(([dur, cost]) => (
                                                            <span key={dur} className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10px]">
                                                                {dur}: {cost}c
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                {(!aiModel.resolution_costs || Object.keys(aiModel.resolution_costs).length === 0) &&
                                                 (!aiModel.duration_costs || Object.keys(aiModel.duration_costs).length === 0) && (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {aiModel.is_active ? (
                                                <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-muted-foreground">
                                                    Inactive
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {aiModel.docs_link && (
                                                    <a
                                                        href={aiModel.docs_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex size-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:text-foreground"
                                                        title="API Docs"
                                                    >
                                                        <ExternalLink className="size-3.5" />
                                                    </a>
                                                )}
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
