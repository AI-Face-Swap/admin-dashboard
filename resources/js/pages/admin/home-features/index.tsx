import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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

export default function Index({ features }: { features: any }) {
    const handleDelete = (item: any) => {
        if (confirm('Are you sure you want to delete this item?')) {
            router.delete(`/admin/home-features/${item.id}`, {
                preserveScroll: true,
                onSuccess: () => toast.success('Deleted successfully'),
            });
        }
    };

    return (
        <>
            <Head title="Home Features" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading
                        title="Home Features"
                        description="Manage your home page features."
                    />
                    <div className="flex gap-2">
                        <Link href={`/admin/home-showcases`}>
                            <AnimatedButton variant="outline">
                                Showcases
                            </AnimatedButton>
                        </Link>
                        <Link href={`/admin/home-features/create`}>
                            <AnimatedButton>
                                <Plus className="mr-2 size-4" />
                                New Feature
                            </AnimatedButton>
                        </Link>
                    </div>
                </div>

                <AnimatedCard>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Icon Image</TableHead>
                                    <TableHead>Video</TableHead>
                                    <TableHead>AI Model</TableHead>
                                    <TableHead>Link</TableHead>
                                    <TableHead>Order</TableHead>
                                    <TableHead>Active</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {features.data.map((item: any) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.title}</TableCell>
                                        <TableCell>
                                            {item.description}
                                        </TableCell>
                                        <TableCell>
                                            {item.icon_url ? (
                                                <img
                                                    src={item.icon_url}
                                                    alt="img"
                                                    className="h-10 w-10 rounded object-contain"
                                                />
                                            ) : (
                                                'None'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {item.video_url ? (
                                                <video
                                                    src={item.video_url}
                                                    className="h-10 w-10 rounded object-contain"
                                                    controls
                                                />
                                            ) : (
                                                'None'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {item.ai_model
                                                ? `${item.ai_model.provider_name} / ${item.ai_model.model_name}`
                                                : '—'}
                                        </TableCell>
                                        <TableCell>{item.link}</TableCell>
                                        <TableCell>{item.order}</TableCell>
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
                                                    href={`/admin/home-features/${item.id}/edit`}
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
                                {features.data.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="h-24 text-center"
                                        >
                                            No home features found.
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
        { title: 'Home', href: '/admin/home-showcases' },
        { title: 'Features', href: '/admin/home-features' },
    ],
};
