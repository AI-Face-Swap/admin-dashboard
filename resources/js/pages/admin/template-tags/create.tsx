import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import admin from '@/routes/admin';

export default function Create() {
    const [name, setName] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.post(
            '/admin/template-tags',
            { name },
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
            <Head title="Create Tag" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <Heading title="Create Tag" description="e.g. superman, anime, football, hd." />
                    <Link href="/admin/template-tags">
                        <AnimatedButton variant="outline">Back</AnimatedButton>
                    </Link>
                </div>

                <AnimatedCard className="max-w-2xl">
                    <CardContent>
                        <form onSubmit={submit} className="space-y-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Tag name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. superman"
                                    required
                                />
                                <InputError message={errors.name} />
                            </div>

                            <AnimatedButton type="submit" disabled={processing}>
                                {processing ? 'Creating...' : 'Create Tag'}
                            </AnimatedButton>
                        </form>
                    </CardContent>
                </AnimatedCard>
            </div>
        </>
    );
}

Create.layout = {
    breadcrumbs: [
        { title: 'Templates', href: admin.templates.index() },
        { title: 'Tags', href: admin.templateTags.index() },
        { title: 'Create', href: admin.templateTags.create() },
    ],
};
