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

type Template = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    type: 'image' | 'video';
    file_path: string;
    thumbnail_path: string | null;
    model: string | null;
    is_active: boolean;
    category: { id: number; name: string } | null;
    tags: { id: number; name: string }[];
};

export default function Edit({
    template,
    categories,
    tags,
}: {
    template: Template;
    categories: TemplateCategory[];
    tags: TemplateTag[];
}) {
    const [name, setName] = useState(template.name);
    const [description, setDescription] = useState(template.description ?? '');
    const [categoryId, setCategoryId] = useState(
        template.category ? String(template.category.id) : '',
    );
    const [type, setType] = useState<'image' | 'video'>(template.type);
    const [file, setFile] = useState<File | null>(null);
    const [thumbnail, setThumbnail] = useState<File | null>(null);
    const [model, setModel] = useState(template.model ?? '');
    const [isActive, setIsActive] = useState(template.is_active);
    const [selectedTags, setSelectedTags] = useState<number[]>(
        template.tags.map((t) => t.id),
    );
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

        router.put(
            `/admin/templates/${template.id}`,
            {
                name,
                description,
                category_id: categoryId || undefined,
                type,
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
            <Head title={`Edit ${template.name}`} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-between">
                    <Heading title={`Edit ${template.name}`} description={template.slug} />
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

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label>Type</Label>
                                    <Select value={type} onValueChange={(v) => setType(v as 'image' | 'video')}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="image">Image</SelectItem>
                                            <SelectItem value="video">Video</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select value={categoryId} onValueChange={setCategoryId}>
                                        <SelectTrigger id="category">
                                            <SelectValue placeholder="None" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={String(cat.id)}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="file">
                                    Replace file (optional, max 50 MB)
                                </Label>
                                <Input
                                    id="file"
                                    type="file"
                                    accept={type === 'image' ? 'image/*' : 'video/*'}
                                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Current: {template.file_path}
                                </p>
                                <InputError message={errors.file} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="thumbnail">
                                    Replace thumbnail (optional, max 5 MB)
                                </Label>
                                <Input
                                    id="thumbnail"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)}
                                />
                                <InputError message={errors.thumbnail} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="model">Segmind model (optional)</Label>
                                <Input
                                    id="model"
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    placeholder="e.g. segmind/face-swap-model"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>Tags</Label>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag) => (
                                        <label
                                            key={tag.id}
                                            className="flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm"
                                        >
                                            <Checkbox
                                                checked={selectedTags.includes(tag.id)}
                                                onCheckedChange={() => toggleTag(tag.id)}
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
                                        Hidden templates are not offered to customers.
                                    </p>
                                </div>
                                <Switch
                                    id="is-active"
                                    checked={isActive}
                                    onCheckedChange={setIsActive}
                                />
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
        { title: 'Templates', href: admin.templates.index() },
        { title: 'Edit', href: '/admin/templates/edit' },
    ],
};
