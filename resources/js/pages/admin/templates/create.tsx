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

export default function Create({
    categories,
    tags,
    aiModels,
    generationTypes,
}: {
    categories: TemplateCategory[];
    tags: TemplateTag[];
    aiModels: AIModelOption[];
    generationTypes: GenerationType[];
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [sortOrder, setSortOrder] = useState('1');
    const [prompt, setPrompt] = useState('');
    const [negativePrompt, setNegativePrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('');
    const [resolution, setResolution] = useState('');
    const [seed, setSeed] = useState('');
    const [categoryId, setCategoryId] = useState<string>('');
    const [generationTypeId, setGenerationTypeId] = useState<string>('');
    const [type, setType] = useState<'image' | 'video'>('image');
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
    const [referenceVideoUrl, setReferenceVideoUrl] = useState<string>('');
    const [imageMode, setImageMode] = useState<string>('reference');
    const [duration, setDuration] = useState<string>('5');
    const [generateAudio, setGenerateAudio] = useState<boolean>(false);
    const [bitrateMode, setBitrateMode] = useState<string>('standard');
    const [autoResize, setAutoResize] = useState<boolean>(true);
    const [cost, setCost] = useState('');
    const [discountCost, setDiscountCost] = useState('0');
    const [model, setModel] = useState('');
    const [aiModelId, setAiModelId] = useState<string>('');
    const [isCommercial, setIsCommercial] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const [selectedTags, setSelectedTags] = useState<number[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    // Live calculation for pricing (inherits AI Model cost when cost override is left empty)
    const selectedAiModel = aiModels.find((m) => String(m.id) === aiModelId);
    const modelBaseCost = selectedAiModel
        ? (selectedAiModel.point_cost ?? selectedAiModel.coin_cost ?? 0)
        : 0;
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
            image_mode: imageMode,
            duration: parseInt(duration, 10) || 5,
            generate_audio: generateAudio,
            bitrate_mode: bitrateMode,
            auto_resize: autoResize,
        };

        router.post(
            '/admin/templates',
            {
                name,
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
                reference_video_url: referenceVideoUrl || undefined,
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
            <Head title="Upload Template" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Heading
                            title="Upload Template"
                            description="Create a new template with AI model pricing and optional discount."
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
                                    Basic details, media format, and
                                    categorization.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
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
                                        placeholder="e.g. Superman Cinematic Suit"
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

                        {/* 3. AI Prompts & Generation Parameters */}
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

                    {/* Right Column: 5 Cols (Media Upload, Preview, Tags, Status) */}
                    <div className="space-y-6 lg:col-span-5">
                        {/* 4. Media Asset Upload & Preview */}
                        <AnimatedCard>
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <UploadCloud className="h-5 w-5 text-primary" />
                                    Template Media File
                                </CardTitle>
                                <CardDescription>
                                    Primary {type} source for face swap or
                                    generation.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="file">
                                        Source File (
                                        {type === 'image' ? 'Image' : 'Video'},
                                        max 50 MB){' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
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
                                        required
                                    />
                                    <InputError message={errors.file} />

                                    {/* Immediate Live Preview */}
                                    {filePreview && (
                                        <div className="mt-2 overflow-hidden rounded-xl border border-border bg-black/40 p-1">
                                            {type === 'image' ? (
                                                <img
                                                    src={filePreview}
                                                    alt="Preview"
                                                    className="max-h-56 w-full rounded-lg object-contain"
                                                />
                                            ) : (
                                                <video
                                                    src={filePreview}
                                                    controls
                                                    className="max-h-56 w-full rounded-lg object-contain"
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-2 border-t border-border pt-2">
                                    <Label htmlFor="thumbnail">
                                        Thumbnail (optional, image max 5 MB)
                                    </Label>
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

                                    {thumbnailPreview && (
                                        <div className="mt-2 h-32 w-32 overflow-hidden rounded-xl border border-border bg-black/40 p-1">
                                            <img
                                                src={thumbnailPreview}
                                                alt="Thumbnail preview"
                                                className="h-full w-full rounded-lg object-cover"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* AI Reference Video */}
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
                                        ? 'Uploading Template...'
                                        : 'Upload & Publish Template'}
                                </AnimatedButton>
                            </CardContent>
                        </AnimatedCard>
                    </div>
                </form>
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
