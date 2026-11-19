import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type ChatCategory = {
    id: number;
    key: string;
    label_en: string;
    label_my: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

type Props = {
    categories: ChatCategory[];
};

export default function Index({ categories }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ChatCategory | null>(null);

    const form = useForm({
        key: '',
        label_en: '',
        label_my: '',
        sort_order: 0,
        is_active: true,
    });

    const openCreate = () => {
        setEditingCategory(null);
        form.setData({
            key: '',
            label_en: '',
            label_my: '',
            sort_order: categories.length + 1,
            is_active: true,
        });
        form.clearErrors();
        setDialogOpen(true);
    };

    const openEdit = (category: ChatCategory) => {
        setEditingCategory(category);
        form.setData({
            key: category.key,
            label_en: category.label_en,
            label_my: category.label_my,
            sort_order: category.sort_order,
            is_active: category.is_active,
        });
        form.clearErrors();
        setDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCategory) {
            form.put(`/admin/chat-categories/${editingCategory.id}`, {
                preserveScroll: true,
                onSuccess: () => setDialogOpen(false),
            });
        } else {
            form.post('/admin/chat-categories', {
                preserveScroll: true,
                onSuccess: () => setDialogOpen(false),
            });
        }
    };

    const handleToggle = (category: ChatCategory) => {
        router.patch(
            `/admin/chat-categories/${category.id}/toggle`,
            {},
            { preserveScroll: true },
        );
    };

    const handleDelete = (category: ChatCategory) => {
        if (!confirm(`Delete category "${category.label_en}" (${category.key})?`)) {
            return;
        }
        router.delete(`/admin/chat-categories/${category.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Chat Categories" />

            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Heading
                        title="Chat Categories"
                        description="Manage AI chat categories and toggle their visibility for users."
                    />
                    <AnimatedButton onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Category
                    </AnimatedButton>
                </div>

                <AnimatedCard>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-20">Order</TableHead>
                                    <TableHead>Key</TableHead>
                                    <TableHead>English Label</TableHead>
                                    <TableHead>Myanmar Label</TableHead>
                                    <TableHead>Visibility</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="py-10 text-center text-muted-foreground"
                                        >
                                            No chat categories found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    categories.map((category) => (
                                        <TableRow key={category.id}>
                                            <TableCell className="font-mono text-sm">
                                                {category.sort_order}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm font-medium">
                                                {category.key}
                                            </TableCell>
                                            <TableCell>{category.label_en}</TableCell>
                                            <TableCell>{category.label_my}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Switch
                                                        checked={category.is_active}
                                                        onCheckedChange={() =>
                                                            handleToggle(category)
                                                        }
                                                    />
                                                    <Badge
                                                        variant={
                                                            category.is_active
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                    >
                                                        {category.is_active
                                                            ? 'Active'
                                                            : 'Hidden'}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="inline-flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEdit(category)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleDelete(category)
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </AnimatedCard>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? 'Edit Chat Category' : 'Add Chat Category'}
                        </DialogTitle>
                        <DialogDescription>
                            Configure the category key, display labels, sort order, and
                            visibility.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="cat-key">Key (slug)</Label>
                            <Input
                                id="cat-key"
                                value={form.data.key}
                                onChange={(e) => form.setData('key', e.target.value)}
                                placeholder="e.g. astrology, health, education"
                                required
                            />
                            {form.errors.key && (
                                <p className="text-sm text-destructive">{form.errors.key}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cat-label-en">English Label</Label>
                            <Input
                                id="cat-label-en"
                                value={form.data.label_en}
                                onChange={(e) => form.setData('label_en', e.target.value)}
                                placeholder="e.g. Astrology"
                                required
                            />
                            {form.errors.label_en && (
                                <p className="text-sm text-destructive">
                                    {form.errors.label_en}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cat-label-my">Myanmar Label</Label>
                            <Input
                                id="cat-label-my"
                                value={form.data.label_my}
                                onChange={(e) => form.setData('label_my', e.target.value)}
                                placeholder="e.g. ဗေဒင်"
                                required
                            />
                            {form.errors.label_my && (
                                <p className="text-sm text-destructive">
                                    {form.errors.label_my}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cat-sort-order">Sort Order</Label>
                            <Input
                                id="cat-sort-order"
                                type="number"
                                min={0}
                                max={999}
                                value={form.data.sort_order}
                                onChange={(e) =>
                                    form.setData('sort_order', Number(e.target.value))
                                }
                                required
                            />
                            {form.errors.sort_order && (
                                <p className="text-sm text-destructive">
                                    {form.errors.sort_order}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                                <Label htmlFor="cat-active">Active (Visible in Chat)</Label>
                                <p className="text-xs text-muted-foreground">
                                    Toggle off to hide this category from the AI Chat page.
                                </p>
                            </div>
                            <Switch
                                id="cat-active"
                                checked={form.data.is_active}
                                onCheckedChange={(checked) =>
                                    form.setData('is_active', checked)
                                }
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {editingCategory ? 'Save Changes' : 'Create Category'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Chat Categories', href: '/admin/chat-categories' }],
};
