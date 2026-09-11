import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Role = { id: number; name: string; slug: string };

type AdminUser = {
    id: number;
    name: string;
    email: string;
    roles: Role[];
};

export default function Edit({
    user,
    roles,
}: {
    user: AdminUser;
    roles: Role[];
}) {
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [password, setPassword] = useState('');
    const [selectedRoles, setSelectedRoles] = useState<number[]>(
        user.roles.map((role) => role.id),
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.put(
            `/admin/users/${user.id}`,
            { name, email, password, roles: selectedRoles },
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
            <Head title={`Edit ${user.name}`} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <Heading
                        title={`Edit ${user.name}`}
                        description="Update the admin user and their roles."
                    />
                    <Link href="/admin/users">
                        <AnimatedButton variant="outline">Back</AnimatedButton>
                    </Link>
                </div>

                <AnimatedCard className="max-w-2xl">
                    <CardContent>
                        <form onSubmit={submit} className="space-y-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">
                                    Password{' '}
                                    <span className="text-xs font-normal text-muted-foreground">
                                        (leave empty to keep current)
                                    </span>
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="New password"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label>Roles</Label>
                                <div className="flex flex-wrap gap-4">
                                    {roles.map((role) => (
                                        <label
                                            key={role.id}
                                            className="flex items-center gap-2 text-sm"
                                        >
                                            <Checkbox
                                                checked={selectedRoles.includes(
                                                    role.id,
                                                )}
                                                onCheckedChange={(checked) =>
                                                    setSelectedRoles((prev) =>
                                                        checked
                                                            ? [...prev, role.id]
                                                            : prev.filter(
                                                                  (id) =>
                                                                      id !==
                                                                      role.id,
                                                              ),
                                                    )
                                                }
                                            />
                                            {role.name}
                                        </label>
                                    ))}
                                </div>
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
        { title: 'Users', href: '/admin/users' },
        { title: 'Edit', href: '/admin/users' },
    ],
};
