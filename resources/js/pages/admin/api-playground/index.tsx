import { motion } from 'framer-motion';
import {
    Send,
    Plus,
    Trash2,
    Clock,
    ChevronDown,
    ChevronRight,
    Loader2,
    Copy,
    Check,
    FileCode,
    AlertTriangle,
    Eye,
    Upload,
    X,
    Key,
    Plug,
    PlugZap,
} from 'lucide-react';
import { useState, useCallback, useRef } from 'react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedInput } from '@/components/animated/AnimatedInput';
import { AnimatedTextarea } from '@/components/animated/AnimatedTextarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { fadeIn, springConfig } from '@/lib/animations';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type BodyType = 'json' | 'form-data' | 'none';

interface KeyValuePair {
    key: string;
    value: string;
}

interface FileEntry {
    key: string;
    file: File | null;
}

interface ApiResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    bodyType: 'json' | 'html' | 'text' | 'empty';
    rawHtml: string;
    duration: number;
}

interface HistoryEntry {
    id: string;
    method: HttpMethod;
    url: string;
    body: string;
    status: number;
    duration: number;
    timestamp: number;
}

const METHOD_COLORS: Record<HttpMethod, string> = {
    GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    POST: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    PATCH: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const STATUS_COLORS: Record<number, string> = {
    2: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    3: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    4: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    5: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const ENDPOINT_TEMPLATES: {
    label: string;
    method: HttpMethod;
    url: string;
    bodyType: BodyType;
    body: string;
    headers: KeyValuePair[];
}[] = [
    {
        label: 'Register Customer',
        method: 'POST',
        url: '/api/v1/auth/register',
        bodyType: 'json',
        body: '{\n  "name": "Test User",\n  "email": "test@example.com",\n  "password": "password123",\n "password_confirmation": "password123"\n}',
        headers: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Accept', value: 'application/json' },
        ],
    },
    {
        label: 'Login Customer',
        method: 'POST',
        url: '/api/v1/auth/login',
        bodyType: 'json',
        body: '{\n  "email": "test@example.com",\n  "password": "password123"\n}',
        headers: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Accept', value: 'application/json' },
        ],
    },
    {
        label: 'Get Profile (/me)',
        method: 'GET',
        url: '/api/v1/auth/me',
        bodyType: 'none',
        body: '',
        headers: [{ key: 'Accept', value: 'application/json' }],
    },
    {
        label: 'Face Swap (URL)',
        method: 'POST',
        url: '/api/v1/ai/face-swap',
        bodyType: 'json',
        body: '{\n  "template_slug": "superman",\n  "face_image_url": "https://example.com/face.jpg"\n}',
        headers: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Accept', value: 'application/json' },
        ],
    },
    {
        label: 'Face Swap (Upload)',
        method: 'POST',
        url: '/api/v1/ai/face-swap',
        bodyType: 'form-data',
        body: '',
        headers: [{ key: 'Accept', value: 'application/json' }],
    },
    {
        label: 'Video Face Swap (URL)',
        method: 'POST',
        url: '/api/v1/ai/video-face-swap',
        bodyType: 'json',
        body: '{\n  "template_slug": "your-video-template-slug",\n  "face_image_url": "https://example.com/face.jpg"\n}',
        headers: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Accept', value: 'application/json' },
        ],
    },
    {
        label: 'Video Face Swap (Upload)',
        method: 'POST',
        url: '/api/v1/ai/video-face-swap',
        bodyType: 'form-data',
        body: '',
        headers: [{ key: 'Accept', value: 'application/json' }],
    },
    {
        label: 'Image Generation',
        method: 'POST',
        url: '/api/v1/ai/images',
        bodyType: 'json',
        body: '{\n  "prompt": "A superhero flying over a city at sunset",\n  "negative_prompt": "blurry, low quality",\n  "model": "seedream-v5-lite-text-to-image",\n  "width": 1024,\n  "height": 1024\n}',
        headers: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Accept', value: 'application/json' },
        ],
    },
    {
        label: 'Check Generation Status',
        method: 'GET',
        url: '/api/v1/ai/generations/1',
        bodyType: 'none',
        body: '',
        headers: [{ key: 'Accept', value: 'application/json' }],
    },
    {
        label: 'Logout',
        method: 'POST',
        url: '/api/v1/auth/logout',
        bodyType: 'none',
        body: '',
        headers: [{ key: 'Accept', value: 'application/json' }],
    },
    {
        label: 'Image to Video (Upload)',
        method: 'POST',
        url: '/api/v1/ai/image-to-video',
        bodyType: 'form-data',
        body: '',
        headers: [{ key: 'Accept', value: 'application/json' }],
    },
    {
        label: 'Image to Video (URL)',
        method: 'POST',
        url: '/api/v1/ai/image-to-video',
        bodyType: 'json',
        body: '{\n  "prompt": "Slow cinematic pan around the subject, soft lighting, dramatic atmosphere",\n  "image_url": "https://example.com/input-image.jpg",\n  "negative_prompt": "blurry, low quality, text overlays",\n  "resolution": "720p",\n  "prompt_extend": true\n}',
        headers: [
            { key: 'Content-Type', value: 'application/json' },
            { key: 'Accept', value: 'application/json' },
        ],
    },
    {
        label: 'Get Sliders (Public)',
        method: 'GET',
        url: '/api/v1/sliders',
        bodyType: 'none',
        body: '',
        headers: [{ key: 'Accept', value: 'application/json' }],
    },
    {
        label: 'Get Templates (Public)',
        method: 'GET',
        url: '/api/v1/templates',
        bodyType: 'none',
        body: '',
        headers: [{ key: 'Accept', value: 'application/json' }],
    },
    {
        label: 'Get Template by Slug',
        method: 'GET',
        url: '/api/v1/templates/superman-suit',
        bodyType: 'none',
        body: '',
        headers: [{ key: 'Accept', value: 'application/json' }],
    },
    {
        label: 'Get Template Categories (Public)',
        method: 'GET',
        url: '/api/v1/template-categories',
        bodyType: 'none',
        body: '',
        headers: [{ key: 'Accept', value: 'application/json' }],
    },
    {
        label: 'Get My Generations',
        method: 'GET',
        url: '/api/v1/customer/generations',
        bodyType: 'none',
        body: '',
        headers: [{ key: 'Accept', value: 'application/json' }],
    },
];

