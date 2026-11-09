import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { TemplatePricingCard } from '@/components/admin/templates/TemplatePricingCard';
import { TemplatePromptsParametersCard } from '@/components/admin/templates/TemplatePromptsParametersCard';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import {
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
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
import {
    Coins,
    Percent,
    Sparkles,
    UploadCloud,
    FileVideo,
    ImageIcon,
    Layers,
    Tag,
    Sliders,
    ArrowLeft,
    CheckCircle2,
    Eye,
} from 'lucide-react';

type TemplateCategory = { id: number; name: string; slug: string };
type TemplateTag = { id: number; name: string; slug: string };
type AIModelOption = {
    id: number;
    name?: string;
    provider_name: string;
    model_name: string;
    point_cost?: number;
    coin_cost?: number;
    generation_type_id: number | null;
};
type GenerationType = { id: number; name: string; slug: string };

type Template = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    type: 'image' | 'video';
    is_commercial?: boolean;
    file_path: string;
    file_url?: string | null;
    thumbnail_path: string | null;
    thumbnail_url?: string | null;
    reference_video_path?: string | null;
    reference_video_url?: string | null;
    reference_audio_path?: string | null;
    reference_audio_url?: string | null;
    reference_images?: string[] | null;
    parameters?: Record<
        string,
        string | number | boolean | null | undefined
    > | null;
    cost: number;
    manual_cost?: number | null;
    discount_cost?: number;
    effective_cost?: number;
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
    const [slug, setSlug] = useState(template.slug);
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
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [thumbnail, setThumbnail] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
        null,
    );
    const [referenceVideo, setReferenceVideo] = useState<File | null>(null);
    const [referenceVideoPreview, setReferenceVideoPreview] = useState<
        string | null
    >(null);
    const [referenceVideoUrl, setReferenceVideoUrl] = useState<string>(
        template.reference_video_url ?? template.reference_video_path ?? '',
    );
    const initialParams = template.parameters ?? {};
    const [imageMode, setImageMode] = useState<string>(
        String(initialParams.image_mode ?? 'reference'),
    );
    const [duration, setDuration] = useState<string>(
        String(initialParams.duration ?? '5'),
    );
    const [generateAudio, setGenerateAudio] = useState<boolean>(
        Boolean(initialParams.generate_audio ?? false),
    );
    const [bitrateMode, setBitrateMode] = useState<string>(
        String(initialParams.bitrate_mode ?? 'standard'),
    );
    const [autoResize, setAutoResize] = useState<boolean>(
        initialParams.auto_resize !== undefined
            ? Boolean(initialParams.auto_resize)
            : true,
    );
    const [cost, setCost] = useState(
        template.manual_cost !== null &&
            template.manual_cost !== undefined &&
            template.manual_cost > 0
            ? String(template.manual_cost)
            : '',
    );
    const [discountCost, setDiscountCost] = useState(
        String(template.discount_cost ?? 0),
    );
    const [model, setModel] = useState(template.model || '');
    const [aiModelId, setAiModelId] = useState<string>(
        template.ai_model_id ? String(template.ai_model_id) : '',
    );
    const [isCommercial, setIsCommercial] = useState(
        Boolean(template.is_commercial),
    );
    const [isActive, setIsActive] = useState(template.is_active);
    const [selectedTags, setSelectedTags] = useState<number[]>(
        template.tags.map((t) => t.id),
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    // Live calculation for pricing (inherits AI Model cost when cost override is left empty)
    const selectedAiModel = aiModels.find((m) => String(m.id) === aiModelId);
    const modelBaseCost = selectedAiModel
        ? (selectedAiModel.point_cost ?? selectedAiModel.coin_cost ?? 0)
        : (template.cost ?? 0);
    const hasManualCost = cost.trim() !== '' && (parseInt(cost, 10) || 0) > 0;
    const numCost = hasManualCost
        ? Math.max(0, parseInt(cost, 10) || 0)
        : modelBaseCost;
    const numDiscount = Math.max(0, parseInt(discountCost, 10) || 0);
    const effectiveCost = Math.max(0, numCost - numDiscount);
    const discountPercent =
        numCost > 0 && numDiscount > 0
            ? Math.min(100, Math.round((numDiscount / numCost) * 100))
            : 0;

    const toggleTag = (id: number) => {
        setSelectedTags((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
        );
    };

    const handleFileSelect = (f: File | null) => {
        setFile(f);
        if (f) {
            setFilePreview(URL.createObjectURL(f));
        } else {
            setFilePreview(null);
        }
    };

    const handleThumbnailSelect = (f: File | null) => {
        setThumbnail(f);
        if (f) {
            setThumbnailPreview(URL.createObjectURL(f));
        } else {
            setThumbnailPreview(null);
        }
    };

    const handleReferenceVideoSelect = (f: File | null) => {
        setReferenceVideo(f);
        if (f) {
            setReferenceVideoPreview(URL.createObjectURL(f));
        } else {
            setReferenceVideoPreview(null);
        }
    };

    const handleAIModelSelect = (id: string) => {
        setAiModelId(id);
        const selected = aiModels.find((m) => String(m.id) === id);
        if (selected) {
            setModel(selected.model_name);
            if (selected.generation_type_id) {
                setGenerationTypeId(String(selected.generation_type_id));
            }
        }
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        const mergedParameters: Record<
            string,
            string | number | boolean | null | undefined
        > = {
            ...(template.parameters ?? {}),
            image_mode: imageMode,
            duration: parseInt(duration, 10) || 5,
            generate_audio: generateAudio,
            bitrate_mode: bitrateMode,
            auto_resize: autoResize,
        };

        router.put(
            `/admin/templates/${template.id}`,
            {
                name,
                slug,
                description,
                category_id: categoryId || undefined,
                generation_type_id: generationTypeId || undefined,
                type,
                is_commercial: isCommercial,
                cost: hasManualCost ? parseInt(cost, 10) : null,
                discount_cost: numDiscount,
                file,
                thumbnail,
                reference_video: referenceVideo || undefined,
                reference_video_url: referenceVideoUrl,
                reference_images: [],
                parameters: mergedParameters,
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
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Heading
                            title={`Edit: ${template.name}`}
                            description={`Slug: ${template.slug} • Type: ${template.type.toUpperCase()}`}
                        />
                    </div>
                    <Link href="/admin/templates">
                        <AnimatedButton
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Templates
                        </AnimatedButton>
                    </Link>
                </div>

                <form onSubmit={submit} className="grid gap-6 lg:grid-cols-12">
                    {/* Left Column: 7 Cols (Info, AI Model, Pricing, Prompts) */}
                    <div className="space-y-6 lg:col-span-7">
                        {/* 1. General Information */}
                        <AnimatedCard>
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Layers className="h-5 w-5 text-primary" />
                                    Template Information
                                </CardTitle>
                                <CardDescription>
                                    Basic details, slug identifier, and
                                    categorization.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">
                                            Template Name{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
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
                                        <Label htmlFor="slug">
                                            Slug Identifier
                                        </Label>
                                        <Input
                                            id="slug"
                                            value={slug}
                                            onChange={(e) =>
                                                setSlug(e.target.value)
                                            }
                                            placeholder="auto-generated-slug"
                                        />
                                        <InputError message={errors.slug} />
                                    </div>
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
                                        placeholder="Brief description displayed to customers..."
                                        rows={2}
                                    />
                                    <InputError message={errors.description} />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-3">
                                    {/* Type */}
                                    <div className="grid gap-2">
                                        <Label>Media Type</Label>
                                        <div className="flex rounded-lg border border-border bg-muted/40 p-1">
                                            <button
                                                type="button"
                                                onClick={() => setType('image')}
                                                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                                                    type === 'image'
                                                        ? 'bg-background text-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                <ImageIcon className="h-3.5 w-3.5" />
                                                Image
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setType('video')}
                                                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                                                    type === 'video'
                                                        ? 'bg-background text-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                <FileVideo className="h-3.5 w-3.5" />
                                                Video
                                            </button>
                                        </div>
                                    </div>

                                    {/* Category */}
                                    <div className="grid gap-2">
                                        <Label htmlFor="category">
                                            Category
                                        </Label>
                                        <Select
                                            value={categoryId}
                                            onValueChange={setCategoryId}
                                        >
                                            <SelectTrigger id="category">
                                                <SelectValue placeholder="Select Category" />
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
                                        <InputError
                                            message={errors.category_id}
                                        />
                                    </div>

                                    {/* Generation Type */}
                                    <div className="grid gap-2">
                                        <Label htmlFor="generationType">
                                            Generation Type
                                        </Label>
                                        <Select
                                            value={generationTypeId}
                                            onValueChange={setGenerationTypeId}
                                        >
                                            <SelectTrigger id="generationType">
                                                <SelectValue placeholder="Select Type" />
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
                                        <InputError
                                            message={errors.generation_type_id}
                                        />
                                    </div>
                                </div>

                                {/* AI Model Selector */}
                                <div className="grid gap-2 pt-1">
                                    <div className="flex items-center justify-between">
                                        <Label
                                            htmlFor="model"
                                            className="flex items-center gap-1.5"
                                        >
                                            <Sparkles className="h-4 w-4 text-amber-400" />
                                            AI Model
                                        </Label>
                                        <span className="text-xs text-muted-foreground">
                                            Auto-fills template point cost
                                        </span>
                                    </div>
                                    <Select
                                        value={aiModelId}
                                        onValueChange={handleAIModelSelect}
                                    >
                                        <SelectTrigger id="model">
                                            <SelectValue placeholder="Choose an AI Model..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {aiModels.map((m) => (
                                                <SelectItem
                                                    key={m.id}
                                                    value={String(m.id)}
                                                >
                                                    <span className="font-medium">
                                                        {m.name || m.model_name}
                                                    </span>
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        ({m.provider_name} •{' '}
                                                        {m.point_cost ?? m.coin_cost ?? 0}{' '}
                                                        points)
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.ai_model_id} />
                                </div>
                            </CardContent>
                        </AnimatedCard>

                        {/* 2. Point Pricing & Discount Card */}
                        <TemplatePricingCard
                            cost={cost}
                            onCostChange={setCost}
                            discountCost={discountCost}
                            onDiscountCostChange={setDiscountCost}
                            hasManualCost={hasManualCost}
                            modelBaseCost={modelBaseCost}
                            numCost={numCost}
                            numDiscount={numDiscount}
                            effectiveCost={effectiveCost}
                            discountPercent={discountPercent}
                            errors={errors}
                        />

                        {/* 3. AI Prompts & Parameters */}
                        <TemplatePromptsParametersCard
                            aspectRatio={aspectRatio}
                            onAspectRatioChange={setAspectRatio}
                            resolution={resolution}
                            onResolutionChange={setResolution}
                            seed={seed}
                            onSeedChange={setSeed}
                            prompt={prompt}
                            onPromptChange={setPrompt}
                            negativePrompt={negativePrompt}
                            onNegativePromptChange={setNegativePrompt}
                            imageMode={imageMode}
                            onImageModeChange={setImageMode}
                            duration={duration}
                            onDurationChange={setDuration}
                            bitrateMode={bitrateMode}
                            onBitrateModeChange={setBitrateMode}
                            generateAudio={generateAudio}
                            onGenerateAudioChange={setGenerateAudio}
                            autoResize={autoResize}
                            onAutoResizeChange={setAutoResize}
                            errors={errors}
                        />
                    </div>

                    {/* Right Column: 5 Cols (Media Asset, Tags, Publishing) */}
                    <div className="space-y-6 lg:col-span-5">
                        {/* 4. Media Asset Preview & Replacement */}
                        <AnimatedCard>
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <UploadCloud className="h-5 w-5 text-primary" />
                                    Template Media Asset
                                </CardTitle>
                                <CardDescription>
                                    Current source file and optional
                                    replacement.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Current Asset Preview */}
                                {(template.file_url || filePreview) && (
                                    <div className="overflow-hidden rounded-xl border border-border bg-black/40 p-1">
                                        <div className="mb-1 flex items-center justify-between border-b border-border/50 px-2 py-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1 font-medium">
                                                <Eye className="h-3.5 w-3.5" />
                                                {filePreview
                                                    ? 'New Replacement Preview'
                                                    : 'Current Active File'}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="py-0 text-[10px] uppercase"
                                            >
                                                {template.type}
                                            </Badge>
                                        </div>
                                        {template.type === 'video' ? (
                                            <video
                                                src={
                                                    filePreview ||
                                                    template.file_url ||
                                                    undefined
                                                }
                                                controls
                                                className="max-h-56 w-full rounded-lg object-contain"
                                            />
                                        ) : (
                                            <img
                                                src={
                                                    filePreview ||
                                                    template.file_url ||
                                                    undefined
                                                }
                                                alt={template.name}
                                                className="max-h-56 w-full rounded-lg object-contain"
                                            />
                                        )}
                                    </div>
                                )}

                                <div className="grid gap-2">
                                    <Label htmlFor="file">
                                        Replace Source File (
                                        {type === 'image' ? 'Image' : 'Video'},
                                        optional)
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
                                            handleFileSelect(
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                    <InputError message={errors.file} />
                                </div>

                                <div className="grid gap-2 border-t border-border pt-2">
                                    <Label htmlFor="thumbnail">
                                        Thumbnail (optional replacement)
                                    </Label>
                                    {(template.thumbnail_url ||
                                        thumbnailPreview) && (
                                        <div className="mb-2 h-28 w-28 overflow-hidden rounded-xl border border-border bg-black/40 p-1">
                                            <img
                                                src={
                                                    thumbnailPreview ||
                                                    template.thumbnail_url ||
                                                    undefined
                                                }
                                                alt="Thumbnail preview"
                                                className="h-full w-full rounded-lg object-cover"
                                            />
                                        </div>
                                    )}
                                    <Input
                                        id="thumbnail"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            handleThumbnailSelect(
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                    <InputError message={errors.thumbnail} />
                                </div>

                                {/* AI Reference Video (for Seedance / Image-to-Video / Video Face Swap) */}
                                <div className="space-y-3 border-t border-border pt-3">
                                    <div>
                                        <Label htmlFor="referenceVideo">
                                            AI Input Reference Video (Optional)
                                        </Label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Reference Video ပါဝင်မှသာ ထည့်ရန် လိုအပ်ပါသည် (Prompt + Reference Image သီးသန့်ဖြင့် ထုတ်ထားသော Template များအတွက် လုံးဝထည့်ရန် မလိုပါ)။
                                        </p>
                                    </div>

                                    {(referenceVideoPreview ||
                                        referenceVideoUrl) && (
                                        <div className="overflow-hidden rounded-xl border border-border bg-black/40 p-1">
                                            <video
                                                src={
                                                    referenceVideoPreview ||
                                                    referenceVideoUrl ||
                                                    undefined
                                                }
                                                controls
                                                className="max-h-40 w-full rounded-lg object-contain"
                                            />
                                        </div>
                                    )}

                                    <Input
                                        id="referenceVideo"
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) =>
                                            handleReferenceVideoSelect(
                                                e.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                    <Input
                                        value={referenceVideoUrl}
                                        onChange={(e) =>
                                            setReferenceVideoUrl(e.target.value)
                                        }
                                        placeholder="Or paste Reference Video URL (https://...)"
                                        className="text-xs"
                                    />
                                    <InputError
                                        message={errors.reference_video}
                                    />
                                </div>
                            </CardContent>
                        </AnimatedCard>

                        {/* 5. Visibility, Tags & Publishing */}
                        <AnimatedCard>
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Tag className="h-5 w-5 text-primary" />
                                    Publishing & Tags
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="grid gap-2">
                                    <Label htmlFor="sortOrder">
                                        Sort Order
                                    </Label>
                                    <Input
                                        id="sortOrder"
                                        type="number"
                                        value={sortOrder}
                                        onChange={(e) =>
                                            setSortOrder(e.target.value)
                                        }
                                        min={1}
                                    />
                                    <InputError message={errors.sort_order} />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Template Tags</Label>
                                    {tags.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">
                                            No tags found.{' '}
                                            <Link
                                                href="/admin/template-tags"
                                                className="text-primary underline"
                                            >
                                                Create tags
                                            </Link>
                                        </p>
                                    ) : (
                                        <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto p-1">
                                            {tags.map((t) => {
                                                const isSelected =
                                                    selectedTags.includes(t.id);
                                                return (
                                                    <button
                                                        type="button"
                                                        key={t.id}
                                                        onClick={() =>
                                                            toggleTag(t.id)
                                                        }
                                                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                                                            isSelected
                                                                ? 'border-primary bg-primary/10 text-primary'
                                                                : 'border-border bg-muted/30 text-muted-foreground hover:border-foreground/20'
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <CheckCircle2 className="h-3 w-3 text-primary" />
                                                        )}
                                                        {t.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                                    <div>
                                        <Label
                                            htmlFor="is-commercial"
                                            className="font-medium"
                                        >
                                            Commercial Template
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Show this template under the
                                            Commercial tab (supports both Image
                                            & Video).
                                        </p>
                                    </div>
                                    <Switch
                                        id="is-commercial"
                                        checked={isCommercial}
                                        onCheckedChange={setIsCommercial}
                                    />
                                </div>

                                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
                                    <div>
                                        <Label
                                            htmlFor="is-active"
                                            className="font-medium"
                                        >
                                            Active Status
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Active templates are immediately
                                            visible to customers.
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
                                    className="w-full py-6 text-base font-semibold text-white hover:opacity-95"
                                >
                                    {processing
                                        ? 'Saving Changes...'
                                        : 'Save Template Changes'}
                                </AnimatedButton>
                            </CardContent>
                        </AnimatedCard>
                    </div>
                </form>
            </div>
        </>
    );
}

Edit.layout = {
    breadcrumbs: [
        { title: 'Templates', href: admin.templates.index() },
        { title: 'Edit', href: '#' },
    ],
};
