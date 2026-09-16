import { Head, Link, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type GenerationType = {
    id: number;
    name: string;
    slug: string;
};

type Props = {
    generationTypes: GenerationType[];
};

export default function Create({ generationTypes }: Props) {
    const [resolutionRows, setResolutionRows] = useState<{ key: string; cost: number }[]>([]);
    const [durationRows, setDurationRows] = useState<{ key: string; cost: number }[]>([]);

    const { data, setData, post, processing, errors } = useForm({
        generation_type_id: generationTypes[0]?.id ? String(generationTypes[0].id) : '',
        provider_name: 'segmind',
        model_name: '',
        name: '',
        coin_cost: '10',
        resolution_costs: {} as Record<string, number>,
        duration_costs: {} as Record<string, number>,
        is_active: true,
        is_default: false,
        docs_link: '',
        sort_order: '0',
        description: '',
    });

    const addResolutionRow = () => {
        setResolutionRows([...resolutionRows, { key: '', cost: 10 }]);
    };

    const removeResolutionRow = (index: number) => {
        const updated = resolutionRows.filter((_, i) => i !== index);
        setResolutionRows(updated);
        updateResolutionData(updated);
    };

    const handleResolutionChange = (index: number, field: 'key' | 'cost', value: string | number) => {
        const updated = [...resolutionRows];
        if (field === 'key') {
            updated[index].key = String(value);
        } else {
            updated[index].cost = Number(value);
        }
        setResolutionRows(updated);
        updateResolutionData(updated);
    };

    const updateResolutionData = (rows: { key: string; cost: number }[]) => {
        const obj: Record<string, number> = {};
        for (const row of rows) {
            if (row.key.trim()) {
                obj[row.key.trim()] = row.cost;
            }
        }
        setData('resolution_costs', obj);
    };

    const addDurationRow = () => {
        setDurationRows([...durationRows, { key: '', cost: 10 }]);
    };

    const removeDurationRow = (index: number) => {
        const updated = durationRows.filter((_, i) => i !== index);
        setDurationRows(updated);
        updateDurationData(updated);
    };

    const handleDurationChange = (index: number, field: 'key' | 'cost', value: string | number) => {
        const updated = [...durationRows];
        if (field === 'key') {
            updated[index].key = String(value);
        } else {
            updated[index].cost = Number(value);
        }
        setDurationRows(updated);
        updateDurationData(updated);
    };

    const updateDurationData = (rows: { key: string; cost: number }[]) => {
        const obj: Record<string, number> = {};
        for (const row of rows) {
            if (row.key.trim()) {
                obj[row.key.trim()] = row.cost;
            }
        }
        setData('duration_costs', obj);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/ai-models');
    };

    return (
        <>
            <Head title="Create AI Model" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="Create AI Model"
                    description="Configure an AI model with coin pricing, resolution tiers, and duration costs."
                />

                <form onSubmit={handleSubmit}>
                    <AnimatedCard className="mx-auto max-w-2xl">
                        <CardContent className="space-y-6">
                            {/* Generation Type */}
                            <div className="space-y-2">
                                <Label htmlFor="generation_type_id">
                                    Generation Type *
                                </Label>
                                <select
                                    id="generation_type_id"
                                    value={data.generation_type_id}
                                    onChange={(e) =>
                                        setData('generation_type_id', e.target.value)
                                    }
                                    className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">None / Unassigned</option>
                                    {generationTypes.map((gt) => (
                                        <option key={gt.id} value={gt.id}>
                                            {gt.name} ({gt.slug})
                                        </option>
                                    ))}
                                </select>
                                {errors.generation_type_id && (
                                    <p className="text-sm text-destructive">
                                        {errors.generation_type_id}
                                    </p>
                                )}
                            </div>

                            {/* Display Name & Model Key */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Display Name</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) =>
                                            setData('name', e.target.value)
                                        }
                                        placeholder="e.g. FLUX Kontext Dev"
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-destructive">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="model_name">Model Key / Identifier *</Label>
                                    <Input
                                        id="model_name"
                                        value={data.model_name}
                                        onChange={(e) =>
                                            setData('model_name', e.target.value)
                                        }
                                        placeholder="e.g. flux-kontext-dev"
                                        required
                                        className="font-mono"
                                    />
                                    {errors.model_name && (
                                        <p className="text-sm text-destructive">
                                            {errors.model_name}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Provider & Base Coin Cost */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="provider_name">
                                        Provider Name *
                                    </Label>
                                    <Input
                                        id="provider_name"
                                        value={data.provider_name}
                                        onChange={(e) =>
                                            setData('provider_name', e.target.value)
                                        }
                                        placeholder="segmind"
                                        required
                                    />
                                    {errors.provider_name && (
                                        <p className="text-sm text-destructive">
                                            {errors.provider_name}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="coin_cost">Base Coin Cost *</Label>
                                    <Input
                                        id="coin_cost"
                                        type="number"
                                        min={0}
                                        value={data.coin_cost}
                                        onChange={(e) =>
                                            setData('coin_cost', e.target.value)
                                        }
                                        required
                                    />
                                    {errors.coin_cost && (
                                        <p className="text-sm text-destructive">
                                            {errors.coin_cost}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Resolution Pricing Tiers */}
                            <div className="space-y-3 rounded-lg border border-border/50 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-sm font-semibold">Resolution Pricing (Optional)</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Custom coin cost per resolution (e.g. 480p, 720p, 1080p or 1K, 2K, 4K).
                                        </p>
                                    </div>
                                    <AnimatedButton
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addResolutionRow}
                                    >
                                        <Plus className="mr-1 size-3.5" />
                                        Add Tier
                                    </AnimatedButton>
                                </div>

                                {resolutionRows.map((row, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input
                                            placeholder="Resolution (e.g. 720p, 2K)"
                                            value={row.key}
                                            onChange={(e) => handleResolutionChange(index, 'key', e.target.value)}
                                            className="h-8 text-xs font-mono"
                                        />
                                        <Input
                                            type="number"
                                            placeholder="Coins"
                                            value={row.cost}
                                            onChange={(e) => handleResolutionChange(index, 'cost', e.target.value)}
                                            className="h-8 w-28 text-xs"
                                            min={0}
                                        />
                                        <AnimatedButton
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeResolutionRow(index)}
                                            className="size-8 p-0 text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="size-4" />
                                        </AnimatedButton>
                                    </div>
                                ))}
                            </div>

                            {/* Duration Pricing (for Video Models) */}
                            <div className="space-y-3 rounded-lg border border-border/50 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-sm font-semibold">Duration Pricing (for Video)</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Custom coin cost per duration seconds (e.g. 5s: 10, 10s: 20).
                                        </p>
                                    </div>
                                    <AnimatedButton
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addDurationRow}
                                    >
                                        <Plus className="mr-1 size-3.5" />
                                        Add Duration
                                    </AnimatedButton>
                                </div>

                                {durationRows.map((row, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input
                                            placeholder="Duration (e.g. 5s, 10s)"
                                            value={row.key}
                                            onChange={(e) => handleDurationChange(index, 'key', e.target.value)}
                                            className="h-8 text-xs font-mono"
                                        />
                                        <Input
                                            type="number"
                                            placeholder="Coins"
                                            value={row.cost}
                                            onChange={(e) => handleDurationChange(index, 'cost', e.target.value)}
                                            className="h-8 w-28 text-xs"
                                            min={0}
                                        />
                                        <AnimatedButton
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeDurationRow(index)}
                                            className="size-8 p-0 text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="size-4" />
                                        </AnimatedButton>
                                    </div>
                                ))}
                            </div>

                            {/* Active and Default Checkboxes */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="h-4 w-4 rounded border-input bg-card text-primary focus:ring-ring"
                                    />
                                    <Label htmlFor="is_active" className="cursor-pointer">
                                        Active (available for users)
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_default"
                                        checked={data.is_default}
                                        onChange={(e) => setData('is_default', e.target.checked)}
                                        className="h-4 w-4 rounded border-input bg-card text-primary focus:ring-ring"
                                    />
                                    <Label htmlFor="is_default" className="cursor-pointer">
                                        Default model for its type
                                    </Label>
                                </div>
                            </div>

                            {/* Docs Link + Sort Order */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="docs_link">Docs Link</Label>
                                    <Input
                                        id="docs_link"
                                        type="url"
                                        value={data.docs_link}
                                        onChange={(e) =>
                                            setData('docs_link', e.target.value)
                                        }
                                        placeholder="https://..."
                                    />
                                    {errors.docs_link && (
                                        <p className="text-sm text-destructive">
                                            {errors.docs_link}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sort_order">
                                        Sort Order
                                    </Label>
                                    <Input
                                        id="sort_order"
                                        type="number"
                                        min={0}
                                        value={data.sort_order}
                                        onChange={(e) =>
                                            setData('sort_order', e.target.value)
                                        }
                                    />
                                    {errors.sort_order && (
                                        <p className="text-sm text-destructive">
                                            {errors.sort_order}
                                        </p>
                                    )}
                                </div>
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
                                    placeholder="What this model does, strengths, limits..."
                                    rows={3}
                                />
                                {errors.description && (
                                    <p className="text-sm text-destructive">
                                        {errors.description}
                                    </p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 border-t pt-4">
                                <AnimatedButton
                                    type="submit"
                                    disabled={processing}
                                >
                                    {processing
                                        ? 'Creating...'
                                        : 'Create AI Model'}
                                </AnimatedButton>
                                <Link href="/admin/ai-models">
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
        { title: 'AI Models', href: '/admin/ai-models' },
        { title: 'Create', href: '/admin/ai-models/create' },
    ],
};
