import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Ban,
    CheckCircle,
    Clock,
    Coins,
    CreditCard,
    Images,
    Mail,
    ShieldCheck,
    Trash2,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

type Customer = {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    auth_provider: string | null;
    customer_type: string;
    coins: number;
    is_banned: boolean;
    email_verified_at: string | null;
    last_active_at: string | null;
    created_at: string;
    generations_count: number;
};

type Generation = {
    id: number;
    operation: string;
    status: string;
    cost: string | null;
    currency: string | null;
    duration_ms: number | null;
    created_at: string;
    template: { id: number; name: string; slug: string } | null;
};

type GenerationStats = {
    total: number;
    completed: number;
    failed: number;
    processing: number;
};

type PaginatedGenerations = {
    data: Generation[];
    current_page: number;
    last_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
};

type Props = {
    customer: Customer;
    generations: PaginatedGenerations;
    generationStats: GenerationStats;
    totalCost: number;
    totalCoinsSpent: number;
};

export default function Show({
    customer,
    generations,
    generationStats,
    totalCoinsSpent,
}: Omit<Props, 'totalCost'>) {
    const [showCoinDialog, setShowCoinDialog] = useState(false);
    const [coinAmount, setCoinAmount] = useState('');
    const [coinNote, setCoinNote] = useState('');
    const [coinLoading, setCoinLoading] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleAddCoins = () => {
        if (!coinAmount || parseInt(coinAmount) <= 0) {
return;
}

        setCoinLoading(true);

        router.post(
            `/admin/customers/${customer.id}/add-coins`,
            { amount: parseInt(coinAmount), note: coinNote || null },
            {
                onSuccess: () => {
                    setShowCoinDialog(false);
                    setCoinAmount('');
                    setCoinNote('');
                },
                onFinish: () => setCoinLoading(false),
            },
        );
    };

    const handleBan = () => {
        if (confirm(`Ban "${customer.name}"? They will not be able to login or make API requests.`)) {
            router.patch(`/admin/customers/${customer.id}/ban`);
        }
    };

    const handleUnban = () => {
        if (confirm(`Unban "${customer.name}"?`)) {
            router.patch(`/admin/customers/${customer.id}/unban`);
        }
    };

    const handleDelete = () => {
        router.delete(`/admin/customers/${customer.id}`);
        setShowDeleteDialog(false);
    };

    return (
        <>
            <Head title={`Customer — ${customer.name}`} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <AnimatedButton
                        variant="ghost"
                        size="sm"
                        onClick={() => router.get('/admin/customers')}
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" /> Back
                    </AnimatedButton>
                    <Heading
                        title={customer.name}
                        description={customer.email}
                    />
                </div>

                <div className="grid gap-6 xl:grid-cols-3">
                    {/* Profile Card */}
                    <AnimatedCard className="xl:col-span-1">
                        <CardContent className="space-y-4">
                            {/* Avatar + Name */}
                            <div className="flex items-center gap-4">
                                {customer.avatar ? (
                                    <img
                                        src={customer.avatar}
                                        alt={customer.name}
                                        className="size-16 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="flex size-16 items-center justify-center rounded-full bg-muted text-2xl font-bold">
                                        {customer.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-lg font-semibold">{customer.name}</h3>
                                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                                </div>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2">
                                <Badge variant={customer.customer_type === 'premium' ? 'default' : 'secondary'}>
                                    {customer.customer_type}
                                </Badge>
                                <Badge variant={customer.is_banned ? 'destructive' : 'outline'}>
                                    {customer.is_banned ? 'Banned' : 'Active'}
                                </Badge>
                                {customer.auth_provider && (
                                    <Badge variant="outline">{customer.auth_provider}</Badge>
                                )}
                            </div>

                            {/* Info */}
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <Coins className="size-4 text-muted-foreground" />
                                    <span>🪙 {customer.coins.toLocaleString()} coins</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="size-4 text-muted-foreground" />
                                    <span>
                                        Email:{' '}
                                        {customer.email_verified_at ? (
                                            <span className="text-emerald-500">Verified ✅</span>
                                        ) : (
                                            <span className="text-amber-500">Not verified ❌</span>
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="size-4 text-muted-foreground" />
                                    <span>Last active: {customer.last_active_at ? new Date(customer.last_active_at).toLocaleString() : 'Never'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="size-4 text-muted-foreground" />
                                    <span>Joined: {new Date(customer.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2 pt-2">
                                <AnimatedButton onClick={() => setShowCoinDialog(true)}>
                                    <Coins className="mr-1 h-4 w-4" /> Add Coins
                                </AnimatedButton>
                                {customer.is_banned ? (
                                    <AnimatedButton variant="outline" onClick={handleUnban}>
                                        Unban Customer
                                    </AnimatedButton>
                                ) : (
                                    <Button variant="destructive" onClick={handleBan}>
                                        <Ban className="mr-1 h-4 w-4" /> Ban Customer
                                    </Button>
                                )}
                                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                                </Button>
                            </div>
                        </CardContent>
                    </AnimatedCard>

                    {/* Right column — Stats + Generations */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* Stats */}
                        <div className="grid gap-4 sm:grid-cols-4">
                            <AnimatedCard>
                                <CardContent className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                                        <Images className="size-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{generationStats.total}</p>
                                        <p className="text-xs text-muted-foreground">Generations</p>
                                    </div>
                                </CardContent>
                            </AnimatedCard>
                            <AnimatedCard>
                                <CardContent className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
                                        <CheckCircle className="size-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{generationStats.completed}</p>
                                        <p className="text-xs text-muted-foreground">Completed</p>
                                    </div>
                                </CardContent>
                            </AnimatedCard>
                            <AnimatedCard>
                                <CardContent className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10">
                                        <XCircle className="size-5 text-destructive" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{generationStats.failed}</p>
                                        <p className="text-xs text-muted-foreground">Failed</p>
                                    </div>
                                </CardContent>
                            </AnimatedCard>
                            <AnimatedCard>
                                <CardContent className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                                        <Coins className="size-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">🪙 {totalCoinsSpent}</p>
                                        <p className="text-xs text-muted-foreground">Coins Spent</p>
                                    </div>
                                </CardContent>
                            </AnimatedCard>
                        </div>

                        {/* Recent Generations */}
                        <AnimatedCard>
                            <CardContent>
                                <p className="mb-3 font-medium">Recent Generations</p>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Operation</TableHead>
                                            <TableHead>Template</TableHead>
                                            <TableHead>Cost</TableHead>
                                            <TableHead>Duration</TableHead>
                                            <TableHead>Created</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {generations.data.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                    No generations yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {generations.data.map((gen) => (
                                            <TableRow key={gen.id}>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            gen.status === 'completed'
                                                                ? 'default'
                                                                : gen.status === 'failed'
                                                                  ? 'destructive'
                                                                  : 'secondary'
                                                        }
                                                    >
                                                        {gen.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">{gen.operation}</TableCell>
                                                <TableCell className="text-sm">{gen.template?.name ?? '—'}</TableCell>
                                                <TableCell className="text-sm">
                                                    {gen.cost ? `${gen.cost} ${gen.currency ?? ''}` : '—'}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {gen.duration_ms ? `${gen.duration_ms}ms` : '—'}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(gen.created_at).toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* Pagination */}
                                {generations.last_page > 1 && (
                                    <div className="mt-4 flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">
                                            Page {generations.current_page} of {generations.last_page}
                                        </p>
                                        <div className="flex gap-1">
                                            {generations.links.map((link, index) => {
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

                        {/* Payment Logs Placeholder */}
                        <AnimatedCard>
                            <CardContent>
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <CreditCard className="size-5" />
                                    <div>
                                        <p className="font-medium">Payment Logs</p>
                                        <p className="text-sm">Coin request payment logs coming soon (KBZ, Stripe integration).</p>
                                    </div>
                                </div>
                            </CardContent>
                        </AnimatedCard>
                    </div>
                </div>
            </div>

            {/* Add Coins Dialog */}
            <Dialog open={showCoinDialog} onOpenChange={setShowCoinDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Coins</DialogTitle>
                        <DialogDescription>
                            Add coins to {customer.name}'s balance. Current balance: 🪙 {customer.coins.toLocaleString()}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input
                                type="number"
                                min="1"
                                max="100000"
                                placeholder="Enter coin amount"
                                value={coinAmount}
                                onChange={(e) => setCoinAmount(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Note (optional)</Label>
                            <Textarea
                                placeholder="Reason for adding coins..."
                                value={coinNote}
                                onChange={(e) => setCoinNote(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <AnimatedButton variant="outline" onClick={() => setShowCoinDialog(false)}>
                            Cancel
                        </AnimatedButton>
                        <AnimatedButton onClick={handleAddCoins} disabled={coinLoading || !coinAmount}>
                            {coinLoading ? 'Adding...' : 'Add Coins'}
                        </AnimatedButton>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Customer</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{customer.name}"? This will revoke all active tokens and cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <AnimatedButton variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </AnimatedButton>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete Customer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

Show.layout = {
    breadcrumbs: [{ title: 'Customers', href: '/admin/customers' }],
};
