import { motion } from 'framer-motion';
import { Check, Copy, Key, Plug, PlugZap, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { QuickTemplatesCard } from '@/components/admin/api-playground/QuickTemplatesCard';
import { RequestBuilderCard } from '@/components/admin/api-playground/RequestBuilderCard';
import {
    RecentRequestsHistoryCard,
    ResponseViewerCard,
} from '@/components/admin/api-playground/ResponseViewerCard';
import {
    detectBodyType,
    type ApiResponse,
    type BodyType,
    type EndpointTemplate,
    type FileEntry,
    type HistoryEntry,
    type HttpMethod,
    type KeyValuePair,
    type PlaygroundTemplate,
} from '@/components/admin/api-playground/types';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedInput } from '@/components/animated/AnimatedInput';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fadeIn, springConfig } from '@/lib/animations';

const HISTORY_KEY = 'api-playground-history';
const TOKEN_KEY = 'api-playground-bearer-token';

export default function APIPlayground({
    templates = [],
}: {
    templates?: PlaygroundTemplate[];
}) {
    const [bearerToken, setBearerToken] = useState<string>(() => {
        try {
            return localStorage.getItem(TOKEN_KEY) ?? '';
        } catch {
            return '';
        }
    });
    const [tokenCopied, setTokenCopied] = useState(false);

    const [method, setMethod] = useState<HttpMethod>('GET');
    const [url, setUrl] = useState('/api/v1/');
    const [headers, setHeaders] = useState<KeyValuePair[]>([
        { key: 'Accept', value: 'application/json' },
    ]);
    const [bodyType, setBodyType] = useState<BodyType>('none');
    const [body, setBody] = useState('');
    const [formDataFields, setFormDataFields] = useState<KeyValuePair[]>([
        { key: '', value: '' },
    ]);
    const [formFileFields, setFormFileFields] = useState<FileEntry[]>([]);
    const [response, setResponse] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loaded, setLoaded] = useState(false);

    if (!loaded) {
        try {
            const stored = localStorage.getItem(HISTORY_KEY);
            if (stored) {
                setHistory(JSON.parse(stored));
            }
        } catch {
            // ignore
        }
        setLoaded(true);
    }

    const updateBearerToken = useCallback((token: string) => {
        setBearerToken(token);
        try {
            if (token) {
                localStorage.setItem(TOKEN_KEY, token);
            } else {
                localStorage.removeItem(TOKEN_KEY);
            }
        } catch {
            // ignore
        }
    }, []);

    const clearBearerToken = useCallback(() => {
        setBearerToken('');
        try {
            localStorage.removeItem(TOKEN_KEY);
        } catch {
            // ignore
        }
    }, []);

    const extractTokenFromResponse = useCallback(
        (resBody: unknown) => {
            if (
                typeof resBody === 'object' &&
                resBody !== null &&
                'token' in resBody
            ) {
                const token = (resBody as Record<string, unknown>).token;
                if (typeof token === 'string' && token.length > 0) {
                    updateBearerToken(token);
                    setTokenCopied(true);
                    setTimeout(() => setTokenCopied(false), 2000);
                }
            }
        },
        [updateBearerToken],
    );

    const saveToHistory = useCallback((entry: HistoryEntry) => {
        setHistory((prev) => {
            const next = [entry, ...prev].slice(0, 10);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const applyTemplate = useCallback((template: EndpointTemplate) => {
        setMethod(template.method);
        setUrl(template.url);
        setBody(template.body);
        setBodyType(template.bodyType);
        setHeaders(template.headers);
        setResponse(null);

        if (template.bodyType === 'form-data') {
            const isImageEdit = template.url.includes('image-edit');
            const isImageToVideo = template.url.includes('image-to-video');
            const isSlugTemplateGenerate =
                template.url.includes('/templates/') &&
                template.url.endsWith('/generate');

            if (isImageEdit) {
                setFormDataFields([
                    { key: 'model', value: 'flux-kontext-dev' },
                    {
                        key: 'prompt',
                        value: 'Replace the background with a bokeh light effect',
                    },
                    { key: 'aspect_ratio', value: 'match_input_image' },
                ]);
                setFormFileFields([{ key: 'input_image', file: null }]);
            } else if (isImageToVideo) {
                setFormDataFields([
                    {
                        key: 'prompt',
                        value: 'Slow cinematic pan around the subject',
                    },
                    { key: 'resolution', value: '1080p' },
                    {
                        key: 'model',
                        value: 'kling-o1-reference-image-to-video',
                    },
                    { key: 'aspect_ratio', value: '16:9' },
                ]);
                setFormFileFields([{ key: 'image', file: null }]);
            } else if (isSlugTemplateGenerate) {
                setFormDataFields([{ key: 'prompt', value: '' }]);
                setFormFileFields([{ key: 'image', file: null }]);
            } else {
                setFormDataFields([
                    { key: 'template_slug', value: 'superman' },
                ]);
                setFormFileFields([{ key: 'image', file: null }]);
            }
        } else {
            setFormDataFields([{ key: '', value: '' }]);
            setFormFileFields([]);
        }
    }, []);

    const loadFromHistory = useCallback((entry: HistoryEntry) => {
        setMethod(entry.method);
        setUrl(entry.url);
        setBody(entry.body);
        setBodyType(
            entry.body && entry.body !== '[form-data]'
                ? 'json'
                : entry.body === '[form-data]'
                  ? 'form-data'
                  : 'none',
        );
        setResponse(null);
    }, []);

    const sendRequest = useCallback(async () => {
        setLoading(true);
        setResponse(null);
        const start = performance.now();

        try {
            const headersObj: Record<string, string> = {};
            headers.forEach((h) => {
                if (h.key.trim()) {
                    headersObj[h.key.trim()] = h.value;
                }
            });

            if (bearerToken) {
                headersObj['Authorization'] = `Bearer ${bearerToken}`;
            }

            delete headersObj['X-XSRF-TOKEN'];

            if (!headersObj['Accept']) {
                headersObj['Accept'] = 'application/json';
            }

            const fetchOptions: RequestInit = {
                method,
                headers: headersObj,
                credentials: 'omit',
            };

            if (['POST', 'PUT', 'PATCH'].includes(method)) {
                if (bodyType === 'form-data') {
                    const formData = new FormData();
                    formDataFields.forEach((field) => {
                        if (field.key.trim()) {
                            formData.append(field.key, field.value);
                        }
                    });
                    formFileFields.forEach((field) => {
                        if (field.key.trim() && field.file) {
                            formData.append(field.key, field.file);
                        }
                    });
                    fetchOptions.body = formData;
                    delete headersObj['Content-Type'];
                } else if (bodyType === 'json' && body.trim()) {
                    fetchOptions.body = body;
                }
            }

            const res = await fetch(url, fetchOptions);
            const duration = Math.round(performance.now() - start);

            const resHeaders: Record<string, string> = {};
            res.headers.forEach((value, key) => {
                resHeaders[key] = value;
            });

            const contentType = res.headers.get('content-type') ?? '';
            let resBody: unknown;
            let rawHtml = '';
            let bodyTypeDetected: ApiResponse['bodyType'] = 'text';

            if (contentType.includes('application/json')) {
                resBody = await res.json();
                bodyTypeDetected = 'json';
            } else {
                const text = await res.text();
                rawHtml = text;
                bodyTypeDetected = detectBodyType(contentType, text);
                resBody = text;
            }

            setResponse({
                status: res.status,
                statusText: res.statusText,
                headers: resHeaders,
                body: resBody,
                bodyType: bodyTypeDetected,
                rawHtml,
                duration,
            });

            if (res.status >= 200 && res.status < 300) {
                extractTokenFromResponse(resBody);
            }

            saveToHistory({
                id:
                    globalThis.crypto?.randomUUID?.() ??
                    `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                method,
                url,
                body:
                    ['POST', 'PUT', 'PATCH'].includes(method) &&
                    bodyType === 'json'
                        ? body
                        : `[${bodyType}]`,
                status: res.status,
                duration,
                timestamp: Date.now(),
            });
        } catch (err) {
            const duration = Math.round(performance.now() - start);
            setResponse({
                status: 0,
                statusText: 'Network Error',
                headers: {},
                body: {
                    error: err instanceof Error ? err.message : 'Unknown error',
                },
                bodyType: 'json',
                rawHtml: '',
                duration,
            });
        } finally {
            setLoading(false);
        }
    }, [
        method,
        url,
        headers,
        bearerToken,
        bodyType,
        body,
        formDataFields,
        formFileFields,
        extractTokenFromResponse,
        saveToHistory,
    ]);

    return (
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springConfig}
            >
                <h1 className="text-2xl font-bold">API Playground</h1>
                <p className="mt-1 text-muted-foreground">
                    Test API endpoints — same requests the mobile app makes.
                </p>
            </motion.div>

            {/* Global Bearer Token */}
            <motion.div
                variants={fadeIn}
                initial="initial"
                animate="animate"
                transition={{ duration: 0.3 }}
            >
                <Card
                    className={
                        bearerToken ? 'border-emerald-500/30' : 'border-muted'
                    }
                >
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-sm font-medium">
                                    Bearer Token
                                </CardTitle>
                                <Badge
                                    variant="outline"
                                    className={`text-xs ${bearerToken ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'}`}
                                >
                                    {bearerToken ? (
                                        <span className="flex items-center gap-1">
                                            <PlugZap className="h-3 w-3" />{' '}
                                            Connected
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1">
                                            <Plug className="h-3 w-3" />{' '}
                                            Disconnected
                                        </span>
                                    )}
                                </Badge>
                            </div>
                            {bearerToken && (
                                <AnimatedButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearBearerToken}
                                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                >
                                    <X className="mr-1 h-3 w-3" /> Clear
                                </AnimatedButton>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Key className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                <AnimatedInput
                                    value={bearerToken}
                                    onChange={(e) =>
                                        updateBearerToken(e.target.value)
                                    }
                                    placeholder="Paste token here after login (or leave empty for guest endpoints)"
                                    className="flex-1 pl-9 font-mono text-xs"
                                    type="password"
                                />
                            </div>
                            {bearerToken && (
                                <AnimatedButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        navigator.clipboard.writeText(
                                            bearerToken,
                                        );
                                        setTokenCopied(true);
                                        setTimeout(
                                            () => setTokenCopied(false),
                                            2000,
                                        );
                                    }}
                                    className="h-8 w-8 px-0"
                                >
                                    {tokenCopied ? (
                                        <Check className="h-3 w-3" />
                                    ) : (
                                        <Copy className="h-3 w-3" />
                                    )}
                                </AnimatedButton>
                            )}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {bearerToken
                                ? 'Token will be sent as `Authorization: Bearer <token>` with every request.'
                                : 'No token — guest endpoints will work. Paste a customer token for authenticated endpoints.'}
                        </p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Quick Templates */}
            <motion.div
                variants={fadeIn}
                initial="initial"
                animate="animate"
                transition={{ duration: 0.3 }}
            >
                <QuickTemplatesCard onApplyTemplate={applyTemplate} />
            </motion.div>

            {/* Request Builder + Response Viewer */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <motion.div
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <RequestBuilderCard
                        method={method}
                        onMethodChange={setMethod}
                        url={url}
                        onUrlChange={setUrl}
                        headers={headers}
                        onAddHeader={() =>
                            setHeaders((prev) => [
                                ...prev,
                                { key: '', value: '' },
                            ])
                        }
                        onRemoveHeader={(index) =>
                            setHeaders((prev) =>
                                prev.filter((_, i) => i !== index),
                            )
                        }
                        onUpdateHeader={(index, field, value) =>
                            setHeaders((prev) =>
                                prev.map((h, i) =>
                                    i === index ? { ...h, [field]: value } : h,
                                ),
                            )
                        }
                        bodyType={bodyType}
                        onBodyTypeChange={setBodyType}
                        body={body}
                        onBodyChange={setBody}
                        formDataFields={formDataFields}
                        onAddFormField={() =>
                            setFormDataFields((prev) => [
                                ...prev,
                                { key: '', value: '' },
                            ])
                        }
                        onRemoveFormField={(index) =>
                            setFormDataFields((prev) =>
                                prev.filter((_, i) => i !== index),
                            )
                        }
                        onUpdateFormField={(index, field, value) =>
                            setFormDataFields((prev) =>
                                prev.map((f, i) =>
                                    i === index ? { ...f, [field]: value } : f,
                                ),
                            )
                        }
                        onSetFormDataFields={setFormDataFields}
                        formFileFields={formFileFields}
                        onAddFileField={() =>
                            setFormFileFields((prev) => [
                                ...prev,
                                { key: '', file: null },
                            ])
                        }
                        onRemoveFileField={(index) =>
                            setFormFileFields((prev) =>
                                prev.filter((_, i) => i !== index),
                            )
                        }
                        onUpdateFileFieldKey={(index, key) =>
                            setFormFileFields((prev) =>
                                prev.map((f, i) =>
                                    i === index ? { ...f, key } : f,
                                ),
                            )
                        }
                        onUpdateFileFieldValue={(index, file) =>
                            setFormFileFields((prev) =>
                                prev.map((f, i) =>
                                    i === index ? { ...f, file } : f,
                                ),
                            )
                        }
                        loading={loading}
                        onSendRequest={sendRequest}
                        templates={templates}
                    />
                </motion.div>

                <motion.div
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <ResponseViewerCard response={response} loading={loading} />
                </motion.div>
            </div>

            {/* History */}
            <motion.div
                variants={fadeIn}
                initial="initial"
                animate="animate"
                transition={{ duration: 0.3, delay: 0.3 }}
            >
                <RecentRequestsHistoryCard
                    history={history}
                    onLoadFromHistory={loadFromHistory}
                />
            </motion.div>
        </div>
    );
}
