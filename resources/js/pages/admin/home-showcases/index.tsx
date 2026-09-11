import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function Index({ showcases }: { showcases: any }) {
    const handleDelete = (item: any) => {
        if (confirm('Are you sure you want to delete this item?')) {
            router.delete(`/admin/home-showcases/${item.id}`, {
                preserveScroll: true,
                onSuccess: () => toast.success('Deleted successfully'),
            });
        }
    };

    return (
        <>
            <Head title="Home Showcases" />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Home Showcases</h1>
                        <p className="text-muted-foreground">Manage your home showcases.</p>
                    </div>
                    <Link href={`/admin/home-showcases/create`}>
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
                                    <TableHead>Section Name</TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Video (MP4, WebM)</TableHead>
                                        <TableHead>Image Fallback</TableHead>
                                        <TableHead>Alignment</TableHead>
                                        <TableHead>Order</TableHead>
                                        <TableHead>Active</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {showcases.data.map((item: any) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.section_name}</TableCell>
                                        <TableCell>{item.title}</TableCell>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell>{item.video_url ? 'Video Uploaded' : 'None'}</TableCell>
                                        <TableCell>{item.image_fallback_url ? <img src={item.image_fallback_url} alt="img" className="h-10 w-10 object-contain rounded" /> : 'None'}</TableCell>
                                        <TableCell>{item.alignment}</TableCell>
                                        <TableCell>{item.order}</TableCell>
                                        <TableCell><Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/admin/home-showcases/${item.id}/edit`}>
                                                    <AnimatedButton variant="outline" size="sm">
                                                        <Pencil className="size-4" />
                                                    </AnimatedButton>
                                                </Link>
                                                <AnimatedButton variant="destructive" size="sm" onClick={() => handleDelete(item)}>
                                                    <Trash2 className="size-4" />
                                                </AnimatedButton>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {showcases.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center h-24">
                                            No home showcases found.
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
    breadcrumbs: [{ title: 'Home Showcases', href: '/admin/home-showcases' }],
};