const HISTORY_KEY = 'api-playground-history';
const TOKEN_KEY = 'api-playground-bearer-token';

function formatJson(obj: unknown): string {
    try {
        return JSON.stringify(obj, null, 2);
    } catch {
        return String(obj);
    }
}

function getStatusColor(status: number): string {
    const prefix = Math.floor(status / 100);

    return (
        STATUS_COLORS[prefix] ??
        'bg-gray-500/15 text-gray-400 border-gray-500/30'
    );
}

function detectBodyType(
    contentType: string,
    body: unknown,
): ApiResponse['bodyType'] {
    if (typeof body === 'string' && body.trim() === '') {
        return 'empty';
    }

    if (contentType.includes('application/json')) {
        return 'json';
    }

    if (
        contentType.includes('text/html') ||
        (typeof body === 'string' && body.trim().startsWith('<'))
    ) {
        return 'html';
    }

    return 'text';
}

function extractHtmlSummary(html: string): {
    title: string;
    isLoginPage: boolean;
    is404: boolean;
} {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch?.[1] ?? 'Unknown';
    const isLoginPage =
        html.includes('login') ||
        html.includes('Login') ||
        html.includes('Sign in');
    const is404 = html.includes('404') || html.includes('Not Found');

    return { title, isLoginPage, is404 };
}

