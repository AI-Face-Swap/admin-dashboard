import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { usePermissions } from '@/hooks/use-permissions';
import admin from '@/routes/admin';

type AdminUser = {
    id: number;
    name: string;
    email: string;
    created_at: string;
    roles: { id: number; name: string; slug: string }[];
};

type Props = {
    users: {
        data: AdminUser[];
        links: { url: string | null; label: string; active: boolean }[];
    };
    filters: { search?: string };
};

export default function Index({ users, filters }: Props) {
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search ?? '');

    const onSearch = (value: string) => {
        setSearch(value);

        router.get(
            '/admin/users',
            { search: value },
            { preserveState: true, replace: true },
        );
    };

    return (
        <>
            <Head title="Users" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading
                        title="Users"
                        description="Manage the admin users and their roles."
                    />
                    {can('users.manage') && (
                        <Link href="/admin/users/create">
                            <AnimatedButton>Add Admin User</AnimatedButton>
                        </Link>
                    )}
                </div>

                <AnimatedCard>
                    <CardContent>
                        <div className="mb-4">
                            <Input
                                placeholder="Search by name or email..."
                                value={search}
                                onChange={(e) => onSearch(e.target.value)}
                                className="max-w-sm"
                            />
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Roles</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.data.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            No users found.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {users.data.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.name}
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {user.roles.length === 0 && (
                                                    <span className="text-xs text-muted-foreground">
                                                        No roles
                                                    </span>
                                                )}
                                                {user.roles.map((role) => (
                                                    <Badge
                                                        key={role.id}
                                                        variant="secondary"
                                                    >
                                                        {role.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(
                                                user.created_at,
                                            ).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {can('users.manage') && (
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={`/admin/users/${user.id}/edit`}
                                                    >
                                                        <AnimatedButton
                                                            variant="outline"
                                                            size="sm"
                                                        >
                                                            Edit
                                                        </AnimatedButton>
                                                    </Link>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (
                                                                confirm(
                                                                    'Delete this admin user?',
                                                                )
                                                            ) {
                                                                router.delete(
                                                                    `/admin/users/${user.id}`,
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </AnimatedCard>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Users', href: admin.users.index() }],
};
