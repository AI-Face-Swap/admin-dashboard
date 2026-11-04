import { ChevronDown, ChevronUp, Download, History } from 'lucide-react';
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
import { handleDownload, type Generation } from './types';

export function RecentGenerationsCard({
    generations,
    onSelectGeneration,
}: {
    generations: Generation[];
    onSelectGeneration: (generation: Generation) => void;
}) {
    const [showHistory, setShowHistory] = useState(true);

    return (
        <AnimatedCard className="w-full">
            <CardContent className="p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <History className="h-5 w-5 text-muted-foreground" />
                        <p className="text-base font-bold">
                            Recent Generations
                        </p>
                        <Badge variant="secondary" className="px-2 py-0.5 text-xs">
                            {generations.length}
                        </Badge>
                    </div>
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

                {showHistory && (
                    <div className="mt-4 max-h-[380px] overflow-y-auto rounded-xl border">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-background">
                                <TableRow>
                                    <TableHead className="py-2.5 text-sm font-semibold">
                                        Status
                                    </TableHead>
                                    <TableHead className="py-2.5 text-sm font-semibold">
                                        Operation
                                    </TableHead>
                                    <TableHead className="py-2.5 text-sm font-semibold">
                                        Template
                                    </TableHead>
                                    <TableHead className="py-2.5 text-sm font-semibold">
                                        Cost
                                    </TableHead>
                                    <TableHead className="py-2.5 text-sm font-semibold">
                                        Duration
                                    </TableHead>
                                    <TableHead className="py-2.5 text-sm font-semibold">
                                        Created
                                    </TableHead>
                                    <TableHead className="py-2.5 text-right text-sm font-semibold">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {generations.map((generation) => (
                                    <TableRow
                                        key={generation.id}
                                        className="cursor-pointer text-sm hover:bg-muted/50"
                                        onClick={() =>
                                            onSelectGeneration(generation)
                                        }
                                    >
                                        <TableCell className="py-2.5">
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
                                                className="px-2.5 py-0.5 text-xs"
                                            >
                                                {generation.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-2.5 font-medium">
                                            {generation.operation}
                                        </TableCell>
                                        <TableCell className="py-2.5">
                                            {generation.template?.name ?? '—'}
                                        </TableCell>
                                        <TableCell className="py-2.5">
                                            {generation.cost
                                                ? `${generation.cost} ${generation.currency ?? ''}`
                                                : '—'}
                                        </TableCell>
                                        <TableCell className="py-2.5">
                                            {generation.duration_ms
                                                ? `${(generation.duration_ms / 1000).toFixed(1)}s`
                                                : '—'}
                                        </TableCell>
                                        <TableCell className="py-2.5 text-muted-foreground">
                                            {new Date(
                                                generation.created_at,
                                            ).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="py-2.5 text-right">
                                            {generation.status ===
                                                'completed' &&
                                            generation.output_metadata &&
                                            generation.output_metadata.length >
                                                0 ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 gap-1.5 px-3 text-xs"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const url =
                                                            generation
                                                                .output_metadata![0];
                                                        const isVideo =
                                                            url.endsWith(
                                                                '.mp4',
                                                            ) ||
                                                            url.endsWith(
                                                                '.webm',
                                                            ) ||
                                                            url.endsWith(
                                                                '.mov',
                                                            ) ||
                                                            generation.operation.includes(
                                                                'video',
                                                            );
                                                        const ext = isVideo
                                                            ? 'mp4'
                                                            : 'png';
                                                        handleDownload(
                                                            url,
                                                            `${generation.operation}-${generation.id}.${ext}`,
                                                            generation.id,
                                                            0,
                                                        );
                                                    }}
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                    Download
                                                </Button>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {generations.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="py-8 text-center text-sm text-muted-foreground"
                                        >
                                            No generations yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </AnimatedCard>
    );
}
