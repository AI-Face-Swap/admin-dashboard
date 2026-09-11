import { Head, Link, useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function Edit({ showcase }: { showcase: any }) {
    const { data, setData, post, processing, errors } = useForm<any>({
        section_name: showcase.section_name || '',
        title: showcase.title || '',
        description: showcase.description || '',
        video_url: showcase.video_url || null,
        image_fallback_url: showcase.image_fallback_url || null,
        alignment: showcase.alignment || '',
        order: showcase.order || '',
        is_active: !!showcase.is_active,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        // Since we are uploading files, we use POST with _method=PUT for Laravel
        post(`/admin/home-showcases/${showcase.id}?_method=PUT`, {
            forceFormData: true,
            onSuccess: () => toast.success('Updated successfully'),
        });
    };

    return (
        <>
            <Head title="Edit HomeShowcase" />
            <div className="mx-auto max-w-2xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Edit HomeShowcase
                    </h1>
                </div>

                <form onSubmit={submit}>
                    <AnimatedCard>
                        <CardHeader>
                            <CardTitle>Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="section_name">
                                    Section Name
                                </Label>
                                <Input
                                    id="section_name"
                                    type="text"
                                    value={data.section_name}
                                    onChange={(e) =>
                                        setData('section_name', e.target.value)
                                    }
                                />
                                {errors.section_name && (
                                    <p className="text-sm text-destructive">
                                        {errors.section_name}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    type="text"
                                    value={data.title}
                                    onChange={(e) =>
                                        setData('title', e.target.value)
                                    }
                                />
                                {errors.title && (
                                    <p className="text-sm text-destructive">
                                        {errors.title}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                    value={data.description}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                    rows={3}
                                />
                                {errors.description && (
                                    <p className="text-sm text-destructive">
                                        {errors.description}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="video_url">
                                    Video (MP4, WebM)
                                </Label>
                                <Input
                                    id="video_url"
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) =>
                                        setData(
                                            'video_url',
                                            e.target.files
                                                ? e.target.files[0]
                                                : null,
                                        )
                                    }
                                />
                                {typeof data.video_url === 'string' &&
                                    data.video_url && (
                                        <div className="mt-2">
                                            <p className="mb-1 text-xs text-muted-foreground">
                                                Current file:
                                            </p>
                                            <video
                                                src={data.video_url as string}
                                                className="h-32 rounded object-contain"
                                                controls
                                            />
                                        </div>
                                    )}
                                {errors.video_url && (
                                    <p className="text-sm text-destructive">
                                        {errors.video_url}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="image_fallback_url">
                                    Image Fallback
                                </Label>
                                <Input
                                    id="image_fallback_url"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                        setData(
                                            'image_fallback_url',
                                            e.target.files
                                                ? e.target.files[0]
                                                : null,
                                        )
                                    }
                                />
                                {typeof data.image_fallback_url === 'string' &&
                                    data.image_fallback_url && (
                                        <div className="mt-2">
                                            <p className="mb-1 text-xs text-muted-foreground">
                                                Current file:
                                            </p>
                                            <img
                                                src={
                                                    data.image_fallback_url as string
                                                }
                                                className="h-32 rounded object-contain"
                                                alt="Current"
                                            />
                                        </div>
                                    )}
                                {errors.image_fallback_url && (
                                    <p className="text-sm text-destructive">
                                        {errors.image_fallback_url}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Alignment</Label>
                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                                    value={data.alignment}
                                    onChange={(e) =>
                                        setData('alignment', e.target.value)
                                    }
                                >
                                    <option value="left">left</option>
                                    <option value="right">right</option>
                                </select>
                                {errors.alignment && (
                                    <p className="text-sm text-destructive">
                                        {errors.alignment}
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
                                    {processing ? 'Saving...' : 'Save Changes'}
                                </AnimatedButton>
                                <Link href="/admin/home-showcases">
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

Edit.layout = {
    breadcrumbs: [
        { title: 'Home Showcases', href: '/admin/home-showcases' },
        { title: 'Edit', href: '#' },
    ],
};
