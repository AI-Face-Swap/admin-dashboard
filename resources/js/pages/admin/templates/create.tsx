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

type TemplateCategory = { id: number; name: string; slug: string };
type TemplateTag = { id: number; name: string; slug: string };

export default function Create({
    categories,
    tags,
}: {
    categories: TemplateCategory[];
    tags: TemplateTag[];
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState<string>('');
    const [type, setType] = useState<'image' | 'video'>('image');
    const [file, setFile] = useState<File | null>(null);
    const [thumbnail, setThumbnail] = useState<File | null>(null);
    const [cost, setCost] = useState('0');
    const [model, setModel] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [selectedTags, setSelectedTags] = useState<number[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const toggleTag = (id: number) => {
        setSelectedTags((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
        );
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.post(
            '/admin/templates',
            {
                name,
                description,
                category_id: categoryId || undefined,
                type,
                cost: parseInt(cost, 10) || 0,
                file,
                thumbnail,
                model,
                is_active: isActive,
                tags: selectedTags,
            },
            {
                forceFormData: true,
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
            <Head title="Upload Template" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <Heading
                        title="Upload Template"
                        description="Add a face-swap source file (image or video)."
                    />
                    <Link href="/admin/templates">
                        <AnimatedButton variant="outline">Back</AnimatedButton>
                    </Link>
                </div>

                <AnimatedCard className="max-w-2xl">
                    <CardContent>
                        <form onSubmit={submit} className="space-y-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Template name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Superman Suit"
                                    required
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    placeholder="What customers will see"
                                    rows={2}
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="grid gap-2">
                                    <Label>Type</Label>
                                    <Select
                                        value={type}
                                        onValueChange={(v) =>
                                            setType(v as 'image' | 'video')
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Type" />
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

                                <div className="grid gap-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select
                                        value={categoryId}
                                        onValueChange={setCategoryId}
                                    >
                                        <SelectTrigger id="category">
                                            <SelectValue placeholder="None" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem
                                                    key={cat.id}
                                                    value={String(cat.id)}
                                                >
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="cost">Cost (coins)</Label>
                                    <Input
                                        id="cost"
                                        type="number"
                                        min={0}
                                        value={cost}
                                        onChange={(e) =>
                                            setCost(e.target.value)
                                        }
                                    />
                                    <InputError message={errors.cost} />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="file">
                                    File ({type === 'image' ? 'image' : 'video'}
                                    , max 50 MB)
                                </Label>
                                <Input
                                    id="file"
                                    type="file"
                                    accept={
                                        type === 'image' ? 'image/*' : 'video/*'
                                    }
                                    onChange={(e) =>
                                        setFile(e.target.files?.[0] ?? null)
                                    }
                                    required
                                />
                                <InputError message={errors.file} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="thumbnail">
                                    Thumbnail (optional, max 5 MB)
                                </Label>
                                <Input
                                    id="thumbnail"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                        setThumbnail(
                                            e.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                                <InputError message={errors.thumbnail} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="model">
                                    Segmind model (optional)
                                </Label>
                                <Input
                                    id="model"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    placeholder="e.g. segmind/face-swap-model"
                                />
                                <InputError message={errors.model} />
                            </div>

                            <div className="grid gap-2">
                                <Label>Tags</Label>
                                {tags.length === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        No tags yet —{' '}
                                        <Link
                                            href="/admin/template-tags"
                                            className="underline"
                                        >
                                            create some first
                                        </Link>
                                        .
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag) => (
                                        <label
                                            key={tag.id}
                                            className="flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm"
                                        >
                                            <Checkbox
                                                checked={selectedTags.includes(
                                                    tag.id,
                                                )}
                                                onCheckedChange={() =>
                                                    toggleTag(tag.id)
                                                }
                                            />
                                            <span>{tag.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <Label htmlFor="is-active">Active</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Hidden templates are not offered to
                                        customers.
                                    </p>
                                </div>
                                <Switch
                                    id="is-active"
                                    checked={isActive}
                                    onCheckedChange={setIsActive}
                                />
                            </div>

                            <AnimatedButton type="submit" disabled={processing}>
                                {processing
                                    ? 'Uploading...'
                                    : 'Upload Template'}
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
        { title: 'Upload', href: admin.templates.create() },
    ],
};
