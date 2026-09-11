import { Head, Link, router } from '@inertiajs/react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
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

type Role = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    permissions_count: number;
    users_count: number;
};

export default function Index({ roles }: { roles: Role[] }) {
    const { can } = usePermissions();

    return (
        <>
            <Head title="Roles" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <Heading
                        title="Roles"
                        description="Roles group permissions and are assigned to admin users."
                    />
                    {can('roles.manage') && (
                        <Link href="/admin/roles/create">
                            <AnimatedButton>Add Role</AnimatedButton>
                        </Link>
                    )}
                </div>

                <AnimatedCard>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Permissions</TableHead>
                                    <TableHead>Users</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {roles.map((role) => (
                                    <TableRow key={role.id}>
                                        <TableCell>
                                            <div className="font-medium">
                                                {role.name}
                                            </div>
                                            {role.description && (
                                                <div className="text-xs text-muted-foreground">
                                                    {role.description}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {role.permissions_count}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {role.users_count}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {can('roles.manage') && (
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={`/admin/roles/${role.id}/edit`}
                                                    >
                                                        <AnimatedButton
                                                            variant="outline"
                                                            size="sm"
                                                        >
                                                            Edit
                                                        </AnimatedButton>
                                                    </Link>
                                                    {role.slug !==
                                                        'super-admin' && (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => {
                                                                if (
                                                                    confirm(
                                                                        `Delete role "${role.name}"?`,
                                                                    )
                                                                ) {
                                                                    router.delete(
                                                                        `/admin/roles/${role.id}`,
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            Delete
                                                        </Button>
                                                    )}
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
    breadcrumbs: [{ title: 'Roles', href: admin.roles.index() }],
};
