import { Head, Link, useForm } from '@inertiajs/react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        provider_name: 'segmind',
        model_name: '',
        docs_link: '',
        sort_order: '0',
        description: '',
    });

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
                    description="Add a new AI model identifier for use in templates."
                />

                <form onSubmit={handleSubmit}>
                    <AnimatedCard className="mx-auto max-w-2xl">
                        <CardContent className="space-y-6">
                            {/* Provider Name */}
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
                                <p className="text-xs text-muted-foreground">
                                    The AI provider (e.g. segmind, replicate).
                                </p>
                                {errors.provider_name && (
                                    <p className="text-sm text-destructive">
                                        {errors.provider_name}
                                    </p>
                                )}
                            </div>

                            {/* Model Name */}
                            <div className="space-y-2">
                                <Label htmlFor="model_name">Model Name *</Label>
                                <Input
                                    id="model_name"
                                    value={data.model_name}
                                    onChange={(e) =>
                                        setData('model_name', e.target.value)
                                    }
                                    placeholder="e.g. wan2.2-i2v-480p"
                                    required
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    The exact model identifier string used in
                                    API calls.
                                </p>
                                {errors.model_name && (
                                    <p className="text-sm text-destructive">
                                        {errors.model_name}
                                    </p>
                                )}
                            </div>

                            {/* Docs Link + Sort Order row */}
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
                                            setData(
                                                'sort_order',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Lower = appears first in dropdowns.
                                    </p>
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
                                    placeholder="What this model does, its strengths, limitations..."
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
