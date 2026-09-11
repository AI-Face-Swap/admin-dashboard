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
type AIModelOption = { id: number; provider_name: string; model_name: string };
type GenerationType = { id: number; name: string; slug: string };

type Template = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    type: 'image' | 'video';
    file_path: string;
    thumbnail_path: string | null;
    cost: number;
    model: string | null;
    ai_model_id: number | null;
    generation_type_id: number | null;
    is_active: boolean;
    category: { id: number; name: string } | null;
    tags: { id: number; name: string }[];
    sort_order: number;
    prompt: string | null;
    negative_prompt: string | null;
    aspect_ratio: string | null;
    resolution: string | null;
    seed: string | null;
};

export default function Edit({
    template,
    categories,
    tags,
    aiModels,
    generationTypes,
}: {
    template: Template;
    categories: TemplateCategory[];
    tags: TemplateTag[];
    aiModels: AIModelOption[];
    generationTypes: GenerationType[];
}) {
    const [name, setName] = useState(template.name);
    const [description, setDescription] = useState(template.description ?? '');
    const [sortOrder, setSortOrder] = useState(
        String(template.sort_order ?? 1),
    );
    const [prompt, setPrompt] = useState(template.prompt ?? '');
    const [negativePrompt, setNegativePrompt] = useState(
        template.negative_prompt ?? '',
    );
    const [aspectRatio, setAspectRatio] = useState(template.aspect_ratio ?? '');
    const [resolution, setResolution] = useState(template.resolution ?? '');
    const [seed, setSeed] = useState(template.seed ?? '');
    const [categoryId, setCategoryId] = useState<string>(
        template.category ? String(template.category.id) : '',
    );
    const [generationTypeId, setGenerationTypeId] = useState<string>(
        template.generation_type_id ? String(template.generation_type_id) : '',
    );
    const [type, setType] = useState<'image' | 'video'>(template.type);
    const [file, setFile] = useState<File | null>(null);
    const [thumbnail, setThumbnail] = useState<File | null>(null);
    const [cost, setCost] = useState(String(template.cost));
    const [model] = useState(template.model || '');
    const [aiModelId, setAiModelId] = useState<string>(
        template.ai_model_id ? String(template.ai_model_id) : '',
    );
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
                generation_type_id: generationTypeId || undefined,
                type,
                cost: parseInt(cost, 10) || 0,
                file,
                thumbnail,
                model,
                ai_model_id: aiModelId ? parseInt(aiModelId, 10) : undefined,
                is_active: isActive,
                tags: selectedTags,
                sort_order: parseInt(sortOrder, 10) || 1,
                prompt: prompt || undefined,
                negative_prompt: negativePrompt || undefined,
                aspect_ratio: aspectRatio || undefined,
                resolution: resolution || undefined,
                seed: seed || undefined,
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
                    <Heading
                        title={`Edit ${template.name}`}
                        description={template.slug}
                    />
                    <Link href="/admin/templates">
                        <AnimatedButton variant="outline">Back</AnimatedButton>
                    </Link>
                </div>

                <AnimatedCard className="mx-auto w-full max-w-5xl">
                    <CardContent>
                        <form
                            onSubmit={submit}
                            className="grid gap-8 md:grid-cols-2"
                        >
                            <div className="space-y-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Template name</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        required
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="description">
                                        Description
                                    </Label>
                                    <Textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) =>
                                            setDescription(e.target.value)
                                        }
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
                                        <Label htmlFor="category">
                                            Category
                                        </Label>
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
                                        <Label htmlFor="generationType">
                                            Generation Type
                                        </Label>
                                        <Select
                                            value={generationTypeId}
                                            onValueChange={setGenerationTypeId}
                                        >
                                            <SelectTrigger id="generationType">
                                                <SelectValue placeholder="None" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {generationTypes.map((gt) => (
                                                    <SelectItem
                                                        key={gt.id}
                                                        value={String(gt.id)}
                                                    >
                                                        {gt.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="cost">
                                            Cost (coins)
                                        </Label>
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
                                        Replace file (optional, max 50 MB)
                                    </Label>
                                    <Input
                                        id="file"
                                        type="file"
                                        accept={
                                            type === 'image'
                                                ? 'image/*'
                                                : 'video/*'
                                        }
                                        onChange={(e) =>
                                            setFile(e.target.files?.[0] ?? null)
                                        }
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
                                        onChange={(e) =>
                                            setThumbnail(
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                    <InputError message={errors.thumbnail} />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="sortOrder">
                                            Sort order
                                        </Label>
                                        <Input
                                            id="sortOrder"
                                            type="number"
                                            value={sortOrder}
                                            onChange={(e) =>
                                                setSortOrder(e.target.value)
                                            }
                                        />
                                        <InputError
                                            message={errors.sort_order}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="seed">
                                            Seed (optional)
                                        </Label>
                                        <Input
                                            id="seed"
                                            type="number"
                                            value={seed}
                                            onChange={(e) =>
                                                setSeed(e.target.value)
                                            }
                                        />
                                        <InputError message={errors.seed} />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="aspectRatio">
                                            Aspect Ratio
                                        </Label>
                                        <Input
                                            id="aspectRatio"
                                            value={aspectRatio}
                                            onChange={(e) =>
                                                setAspectRatio(e.target.value)
                                            }
                                            placeholder="e.g. 16:9"
                                        />
                                        <InputError
                                            message={errors.aspect_ratio}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="resolution">
                                            Resolution
                                        </Label>
                                        <Input
                                            id="resolution"
                                            value={resolution}
                                            onChange={(e) =>
                                                setResolution(e.target.value)
                                            }
                                            placeholder="e.g. 1080p"
                                        />
                                        <InputError
                                            message={errors.resolution}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="prompt">Prompt</Label>
                                    <Textarea
                                        id="prompt"
                                        value={prompt}
                                        onChange={(e) =>
                                            setPrompt(e.target.value)
                                        }
                                        rows={3}
                                    />
                                    <InputError message={errors.prompt} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="negativePrompt">
                                        Negative Prompt
                                    </Label>
                                    <Textarea
                                        id="negativePrompt"
                                        value={negativePrompt}
                                        onChange={(e) =>
                                            setNegativePrompt(e.target.value)
                                        }
                                        rows={2}
                                    />
                                    <InputError
                                        message={errors.negative_prompt}
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="model">
                                        AI Model (optional)
                                    </Label>
                                    {aiModels.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            No AI models yet —{' '}
                                            <a
                                                href="/admin/ai-models"
                                                className="underline"
                                            >
                                                create some first
                                            </a>
                                            .
                                        </p>
                                    ) : (
                                        <Select
                                            value={aiModelId}
                                            onValueChange={setAiModelId}
                                        >
                                            <SelectTrigger id="model">
                                                <SelectValue placeholder="None" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {aiModels.map((m) => (
                                                    <SelectItem
                                                        key={m.id}
                                                        value={String(m.id)}
                                                    >
                                                        {m.provider_name} —{' '}
                                                        {m.model_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
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
                                        <Label htmlFor="is-active">
                                            Active
                                        </Label>
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

                                <AnimatedButton
                                    type="submit"
                                    disabled={processing}
                                >
                                    {processing ? 'Saving...' : 'Save Changes'}
                                </AnimatedButton>
                            </div>
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
