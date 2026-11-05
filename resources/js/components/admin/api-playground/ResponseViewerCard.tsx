import {
    AlertTriangle,
    Check,
    ChevronDown,
    ChevronRight,
    Clock,
    Copy,
    Eye,
    FileCode,
    Loader2,
} from 'lucide-react';
import { useState } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
    extractHtmlSummary,
    formatJson,
    getStatusColor,
    METHOD_COLORS,
    type ApiResponse,
    type HistoryEntry,
} from './types';

interface ResponseViewerCardProps {
    response: ApiResponse | null;
    loading: boolean;
}

export function ResponseViewerCard({
    response,
    loading,
}: ResponseViewerCardProps) {
    const [responseHeadersOpen, setResponseHeadersOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [previewHtml, setPreviewHtml] = useState(false);
    const [showRawBody, setShowRawBody] = useState(false);

    const copyResponse = () => {
        if (!response) {
            return;
        }
        const text =
            response.bodyType === 'json'
                ? formatJson(response.body)
                : String(response.body);
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const renderResponseBody = () => {
        if (!response) {
            return null;
        }

        const { body: resBody, bodyType: resBodyType, rawHtml } = response;

        if (resBodyType === 'empty') {
            return (
                <div className="flex h-[150px] flex-col items-center justify-center text-muted-foreground">
                    <FileCode className="mb-2 h-8 w-8 opacity-50" />
                    <p className="text-sm">Empty response body</p>
                </div>
            );
        }

        if (resBodyType === 'html') {
            const htmlStr = rawHtml || String(resBody);
            const summary = extractHtmlSummary(htmlStr);

            return (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                        <div className="text-sm">
                            <p className="font-medium text-amber-600 dark:text-amber-400">
                                Response is HTML, not JSON
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {summary.isLoginPage &&
                                    '🔒 This looks like a login page — the endpoint requires authentication.'}
                                {summary.is404 &&
                                    '📄 Page not found — check the URL.'}
                                {!summary.isLoginPage &&
                                    !summary.is404 &&
                                    `Page title: "${summary.title}"`}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <AnimatedButton
                            variant={previewHtml ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPreviewHtml(!previewHtml)}
                            className="text-xs"
                        >
                            <Eye className="mr-1 h-3 w-3" />
                            Preview
                        </AnimatedButton>
                        <AnimatedButton
                            variant={!previewHtml ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                                setPreviewHtml(false);
                                setShowRawBody(true);
                            }}
                            className="text-xs"
                        >
                            <FileCode className="mr-1 h-3 w-3" />
                            Raw HTML ({(htmlStr.length / 1024).toFixed(1)} KB)
                        </AnimatedButton>
                    </div>

                    {previewHtml && (
                        <div className="overflow-hidden rounded-md border bg-white">
                            <iframe
                                srcDoc={htmlStr}
                                title="HTML Preview"
                                className="h-[400px] w-full border-0"
                                sandbox="allow-same-origin"
                            />
                        </div>
                    )}

                    {showRawBody && !previewHtml && (
                        <div className="max-h-[300px] overflow-auto rounded-md bg-muted/50 p-3">
                            <pre className="font-mono text-xs break-all whitespace-pre-wrap text-muted-foreground">
                                {htmlStr.length > 5000
                                    ? htmlStr.slice(0, 5000) +
                                      '\n\n... (truncated)'
                                    : htmlStr}
                            </pre>
                        </div>
                    )}
                </div>
            );
        }

        if (resBodyType === 'json') {
            return (
                <div className="max-h-[400px] overflow-auto rounded-md bg-muted/50 p-3">
                    <pre className="font-mono text-xs break-all whitespace-pre-wrap">
                        {showRawBody
                            ? typeof resBody === 'string'
                                ? resBody
                                : formatJson(resBody)
                            : formatJson(resBody)}
                    </pre>
                </div>
            );
        }

        const textStr = String(resBody);

        return (
            <div className="max-h-[400px] overflow-auto rounded-md bg-muted/50 p-3">
                <pre className="font-mono text-xs break-all whitespace-pre-wrap">
                    {textStr.length > 5000
                        ? textStr.slice(0, 5000) + '\n\n... (truncated)'
                        : textStr}
                </pre>
            </div>
        );
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                        Response
                    </CardTitle>
                    {response && (
                        <div className="flex items-center gap-2">
                            <Badge
                                variant="outline"
                                className={`font-mono text-xs ${getStatusColor(response.status)}`}
                            >
                                {response.status} {response.statusText}
                            </Badge>
                            <Badge
                                variant="outline"
                                className="font-mono text-xs"
                            >
                                {response.duration}ms
                            </Badge>
                            <Badge
                                variant="outline"
                                className="font-mono text-xs capitalize"
                            >
                                {response.bodyType}
                            </Badge>
                            <AnimatedButton
                                variant="ghost"
                                size="sm"
                                onClick={copyResponse}
                                className="h-7 w-7 px-0"
                            >
                                {copied ? (
                                    <Check className="h-3 w-3" />
                                ) : (
                                    <Copy className="h-3 w-3" />
                                )}
                            </AnimatedButton>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {loading && !response && (
                    <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        Sending request...
                    </div>
                )}

                {!loading && !response && (
                    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                        Send a request to see the response
                    </div>
                )}

                {response && (
                    <div className="space-y-3">
                        <Collapsible
                            open={responseHeadersOpen}
                            onOpenChange={setResponseHeadersOpen}
                        >
                            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                                {responseHeadersOpen ? (
                                    <ChevronDown className="h-3 w-3" />
                                ) : (
                                    <ChevronRight className="h-3 w-3" />
                                )}
                                Response Headers (
                                {Object.keys(response.headers).length})
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2">
                                <div className="max-h-[150px] overflow-auto rounded-md bg-muted/50 p-3">
                                    {Object.entries(response.headers).map(
                                        ([key, value]) => (
                                            <div
                                                key={key}
                                                className="flex gap-2 font-mono text-xs"
                                            >
                                                <span className="shrink-0 text-blue-400">
                                                    {key}:
                                                </span>
                                                <span className="break-all text-muted-foreground">
                                                    {value}
                                                </span>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        <Separator />

                        {renderResponseBody()}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface RecentRequestsHistoryCardProps {
    history: HistoryEntry[];
    onLoadFromHistory: (entry: HistoryEntry) => void;
}

export function RecentRequestsHistoryCard({
    history,
    onLoadFromHistory,
}: RecentRequestsHistoryCardProps) {
    const [historyOpen, setHistoryOpen] = useState(false);

    if (history.length === 0) {
        return null;
    }

    return (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <Card>
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer rounded-t-lg pb-3 transition-colors hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                            {historyOpen ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-medium">
                                Recent Requests ({history.length})
                            </CardTitle>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent className="pt-0">
                        <div className="space-y-1">
                            {history.map((entry) => (
                                <button
                                    key={entry.id}
                                    onClick={() => onLoadFromHistory(entry)}
                                    className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted/50"
                                >
                                    <Badge
                                        variant="outline"
                                        className={`shrink-0 font-mono text-xs ${METHOD_COLORS[entry.method]}`}
                                    >
                                        {entry.method}
                                    </Badge>
                                    <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
                                        {entry.url}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className={`shrink-0 font-mono text-xs ${getStatusColor(entry.status)}`}
                                    >
                                        {entry.status}
                                    </Badge>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        {entry.duration}ms
                                    </span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}
