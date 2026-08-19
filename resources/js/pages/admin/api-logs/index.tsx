import { Head, router } from '@inertiajs/react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useState } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { CardContent } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import admin from '@/routes/admin';

type LogEntry = {
    id: number;
    method: string;
    path: string;
    request_headers: Record<string, string> | null;
    request_body: Record<string, unknown> | null;
    response_status: number | null;
    response_headers: Record<string, string> | null;
    response_body: Record<string, unknown> | null;
    duration_ms: number | null;
    user: { id: number; name: string; email: string } | null;
    customer: { id: number; name: string; email: string } | null;
    created_at: string;
};

type PaginatedLogs = {
    data: LogEntry[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
};

const METHOD_COLORS: Record<string, string> = {
    GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    POST: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    PATCH: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
};

function getStatusColor(status: number | null): string {
    if (!status) {
        return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
    }

    const prefix = Math.floor(status / 100);

    if (prefix === 2) {
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }

    if (prefix === 3) {
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    }

    if (prefix === 4) {
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }

    if (prefix === 5) {
        return 'bg-red-500/15 text-red-400 border-red-500/30';
    }

    return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
}

function formatJson(obj: unknown): string {
    try {
        return JSON.stringify(obj, null, 2);
    } catch {
        return String(obj);
    }
}

export default function Index({ logs }: { logs: PaginatedLogs }) {
    const [methodFilter, setMethodFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [pathFilter, setPathFilter] = useState('');
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    const applyFilters = () => {
        const params: Record<string, string> = {};

        if (methodFilter !== 'all') {
            params.method = methodFilter;
        }

        if (statusFilter) {
            params.status = statusFilter;
        }

        if (pathFilter) {
            params.path = pathFilter;
        }

        router.get(admin.apiLogs.index().url, params, {
            preserveState: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setMethodFilter('all');
        setStatusFilter('');
        setPathFilter('');
        router.get(
            admin.apiLogs.index().url,
            {},
            { preserveState: true, replace: true },
        );
    };

    return (
        <>
            <Head title="API Logs" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="API Request Logs"
                    description={`Browse all logged API requests (${logs.total} total).`}
                />

                {/* Filters */}
                <AnimatedCard>
                    <CardContent>
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Method
                                </Label>
                                <Select
                                    value={methodFilter}
                                    onValueChange={setMethodFilter}
                                >
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="GET">GET</SelectItem>
                                        <SelectItem value="POST">
                                            POST
                                        </SelectItem>
                                        <SelectItem value="PUT">PUT</SelectItem>
                                        <SelectItem value="PATCH">
                                            PATCH
                                        </SelectItem>
                                        <SelectItem value="DELETE">
                                            DELETE
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Status
                                </Label>
                                <Input
                                    value={statusFilter}
                                    onChange={(e) =>
                                        setStatusFilter(e.target.value)
                                    }
                                    placeholder="200, 404, 500..."
                                    className="w-[120px] font-mono text-xs"
                                />
                            </div>

                            <div className="flex-1 space-y-1">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Path
                                </Label>
                                <Input
                                    value={pathFilter}
                                    onChange={(e) =>
                                        setPathFilter(e.target.value)
                                    }
                                    placeholder="/api/v1/..."
                                    className="font-mono text-xs"
                                />
                            </div>

                            <AnimatedButton onClick={applyFilters} size="sm">
                                <Search className="mr-1 h-3 w-3" /> Filter
                            </AnimatedButton>

                            <AnimatedButton
                                onClick={clearFilters}
                                variant="outline"
                                size="sm"
                            >
                                Clear
                            </AnimatedButton>
                        </div>
                    </CardContent>
                </AnimatedCard>

                {/* Logs Table */}
                <AnimatedCard>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-8" />
                                    <TableHead>Method</TableHead>
                                    <TableHead>Path</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Requester</TableHead>
                                    <TableHead>Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.data.map((log) => (
                                    <LogRow
                                        key={log.id}
                                        log={log}
                                        expanded={expandedRow === log.id}
                                        onToggle={() =>
                                            setExpandedRow(
                                                expandedRow === log.id
                                                    ? null
                                                    : log.id,
                                            )
                                        }
                                    />
                                ))}
                                {logs.data.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="text-center text-muted-foreground"
                                        >
                                            No logs found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {logs.last_page > 1 && (
                            <div className="mt-4 flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    Page {logs.current_page} of {logs.last_page}{' '}
                                    ({logs.total} entries)
                                </p>
                                <div className="flex gap-1">
                                    {logs.links.map((link, index) => {
                                        const path = link.url
                                            ? new URL(link.url).pathname +
                                              new URL(link.url).search
                                            : '';

                                        return (
                                            <AnimatedButton
                                                key={index}
                                                variant={
                                                    link.active
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                size="sm"
                                                disabled={!link.url}
                                                onClick={() =>
                                                    link.url &&
                                                    router.get(
                                                        path,
                                                        {},
                                                        { preserveState: true },
                                                    )
                                                }
                                                className="h-8 text-xs"
                                            >
                                                {link.label ===
                                                '&laquo; Previous'
                                                    ? '← Prev'
                                                    : link.label ===
                                                        'Next &raquo;'
                                                      ? 'Next →'
                                                      : link.label}
                                            </AnimatedButton>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </AnimatedCard>
            </div>
        </>
    );
}

function LogRow({
    log,
    expanded,
    onToggle,
}: {
    log: LogEntry;
    expanded: boolean;
    onToggle: () => void;
}) {
    const requester = log.user ?? log.customer;
    const requesterType = log.user ? 'admin' : log.customer ? 'customer' : '—';

    return (
        <>
            <TableRow
                className="cursor-pointer hover:bg-muted/50"
                onClick={onToggle}
            >
                <TableCell className="w-8">
                    {expanded ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </TableCell>
                <TableCell>
                    <Badge
                        variant="outline"
                        className={`font-mono text-xs ${METHOD_COLORS[log.method] ?? ''}`}
                    >
                        {log.method}
                    </Badge>
                </TableCell>
                <TableCell className="max-w-[300px] truncate font-mono text-xs">
                    {log.path}
                </TableCell>
                <TableCell>
                    <Badge
                        variant="outline"
                        className={`font-mono text-xs ${getStatusColor(log.response_status)}`}
                    >
                        {log.response_status ?? '—'}
                    </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                    {log.duration_ms ? `${log.duration_ms}ms` : '—'}
                </TableCell>
                <TableCell className="text-xs">
                    {requester ? (
                        <span>
                            {requester.name}{' '}
                            <span className="text-muted-foreground">
                                ({requesterType})
                            </span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground">—</span>
                    )}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                </TableCell>
            </TableRow>
            {expanded && (
                <TableRow>
                    <TableCell colSpan={7} className="p-0">
                        <div className="space-y-3 bg-muted/30 p-4">
                            {log.request_body &&
                                Object.keys(log.request_body).length > 0 && (
                                    <Collapsible defaultOpen>
                                        <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                                            <ChevronDown className="h-3 w-3" />{' '}
                                            Request Body
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <pre className="mt-2 max-h-[200px] overflow-auto rounded-md bg-background p-3 font-mono text-xs">
                                                {formatJson(log.request_body)}
                                            </pre>
                                        </CollapsibleContent>
                                    </Collapsible>
                                )}

                            {log.response_body && (
                                <Collapsible defaultOpen>
                                    <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                                        <ChevronDown className="h-3 w-3" />{' '}
                                        Response Body
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <pre className="mt-2 max-h-[200px] overflow-auto rounded-md bg-background p-3 font-mono text-xs">
                                            {formatJson(log.response_body)}
                                        </pre>
                                    </CollapsibleContent>
                                </Collapsible>
                            )}

                            {log.request_headers && (
                                <Collapsible>
                                    <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                                        <ChevronRight className="h-3 w-3" />{' '}
                                        Request Headers
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <pre className="mt-2 max-h-[150px] overflow-auto rounded-md bg-background p-3 font-mono text-xs">
                                            {formatJson(log.request_headers)}
                                        </pre>
                                    </CollapsibleContent>
                                </Collapsible>
                            )}

                            {log.response_headers && (
                                <Collapsible>
                                    <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                                        <ChevronRight className="h-3 w-3" />{' '}
                                        Response Headers
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <pre className="mt-2 max-h-[150px] overflow-auto rounded-md bg-background p-3 font-mono text-xs">
                                            {formatJson(log.response_headers)}
                                        </pre>
                                    </CollapsibleContent>
                                </Collapsible>
                            )}
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'API Logs', href: admin.apiLogs.index().url }],
};
