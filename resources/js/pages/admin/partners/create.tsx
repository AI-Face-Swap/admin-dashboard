import { Head, Link, useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm<any>({
        name: '',
        logo_url: null,
        website_url: '',
        order: 0,
        is_active: true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/partners', {
            forceFormData: true,
            onSuccess: () => toast.success('Created successfully'),
        });
    };

    return (
        <>
            <Head title="Create Partner" />
            <div className="mx-auto max-w-2xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Create Partner
                    </h1>
                </div>

                <form onSubmit={submit}>
                    <AnimatedCard>
                        <CardHeader>
                            <CardTitle>Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">
                                        {errors.name}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="logo_url">Logo Image</Label>
                                <Input
                                    id="logo_url"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                        setData(
                                            'logo_url',
                                            e.target.files
                                                ? e.target.files[0]
                                                : null,
                                        )
                                    }
                                />
                                {typeof data.logo_url === 'string' &&
                                    data.logo_url && (
                                        <div className="mt-2">
                                            <p className="mb-1 text-xs text-muted-foreground">
                                                Current file:
                                            </p>
                                            <img
                                                src={data.logo_url as string}
                                                className="h-32 rounded object-contain"
                                                alt="Current"
                                            />
                                        </div>
                                    )}
                                {errors.logo_url && (
                                    <p className="text-sm text-destructive">
                                        {errors.logo_url}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="website_url">Website URL</Label>
                                <Input
                                    id="website_url"
                                    type="text"
                                    value={data.website_url}
                                    onChange={(e) =>
                                        setData('website_url', e.target.value)
                                    }
                                />
                                {errors.website_url && (
                                    <p className="text-sm text-destructive">
                                        {errors.website_url}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="order">Order</Label>
                                <Input
                                    id="order"
                                    type="number"
                                    value={data.order}
                                    onChange={(e) =>
                                        setData(
                                            'order',
                                            parseInt(e.target.value) || 0,
                                        )
                                    }
                                />
                                {errors.order && (
                                    <p className="text-sm text-destructive">
                                        {errors.order}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Active</Label>
                                <div className="flex h-10 items-center">
                                    <Switch
                                        checked={data.is_active}
                                        onCheckedChange={(checked) =>
                                            setData('is_active', checked)
                                        }
                                    />
                                </div>
                                {errors.is_active && (
                                    <p className="text-sm text-destructive">
                                        {errors.is_active}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-3 border-t pt-4">
                                <AnimatedButton
                                    type="submit"
                                    disabled={processing}
                                >
                                    {processing ? 'Saving...' : 'Save'}
                                </AnimatedButton>
                                <Link href="/admin/partners">
                                    <AnimatedButton
                                        type="button"
                                        variant="outline"
                                    >
                                        Cancel
                                    </AnimatedButton>
                                </Link>
                            </div>
                        </CardContent>
                    </AnimatedCard>
                </form>
            </div>
        </>
    );
}

Create.layout = {
    breadcrumbs: [
        { title: 'Partners', href: '/admin/partners' },
        { title: 'Create', href: '/admin/partners/create' },
    ],
};
