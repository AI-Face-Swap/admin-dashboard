import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Permission = { id: number; name: string; slug: string };

type Role = {
    id: number;
    name: string;
    description: string | null;
    permissions: Permission[];
};

export default function Edit({ role, permissions }: { role: Role; permissions: Permission[] }) {
    const [name, setName] = useState(role.name);
    const [description, setDescription] = useState(role.description ?? '');
    const [selected, setSelected] = useState<number[]>(
        role.permissions.map((permission) => permission.id),
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const grouped = useMemo(() => {
        return permissions.reduce<Record<string, Permission[]>>((acc, permission) => {
            const group = permission.slug.split('.')[0];
            acc[group] ??= [];
            acc[group].push(permission);

            return acc;
        }, {});
    }, [permissions]);

    const toggle = (id: number) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
        );
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.put(
            `/admin/roles/${role.id}`,
            { name, description, permissions: selected },
            {
                onError: (errs) => {
                    setErrors(errs);
                    setProcessing(false);
                },
                onSuccess: () => setProcessing(false),
            },
        );
    };

    return (
        <>
            <Head title={`Edit ${role.name}`} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <Heading title={`Edit ${role.name}`} description="Update the role and its permissions." />
                    <Link href="/admin/roles">
                        <AnimatedButton variant="outline">Back</AnimatedButton>
                    </Link>
                </div>

                <AnimatedCard className="max-w-2xl">
                    <CardContent>
                        <form onSubmit={submit} className="space-y-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Role name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                />
                            </div>

                            <div className="grid gap-4">
                                <Label>Permissions</Label>
                                {Object.entries(grouped).map(([group, groupPermissions]) => (
                                    <div key={group} className="rounded-lg border p-4">
                                        <p className="mb-2 text-sm font-medium capitalize">{group}</p>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {groupPermissions.map((permission) => (
                                                <label key={permission.id} className="flex items-center gap-2 text-sm">
                                                    <Checkbox
                                                        checked={selected.includes(permission.id)}
                                                        onCheckedChange={() => toggle(permission.id)}
                                                    />
                                                    <span className="font-mono text-xs">{permission.slug}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <AnimatedButton type="submit" disabled={processing}>
                                {processing ? 'Saving...' : 'Save Changes'}
                            </AnimatedButton>
                        </form>
                    </CardContent>
                </AnimatedCard>
            </div>
        </>
    );
}

Edit.layout = {
    breadcrumbs: [
        { title: 'Roles', href: '/admin/roles' },
        { title: 'Edit', href: '/admin/roles' },
    ],
};
