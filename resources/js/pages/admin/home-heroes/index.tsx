import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2, Video } from 'lucide-react';
import { toast } from 'sonner';
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

interface HomeHeroItem {
    id: number;
    title: string;
    description: string | null;
    video: string | null;
    images: string[] | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
}

interface IndexProps {
    heroes: {
        data: HomeHeroItem[];
        current_page: number;
        last_page: number;
        total: number;
    };
}

export default function Index({ heroes }: IndexProps) {
    const handleDelete = (item: HomeHeroItem) => {
        if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
            router.delete(`/admin/home-heroes/${item.id}`, {
                preserveScroll: true,
                onSuccess: () =>
                    toast.success('Hero section deleted successfully'),
            });
        }
    };

    return (
        <>
            <Head title="Home Hero Sections" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading
                        title="Home Hero Sections"
                        description="Manage the top hero section of your landing page."
                    />
                    <div className="flex flex-wrap gap-2">
                        <Link href="/admin/home-heroes">
                            <AnimatedButton variant="secondary">
                                Hero Section
                            </AnimatedButton>
                        </Link>
                        <Link href="/admin/home-showcases">
                            <AnimatedButton variant="outline">
                                Showcases
                            </AnimatedButton>
                        </Link>
                        <Link href="/admin/home-features">
                            <AnimatedButton variant="outline">
                                Features
                            </AnimatedButton>
                        </Link>
                        <Link href="/admin/home-heroes/create">
                            <AnimatedButton>
                                <Plus className="mr-2 size-4" />
                                New Hero Section
                            </AnimatedButton>
                        </Link>
                    </div>
                </div>

                <AnimatedCard>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-20">Sort</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Video</TableHead>
                                    <TableHead>Images</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {heroes.data.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">
                                            {item.sort_order}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate font-semibold">
                                            {item.title}
                                        </TableCell>
                                        <TableCell className="max-w-[240px] truncate text-muted-foreground">
                                            {item.description || '—'}
                                        </TableCell>
                                        <TableCell>
                                            {item.video ? (
                                                <a
                                                    href={item.video}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                                >
                                                    <Video className="size-3.5" />
                                                    View Video
                                                </a>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    None
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {item.images &&
                                            item.images.length > 0 ? (
                                                <div className="flex max-w-[180px] items-center gap-1.5 overflow-x-auto">
                                                    {item.images
                                                        .slice(0, 3)
                                                        .map((imgUrl, idx) => (
                                                            <img
                                                                key={idx}
                                                                src={imgUrl}
                                                                alt={`hero-${idx}`}
                                                                className="h-9 w-9 shrink-0 rounded border border-border object-cover"
                                                            />
                                                        ))}
                                                    {item.images.length > 3 && (
                                                        <Badge
                                                            variant="outline"
                                                            className="shrink-0 text-xs"
                                                        >
                                                            +
                                                            {item.images
                                                                .length - 3}
                                                        </Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    No images
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    item.is_active
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {item.is_active
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    href={`/admin/home-heroes/${item.id}/edit`}
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
                                                        handleDelete(item)
                                                    }
                                                >
                                                    <Trash2 className="size-4" />
                                                </AnimatedButton>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {heroes.data.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            No home hero sections found.
                                        </TableCell>
                                    </TableRow>
                                )}
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
        { title: 'Home Page', href: '/admin/home-heroes' },
        { title: 'Hero Sections', href: '/admin/home-heroes' },
    ],
};
