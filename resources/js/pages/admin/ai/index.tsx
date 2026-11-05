import { Head } from '@inertiajs/react';
import { Film, Layers, Sparkles, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { GenerationDetailModal } from '@/components/admin/ai/GenerationDetailModal';
import { ImageEditingTab } from '@/components/admin/ai/ImageEditingTab';
import { ImageGenerationTab } from '@/components/admin/ai/ImageGenerationTab';
import { ImageToVideoTab } from '@/components/admin/ai/ImageToVideoTab';
import { RecentGenerationsCard } from '@/components/admin/ai/RecentGenerationsCard';
import { TemplateGenerationTab } from '@/components/admin/ai/TemplateGenerationTab';
import type {
    Generation,
    TabType,
    Template,
} from '@/components/admin/ai/types';
import Heading from '@/components/heading';
import admin from '@/routes/admin';

export default function Index({
    templates,
    generations,
}: {
    templates: Template[];
    generations: Generation[];
}) {
    const [activeTab, setActiveTab] = useState<TabType>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab') as TabType;
            if (
                tab &&
                [
                    'template',
                    'generate',
                    'image-to-video',
                    'image-edit',
                ].includes(tab)
            ) {
                return tab;
            }
        }
        return 'template';
    });

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tab);
            window.history.replaceState({}, '', url.toString());
        }
    };

    const [selectedGeneration, setSelectedGeneration] =
        useState<Generation | null>(null);

    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        {
            id: 'template',
            label: 'Template Generator',
            icon: <Layers className="h-4 w-4" />,
        },
        {
            id: 'generate',
            label: 'Image Generation',
            icon: <Sparkles className="h-4 w-4" />,
        },
        {
            id: 'image-to-video',
            label: 'Image to Video',
            icon: <Film className="h-4 w-4" />,
        },
        {
            id: 'image-edit',
            label: 'Image Editing',
            icon: <Wand2 className="h-4 w-4" />,
        },
    ];

    return (
        <>
            <Head title="AI Generation" />

            <div className="flex flex-1 flex-col gap-5 p-5 md:p-6">
                {/* Header + Segmented Studio Tabs */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <Heading
                        title="AI Generation Studio"
                        description="Test and create templates across Unified Template Generation, Image Generation, Image-to-Video, and Image Editing."
                    />

                    <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border bg-muted/40 p-1.5">
                        {tabs.map((t) => {
                            const active = activeTab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => handleTabChange(t.id)}
                                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                                        active
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                                    }`}
                                >
                                    {t.icon}
                                    {t.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {activeTab === 'template' && (
                    <TemplateGenerationTab templates={templates} />
                )}

                {activeTab === 'generate' && <ImageGenerationTab />}

                {activeTab === 'image-to-video' && <ImageToVideoTab />}

                {activeTab === 'image-edit' && <ImageEditingTab />}

                <RecentGenerationsCard
                    generations={generations}
                    onSelectGeneration={setSelectedGeneration}
                />
            </div>

            {selectedGeneration && (
                <GenerationDetailModal
                    generation={selectedGeneration}
                    onClose={() => setSelectedGeneration(null)}
                />
            )}
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'AI Generation', href: admin.ai.index() }],
};
