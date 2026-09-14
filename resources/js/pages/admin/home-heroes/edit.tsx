import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Plus, Trash2, Upload, Video } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface HomeHeroItem {
    id: number;
    title: string;
    description: string | null;
    video: string | null;
    images: string[] | null;
    sort_order: number;
    is_active: boolean;
}

export default function Edit({ hero }: { hero: HomeHeroItem }) {
    const [videoMode, setVideoMode] = useState<'upload' | 'url'>('upload');
    const { data, setData, processing, errors } = useForm<{
        title: string;
        description: string;
        video: string;
        video_file: File | null;
        images: string[];
        image_files: File[];
        sort_order: number;
        is_active: boolean;
    }>({
        title: hero.title || '',
        description: hero.description || '',
        video: hero.video || '',
        video_file: null,
        images: hero.images && hero.images.length > 0 ? hero.images : [''],
        image_files: [],
        sort_order: hero.sort_order ?? 0,
        is_active: Boolean(hero.is_active),
    });

    const handleAddImageUrl = () => {
        setData('images', [...data.images, '']);
    };

    const handleRemoveImageUrl = (index: number) => {
        const updated = data.images.filter((_, i) => i !== index);
        setData('images', updated.length === 0 ? [''] : updated);
    };

    const handleImageUrlChange = (index: number, val: string) => {
        const updated = [...data.images];
        updated[index] = val;
        setData('images', updated);
    };

    const handleImageFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setData('image_files', Array.from(e.target.files));
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        // Since HTML forms cannot send multipart PUT directly, use POST with _method = 'PUT'
        const formData = new FormData();
        formData.append('_method', 'PUT');
        formData.append('title', data.title);
        if (data.description) formData.append('description', data.description);
        formData.append('sort_order', data.sort_order.toString());
        formData.append('is_active', data.is_active ? '1' : '0');

        if (data.video_file) {
            formData.append('video_file', data.video_file);
        } else if (data.video) {
            formData.append('video', data.video);
        }

        data.images
            .filter((img) => img.trim() !== '')
            .forEach((img) => {
                formData.append('images[]', img);
            });

        data.image_files.forEach((file) => {
            formData.append('image_files[]', file);
        });

        router.post(`/admin/home-heroes/${hero.id}`, formData, {
            onSuccess: () => toast.success('Hero section updated successfully'),
        });
    };

    return (
        <>
            <Head title={`Edit Hero Section - ${hero.title}`} />
            <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
                <div className="flex items-center gap-4">
                    <Link href="/admin/home-heroes">
                        <AnimatedButton variant="outline" size="sm">
                            <ArrowLeft className="mr-1 size-4" />
                            Back
                        </AnimatedButton>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Edit Home Hero Section
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Update details, video, and image assets.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <AnimatedCard>
                        <CardHeader>
                            <CardTitle>Content Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">
                                    Title{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
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

                            <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="sort_order">
                                        Sort Order
                                    </Label>
                                    <Input
                                        id="sort_order"
                                        type="number"
                                        value={data.sort_order}
                                        onChange={(e) =>
                                            setData(
                                                'sort_order',
                                                parseInt(e.target.value) || 0,
                                            )
                                        }
                                    />
                                    {errors.sort_order && (
                                        <p className="text-sm text-destructive">
                                            {errors.sort_order}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col justify-end space-y-2">
                                    <Label htmlFor="is_active">Status</Label>
                                    <div className="flex h-10 items-center gap-3">
                                        <Switch
                                            id="is_active"
                                            checked={data.is_active}
                                            onCheckedChange={(checked) =>
                                                setData('is_active', checked)
                                            }
                                        />
                                        <span className="text-sm">
                                            {data.is_active
                                                ? 'Active (Visible)'
                                                : 'Inactive (Hidden)'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </AnimatedCard>

                    <AnimatedCard>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Video className="size-5" />
                                    Hero Video
                                </CardTitle>
                                <div className="flex rounded-lg border border-border p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setVideoMode('upload')}
                                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                            videoMode === 'upload'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Upload File
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setVideoMode('url')}
                                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                            videoMode === 'url'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        Direct URL
                                    </button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {hero.video && (
                                <div className="rounded-md border border-border bg-muted/30 p-3">
                                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                                        Current Video:
                                    </p>
                                    <a
                                        href={hero.video}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block truncate text-xs text-primary underline"
                                    >
                                        {hero.video}
                                    </a>
                                </div>
                            )}

                            {videoMode === 'upload' ? (
                                <div className="space-y-2">
                                    <Label htmlFor="video_file">
                                        Upload New Video (MP4, WebM, MOV - Max
                                        50MB)
                                    </Label>
                                    <Input
                                        id="video_file"
                                        type="file"
                                        accept="video/mp4,video/webm,video/quicktime"
                                        onChange={(e) =>
                                            setData(
                                                'video_file',
                                                e.target.files
                                                    ? e.target.files[0]
                                                    : null,
                                            )
                                        }
                                    />
                                    {errors.video_file && (
                                        <p className="text-sm text-destructive">
                                            {errors.video_file}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor="video">Video URL</Label>
                                    <Input
                                        id="video"
                                        type="url"
                                        value={data.video}
                                        onChange={(e) =>
                                            setData('video', e.target.value)
                                        }
                                    />
                                    {errors.video && (
                                        <p className="text-sm text-destructive">
                                            {errors.video}
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </AnimatedCard>

                    <AnimatedCard>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Upload className="size-5" />
                                    Hero Images
                                </CardTitle>
                                <AnimatedButton
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddImageUrl}
                                >
                                    <Plus className="mr-1 size-3.5" />
                                    Add Image URL
                                </AnimatedButton>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="image_files">
                                    Upload Additional Image Files
                                </Label>
                                <Input
                                    id="image_files"
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleImageFilesChange}
                                />
                                {data.image_files.length > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        {data.image_files.length} new file(s)
                                        selected
                                    </p>
                                )}
                            </div>

                            <div className="space-y-3 pt-2">
                                <Label>Current Image URLs</Label>
                                {data.images.map((url, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-2"
                                    >
                                        {url && url.startsWith('http') && (
                                            <img
                                                src={url}
                                                alt={`preview-${idx}`}
                                                className="h-9 w-9 shrink-0 rounded border border-border object-cover"
                                            />
                                        )}
                                        <Input
                                            type="url"
                                            placeholder="https://example.com/banner.webp"
                                            value={url}
                                            onChange={(e) =>
                                                handleImageUrlChange(
                                                    idx,
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <AnimatedButton
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() =>
                                                handleRemoveImageUrl(idx)
                                            }
                                        >
                                            <Trash2 className="size-4" />
                                        </AnimatedButton>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </AnimatedCard>

                    <div className="flex justify-end gap-3">
                        <Link href="/admin/home-heroes">
                            <AnimatedButton variant="outline" type="button">
                                Cancel
                            </AnimatedButton>
                        </Link>
                        <AnimatedButton type="submit" disabled={processing}>
                            {processing ? 'Saving...' : 'Update Hero Section'}
                        </AnimatedButton>
                    </div>
                </form>
            </div>
        </>
    );
}

Edit.layout = {
    breadcrumbs: [
        { title: 'Home Page', href: '/admin/home-heroes' },
        { title: 'Hero Sections', href: '/admin/home-heroes' },
        { title: 'Edit', href: '#' },
    ],
};
