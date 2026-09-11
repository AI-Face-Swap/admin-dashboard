import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import admin from '@/routes/admin';

type Slider = {
    id: number;
    title: string;
    description: string | null;
    cta_text: string | null;
    cta_url: string | null;
    file_path: string;
    file_url: string | null;
    type: 'image' | 'video';
    sorting: number;
    is_active: boolean;
    badge: string | null;
};

type Props = {
    slider: Slider;
};

export default function Edit({ slider }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        title: slider.title,
        description: slider.description ?? '',
        cta_text: slider.cta_text ?? '',
        cta_url: slider.cta_url ?? '',
        file: null as File | null,
        type: slider.type,
        sorting: String(slider.sorting),
        is_active: slider.is_active,
        badge: slider.badge ?? '',
        _method: 'PUT',
    });

    const [preview, setPreview] = useState<string | null>(slider.file_url);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/admin/sliders/${slider.id}`);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setData('file', file);

        if (file) {
            const url = URL.createObjectURL(file);
            setPreview(url);

            // Auto-detect type from file
            if (file.type.startsWith('video/')) {
                setData('type', 'video');
            } else {
                setData('type', 'image');
            }
        }
    };

    return (
        <>
            <Head title={`Edit — ${slider.title}`} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <Heading
                    title={`Edit: ${slider.title}`}
                    description="Update slider details."
                />

                <form onSubmit={handleSubmit}>
                    <AnimatedCard>
                        <CardContent className="space-y-6">
                            {/* Title */}
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={(e) =>
                                        setData('title', e.target.value)
                                    }
                                    required
                                />
                                {errors.title && (
                                    <p className="text-sm text-destructive">
                                        {errors.title}
                                    </p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                    rows={3}
                                />
                            </div>

                            {/* Badge */}
                            <div className="space-y-2">
                                <Label htmlFor="badge">Badge</Label>
                                <Input
                                    id="badge"
                                    value={data.badge}
                                    onChange={(e) =>
                                        setData('badge', e.target.value)
                                    }
                                    placeholder="New, Featured, etc."
                                    className="w-[200px]"
                                />
                            </div>

                            {/* CTA */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="cta_text">CTA Text</Label>
                                    <Input
                                        id="cta_text"
                                        value={data.cta_text}
                                        onChange={(e) =>
                                            setData('cta_text', e.target.value)
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cta_url">CTA URL</Label>
                                    <Input
                                        id="cta_url"
                                        value={data.cta_url}
                                        onChange={(e) =>
                                            setData('cta_url', e.target.value)
                                        }
                                    />
                                </div>
                            </div>

                            {/* Type + Sorting + Active */}
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label>Type *</Label>
                                    <Select
                                        value={data.type}
                                        onValueChange={(v) =>
                                            setData(
                                                'type',
                                                v as 'video' | 'image',
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="image">
                                                Image
                                            </SelectItem>
                                            <SelectItem value="video">
                                                Video
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sorting">Sorting *</Label>
                                    <Input
                                        id="sorting"
                                        type="number"
                                        min={0}
                                        max={9999}
                                        value={data.sorting}
                                        onChange={(e) =>
                                            setData('sorting', e.target.value)
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Higher = shows first
                                    </p>
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
                                </div>
                            </div>

                            {/* File Upload */}
                            <div className="space-y-2">
                                <Label>File</Label>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 transition-colors hover:bg-muted">
                                            {preview ? (
                                                data.type === 'video' ? (
                                                    <video
                                                        src={preview}
                                                        className="h-full rounded object-contain"
                                                        muted
                                                        controls
                                                    />
                                                ) : (
                                                    <img
                                                        src={preview}
                                                        alt="Preview"
                                                        className="h-full rounded object-contain"
                                                    />
                                                )
                                            ) : (
                                                <div className="text-center">
                                                    <p className="text-sm text-muted-foreground">
                                                        Click to upload new file
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Leave empty to keep
                                                        current
                                                    </p>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*,video/*"
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Current: {slider.file_path}
                                </p>
                                {errors.file && (
                                    <p className="text-sm text-destructive">
                                        {errors.file}
                                    </p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 border-t pt-4">
                                <AnimatedButton
                                    type="submit"
                                    disabled={processing}
                                >
                                    {processing ? 'Saving...' : 'Save Changes'}
                                </AnimatedButton>
                                <Link href="/admin/sliders">
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
        { title: 'Sliders', href: admin.sliders.index().url },
        { title: 'Edit', href: '#' },
    ],
};
