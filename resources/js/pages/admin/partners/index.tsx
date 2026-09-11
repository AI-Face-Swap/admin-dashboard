import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
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

export default function Index({ partners }: { partners: any }) {
    const handleDelete = (item: any) => {
        if (confirm('Are you sure you want to delete this item?')) {
            router.delete(`/admin/partners/${item.id}`, {
                preserveScroll: true,
                onSuccess: () => toast.success('Deleted successfully'),
            });
        }
    };

    return (
        <>
            <Head title="Partners" />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Partners
                        </h1>
                        <p className="text-muted-foreground">
                            Manage your partners.
                        </p>
                    </div>
                    <Link href={`/admin/partners/create`}>
                        <AnimatedButton>
                            <Plus className="mr-2 size-4" />
                            Add New
                        </AnimatedButton>
                    </Link>
                </div>

                <AnimatedCard>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Logo Image</TableHead>
                                    <TableHead>Website URL</TableHead>
                                    <TableHead>Order</TableHead>
                                    <TableHead>Active</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {partners.data.map((item: any) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell>
                                            {item.logo_url ? (
                                                <img
                                                    src={item.logo_url}
                                                    alt="img"
                                                    className="h-10 w-10 rounded object-contain"
                                                />
                                            ) : (
                                                'None'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {item.website_url}
                                        </TableCell>
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
                                                    href={`/admin/partners/${item.id}/edit`}
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
                                {partners.data.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-24 text-center"
                                        >
                                            No partners found.
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
    breadcrumbs: [{ title: 'Partners', href: '/admin/partners' }],
};
