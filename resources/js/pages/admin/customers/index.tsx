import { Head, Link, router } from '@inertiajs/react';
import { Users, UserCheck, Coins, Ban } from 'lucide-react';
import { useState } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import admin from '@/routes/admin';

type Customer = {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    customer_type: string;
    coins: number;
    is_banned: boolean;
    last_active_at: string | null;
    created_at: string;
    total_generations: number;
};

type Stats = {
    total: number;
    free: number;
    premium: number;
    banned: number;
    total_coins: number;
};

type Props = {
    customers: {
        data: Customer[];
        current_page: number;
        last_page: number;
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    stats: Stats;
    filters: {
        search?: string;
        type?: string;
        status?: string;
        coins_min?: string;
        coins_max?: string;
    };
};

function timeAgo(date: string | null): string {
    if (!date) {
return 'Never';
}

    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

    if (seconds < 60) {
return 'Just now';
}

    if (seconds < 3600) {
return `${Math.floor(seconds / 60)}m ago`;
}

    if (seconds < 86400) {
return `${Math.floor(seconds / 3600)}h ago`;
}

    return `${Math.floor(seconds / 86400)}d ago`;
}

export default function Index({ customers, stats, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [typeFilter, setTypeFilter] = useState(filters.type ?? 'all');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');
    const [coinsMin, setCoinsMin] = useState(filters.coins_min ?? '');
    const [coinsMax, setCoinsMax] = useState(filters.coins_max ?? '');

    const applyFilters = () => {
        const params: Record<string, string> = {};

        if (search) {
params.search = search;
}

        if (typeFilter !== 'all') {
params.type = typeFilter;
}

        if (statusFilter !== 'all') {
params.status = statusFilter;
}

        if (coinsMin) {
params.coins_min = coinsMin;
}

        if (coinsMax) {
params.coins_max = coinsMax;
}

        router.get('/admin/customers', params, { preserveState: true, replace: true });
    };

    const clearFilters = () => {
        setSearch('');
        setTypeFilter('all');
        setStatusFilter('all');
        setCoinsMin('');
        setCoinsMax('');
        router.get('/admin/customers', {}, { preserveState: true, replace: true });
    };

    const handleBan = (customer: Customer) => {
        if (confirm(`Ban "${customer.name}"? They will not be able to login or make API requests.`)) {
            router.patch(`/admin/customers/${customer.id}/ban`);
        }
    };

    const handleUnban = (customer: Customer) => {
        if (confirm(`Unban "${customer.name}"?`)) {
            router.patch(`/admin/customers/${customer.id}/unban`);
        }
    };

    return (
        <>
            <Head title="Customers" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="Customers"
                    description="Manage mobile and web app customers."
                />

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <AnimatedCard>
                        <CardContent className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                                <Users className="size-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.total}</p>
                                <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                        </CardContent>
                    </AnimatedCard>
                    <AnimatedCard>
                        <CardContent className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
                                <UserCheck className="size-5 text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.free}</p>
                                <p className="text-xs text-muted-foreground">Free</p>
                            </div>
                        </CardContent>
                    </AnimatedCard>
                    <AnimatedCard>
                        <CardContent className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
                                <UserCheck className="size-5 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.premium}</p>
                                <p className="text-xs text-muted-foreground">Premium</p>
                            </div>
                        </CardContent>
                    </AnimatedCard>
                    <AnimatedCard>
                        <CardContent className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                                <Coins className="size-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.total_coins.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Total Coins</p>
                            </div>
                        </CardContent>
                    </AnimatedCard>
                    <AnimatedCard>
                        <CardContent className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10">
                                <Ban className="size-5 text-destructive" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.banned}</p>
                                <p className="text-xs text-muted-foreground">Banned</p>
                            </div>
                        </CardContent>
                    </AnimatedCard>
                </div>

                {/* Filters */}
                <AnimatedCard>
                    <CardContent>
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="flex-1 space-y-1 min-w-[200px]">
                                <Label className="text-xs font-medium text-muted-foreground">Search</Label>
                                <Input
                                    placeholder="Name or email..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                    className="font-mono text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="free">Free</SelectItem>
                                        <SelectItem value="premium">Premium</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="banned">Banned</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-medium text-muted-foreground">Coins Min</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={coinsMin}
                                    onChange={(e) => setCoinsMin(e.target.value)}
                                    className="w-[100px] font-mono text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-medium text-muted-foreground">Coins Max</Label>
                                <Input
                                    type="number"
                                    placeholder="99999"
                                    value={coinsMax}
                                    onChange={(e) => setCoinsMax(e.target.value)}
                                    className="w-[100px] font-mono text-xs"
                                />
                            </div>

                            <AnimatedButton onClick={applyFilters} size="sm">
                                Filter
                            </AnimatedButton>

                            <AnimatedButton onClick={clearFilters} variant="outline" size="sm">
                                Clear
                            </AnimatedButton>
                        </div>
                    </CardContent>
                </AnimatedCard>

                {/* Table */}
                <AnimatedCard>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Coins</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Generations</TableHead>
                                    <TableHead>Last Active</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {customers.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            No customers found.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {customers.data.map((customer) => (
                                    <TableRow key={customer.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {customer.avatar ? (
                                                    <img
                                                        src={customer.avatar}
                                                        alt={customer.name}
                                                        className="size-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                                        {customer.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium">{customer.name}</p>
                                                    <p className="text-xs text-muted-foreground">{customer.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={customer.customer_type === 'premium' ? 'default' : 'secondary'}>
                                                {customer.customer_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-sm">🪙 {customer.coins.toLocaleString()}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={customer.is_banned ? 'destructive' : 'outline'}>
                                                {customer.is_banned ? 'Banned' : 'Active'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {customer.total_generations}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {timeAgo(customer.last_active_at)}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(customer.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/admin/customers/${customer.id}`}>
                                                    <AnimatedButton variant="outline" size="sm">
                                                        View
                                                    </AnimatedButton>
                                                </Link>
                                                {customer.is_banned ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleUnban(customer)}
                                                    >
                                                        Unban
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleBan(customer)}
                                                    >
                                                        Ban
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {customers.last_page > 1 && (
                            <div className="mt-4 flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    Page {customers.current_page} of {customers.last_page} ({customers.total} entries)
                                </p>
                                <div className="flex gap-1">
                                    {customers.links.map((link, index) => {
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
    breadcrumbs: [{ title: 'Customers', href: admin.customers.index().url }],
};
