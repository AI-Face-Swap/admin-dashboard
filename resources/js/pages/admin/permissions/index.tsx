import { Head } from '@inertiajs/react';
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

type Permission = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    roles_count: number;
};

export default function Index({ permissions }: { permissions: Permission[] }) {
    return (
        <>
            <Head title="Permissions" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="Permissions"
                    description="All permissions in the system. Grant them to roles on the roles page."
                />

                <AnimatedCard>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Permission</TableHead>
                                    <TableHead>Slug</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Roles using it</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {permissions.map((permission) => (
                                    <TableRow key={permission.id}>
                                        <TableCell className="font-medium">
                                            {permission.name}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-xs">
                                                {permission.slug}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {permission.description}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {permission.roles_count}
                                            </Badge>
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
    breadcrumbs: [{ title: 'Permissions', href: admin.permissions.index() }],
};
