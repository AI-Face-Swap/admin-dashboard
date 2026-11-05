import { Link, router } from '@inertiajs/react';
import {
    Activity,
    BookmarkPlus,
    ChevronDown,
    ChevronUp,
    Download,
    Eye,
    Film,
    History,
    Sparkles,
    UserCheck,
    Video,
    Wand2,
} from 'lucide-react';
import { useState } from 'react';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    extractInputMediaUrls,
    extractKeyInputParams,
    handleDownload,
    resolveGenerationModel,
    type Generation,
} from './types';

export function RecentGenerationsCard({
    generations,
    onSelectGeneration,
}: {
    generations: Generation[];
    onSelectGeneration: (generation: Generation) => void;
}) {
    const [showHistory, setShowHistory] = useState(true);
    const [operationFilter, setOperationFilter] = useState<string>('all');
    const [savingTemplateId, setSavingTemplateId] = useState<number | null>(
        null,
    );

    const filteredGenerations =
        operationFilter === 'all'
            ? generations
            : generations.filter((g) => g.operation === operationFilter);

    const handleSaveToTemplate = (
        e: React.MouseEvent,
        generationId: number,
    ) => {
        e.stopPropagation();
        setSavingTemplateId(generationId);
        router.post(
            `/admin/templates/from-generation/${generationId}`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setSavingTemplateId(null),
            },
        );
    };

    const getOperationBadge = (operation: string) => {
        switch (operation) {
            case 'image-generation':
            case 'text-to-image':
                return (
                    <Badge className="border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        <Sparkles className="mr-1 inline h-3 w-3" />{' '}
                        Text-to-Image
                    </Badge>
                );
            case 'image-editing':
            case 'image-edit':
                return (
                    <Badge className="border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <Wand2 className="mr-1 inline h-3 w-3" /> Image Edit
                    </Badge>
                );
            case 'image-to-video':
                return (
                    <Badge className="border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Film className="mr-1 inline h-3 w-3" /> Image-to-Video
                    </Badge>
                );
            case 'face-swap':
                return (
                    <Badge className="border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                        <UserCheck className="mr-1 inline h-3 w-3" /> Face Swap
                    </Badge>
                );
            case 'video-face-swap':
                return (
                    <Badge className="border border-pink-500/30 bg-pink-500/10 text-pink-600 dark:text-pink-400">
                        <Video className="mr-1 inline h-3 w-3" /> Video Swap
                    </Badge>
                );
            default:
                return <Badge variant="outline">{operation}</Badge>;
        }
    };

    return (
        <AnimatedCard className="w-full">
            <CardContent className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <History className="h-5 w-5 text-muted-foreground" />
                        <p className="text-base font-bold">
                            Recent Generations (နောက်ဆုံးထုတ်ထားသော ပုံ/ဗီဒီယိုများ)
                        </p>
                        <Badge
                            variant="secondary"
                            className="px-2 py-0.5 text-xs"
                        >
                            {filteredGenerations.length}
                        </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/admin/queue"
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 text-xs font-semibold text-primary transition hover:bg-primary/10"
                        >
                            <Activity className="h-3.5 w-3.5" />
                            Queue Monitor &amp; Full History →
                        </Link>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 gap-1.5 px-3 text-sm"
                            onClick={() => setShowHistory((v) => !v)}
                        >
                            {showHistory ? (
                                <>
                                    Hide <ChevronUp className="h-4 w-4" />
                                </>
                            ) : (
                                <>
                                    Show <ChevronDown className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {showHistory && (
                    <>
                        {/* Quick Operation Filter Pills */}
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            {[
                                { id: 'all', label: 'All (အားလုံး)' },
                                {
                                    id: 'image-editing',
                                    label: 'Image Editing',
                                },
                                {
                                    id: 'image-generation',
                                    label: 'Text-to-Image',
                                },
                                {
                                    id: 'image-to-video',
                                    label: 'Image-to-Video',
                                },
                                { id: 'face-swap', label: 'Face Swap' },
                                {
                                    id: 'video-face-swap',
                                    label: 'Video Swap',
                                },
                            ].map((pill) => (
                                <button
                                    key={pill.id}
                                    type="button"
                                    onClick={() => setOperationFilter(pill.id)}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                                        operationFilter === pill.id
                                            ? 'bg-primary text-primary-foreground shadow-xs'
                                            : 'border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                >
                                    {pill.label}
                                </button>
                            ))}
                        </div>

                        <div className="mt-3 max-h-[540px] overflow-x-hidden overflow-y-auto rounded-xl border">
                            <Table className="w-full table-fixed">
                                <TableHeader className="sticky top-0 z-10 bg-background shadow-2xs">
                                    <TableRow>
                                        <TableHead className="w-[12%] px-3 py-2.5 text-xs font-semibold">
                                            ID / Status
                                        </TableHead>
                                        <TableHead className="w-[18%] px-3 py-2.5 text-xs font-semibold">
                                            Operation &amp; Model
                                        </TableHead>
                                        <TableHead className="w-[36%] px-3 py-2.5 text-xs font-semibold">
                                            Input Fields (Prompt &amp; Params)
                                        </TableHead>
                                        <TableHead className="w-[8%] px-2 py-2.5 text-center text-xs font-semibold">
                                            Output
                                        </TableHead>
                                        <TableHead className="w-[14%] px-3 py-2.5 text-xs font-semibold">
                                            API Cost &amp; Time
                                        </TableHead>
                                        <TableHead className="w-[12%] px-3 py-2.5 text-right text-xs font-semibold">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredGenerations.map((generation) => {
                                        const modelName =
                                            resolveGenerationModel(generation);
                                        const inputMedia =
                                            extractInputMediaUrls(
                                                generation.input_metadata,
                                            );
                                        const keyParams = extractKeyInputParams(
                                            generation.input_metadata,
                                        );
                                        const promptText =
                                            generation.input_metadata?.prompt ||
                                            generation.input_metadata
                                                ?.prompt_enhancement ||
                                            null;
                                        const firstOutput =
                                            generation.output_metadata?.[0] ??
                                            null;
                                        const isVideoOutput =
                                            firstOutput &&
                                            (firstOutput.endsWith('.mp4') ||
                                                firstOutput.endsWith('.webm') ||
                                                firstOutput.endsWith('.mov') ||
                                                generation.operation.includes(
                                                    'video',
                                                ));

                                        return (
                                            <TableRow
                                                key={generation.id}
                                                className="cursor-pointer text-sm hover:bg-muted/50"
                                                onClick={() =>
                                                    onSelectGeneration(
                                                        generation,
                                                    )
                                                }
                                            >
                                                {/* 1. ID & STATUS */}
                                                <TableCell className="px-3 py-2.5 align-top whitespace-normal">
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="font-mono text-xs font-bold text-primary">
                                                            #{generation.id}
                                                        </span>
                                                        <Badge
                                                            variant={
                                                                generation.status ===
                                                                'completed'
                                                                    ? 'default'
                                                                    : generation.status ===
                                                                        'failed'
                                                                      ? 'destructive'
                                                                      : 'secondary'
                                                            }
                                                            className="px-2 py-0.5 text-[11px]"
                                                        >
                                                            {generation.status}
                                                        </Badge>
                                                    </div>
                                                </TableCell>

                                                {/* 2. OPERATION & MODEL */}
                                                <TableCell className="px-3 py-2.5 align-top whitespace-normal">
                                                    <div className="flex flex-col items-start gap-1">
                                                        {getOperationBadge(
                                                            generation.operation,
                                                        )}
                                                        <code className="max-w-full truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                                                            {modelName}
                                                        </code>
                                                        {generation.template && (
                                                            <span className="w-full truncate text-[11px] text-muted-foreground">
                                                                {
                                                                    generation
                                                                        .template
                                                                        .name
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* 3. INPUT FIELDS (PROMPT + INPUT THUMBNAILS + PARAMS) */}
                                                <TableCell className="px-3 py-2.5 align-top whitespace-normal">
                                                    <div className="flex flex-col gap-1.5">
                                                        {promptText ? (
                                                            <p
                                                                className="line-clamp-2 break-words text-xs font-medium leading-relaxed text-foreground"
                                                                title={
                                                                    promptText
                                                                }
                                                            >
                                                                “{promptText}”
                                                            </p>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">
                                                                {generation
                                                                    .template
                                                                    ?.name ||
                                                                    'Template / Face Swap'}
                                                            </span>
                                                        )}

                                                        {inputMedia.length >
                                                            0 && (
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                {inputMedia
                                                                    .slice(0, 3)
                                                                    .map(
                                                                        (
                                                                            media,
                                                                            idx,
                                                                        ) => (
                                                                            <div
                                                                                key={
                                                                                    idx
                                                                                }
                                                                                className="flex items-center gap-1 rounded border bg-muted/40 p-0.5 pr-1.5 text-[10px]"
                                                                            >
                                                                                {media.type ===
                                                                                'image' ? (
                                                                                    <img
                                                                                        src={
                                                                                            media.url
                                                                                        }
                                                                                        alt={
                                                                                            media.label
                                                                                        }
                                                                                        className="h-5 w-5 rounded object-cover"
                                                                                    />
                                                                                ) : (
                                                                                    <span className="px-1">
                                                                                        {media.type ===
                                                                                        'video'
                                                                                            ? '🎬'
                                                                                            : '🎵'}
                                                                                    </span>
                                                                                )}
                                                                                <span className="text-muted-foreground">
                                                                                    {
                                                                                        media.label
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                        ),
                                                                    )}
                                                            </div>
                                                        )}

                                                        {keyParams.length >
                                                            0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {keyParams
                                                                    .slice(0, 4)
                                                                    .map(
                                                                        (p) => (
                                                                            <span
                                                                                key={
                                                                                    p.key
                                                                                }
                                                                                className="rounded border bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                                                                            >
                                                                                {
                                                                                    p.key
                                                                                }
                                                                                :{' '}
                                                                                <strong className="text-foreground">
                                                                                    {
                                                                                        p.value
                                                                                    }
                                                                                </strong>
                                                                            </span>
                                                                        ),
                                                                    )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* 4. OUTPUT PREVIEW */}
                                                <TableCell className="px-2 py-2.5 text-center align-top">
                                                    {firstOutput ? (
                                                        <div className="mx-auto h-11 w-11 overflow-hidden rounded-lg border bg-black/20">
                                                            {isVideoOutput ? (
                                                                <video
                                                                    src={
                                                                        firstOutput
                                                                    }
                                                                    className="h-full w-full object-cover"
                                                                    muted
                                                                />
                                                            ) : (
                                                                <img
                                                                    src={
                                                                        firstOutput
                                                                    }
                                                                    alt={`Output #${generation.id}`}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </TableCell>

                                                {/* 5. API COST & DURATION */}
                                                <TableCell className="px-3 py-2.5 align-top whitespace-normal">
                                                    <div className="flex flex-col gap-0.5 text-xs">
                                                        <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">
                                                            {generation.cost
                                                                ? `$${Number(generation.cost).toFixed(4)} ${generation.currency ?? 'USD'}`
                                                                : 'API: —'}
                                                        </span>
                                                        {generation.coins_spent ? (
                                                            <span className="text-[11px] font-medium text-foreground">
                                                                {
                                                                    generation.coins_spent
                                                                }{' '}
                                                                pts
                                                            </span>
                                                        ) : null}
                                                        <span className="font-mono text-[11px] text-muted-foreground">
                                                            ⏱{' '}
                                                            {generation.duration_ms
                                                                ? `${(generation.duration_ms / 1000).toFixed(1)}s`
                                                                : '—'}
                                                        </span>
                                                        <span
                                                            suppressHydrationWarning
                                                            className="text-[10px] text-muted-foreground"
                                                        >
                                                            {new Date(
                                                                generation.created_at,
                                                            ).toLocaleTimeString(
                                                                [],
                                                                {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                },
                                                            )}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* 6. ACTIONS (SINGLE LINE) */}
                                                <TableCell className="px-3 py-2.5 text-right align-top">
                                                    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                                                        {generation.status ===
                                                            'completed' &&
                                                            firstOutput && (
                                                                <>
                                                                    <Button
                                                                        variant="secondary"
                                                                        size="sm"
                                                                        disabled={
                                                                            savingTemplateId ===
                                                                            generation.id
                                                                        }
                                                                        className="h-8 w-8 border border-primary/20 bg-primary/10 p-0 text-primary hover:bg-primary/20"
                                                                        onClick={(
                                                                            e,
                                                                        ) =>
                                                                            handleSaveToTemplate(
                                                                                e,
                                                                                generation.id,
                                                                            )
                                                                        }
                                                                        title="Save to Template"
                                                                    >
                                                                        <BookmarkPlus className="h-3.5 w-3.5" />
                                                                    </Button>

                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0"
                                                                        onClick={(
                                                                            e,
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                            const ext =
                                                                                isVideoOutput
                                                                                    ? 'mp4'
                                                                                    : 'png';
                                                                            handleDownload(
                                                                                firstOutput,
                                                                                `${generation.operation}-${generation.id}.${ext}`,
                                                                                generation.id,
                                                                                0,
                                                                            );
                                                                        }}
                                                                        title="Download output file"
                                                                    >
                                                                        <Download className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </>
                                                            )}

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSelectGeneration(
                                                                    generation,
                                                                );
                                                            }}
                                                            title="View full generation details"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {filteredGenerations.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="py-8 text-center text-sm text-muted-foreground"
                                            >
                                                No generations found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </CardContent>
        </AnimatedCard>
    );
}
