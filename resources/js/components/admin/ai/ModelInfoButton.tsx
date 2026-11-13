import {
    CheckCircle2,
    ExternalLink,
    Lightbulb,
    Sparkles,
    Target,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    getModelGuide,
    getModelsByCategory,
    type ModelGuide,
} from '@/components/admin/ai/modelGuides';

interface ModelInfoButtonProps {
    model: string;
    category?: ModelGuide['category'];
    onSelectModel?: (slug: string) => void;
    compact?: boolean;
}

export function ModelInfoButton({
    model,
    category,
    onSelectModel,
    compact = false,
}: ModelInfoButtonProps) {
    const [open, setOpen] = useState(false);
    const [activeSlug, setActiveSlug] = useState(model);

    useEffect(() => {
        if (open) {
            setActiveSlug(model);
        }
    }, [open, model]);

    const currentGuide = getModelGuide(activeSlug);
    const resolvedCategory = category ?? currentGuide?.category;
    const siblingModels = resolvedCategory
        ? getModelsByCategory(resolvedCategory)
        : [];

    const fallbackSegmindUrl = `https://www.segmind.com/models/${activeSlug}`;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                title={`${model} အကြောင်း မြန်မာလို ဖတ်ရှုရန်`}
                aria-label={`${model} model guide`}
                className={`inline-flex items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/15 font-extrabold text-amber-600 transition-colors hover:border-amber-500 hover:bg-amber-500 hover:text-white focus:ring-2 focus:ring-amber-500/40 focus:outline-none dark:text-amber-400 dark:hover:text-white ${
                    compact ? 'h-5 w-5 text-xs' : 'h-6 w-6 text-xs'
                }`}
            >
                !
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto p-0">
                    <div className="border-b bg-muted/30 px-6 py-5">
                        <DialogHeader className="space-y-2 text-left">
                            <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-sm font-extrabold text-white shadow-sm">
                                        !
                                    </span>
                                    <DialogTitle className="text-lg font-bold">
                                        {currentGuide?.name ?? activeSlug}
                                    </DialogTitle>
                                    {currentGuide?.provider && (
                                        <Badge variant="secondary">
                                            {currentGuide.provider}
                                        </Badge>
                                    )}
                                </div>

                                <a
                                    href={
                                        currentGuide?.segmindUrl ??
                                        fallbackSegmindUrl
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-muted"
                                >
                                    Segmind Docs
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            </div>

                            <DialogDescription className="flex flex-wrap items-center gap-2 text-xs">
                                <span>Model Slug:</span>
                                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
                                    {activeSlug}
                                </code>
                            </DialogDescription>
                        </DialogHeader>

                        {siblingModels.length > 1 && (
                            <div className="mt-4 flex flex-wrap gap-1.5">
                                {siblingModels.map((item) => {
                                    const isCurrent = item.slug === activeSlug;
                                    return (
                                        <button
                                            key={item.slug}
                                            type="button"
                                            onClick={() =>
                                                setActiveSlug(item.slug)
                                            }
                                            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                                                isCurrent
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }`}
                                        >
                                            {item.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="space-y-5 px-6 py-5 text-sm leading-relaxed">
                        {currentGuide ? (
                            <>
                                {/* About / Summary */}
                                <div className="rounded-xl border bg-muted/20 p-4">
                                    <div className="mb-1.5 flex items-center gap-2 font-semibold text-foreground">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                        <span>
                                            ဒီ Model က ဘာအတွက်လဲ (About)
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground">
                                        {currentGuide.summary}
                                    </p>
                                </div>

                                {/* Key Features */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 font-semibold text-foreground">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        <span>
                                            အဓိက စွမ်းဆောင်ရည်များ (Key
                                            Features)
                                        </span>
                                    </div>
                                    <ul className="space-y-1.5 pl-1">
                                        {currentGuide.keyFeatures.map(
                                            (feat, idx) => (
                                                <li
                                                    key={idx}
                                                    className="flex items-start gap-2 text-muted-foreground"
                                                >
                                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                                    <span>{feat}</span>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </div>

                                {/* Best Use Cases */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 font-semibold text-foreground">
                                        <Target className="h-4 w-4 text-sky-500" />
                                        <span>
                                            ဘယ်အရာတွေအတွက် သုံးသင့်သလဲ (Best
                                            Use Cases)
                                        </span>
                                    </div>
                                    <ul className="space-y-1.5 pl-1">
                                        {currentGuide.bestUseCases.map(
                                            (useCase, idx) => (
                                                <li
                                                    key={idx}
                                                    className="flex items-start gap-2 text-muted-foreground"
                                                >
                                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                                                    <span>{useCase}</span>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </div>

                                {/* Prompt & Usage Tips */}
                                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                                    <div className="mb-2 flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
                                        <Lightbulb className="h-4 w-4" />
                                        <span>
                                            အသုံးပြုပုံနှင့် Prompt
                                            အကြံပြုချက်များ (Tips)
                                        </span>
                                    </div>
                                    <ul className="space-y-1.5">
                                        {currentGuide.promptTips.map(
                                            (tip, idx) => (
                                                <li
                                                    key={idx}
                                                    className="flex items-start gap-2 text-muted-foreground"
                                                >
                                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                                                    <span>{tip}</span>
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                </div>
                            </>
                        ) : (
                            <div className="rounded-xl border bg-muted/20 p-4 text-muted-foreground">
                                <p>
                                    ဒီ Model ({activeSlug}) အတွက်
                                    အသေးစိတ်လမ်းညွှန်ကို Segmind Docs တွင်
                                    တိုက်ရိုက် ကြည့်ရှုနိုင်ပါသည်။
                                </p>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                            {onSelectModel && activeSlug !== model && (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                        onSelectModel(activeSlug);
                                        setOpen(false);
                                    }}
                                >
                                    ဒီ Model ကို ရွေးသုံးမည်
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setOpen(false)}
                            >
                                ပိတ်မည်
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
