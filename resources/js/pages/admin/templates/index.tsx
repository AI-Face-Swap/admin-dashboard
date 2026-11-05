import { Head, Link, router } from '@inertiajs/react';
import {
    Check,
    Copy,
    Edit3,
    Eye,
    Film,
    FolderOpen,
    Image as ImageIcon,
    Layers,
    Loader2,
    Plus,
    RotateCcw,
    Search,
    Sparkles,
    Tag,
    Trash2,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/use-permissions';
import admin from '@/routes/admin';

type TemplateCategory = { id: number; name: string; slug: string };

type Template = {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    type: 'image' | 'video';
    file_url: string;
    thumbnail_url: string | null;
    model?: string | null;
    prompt?: string | null;
    negative_prompt?: string | null;
    aspect_ratio?: string | null;
    resolution?: string | null;
    seed?: string | null;
    cost: number;
    manual_cost?: number | null;
    discount_cost?: number;
    effective_cost?: number;
    is_active: boolean;
    category: { id: number; name: string; slug?: string } | null;
    generation_type?: { id: number; name: string; slug: string } | null;
    ai_model?: {
        id: number;
        name: string;
        provider_name: string;
        model_name: string;
        coin_cost: number;
    } | null;
    tags: { id: number; name: string }[];
};

type PaginatedTemplates = {
    data: Template[];
    current_page: number;
    last_page: number;
    total: number;
    next_page_url: string | null;
};

type Props = {
    templates: PaginatedTemplates;
    categories: TemplateCategory[];
    filters: { search?: string; category?: string; type?: string };
};

export default function Index({ templates, categories, filters }: Props) {
    const { can } = usePermissions();
    const [search, setSearch] = useState(filters.search ?? '');
    const [category, setCategory] = useState(filters.category ?? 'all');
    const [typeFilter, setTypeFilter] = useState(filters.type ?? 'all');

    // Infinite scroll state
    const [items, setItems] = useState<Template[]>(templates.data);
    const [currentPage, setCurrentPage] = useState<number>(
        templates.current_page ?? 1,
    );
    const [lastPage, setLastPage] = useState<number>(templates.last_page ?? 1);
    const [totalCount, setTotalCount] = useState<number>(
        templates.total ?? templates.data.length,
    );
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Lightbox modal & copy states
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
        null,
    );
    const [copiedSlugId, setCopiedSlugId] = useState<number | null>(null);
    const [copiedPrompt, setCopiedPrompt] = useState(false);

    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync state when Inertia props update (e.g., on filter change or deletion)
    useEffect(() => {
        setItems(templates.data);
        setCurrentPage(templates.current_page ?? 1);
        setLastPage(templates.last_page ?? 1);
        setTotalCount(templates.total ?? templates.data.length);
    }, [templates]);

    const applyFilters = useCallback(
        (next: { search?: string; category?: string; type?: string }) => {
            const nextSearch = next.search !== undefined ? next.search : search;
            const nextCategory =
                next.category !== undefined ? next.category : category;
            const nextType = next.type !== undefined ? next.type : typeFilter;

            router.get(
                '/admin/templates',
                {
                    search: nextSearch || undefined,
                    category:
                        nextCategory && nextCategory !== 'all'
                            ? nextCategory
                            : undefined,
                    type:
                        nextType && nextType !== 'all' ? nextType : undefined,
                },
                { preserveState: true, preserveScroll: false, replace: true },
            );
        },
        [search, category, typeFilter],
    );

    const handleSearchChange = (value: string) => {
        setSearch(value);
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            applyFilters({ search: value });
        }, 300);
    };

    const loadMore = useCallback(async () => {
        if (isLoadingMore || currentPage >= lastPage) return;

        setIsLoadingMore(true);
        try {
            const nextPage = currentPage + 1;
            const params = new URLSearchParams();
            params.set('page', String(nextPage));
            params.set('json', '1');
            if (search) params.set('search', search);
            if (category && category !== 'all')
                params.set('category', category);
            if (typeFilter && typeFilter !== 'all')
                params.set('type', typeFilter);

            const res = await fetch(`/admin/templates?${params.toString()}`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (res.ok) {
                const payload: { templates: PaginatedTemplates } =
                    await res.json();
                const paged = payload.templates;
                setItems((prev) => {
                    const existingIds = new Set(prev.map((i) => i.id));
                    const newItems = paged.data.filter(
                        (i) => !existingIds.has(i.id),
                    );
                    return [...prev, ...newItems];
                });
                setCurrentPage(paged.current_page);
                setLastPage(paged.last_page);
                setTotalCount(paged.total);
            }
        } catch {
            // Silent fallback — user can click Load More button
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, currentPage, lastPage, search, category, typeFilter]);

    // IntersectionObserver for Infinite Scroll
    useEffect(() => {
        const sentinel = loadMoreRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (
                    first?.isIntersecting &&
                    currentPage < lastPage &&
                    !isLoadingMore
                ) {
                    loadMore();
                }
            },
            { rootMargin: '350px' },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadMore, currentPage, lastPage, isLoadingMore]);

    const handleCopySlug = (e: React.MouseEvent, template: Template) => {
        e.stopPropagation();
        navigator.clipboard.writeText(template.slug);
        setCopiedSlugId(template.id);
        setTimeout(() => setCopiedSlugId(null), 1600);
    };

    const handleCopyPrompt = (promptText: string) => {
        navigator.clipboard.writeText(promptText);
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 1600);
    };

    const handleDelete = (e: React.MouseEvent, template: Template) => {
        e.stopPropagation();
        if (confirm(`Delete template "${template.name}"?`)) {
            router.delete(`/admin/templates/${template.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setItems((prev) =>
                        prev.filter((item) => item.id !== template.id),
                    );
                    setTotalCount((c) => Math.max(0, c - 1));
                    if (selectedTemplate?.id === template.id) {
                        setSelectedTemplate(null);
                    }
                },
            });
        }
    };

    return (
        <>
            <Head title="Templates" />

            <div className="flex w-full flex-1 flex-col gap-5 p-4 md:p-6">
                {/* TOP HEADER */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <Heading
                            title="Templates Gallery"
                            description="Pinterest-style visual library for Face Swap, Image Editing, and Video Templates."
                        />
                        <Badge
                            variant="secondary"
                            className="h-6 px-2.5 font-mono text-xs"
                        >
                            {items.length} / {totalCount} Templates
                        </Badge>
                    </div>

                    {can('templates.manage') && (
                        <div className="flex flex-wrap items-center gap-2">
                            <Link href="/admin/template-categories">
                                <AnimatedButton
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5"
                                >
                                    <FolderOpen className="h-4 w-4" />
                                    Categories
                                </AnimatedButton>
                            </Link>
                            <Link href="/admin/template-tags">
                                <AnimatedButton
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5"
                                >
                                    <Tag className="h-4 w-4" />
                                    Tags
                                </AnimatedButton>
                            </Link>
                            <Link href="/admin/templates/create">
                                <AnimatedButton size="sm" className="gap-1.5">
                                    <Plus className="h-4 w-4" />
                                    Upload Template
                                </AnimatedButton>
                            </Link>
                        </div>
                    )}
                </div>

                {/* PINTEREST-STYLE STICKY FILTER & CATEGORY BAR */}
                <div className="space-y-3 rounded-2xl border bg-card/80 p-4 shadow-xs backdrop-blur-md">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        {/* Search Box */}
                        <div className="relative w-full max-w-md">
                            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, slug, prompt, or #tag..."
                                value={search}
                                onChange={(e) =>
                                    handleSearchChange(e.target.value)
                                }
                                className="rounded-full pr-9 pl-9"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => handleSearchChange('')}
                                    className="absolute top-2.5 right-3 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Type Segmented Tabs + Reset */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-1 rounded-full border bg-muted/40 p-1">
                                {[
                                    {
                                        id: 'all',
                                        label: 'All',
                                        icon: <Layers className="h-3.5 w-3.5" />,
                                    },
                                    {
                                        id: 'image',
                                        label: 'Images',
                                        icon: (
                                            <ImageIcon className="h-3.5 w-3.5" />
                                        ),
                                    },
                                    {
                                        id: 'video',
                                        label: 'Videos',
                                        icon: <Film className="h-3.5 w-3.5" />,
                                    },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => {
                                            setTypeFilter(tab.id);
                                            applyFilters({ type: tab.id });
                                        }}
                                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                            typeFilter === tab.id
                                                ? 'bg-primary text-primary-foreground shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {(search ||
                                category !== 'all' ||
                                typeFilter !== 'all') && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-1 rounded-full px-3 text-xs text-muted-foreground"
                                    onClick={() => {
                                        setSearch('');
                                        setCategory('all');
                                        setTypeFilter('all');
                                        applyFilters({
                                            search: '',
                                            category: 'all',
                                            type: 'all',
                                        });
                                    }}
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Reset
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Pinterest Category Pills */}
                    {categories.length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setCategory('all');
                                    applyFilters({ category: 'all' });
                                }}
                                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                    category === 'all'
                                        ? 'bg-foreground text-background shadow-xs'
                                        : 'border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                All Categories
                            </button>
                            {categories.map((cat) => {
                                const active = category === String(cat.id);
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => {
                                            const nextCat = String(cat.id);
                                            setCategory(nextCat);
                                            applyFilters({ category: nextCat });
                                        }}
                                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                            active
                                                ? 'bg-foreground text-background shadow-xs'
                                                : 'border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                    >
                                        {cat.name}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* EMPTY STATE */}
                {items.length === 0 && (
                    <AnimatedCard>
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <Sparkles className="mb-3 h-10 w-10 text-muted-foreground/50" />
                            <p className="text-base font-semibold">
                                No templates found
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Try adjusting your search or category filter, or
                                upload a new template.
                            </p>
                        </CardContent>
                    </AnimatedCard>
                )}

                {/* PINTEREST MASONRY GRID */}
                {items.length > 0 && (
                    <div className="columns-1 gap-4 space-y-4 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5">
                        {items.map((template) => {
                            const effectivePoints =
                                template.effective_cost ??
                                Math.max(
                                    0,
                                    template.cost -
                                        (template.discount_cost ?? 0),
                                );
                            const hasDiscount =
                                (template.discount_cost ?? 0) > 0;
                            const isManualCost =
                                template.manual_cost !== null &&
                                template.manual_cost !== undefined;

                            return (
                                <div
                                    key={template.id}
                                    onClick={() =>
                                        setSelectedTemplate(template)
                                    }
                                    className="group relative break-inside-avoid overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl cursor-pointer"
                                >
                                    {/* MEDIA CONTAINER (Natural Aspect Ratio like Pinterest) */}
                                    <div className="relative w-full overflow-hidden bg-muted/40">
                                        {template.type === 'video' &&
                                        !template.thumbnail_url ? (
                                            <video
                                                src={template.file_url}
                                                muted
                                                loop
                                                playsInline
                                                preload="metadata"
                                                onMouseOver={(e) =>
                                                    e.currentTarget
                                                        .play()
                                                        .catch(() => {})
                                                }
                                                onMouseOut={(e) => {
                                                    e.currentTarget.pause();
                                                    e.currentTarget.currentTime = 0;
                                                }}
                                                className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <img
                                                src={
                                                    template.thumbnail_url ??
                                                    template.file_url
                                                }
                                                alt={template.name}
                                                loading="lazy"
                                                className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        )}

                                        {/* Subtle Top Gradient for Badges */}
                                        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 via-black/20 to-transparent" />

                                        {/* Top-Left Badges (Status + Type) */}
                                        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md ${
                                                    template.is_active
                                                        ? 'bg-emerald-500/85 text-white'
                                                        : 'bg-zinc-800/85 text-zinc-300'
                                                }`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${
                                                        template.is_active
                                                            ? 'bg-white'
                                                            : 'bg-zinc-400'
                                                    }`}
                                                />
                                                {template.is_active
                                                    ? 'Active'
                                                    : 'Hidden'}
                                            </span>

                                            {template.type === 'video' && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-medium text-amber-300 backdrop-blur-md">
                                                    <Film className="h-3 w-3" />
                                                    Video
                                                </span>
                                            )}
                                        </div>

                                        {/* Top-Right Point Cost Pill */}
                                        <div className="absolute top-3 right-3">
                                            {hasDiscount ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-black/75 px-2.5 py-0.5 text-xs font-bold text-amber-300 backdrop-blur-md">
                                                    <span className="text-[10px] text-zinc-400 line-through">
                                                        {template.cost}
                                                    </span>
                                                    🪙 {effectivePoints}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-md">
                                                    🪙 {template.cost}
                                                    <span className="text-[9px] font-normal text-zinc-300">
                                                        {isManualCost
                                                            ? 'M'
                                                            : 'AI'}
                                                    </span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Hover Action Overlay (Pinterest Pin Hover Bar) */}
                                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                            <button
                                                type="button"
                                                onClick={(e) =>
                                                    handleCopySlug(e, template)
                                                }
                                                className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 font-mono text-[11px] font-medium text-white backdrop-blur-md transition hover:bg-white/30"
                                                title="Copy slug for API"
                                            >
                                                {copiedSlugId ===
                                                template.id ? (
                                                    <>
                                                        <Check className="h-3 w-3 text-emerald-400" />
                                                        Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-3 w-3" />
                                                        {template.slug}
                                                    </>
                                                )}
                                            </button>

                                            <div className="flex items-center gap-1">
                                                {can('templates.manage') && (
                                                    <>
                                                        <Link
                                                            href={`/admin/templates/${template.id}/edit`}
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-xs transition hover:bg-white"
                                                            title="Edit Template"
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5" />
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            onClick={(e) =>
                                                                handleDelete(
                                                                    e,
                                                                    template,
                                                                )
                                                            }
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-500/90 text-white shadow-xs transition hover:bg-red-600"
                                                            title="Delete Template"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* PIN FOOTER INFO */}
                                    <div className="space-y-2 p-3.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <h3 className="truncate text-sm font-bold text-foreground group-hover:text-primary">
                                                    {template.name}
                                                </h3>
                                                <p className="truncate font-mono text-[11px] text-muted-foreground">
                                                    /{template.slug}
                                                </p>
                                            </div>
                                            {template.category && (
                                                <Badge
                                                    variant="secondary"
                                                    className="shrink-0 rounded-full px-2 py-0 text-[10px]"
                                                >
                                                    {template.category.name}
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Prompt Snippet if present */}
                                        {template.prompt && (
                                            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                                “{template.prompt}”
                                            </p>
                                        )}

                                        {/* Model & Aspect Ratio Info */}
                                        {(template.model ||
                                            template.ai_model ||
                                            template.aspect_ratio) && (
                                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                                {(template.ai_model?.name ||
                                                    template.model) && (
                                                    <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary">
                                                        {template.ai_model
                                                            ?.name ??
                                                            template.model}
                                                    </span>
                                                )}
                                                {template.aspect_ratio && (
                                                    <span className="rounded border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                                        {template.aspect_ratio}
                                                    </span>
                                                )}
                                                {template.resolution && (
                                                    <span className="rounded border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                                        {template.resolution}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Tags */}
                                        {template.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 pt-0.5">
                                                {template.tags
                                                    .slice(0, 4)
                                                    .map((tag) => (
                                                        <span
                                                            key={tag.id}
                                                            className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                                                        >
                                                            #{tag.name}
                                                        </span>
                                                    ))}
                                                {template.tags.length > 4 && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        +
                                                        {template.tags.length -
                                                            4}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* INFINITE SCROLL SENTINEL & FOOTER */}
                <div
                    ref={loadMoreRef}
                    className="flex flex-col items-center justify-center py-8"
                >
                    {isLoadingMore && (
                        <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-xs font-medium text-muted-foreground shadow-xs">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            Loading more templates...
                        </div>
                    )}

                    {!isLoadingMore && currentPage < lastPage && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={loadMore}
                            className="rounded-full px-6"
                        >
                            Load More Templates ({items.length} of {totalCount})
                        </Button>
                    )}

                    {!isLoadingMore &&
                        items.length > 0 &&
                        currentPage >= lastPage && (
                            <p className="text-xs text-muted-foreground">
                                ✨ You’ve reached the end ({items.length}{' '}
                                templates shown)
                            </p>
                        )}
                </div>
            </div>

            {/* PINTEREST-STYLE LIGHTBOX PREVIEW MODAL */}
            <Dialog
                open={!!selectedTemplate}
                onOpenChange={(open) => !open && setSelectedTemplate(null)}
            >
                <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-0">
                    {selectedTemplate && (
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            {/* Left: Full Media Preview */}
                            <div className="flex items-center justify-center bg-black/90 p-4 md:min-h-[420px]">
                                {selectedTemplate.type === 'video' ? (
                                    <video
                                        src={selectedTemplate.file_url}
                                        controls
                                        autoPlay
                                        loop
                                        className="max-h-[70vh] w-full rounded-lg object-contain"
                                    />
                                ) : (
                                    <img
                                        src={selectedTemplate.file_url}
                                        alt={selectedTemplate.name}
                                        className="max-h-[70vh] w-full rounded-lg object-contain"
                                    />
                                )}
                            </div>

                            {/* Right: Pin Details & Actions */}
                            <div className="flex flex-col justify-between p-6">
                                <div className="space-y-4">
                                    <DialogHeader>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={
                                                    selectedTemplate.is_active
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                            >
                                                {selectedTemplate.is_active
                                                    ? 'Active'
                                                    : 'Hidden'}
                                            </Badge>
                                            <Badge variant="outline">
                                                {selectedTemplate.type}
                                            </Badge>
                                            {selectedTemplate.category && (
                                                <Badge variant="secondary">
                                                    {
                                                        selectedTemplate
                                                            .category.name
                                                    }
                                                </Badge>
                                            )}
                                        </div>
                                        <DialogTitle className="mt-2 text-xl font-bold">
                                            {selectedTemplate.name}
                                        </DialogTitle>
                                        <DialogDescription className="flex items-center gap-2 font-mono text-xs">
                                            <span>
                                                slug: {selectedTemplate.slug}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) =>
                                                    handleCopySlug(
                                                        e,
                                                        selectedTemplate,
                                                    )
                                                }
                                                className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] text-foreground hover:bg-muted"
                                            >
                                                {copiedSlugId ===
                                                selectedTemplate.id ? (
                                                    <>
                                                        <Check className="h-3 w-3 text-emerald-500" />
                                                        Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-3 w-3" />
                                                        Copy
                                                    </>
                                                )}
                                            </button>
                                        </DialogDescription>
                                    </DialogHeader>

                                    {/* Cost & Model Card */}
                                    <div className="grid grid-cols-2 gap-2.5 rounded-xl border bg-muted/30 p-3 text-xs">
                                        <div>
                                            <span className="block text-[10px] text-muted-foreground uppercase">
                                                Point Cost
                                            </span>
                                            <span className="font-bold text-foreground">
                                                🪙{' '}
                                                {selectedTemplate.effective_cost ??
                                                    selectedTemplate.cost}{' '}
                                                pts
                                            </span>
                                            <span className="ml-1 text-[10px] text-muted-foreground">
                                                (
                                                {selectedTemplate.manual_cost !==
                                                    null &&
                                                selectedTemplate.manual_cost !==
                                                    undefined
                                                    ? 'Manual'
                                                    : 'Model'}
                                                )
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] text-muted-foreground uppercase">
                                                AI Model
                                            </span>
                                            <span className="font-mono font-semibold text-primary">
                                                {selectedTemplate.ai_model
                                                    ?.name ??
                                                    selectedTemplate.model ??
                                                    'Default'}
                                            </span>
                                        </div>
                                        {selectedTemplate.aspect_ratio && (
                                            <div>
                                                <span className="block text-[10px] text-muted-foreground uppercase">
                                                    Aspect Ratio
                                                </span>
                                                <span className="font-mono font-semibold">
                                                    {
                                                        selectedTemplate.aspect_ratio
                                                    }
                                                </span>
                                            </div>
                                        )}
                                        {selectedTemplate.resolution && (
                                            <div>
                                                <span className="block text-[10px] text-muted-foreground uppercase">
                                                    Resolution
                                                </span>
                                                <span className="font-mono font-semibold">
                                                    {
                                                        selectedTemplate.resolution
                                                    }
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Prompt */}
                                    {selectedTemplate.prompt && (
                                        <div className="rounded-xl border bg-muted/20 p-3">
                                            <div className="mb-1 flex items-center justify-between">
                                                <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                                                    Prompt
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleCopyPrompt(
                                                            selectedTemplate.prompt!,
                                                        )
                                                    }
                                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                                >
                                                    {copiedPrompt ? (
                                                        <>
                                                            <Check className="h-3 w-3 text-emerald-500" />
                                                            Copied
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="h-3 w-3" />
                                                            Copy Prompt
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                            <p className="max-h-36 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap text-foreground">
                                                {selectedTemplate.prompt}
                                            </p>
                                        </div>
                                    )}

                                    {/* Tags */}
                                    {selectedTemplate.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedTemplate.tags.map(
                                                (tag) => (
                                                    <span
                                                        key={tag.id}
                                                        className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                                                    >
                                                        #{tag.name}
                                                    </span>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Footer Actions */}
                                {can('templates.manage') && (
                                    <div className="mt-6 flex items-center justify-end gap-2 border-t pt-4">
                                        <Link
                                            href={`/admin/templates/${selectedTemplate.id}/edit`}
                                        >
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="gap-1.5"
                                            >
                                                <Edit3 className="h-4 w-4" />
                                                Edit Template
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="gap-1.5"
                                            onClick={(e) =>
                                                handleDelete(
                                                    e,
                                                    selectedTemplate,
                                                )
                                            }
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Templates', href: admin.templates.index() }],
};