export default function APIPlayground() {
    // Global Bearer token (stored in localStorage)
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
    const [historyOpen, setHistoryOpen] = useState(false);
    const [responseHeadersOpen, setResponseHeadersOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [previewHtml, setPreviewHtml] = useState(false);
    const [showRawBody, setShowRawBody] = useState(false);
    const fileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

    // Load history from localStorage on mount
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
        (body: unknown) => {
            if (typeof body === 'object' && body !== null && 'token' in body) {
                const token = (body as Record<string, unknown>).token;

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

    const applyTemplate = useCallback(
        (template: (typeof ENDPOINT_TEMPLATES)[number]) => {
            setMethod(template.method);
            setUrl(template.url);
            setBody(template.body);
            setBodyType(template.bodyType);
            setHeaders(template.headers);
            setResponse(null);
            setPreviewHtml(false);
            setShowRawBody(false);

            if (template.bodyType === 'form-data') {
                const isImageToVideo = template.url.includes('image-to-video');
                const isVideoFaceSwap = template.url.includes('video-face-swap');

                if (isImageToVideo) {
                    // Image-to-video: prompt + image file
                    setFormDataFields([
                        { key: 'prompt', value: 'Slow cinematic pan around the subject' },
                        { key: 'resolution', value: '720p' },
                    ]);
                    setFormFileFields([{ key: 'image', file: null }]);
                } else if (isVideoFaceSwap) {
                    // Video face-swap: template_slug + face image
                    setFormDataFields([
                        { key: 'template_slug', value: 'your-video-template-slug' },
                    ]);
                    setFormFileFields([{ key: 'face_image', file: null }]);
                } else {
                    // Face-swap (default): template_slug + face image
                    setFormDataFields([
                        { key: 'template_slug', value: 'superman' },
                    ]);
                    setFormFileFields([{ key: 'face_image', file: null }]);
                }
            } else {
                setFormDataFields([{ key: '', value: '' }]);
                setFormFileFields([]);
            }
        },
        [],
    );

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
        setPreviewHtml(false);
        setShowRawBody(false);
    }, []);

    const addHeader = useCallback(() => {
        setHeaders((prev) => [...prev, { key: '', value: '' }]);
    }, []);

    const removeHeader = useCallback((index: number) => {
        setHeaders((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const updateHeader = useCallback(
        (index: number, field: 'key' | 'value', value: string) => {
            setHeaders((prev) =>
                prev.map((h, i) =>
                    i === index ? { ...h, [field]: value } : h,
                ),
            );
        },
        [],
    );

    const addFormField = useCallback(() => {
        setFormDataFields((prev) => [...prev, { key: '', value: '' }]);
    }, []);

    const removeFormField = useCallback((index: number) => {
        setFormDataFields((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const updateFormField = useCallback(
        (index: number, field: 'key' | 'value', value: string) => {
            setFormDataFields((prev) =>
                prev.map((f, i) =>
                    i === index ? { ...f, [field]: value } : f,
                ),
            );
        },
        [],
    );

    const addFileField = useCallback(() => {
        setFormFileFields((prev) => [...prev, { key: '', file: null }]);
    }, []);

    const removeFileField = useCallback((index: number) => {
        setFormFileFields((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const updateFileFieldKey = useCallback((index: number, key: string) => {
        setFormFileFields((prev) =>
            prev.map((f, i) => (i === index ? { ...f, key } : f)),
        );
    }, []);

    const updateFileFieldValue = useCallback(
        (index: number, file: File | null) => {
            setFormFileFields((prev) =>
                prev.map((f, i) => (i === index ? { ...f, file } : f)),
            );
        },
        [],
    );

    const sendRequest = useCallback(async () => {
        setLoading(true);
        setResponse(null);
        setPreviewHtml(false);
        setShowRawBody(false);
        const start = performance.now();

        try {
            const headersObj: Record<string, string> = {};
            headers.forEach((h) => {
                if (h.key.trim()) {
                    headersObj[h.key.trim()] = h.value;
                }
            });

            // Inject Bearer token if set (global token from localStorage)
            if (bearerToken) {
                headersObj['Authorization'] = `Bearer ${bearerToken}`;
            }

            // Remove XSRF-TOKEN — not needed without session cookies
            delete headersObj['X-XSRF-TOKEN'];

            if (!headersObj['Accept']) {
                headersObj['Accept'] = 'application/json';
            }

            const fetchOptions: RequestInit = {
                method,
                headers: headersObj,
                credentials: 'omit', // Never send session cookie — mobile-app behavior. Bearer token is the only auth.
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

            const apiResponse: ApiResponse = {
                status: res.status,
                statusText: res.statusText,
                headers: resHeaders,
                body: resBody,
                bodyType: bodyTypeDetected,
                rawHtml,
                duration,
            };

            setResponse(apiResponse);

            // Auto-extract token from login/register responses
            if (res.status >= 200 && res.status < 300) {
                extractTokenFromResponse(resBody);
            }

            saveToHistory({
                id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`),
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

    const copyResponse = useCallback(() => {
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
    }, [response]);

    const showBodyEditor = ['POST', 'PUT', 'PATCH'].includes(method);

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
        <div className="space-y-6">
            {/* Header */}
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
                                : 'No token — guest endpoints (register, login) will work. Login to get a token for authenticated endpoints.'}
                        </p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Endpoint Templates */}
            <motion.div
                variants={fadeIn}
                initial="initial"
                animate="animate"
                transition={{ duration: 0.3 }}
            >
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">
                            Quick Templates
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {ENDPOINT_TEMPLATES.map((template) => (
                                <AnimatedButton
                                    key={template.label}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyTemplate(template)}
                                >
                                    <Badge
                                        variant="secondary"
                                        className={`mr-2 text-xs ${METHOD_COLORS[template.method]}`}
                                    >
                                        {template.method}
                                    </Badge>
                                    {template.label}
                                </AnimatedButton>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Request Builder */}
                <motion.div
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                                Request
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Method + URL */}
                            <div className="flex gap-2">
                                <Select
                                    value={method}
                                    onValueChange={(v) =>
                                        setMethod(v as HttpMethod)
                                    }
                                >
                                    <SelectTrigger
                                        className={`w-[110px] font-mono text-sm font-semibold ${METHOD_COLORS[method]}`}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(
                                            [
                                                'GET',
                                                'POST',
                                                'PUT',
                                                'PATCH',
                                                'DELETE',
                                            ] as const
                                        ).map((m) => (
                                            <SelectItem
                                                key={m}
                                                value={m}
                                                className="font-mono text-sm"
                                            >
                                                {m}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <AnimatedInput
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="/api/v1/..."
                                    className="flex-1 font-mono text-sm"
                                />
                            </div>

                            {/* Headers */}
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <Label className="text-xs font-medium text-muted-foreground">
                                        Headers
                                    </Label>
                                    <AnimatedButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={addHeader}
                                        className="h-7 text-xs"
                                    >
                                        <Plus className="mr-1 h-3 w-3" /> Add
                                    </AnimatedButton>
                                </div>
                                <div className="space-y-1">
                                    {headers.map((header, index) => (
                                        <div key={index} className="flex gap-1">
                                            <AnimatedInput
                                                value={header.key}
                                                onChange={(e) =>
                                                    updateHeader(
                                                        index,
                                                        'key',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Key"
                                                className="flex-1 font-mono text-xs"
                                            />
                                            <AnimatedInput
                                                value={header.value}
                                                onChange={(e) =>
                                                    updateHeader(
                                                        index,
                                                        'value',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Value"
                                                className="flex-1 font-mono text-xs"
                                            />
                                            <AnimatedButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    removeHeader(index)
                                                }
                                                className="h-8 w-8 px-0 text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </AnimatedButton>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Body Type Selector */}
                            {showBodyEditor && (
                                <div>
                                    <Label className="mb-2 block text-xs font-medium text-muted-foreground">
                                        Body Type
                                    </Label>
                                    <div className="flex gap-2">
                                        {(
                                            [
                                                'none',
                                                'json',
                                                'form-data',
                                            ] as const
                                        ).map((bt) => (
                                            <AnimatedButton
                                                key={bt}
                                                variant={
                                                    bodyType === bt
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                size="sm"
                                                onClick={() => setBodyType(bt)}
                                                className="font-mono text-xs"
                                            >
                                                {bt === 'form-data'
                                                    ? 'form-data (files)'
                                                    : bt}
                                            </AnimatedButton>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* JSON Body */}
                            {showBodyEditor && bodyType === 'json' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Label className="mb-2 block text-xs font-medium text-muted-foreground">
                                        Body (JSON)
                                    </Label>
                                    <AnimatedTextarea
                                        value={body}
                                        onChange={(e) =>
                                            setBody(e.target.value)
                                        }
                                        placeholder='{\n  "key": "value"\n}'
                                        className="min-h-[150px] resize-y font-mono text-xs"
                                    />
                                </motion.div>
                            )}

                            {/* Form Data Body */}
                            {showBodyEditor && bodyType === 'form-data' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-3"
                                >
                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <Label className="text-xs font-medium text-muted-foreground">
                                                Text Fields
                                            </Label>
                                            <AnimatedButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={addFormField}
                                                className="h-7 text-xs"
                                            >
                                                <Plus className="mr-1 h-3 w-3" />{' '}
                                                Add
                                            </AnimatedButton>
                                        </div>
                                        <div className="space-y-1">
                                            {formDataFields.map(
                                                (field, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex gap-1"
                                                    >
                                                        <AnimatedInput
                                                            value={field.key}
                                                            onChange={(e) =>
                                                                updateFormField(
                                                                    index,
                                                                    'key',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Field name"
                                                            className="flex-1 font-mono text-xs"
                                                        />
                                                        <AnimatedInput
                                                            value={field.value}
                                                            onChange={(e) =>
                                                                updateFormField(
                                                                    index,
                                                                    'value',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Value"
                                                            className="flex-1 font-mono text-xs"
                                                        />
                                                        <AnimatedButton
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                removeFormField(
                                                                    index,
                                                                )
                                                            }
                                                            className="h-8 w-8 px-0 text-muted-foreground hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </AnimatedButton>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>

                                    <Separator />

                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <Label className="text-xs font-medium text-muted-foreground">
                                                File Fields
                                            </Label>
                                            <AnimatedButton
                                                variant="ghost"
                                                size="sm"
                                                onClick={addFileField}
                                                className="h-7 text-xs"
                                            >
                                                <Upload className="mr-1 h-3 w-3" />{' '}
                                                Add File
                                            </AnimatedButton>
                                        </div>
                                        <div className="space-y-2">
                                            {formFileFields.map(
                                                (field, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center gap-1"
                                                    >
                                                        <AnimatedInput
                                                            value={field.key}
                                                            onChange={(e) =>
                                                                updateFileFieldKey(
                                                                    index,
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Field name (e.g. face_image)"
                                                            className="w-[180px] font-mono text-xs"
                                                        />
                                                        <div className="flex flex-1 items-center gap-2">
                                                            <input
                                                                ref={(el) => {
                                                                    if (el) {
                                                                        fileInputRefs.current.set(
                                                                            index,
                                                                            el,
                                                                        );
                                                                    }
                                                                }}
                                                                type="file"
                                                                accept="image/*,video/*"
                                                                onChange={(e) =>
                                                                    updateFileFieldValue(
                                                                        index,
                                                                        e.target
                                                                            .files?.[0] ??
                                                                            null,
                                                                    )
                                                                }
                                                                className="hidden"
                                                            />
                                                            <AnimatedButton
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    fileInputRefs.current
                                                                        .get(
                                                                            index,
                                                                        )
                                                                        ?.click()
                                                                }
                                                                className="h-8 text-xs"
                                                            >
                                                                <Upload className="mr-1 h-3 w-3" />
                                                                {field.file
                                                                    ? field.file
                                                                          .name
                                                                    : 'Choose file'}
                                                            </AnimatedButton>
                                                            {field.file && (
                                                                <span className="max-w-[150px] truncate text-xs text-muted-foreground">
                                                                    {(
                                                                        field
                                                                            .file
                                                                            .size /
                                                                        1024
                                                                    ).toFixed(
                                                                        0,
                                                                    )}{' '}
                                                                    KB
                                                                </span>
                                                            )}
                                                        </div>
                                                        <AnimatedButton
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                removeFileField(
                                                                    index,
                                                                )
                                                            }
                                                            className="h-8 w-8 px-0 text-muted-foreground hover:text-destructive"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </AnimatedButton>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Send Button */}
                            <AnimatedButton
                                onClick={sendRequest}
                                disabled={loading || !url.trim()}
                                className="w-full"
                            >
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="mr-2 h-4 w-4" />
                                )}
                                {loading ? 'Sending...' : 'Send Request'}
                            </AnimatedButton>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Response Viewer */}
                <motion.div
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
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
                                            {response.status}{' '}
                                            {response.statusText}
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
                                            {
                                                Object.keys(response.headers)
                                                    .length
                                            }
                                            )
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="mt-2">
                                            <div className="max-h-[150px] overflow-auto rounded-md bg-muted/50 p-3">
                                                {Object.entries(
                                                    response.headers,
                                                ).map(([key, value]) => (
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
                                                ))}
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>

                                    <Separator />

                                    {renderResponseBody()}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* History */}
            {history.length > 0 && (
                <motion.div
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                    transition={{ duration: 0.3, delay: 0.3 }}
                >
                    <Collapsible
                        open={historyOpen}
                        onOpenChange={setHistoryOpen}
                    >
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
                                                onClick={() =>
                                                    loadFromHistory(entry)
                                                }
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
                </motion.div>
            )}
        </div>
    );
}
