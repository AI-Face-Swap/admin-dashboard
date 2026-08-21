import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import admin from '@/routes/admin';

type Slider = {
    id: number;
    title: string;
    description: string | null;
    cta_text: string | null;
    cta_url: string | null;
    file_path: string;
    file_url: string | null;
    type: 'image' | 'video';
    sorting: number;
    is_active: boolean;
    badge: string | null;
    created_at: string;
};

type Props = {
    sliders: {
        data: Slider[];
        current_page: number;
        last_page: number;
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
};

export default function Index({ sliders }: Props) {
    const handleDelete = (slider: Slider) => {
        if (confirm(`Delete "${slider.title}"? This cannot be undone.`)) {
            router.delete(`/admin/sliders/${slider.id}`);
        }
    };

    return (
        <>
            <Head title="Sliders" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Sliders"
                        description="Manage hero banners for the mobile app."
                    />
                    <Link href="/admin/sliders/create">
                        <AnimatedButton>
                            <Plus className="mr-2 size-4" />
                            New Slider
                        </AnimatedButton>
                    </Link>
                </div>

                <AnimatedCard>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60px]">Sort</TableHead>
                                    <TableHead className="w-[80px]">Preview</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Badge</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>CTA</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sliders.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            No sliders yet. Create your first one.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {sliders.data.map((slider) => (
                                    <TableRow key={slider.id}>
                                        <TableCell>
                                            <span className="font-mono text-sm font-medium">{slider.sorting}</span>
                                        </TableCell>
                                        <TableCell>
                                            {slider.file_url ? (
                                                slider.type === 'video' ? (
                                                    <div className="size-12 overflow-hidden rounded bg-muted">
                                                        <video src={slider.file_url} className="size-full object-cover" muted />
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={slider.file_url}
                                                        alt={slider.title}
                                                        className="size-12 rounded object-cover"
                                                    />
                                                )
                                            ) : (
                                                <div className="flex size-12 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                                                    —
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-medium">{slider.title}</p>
                                            {slider.description && (
                                                <p className="max-w-[200px] truncate text-xs text-muted-foreground">
                                                    {slider.description}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {slider.badge ? (
                                                <Badge variant="secondary">{slider.badge}</Badge>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={slider.type === 'video' ? 'default' : 'outline'}>
                                                {slider.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={slider.is_active ? 'default' : 'secondary'}>
                                                {slider.is_active ? 'Active' : 'Draft'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {slider.cta_text ? (
                                                <span className="text-sm">{slider.cta_text}</span>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/admin/sliders/${slider.id}/edit`}>
                                                    <AnimatedButton variant="outline" size="sm">
                                                        <Pencil className="size-4" />
                                                    </AnimatedButton>
                                                </Link>
                                                <AnimatedButton
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(slider)}
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
                        {sliders.last_page > 1 && (
                            <div className="mt-4 flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    Page {sliders.current_page} of {sliders.last_page} ({sliders.total} entries)
                                </p>
                                <div className="flex gap-1">
                                    {sliders.links.map((link, index) => {
                                        const path = link.url
                                            ? new URL(link.url).pathname + new URL(link.url).search
                                            : '';

                                        return (
                                            <AnimatedButton
                                                key={index}
                                                variant={link.active ? 'default' : 'outline'}
                                                size="sm"
                                                disabled={!link.url}
                                                onClick={() => link.url && router.get(path, {}, { preserveState: true })}
                                                className="h-8 text-xs"
                                            >
                                                {link.label === '&laquo; Previous'
                                                    ? '← Prev'
                                                    : link.label === 'Next &raquo;'
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
    breadcrumbs: [{ title: 'Sliders', href: admin.sliders.index().url }],
};
