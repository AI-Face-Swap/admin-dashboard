import { Link } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    Check,
    Copy,
    Edit3,
    Film,
    GripVertical,
    Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TemplateItem } from './types';

interface TemplateCardProps {
    template: TemplateItem;
    index: number;
    totalItems: number;
    canManage: boolean;
    copiedSlugId: number | null;
    isDragging: boolean;
    isDragOver: boolean;
    onSelect: (template: TemplateItem) => void;
    onCopySlug: (e: React.MouseEvent, template: TemplateItem) => void;
    onDelete: (e: React.MouseEvent, template: TemplateItem) => void;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragEnter: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDrop: (e: React.DragEvent, index: number) => void;
    onDragEnd: () => void;
    onMoveStep: (e: React.MouseEvent, fromIndex: number, toIndex: number) => void;
}

export function TemplateCard({
    template,
    index,
    totalItems,
    canManage,
    copiedSlugId,
    isDragging,
    isDragOver,
    onSelect,
    onCopySlug,
    onDelete,
    onDragStart,
    onDragEnter,
    onDragOver,
    onDrop,
    onDragEnd,
    onMoveStep,
}: TemplateCardProps) {
    const effectivePoints =
        template.effective_cost ??
        Math.max(0, template.cost - (template.discount_cost ?? 0));
    const hasDiscount = (template.discount_cost ?? 0) > 0;
    const isManualCost =
        template.manual_cost !== null && template.manual_cost !== undefined;

    return (
        <div
            draggable={canManage}
            onDragStart={(e) => onDragStart(e, index)}
            onDragEnter={(e) => onDragEnter(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDrop={(e) => onDrop(e, index)}
            onDragEnd={onDragEnd}
            onClick={() => onSelect(template)}
            className={`group relative overflow-hidden rounded-2xl border bg-card shadow-xs transition-all duration-200 ${
                canManage ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
            } ${
                isDragging
                    ? 'scale-95 border-primary opacity-45 ring-2 ring-primary/50'
                    : isDragOver
                      ? 'scale-[1.02] border-amber-400 ring-2 ring-amber-400/70 shadow-2xl'
                      : 'border-border/70 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl'
            }`}
        >
            {/* MEDIA CONTAINER */}
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted/40">
                {template.type === 'video' && !template.thumbnail_url ? (
                    <video
                        src={template.file_url}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        draggable={false}
                        onMouseOver={(e) =>
                            e.currentTarget.play().catch(() => {})
                        }
                        onMouseOut={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                        }}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <img
                        src={template.thumbnail_url ?? template.file_url}
                        alt={template.name}
                        loading="lazy"
                        draggable={false}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                )}

                {/* Subtle Top Gradient for Badges */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/65 via-black/25 to-transparent" />

                {/* Top-Left Badges (Drag Handle + Order # + Status + Type) */}
                <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                    <span
                        className="inline-flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300 backdrop-blur-md"
                        title={
                            canManage
                                ? 'Drag card to reorder'
                                : `Order #${index + 1}`
                        }
                    >
                        {canManage && (
                            <GripVertical className="h-3 w-3 text-zinc-300" />
                        )}
                        #{index + 1}
                    </span>

                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md ${
                            template.is_active
                                ? 'bg-emerald-500/85 text-white'
                                : 'bg-zinc-800/85 text-zinc-300'
                        }`}
                    >
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${
                                template.is_active ? 'bg-white' : 'bg-zinc-400'
                            }`}
                        />
                        {template.is_active ? 'Active' : 'Hidden'}
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
                                {isManualCost ? 'M' : 'AI'}
                            </span>
                        </span>
                    )}
                </div>

                {/* Hover Action Overlay */}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <button
                        type="button"
                        onClick={(e) => onCopySlug(e, template)}
                        className="inline-flex max-w-[130px] items-center gap-1 truncate rounded-full bg-white/20 px-2.5 py-1 font-mono text-[11px] font-medium text-white backdrop-blur-md transition hover:bg-white/30"
                        title="Copy slug for API"
                    >
                        {copiedSlugId === template.id ? (
                            <>
                                <Check className="h-3 w-3 shrink-0 text-emerald-400" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                    {template.slug}
                                </span>
                            </>
                        )}
                    </button>

                    <div className="flex items-center gap-1">
                        {canManage && (
                            <>
                                <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={(e) =>
                                        onMoveStep(e, index, index - 1)
                                    }
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white shadow-xs transition hover:bg-black disabled:opacity-30"
                                    title="Move Forward / Up"
                                >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    disabled={index >= totalItems - 1}
                                    onClick={(e) =>
                                        onMoveStep(e, index, index + 1)
                                    }
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white shadow-xs transition hover:bg-black disabled:opacity-30"
                                    title="Move Backward / Down"
                                >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                </button>
                                <Link
                                    href={`/admin/templates/${template.id}/edit`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-xs transition hover:bg-white"
                                    title="Edit Template"
                                >
                                    <Edit3 className="h-3.5 w-3.5" />
                                </Link>
                                <button
                                    type="button"
                                    onClick={(e) => onDelete(e, template)}
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

                {template.prompt && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        “{template.prompt}”
                    </p>
                )}

                {(template.model ||
                    template.ai_model ||
                    template.aspect_ratio) && (
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {(template.ai_model?.name || template.model) && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary">
                                {template.ai_model?.name ?? template.model}
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

                {template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                        {template.tags.slice(0, 4).map((tag) => (
                            <span
                                key={tag.id}
                                className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                            >
                                #{tag.name}
                            </span>
                        ))}
                        {template.tags.length > 4 && (
                            <span className="text-[10px] text-muted-foreground">
                                +{template.tags.length - 4}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
