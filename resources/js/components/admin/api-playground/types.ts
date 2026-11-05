export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type BodyType = 'json' | 'form-data' | 'none';

export interface KeyValuePair {
    key: string;
    value: string;
}

export interface FileEntry {
    key: string;
    file: File | null;
}

export interface ApiResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    bodyType: 'json' | 'html' | 'text' | 'empty';
    rawHtml: string;
    duration: number;
}

export interface HistoryEntry {
    id: string;
    method: HttpMethod;
    url: string;
    body: string;
    status: number;
    duration: number;
    timestamp: number;
}

export interface EndpointTemplate {
    label: string;
    group: string;
    method: HttpMethod;
    url: string;
    bodyType: BodyType;
    body: string;
    headers: KeyValuePair[];
}

export interface PlaygroundTemplate {
    id: number;
    name: string;
    slug: string;
    type: 'image' | 'video';
    model: string | null;
    ai_model?: {
        id: number;
        name: string;
        model_name: string;
        provider_name: string;
    } | null;
    generation_type?: {
        id: number;
        name: string;
        slug: string;
    } | null;
}

export const METHOD_COLORS: Record<HttpMethod, string> = {
    GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    POST: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    PATCH: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export const STATUS_COLORS: Record<number, string> = {
    2: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    3: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    4: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    5: 'bg-red-500/15 text-red-400 border-red-500/30',
};

export const GROUP_LABELS: Record<string, string> = {
    auth: 'Auth',
    ai: 'AI',
    public: 'Public',
    customer: 'Customer',
};

export const GROUP_COLORS: Record<string, string> = {
    auth: 'text-violet-400 border-violet-500/30 bg-violet-500/15',
    ai: 'text-sky-400 border-sky-500/30 bg-sky-500/15',
    public: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/15',
    customer: 'text-amber-400 border-amber-500/30 bg-amber-500/15',
};

export function formatJson(obj: unknown): string {
    try {
        return JSON.stringify(obj, null, 2);
    } catch {
        return String(obj);
    }
}

export function getStatusColor(status: number): string {
    const prefix = Math.floor(status / 100);

    return (
        STATUS_COLORS[prefix] ??
        'bg-gray-500/15 text-gray-400 border-gray-500/30'
    );
}

export function detectBodyType(
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

export function extractHtmlSummary(html: string): {
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
