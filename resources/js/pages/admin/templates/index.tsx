import { Head, Link, router } from '@inertiajs/react';
import {
    Check,
    Film,
    FolderOpen,
    GripVertical,
    Image as ImageIcon,
    Layers,
    Loader2,
    Plus,
    RotateCcw,
    Search,
    Sparkles,
    Tag,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TemplateCard } from '@/components/admin/templates/TemplateCard';
import { TemplateLightboxModal } from '@/components/admin/templates/TemplateLightboxModal';
import type {
    PaginatedTemplates,
    TemplateCategory,
    TemplateItem,
} from '@/components/admin/templates/types';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/use-permissions';
import admin from '@/routes/admin';

type Props = {
    templates: PaginatedTemplates;
    categories: TemplateCategory[];
    filters: { search?: string; category?: string; type?: string };
};

export default function Index({ templates, categories, filters }: Props) {
    const { can } = usePermissions();
    const canManage = can('templates.manage');

    const [search, setSearch] = useState(filters.search ?? '');
    const [category, setCategory] = useState(filters.category ?? 'all');
    const [typeFilter, setTypeFilter] = useState(filters.type ?? 'all');

    const [items, setItems] = useState<TemplateItem[]>(templates.data);
    const [currentPage, setCurrentPage] = useState<number>(
        templates.current_page ?? 1,
    );
    const [lastPage, setLastPage] = useState<number>(templates.last_page ?? 1);
    const [totalCount, setTotalCount] = useState<number>(
        templates.total ?? templates.data.length,
    );
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Drag & Drop states
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [saveStatus, setSaveStatus] = useState<
        'idle' | 'saving' | 'saved' | 'error'
    >('idle');
    const dragIndexRef = useRef<number | null>(null);
    const didReorderRef = useRef(false);
    const itemsRef = useRef<TemplateItem[]>(templates.data);

    // Lightbox & copy states
    const [selectedTemplate, setSelectedTemplate] =
        useState<TemplateItem | null>(null);
    const [copiedSlugId, setCopiedSlugId] = useState<number | null>(null);

    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setItems(templates.data);
        itemsRef.current = templates.data;
        setCurrentPage(templates.current_page ?? 1);
        setLastPage(templates.last_page ?? 1);
        setTotalCount(templates.total ?? templates.data.length);
    }, [templates]);

    const persistOrder = useCallback(async (orderedList: TemplateItem[]) => {
        setSaveStatus('saving');
        try {
            const res = await fetch('/admin/templates/reorder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    ordered_ids: orderedList.map((item) => item.id),
                }),
            });

            if (res.ok) {
                setSaveStatus('saved');
                setTimeout(() => {
                    setSaveStatus((prev) =>
                        prev === 'saved' ? 'idle' : prev,
                    );
                }, 2200);
            } else {
                setSaveStatus('error');
            }
        } catch {
            setSaveStatus('error');
        }
    }, []);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        if (!canManage) return;
        dragIndexRef.current = index;
        didReorderRef.current = false;
        setDragIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
    };

    const handleDragEnter = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const fromIndex = dragIndexRef.current;
        if (!canManage || fromIndex === null || fromIndex === targetIndex) {
            return;
        }

        setDragOverIndex(targetIndex);
        setItems((prev) => {
            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(targetIndex, 0, moved);
            itemsRef.current = next;
            return next;
        });

        dragIndexRef.current = targetIndex;
        setDragIndex(targetIndex);
        didReorderRef.current = true;
    };

    const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverIndex !== targetIndex) {
            setDragOverIndex(targetIndex);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragIndex(null);
        setDragOverIndex(null);
        dragIndexRef.current = null;

        if (didReorderRef.current) {
            didReorderRef.current = false;
            persistOrder(itemsRef.current);
        }
    };

    const handleDragEnd = () => {
        setDragIndex(null);
        setDragOverIndex(null);
        dragIndexRef.current = null;

        if (didReorderRef.current) {
            didReorderRef.current = false;
            persistOrder(itemsRef.current);
        }
    };

    const handleMoveStep = (
        e: React.MouseEvent,
        fromIndex: number,
        toIndex: number,
    ) => {
        e.stopPropagation();
        if (
            !canManage ||
            toIndex < 0 ||
            toIndex >= items.length ||
            fromIndex === toIndex
        ) {
            return;
        }

        const next = [...items];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        setItems(next);
        itemsRef.current = next;
        persistOrder(next);
    };

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
                    const merged = [...prev, ...newItems];
                    itemsRef.current = merged;
                    return merged;
                });
                setCurrentPage(paged.current_page);
                setLastPage(paged.last_page);
                setTotalCount(paged.total);
            }
        } catch {
            // Silent fallback
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, currentPage, lastPage, search, category, typeFilter]);

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

    const handleCopySlug = (e: React.MouseEvent, template: TemplateItem) => {
        e.stopPropagation();
        navigator.clipboard.writeText(template.slug);
        setCopiedSlugId(template.id);
        setTimeout(() => setCopiedSlugId(null), 1600);
    };

    const handleDelete = (e: React.MouseEvent, template: TemplateItem) => {
        e.stopPropagation();
        if (confirm(`Delete template "${template.name}"?`)) {
            router.delete(`/admin/templates/${template.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    setItems((prev) => {
                        const filtered = prev.filter(
                            (item) => item.id !== template.id,
                        );
                        itemsRef.current = filtered;
                        return filtered;
                    });
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
                            description="Drag and drop cards with your mouse to reorder templates."
                        />
                        <Badge
                            variant="secondary"
                            className="h-6 px-2.5 font-mono text-xs"
                        >
                            {items.length} / {totalCount} Templates
                        </Badge>
                        {canManage && (
                            <Badge
                                variant="outline"
                                className="h-6 gap-1.5 border-amber-500/30 bg-amber-500/10 px-2.5 text-xs text-amber-400"
                            >
                                <GripVertical className="h-3.5 w-3.5" />
                                Drag cards to reorder
                            </Badge>
                        )}
                        {saveStatus === 'saving' && (
                            <Badge
                                variant="outline"
                                className="h-6 gap-1.5 border-sky-500/30 bg-sky-500/10 px-2.5 text-xs text-sky-400"
                            >
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Saving order...
                            </Badge>
                        )}
                        {saveStatus === 'saved' && (
                            <Badge
                                variant="outline"
                                className="h-6 gap-1.5 border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs text-emerald-400"
                            >
                                <Check className="h-3 w-3" />
                                Order saved!
                            </Badge>
                        )}
                    </div>

                    {canManage && (
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

                {/* FILTER & CATEGORY BAR */}
                <div className="space-y-3 rounded-2xl border bg-card/80 p-4 shadow-xs backdrop-blur-md">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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

                {/* DRAGGABLE ORDERED GRID */}
                {items.length > 0 && (
                    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {items.map((template, index) => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                index={index}
                                totalItems={items.length}
                                canManage={canManage}
                                copiedSlugId={copiedSlugId}
                                isDragging={dragIndex === index}
                                isDragOver={dragOverIndex === index}
                                onSelect={setSelectedTemplate}
                                onCopySlug={handleCopySlug}
                                onDelete={handleDelete}
                                onDragStart={handleDragStart}
                                onDragEnter={handleDragEnter}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onDragEnd={handleDragEnd}
                                onMoveStep={handleMoveStep}
                            />
                        ))}
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

            <TemplateLightboxModal
                selectedTemplate={selectedTemplate}
                canManage={canManage}
                copiedSlugId={copiedSlugId}
                onClose={() => setSelectedTemplate(null)}
                onCopySlug={handleCopySlug}
                onDelete={handleDelete}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'Templates', href: admin.templates.index() }],
};
