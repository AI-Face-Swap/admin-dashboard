import { Head } from '@inertiajs/react';
import axios from 'axios';
import {
    BookOpen,
    Calendar,
    Check,
    Clock,
    Copy,
    Loader2,
    MessageSquarePlus,
    Search,
    Send,
    Sparkles,
    Trash2,
    User,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AstrologyInfo = {
    day: string | null;
    myanmar_birthday: string | null;
    zodiac: string | null;
    mahabote: string | null;
    nakhat: string | null;
    san_yat_natkhat: string | null;
};

type RagSource = {
    id?: string;
    name: string;
    score: number;
    excerpt: string;
};

type ConversationSummary = {
    id: number;
    category: string;
    title: string;
    client_name: string | null;
    client_gender: 'male' | 'female' | null;
    client_birthday: string | null;
    client_astrology: AstrologyInfo | null;
    updated_at: string | null;
};

type ChatMessage = {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    structured?: {
        sections?: { title: string; description: string }[];
        checklist?: { item: string; detail: string }[];
        related_questions?: string[];
    } | null;
    rag_sources?: RagSource[];
    model?: string | null;
    response_type?: string | null;
    duration_ms?: number | null;
    created_at?: string | null;
};

function parseFlexibleDob(raw: string): string | null {
    const trimmed = raw.trim();
    const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (isoMatch) {
        const [, y, m, d] = isoMatch;
        const mm = m.padStart(2, '0');
        const dd = d.padStart(2, '0');
        const date = new Date(`${y}-${mm}-${dd}T00:00:00`);
        if (
            !Number.isNaN(date.getTime()) &&
            date.getFullYear() === Number(y) &&
            date.getMonth() + 1 === Number(m) &&
            date.getDate() === Number(d)
        ) {
            return `${y}-${mm}-${dd}`;
        }
    }
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
        const [, d, m, y] = dmyMatch;
        const mm = m.padStart(2, '0');
        const dd = d.padStart(2, '0');
        const date = new Date(`${y}-${mm}-${dd}T00:00:00`);
        if (
            !Number.isNaN(date.getTime()) &&
            date.getFullYear() === Number(y) &&
            date.getMonth() + 1 === Number(m) &&
            date.getDate() === Number(d)
        ) {
            return `${y}-${mm}-${dd}`;
        }
    }
    return null;
}

type CategoryKey = 'astrology' | 'general' | 'health' | 'education';
type ResponseType = 'short' | 'normal' | 'long';
type LanguageKey = 'my' | 'en';

const CATEGORIES: { key: CategoryKey; label: string }[] = [
    { key: 'astrology', label: 'ဗေဒင်' },
    { key: 'general', label: 'General' },
    { key: 'health', label: 'Health' },
    { key: 'education', label: 'Education' },
];

const QUICK_ASTROLOGY_PROMPTS = [
    '၂၀၂၆ ခုနှစ် စီးပွားရေးနှင့် အလုပ်အကိုင် ကံဇာတာ ဟောပေးပါ',
    'အချစ်ရေးနှင့် အိမ်ထောင်ရေး ကံဇာတာ ပြောပြပေးပါ',
    'ကျန်းမာရေးနှင့် သတိထားရမည့်အချက်များ ပြောပြပေးပါ',
    'ကံကောင်းစေမည့် ယတြာနှင့် အဆောင်အရောင်များ ပြောပြပေးပါ',
];

export default function Index({
    conversations: initialConversations,
}: {
    conversations: ConversationSummary[];
}) {
    const [conversations, setConversations] =
        useState<ConversationSummary[]>(initialConversations);
    const [leftTab, setLeftTab] = useState<'profile' | 'history'>('profile');
    const [historySearch, setHistorySearch] = useState('');

    const [activeConversationId, setActiveConversationId] = useState<
        number | null
    >(null);
    const [category, setCategory] = useState<CategoryKey>('astrology');
    const [responseType, setResponseType] = useState<ResponseType>('normal');
    const [language, setLanguage] = useState<LanguageKey>('my');

    // Quick Client Profile (editable anytime)
    const [clientName, setClientName] = useState('');
    const [clientGender, setClientGender] = useState<'male' | 'female'>('male');
    const [clientBirthday, setClientBirthday] = useState('');
    const [astrology, setAstrology] = useState<AstrologyInfo | null>(null);
    const [calculatingDob, setCalculatingDob] = useState(false);

    // Chat state
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [prompt, setPrompt] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingConversation, setLoadingConversation] = useState(false);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
    const nativeDatePickerRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sending]);

    const filteredConversations = useMemo(() => {
        const q = historySearch.trim().toLowerCase();
        if (!q) return conversations;
        return conversations.filter((c) => {
            const haystack = [
                c.title,
                c.client_name ?? '',
                c.client_birthday ?? '',
                c.category,
            ]
                .join(' ')
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [conversations, historySearch]);

    const handleBirthdayChange = async (value: string) => {
        setClientBirthday(value);
        if (!value.trim()) {
            setAstrology(null);
            return;
        }
        const parsedIso = parseFlexibleDob(value);
        if (!parsedIso) {
            setAstrology(null);
            return;
        }
        if (parsedIso !== value) {
            setClientBirthday(parsedIso);
        }
        setCalculatingDob(true);
        try {
            const res = await axios.post('/admin/ai-chat/calculate-dob', {
                birthday: parsedIso,
            });
            setAstrology(res.data.astrology ?? null);
        } catch {
            setAstrology(null);
            toast.error('မွေးသက္ကရာဇ် တွက်ချက်၍ မရပါ');
        } finally {
            setCalculatingDob(false);
        }
    };

    const handleSelectRelatedQuestion = (question: string) => {
        setPrompt(question);
        promptInputRef.current?.focus();
    };

    const handleNewClient = () => {
        setActiveConversationId(null);
        setMessages([]);
        setPrompt('');
        setClientName('');
        setClientGender('male');
        setClientBirthday('');
        setAstrology(null);
        setLeftTab('profile');
    };

    const handleSelectConversation = async (conv: ConversationSummary) => {
        setLoadingConversation(true);
        try {
            const res = await axios.get(`/admin/ai-chat/conversations/${conv.id}`);
            const loaded: ConversationSummary = res.data.conversation;
            setActiveConversationId(loaded.id);
            setCategory((loaded.category as CategoryKey) || 'astrology');
            setClientName(loaded.client_name ?? '');
            setClientGender(loaded.client_gender ?? 'male');
            setClientBirthday(loaded.client_birthday ?? '');
            setAstrology(loaded.client_astrology ?? null);
            setMessages(res.data.messages ?? []);
        } catch {
            toast.error('Chat history ဖွင့်၍ မရပါ');
        } finally {
            setLoadingConversation(false);
        }
    };

    const handleDeleteConversation = async (
        e: React.MouseEvent,
        id: number,
    ) => {
        e.stopPropagation();
        try {
            await axios.delete(`/admin/ai-chat/conversations/${id}`);
            setConversations((prev) => prev.filter((c) => c.id !== id));
            if (activeConversationId === id) {
                handleNewClient();
            }
            toast.success('History ဖျက်ပြီးပါပြီ');
        } catch {
            toast.error('History ဖျက်၍ မရပါ');
        }
    };

    const handleCopy = async (id: number, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            toast.success('Copy ကူးပြီးပါပြီ');
            setTimeout(() => setCopiedId(null), 1500);
        } catch {
            toast.error('Copy ကူး၍ မရပါ');
        }
    };

    const handleSend = async (overridePrompt?: string) => {
        const text = (overridePrompt ?? prompt).trim();
        if (!text || sending) return;

        if (category === 'astrology' && !clientBirthday) {
            toast.error('ဗေဒင်မေးရန် Date of Birth အရင်ရွေးပေးပါ');
            setLeftTab('profile');
            return;
        }

        const tempUserMsg: ChatMessage = {
            id: -Date.now(),
            role: 'user',
            content: text,
        };

        setMessages((prev) => [...prev, tempUserMsg]);
        setPrompt('');
        setSending(true);

        try {
            const res = await axios.post('/admin/ai-chat/send', {
                prompt: text,
                category,
                response_type: category === 'astrology' ? responseType : null,
                language,
                conversation_id: activeConversationId,
                client_name: clientName || null,
                client_gender: clientGender,
                client_birthday: clientBirthday || null,
            });

            const savedConv: ConversationSummary = res.data.conversation;
            const userMsg: ChatMessage = res.data.user_message;
            const assistantMsg: ChatMessage = res.data.assistant_message;

            setActiveConversationId(savedConv.id);
            if (savedConv.client_astrology) {
                setAstrology(savedConv.client_astrology);
            }

            setMessages((prev) => [
                ...prev.filter((m) => m.id !== tempUserMsg.id),
                userMsg,
                assistantMsg,
            ]);

            setConversations((prev) => [
                savedConv,
                ...prev.filter((c) => c.id !== savedConv.id),
            ]);
        } catch (err: unknown) {
            setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
            setPrompt(text);
            const message =
                axios.isAxiosError(err) && err.response?.data?.message
                    ? String(err.response.data.message)
                    : 'AI response ရယူ၍ မရပါ';
            toast.error(message);
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <Head title="AI Chat" />

            <div className="flex h-[calc(100vh-5.5rem)] flex-col gap-4 p-4 lg:flex-row">
                {/* Left Control Panel */}
                <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border bg-card lg:w-[340px]">
                    {/* Category Tabs */}
                    <div className="grid grid-cols-4 gap-1 border-b p-2">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.key}
                                type="button"
                                onClick={() => setCategory(cat.key)}
                                className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                    category === cat.key
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Profile / History Switcher */}
                    <div className="grid grid-cols-2 border-b bg-muted/30 p-1.5">
                        <button
                            type="button"
                            onClick={() => setLeftTab('profile')}
                            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                leftTab === 'profile'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <User className="h-3.5 w-3.5" />
                            Client Profile
                        </button>
                        <button
                            type="button"
                            onClick={() => setLeftTab('history')}
                            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                leftTab === 'history'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Clock className="h-3.5 w-3.5" />
                            History ({conversations.length})
                        </button>
                    </div>

                    {leftTab === 'profile' ? (
                        <div className="flex-1 space-y-4 overflow-y-auto p-4">
                            {category === 'astrology' && (
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="client-name"
                                            className="text-xs"
                                        >
                                            Client Name (Optional)
                                        </Label>
                                        <Input
                                            id="client-name"
                                            value={clientName}
                                            onChange={(e) =>
                                                setClientName(e.target.value)
                                            }
                                            placeholder="e.g. Mg Mg"
                                            className="h-9 text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Gender</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(['male', 'female'] as const).map(
                                                (g) => (
                                                    <button
                                                        key={g}
                                                        type="button"
                                                        onClick={() =>
                                                            setClientGender(g)
                                                        }
                                                        className={`rounded-lg border py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                                            clientGender === g
                                                                ? 'border-primary bg-primary/10 text-primary'
                                                                : 'border-border text-muted-foreground hover:bg-muted'
                                                        }`}
                                                    >
                                                        {g === 'male'
                                                            ? 'Male (ကျား)'
                                                            : 'Female (မ)'}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="client-dob"
                                            className="flex items-center justify-between text-xs"
                                        >
                                            <span>
                                                Date of Birth (YYYY-MM-DD)
                                            </span>
                                            {calculatingDob && (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                    တွက်နေသည်...
                                                </span>
                                            )}
                                        </Label>
                                        <div className="relative flex items-center gap-1.5">
                                            <Input
                                                id="client-dob"
                                                type="text"
                                                inputMode="numeric"
                                                value={clientBirthday}
                                                onChange={(e) =>
                                                    handleBirthdayChange(
                                                        e.target.value,
                                                    )
                                                }
                                                onPaste={(e) => {
                                                    const pasted =
                                                        e.clipboardData.getData(
                                                            'text',
                                                        );
                                                    const parsed =
                                                        parseFlexibleDob(
                                                            pasted,
                                                        );
                                                    if (parsed) {
                                                        e.preventDefault();
                                                        handleBirthdayChange(
                                                            parsed,
                                                        );
                                                    }
                                                }}
                                                placeholder="2007-07-16"
                                                className="h-9 flex-1 font-mono text-sm"
                                            />
                                            <input
                                                ref={nativeDatePickerRef}
                                                type="date"
                                                value={
                                                    parseFlexibleDob(
                                                        clientBirthday,
                                                    ) ?? ''
                                                }
                                                onChange={(e) =>
                                                    handleBirthdayChange(
                                                        e.target.value,
                                                    )
                                                }
                                                className="sr-only"
                                                tabIndex={-1}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 shrink-0"
                                                title="Pick from calendar"
                                                onClick={() => {
                                                    const el =
                                                        nativeDatePickerRef.current;
                                                    if (!el) return;
                                                    if (
                                                        typeof el.showPicker ===
                                                        'function'
                                                    ) {
                                                        el.showPicker();
                                                    } else {
                                                        el.click();
                                                    }
                                                }}
                                            >
                                                <Calendar className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                            Copy-paste ရသည် (e.g. 2007-07-16
                                            သို့ 16/07/2007)
                                        </p>
                                    </div>

                                    {astrology && (
                                        <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-xs">
                                            <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                                Auto-Calculated Chart
                                            </div>
                                            {astrology.myanmar_birthday && (
                                                <p className="text-muted-foreground">
                                                    {astrology.myanmar_birthday}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {astrology.day && (
                                                    <Badge variant="secondary">
                                                        {astrology.day}
                                                    </Badge>
                                                )}
                                                {astrology.zodiac && (
                                                    <Badge variant="secondary">
                                                        {astrology.zodiac}
                                                    </Badge>
                                                )}
                                                {astrology.mahabote && (
                                                    <Badge variant="secondary">
                                                        {astrology.mahabote}
                                                    </Badge>
                                                )}
                                                {astrology.nakhat && (
                                                    <Badge variant="outline">
                                                        {astrology.nakhat}
                                                    </Badge>
                                                )}
                                                {astrology.san_yat_natkhat && (
                                                    <Badge variant="outline">
                                                        {
                                                            astrology.san_yat_natkhat
                                                        }
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Response Length (Radio) */}
                            {category === 'astrology' && (
                                <div className="space-y-2 border-t pt-3">
                                    <Label className="text-xs">
                                        ဟောစာတမ်း အမျိုးအစား
                                    </Label>
                                    <div
                                        role="radiogroup"
                                        className="space-y-1.5"
                                    >
                                        {(
                                            [
                                                {
                                                    key: 'short',
                                                    label: 'လိုရင်းတိုရှင်း',
                                                    points: 10,
                                                },
                                                {
                                                    key: 'normal',
                                                    label: 'အပြည့်အစုံ',
                                                    points: 50,
                                                },
                                                {
                                                    key: 'long',
                                                    label: 'အသေးစိတ်',
                                                    points: 100,
                                                },
                                            ] as const
                                        ).map((opt) => {
                                            const checked =
                                                responseType === opt.key;
                                            return (
                                                <label
                                                    key={opt.key}
                                                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors cursor-pointer ${
                                                        checked
                                                            ? 'border-primary bg-primary/10 text-primary'
                                                            : 'border-border text-muted-foreground hover:bg-muted'
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-2 font-medium">
                                                        <input
                                                            type="radio"
                                                            name="admin-astrology-response-type"
                                                            value={opt.key}
                                                            checked={checked}
                                                            onChange={() =>
                                                                setResponseType(
                                                                    opt.key,
                                                                )
                                                            }
                                                            className="accent-primary"
                                                        />
                                                        {opt.label}
                                                    </span>
                                                    <Badge
                                                        variant={
                                                            checked
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                        className="px-1.5 py-0 text-[10px]"
                                                    >
                                                        {opt.points} pts
                                                    </Badge>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Language */}
                            <div className="space-y-1.5 border-t pt-3">
                                <Label className="text-xs">Language</Label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {(
                                        [
                                            { key: 'my', label: 'မြန်မာ' },
                                            { key: 'en', label: 'English' },
                                        ] as const
                                    ).map((opt) => (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            onClick={() => setLanguage(opt.key)}
                                            className={`rounded-lg border py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                                language === opt.key
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'border-border text-muted-foreground hover:bg-muted'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-1 flex-col overflow-hidden">
                            <div className="border-b p-2.5">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        value={historySearch}
                                        onChange={(e) =>
                                            setHistorySearch(e.target.value)
                                        }
                                        placeholder="နာမည် / DOB / မေးခွန်း ရှာရန်..."
                                        className="h-8 pl-8 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 space-y-1 overflow-y-auto p-2">
                                {filteredConversations.length === 0 ? (
                                    <p className="py-10 text-center text-xs text-muted-foreground">
                                        History မရှိသေးပါ
                                    </p>
                                ) : (
                                    filteredConversations.map((conv) => (
                                        <div
                                            key={conv.id}
                                            onClick={() =>
                                                handleSelectConversation(conv)
                                            }
                                            className={`group flex items-start justify-between gap-2 rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                                                activeConversationId === conv.id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-transparent hover:bg-muted/60'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Badge
                                                        variant="outline"
                                                        className="px-1.5 py-0 text-[10px]"
                                                    >
                                                        {conv.category}
                                                    </Badge>
                                                    {(conv.client_name ||
                                                        conv.client_birthday) && (
                                                        <span className="truncate text-[11px] font-medium text-foreground">
                                                            {conv.client_name ||
                                                                'Client'}
                                                            {conv.client_birthday
                                                                ? ` · ${conv.client_birthday}`
                                                                : ''}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                                    {conv.title}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) =>
                                                    handleDeleteConversation(
                                                        e,
                                                        conv.id,
                                                    )
                                                }
                                                className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 cursor-pointer"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </aside>

                {/* Right Main Chat Panel */}
                <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
                    {/* Chat Header */}
                    <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <h1 className="text-sm font-semibold">
                                HTUT AI Operator Chat
                            </h1>
                            {category === 'astrology' && clientBirthday && (
                                <Badge variant="secondary" className="text-xs">
                                    {clientName ? `${clientName} · ` : ''}
                                    {clientBirthday}
                                    {astrology?.zodiac
                                        ? ` · ${astrology.zodiac}`
                                        : ''}
                                    {astrology?.mahabote
                                        ? ` · ${astrology.mahabote}`
                                        : ''}
                                </Badge>
                            )}
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleNewClient}
                            className="gap-1.5 text-xs"
                        >
                            <MessageSquarePlus className="h-3.5 w-3.5" />
                            New Client
                        </Button>
                    </header>

                    {/* Messages */}
                    <div className="flex-1 space-y-4 overflow-y-auto p-4">
                        {loadingConversation ? (
                            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading conversation...
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                                <Sparkles className="h-8 w-8 text-muted-foreground/50" />
                                <p className="text-sm font-medium text-foreground">
                                    {category === 'astrology'
                                        ? 'ဘယ်ဘက်မှာ Date of Birth ရွေးပြီး ဗေဒင်မေးခွန်း စမေးနိုင်ပါပြီ'
                                        : 'HTUT AI ကို မေးခွန်း စမေးနိုင်ပါပြီ'}
                                </p>
                                <p className="max-w-md text-xs text-muted-foreground">
                                    နောက်တစ်ယောက်အတွက် မေးမယ်ဆိုရင် DOB ကို
                                    တန်းပြောင်း (သို့) New Client နှိပ်ပြီး
                                    ချက်ချင်းတွက်နိုင်ပါတယ်။
                                </p>
                            </div>
                        ) : (
                            messages.map((msg) =>
                                msg.role === 'user' ? (
                                    <div
                                        key={msg.id}
                                        className="flex justify-end"
                                    >
                                        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm whitespace-pre-wrap text-primary-foreground">
                                            {msg.content}
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        key={msg.id}
                                        className="flex flex-col items-start gap-2"
                                    >
                                        <div className="w-full max-w-[90%] rounded-2xl rounded-bl-sm border bg-muted/30 p-4">
                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                                    <span className="font-semibold text-foreground">
                                                        HTUT AI
                                                    </span>
                                                    {msg.model && (
                                                        <Badge
                                                            variant="outline"
                                                            className="px-1.5 py-0 text-[10px]"
                                                        >
                                                            {msg.model}
                                                        </Badge>
                                                    )}
                                                    {msg.response_type && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="px-1.5 py-0 text-[10px]"
                                                        >
                                                            {msg.response_type}
                                                        </Badge>
                                                    )}
                                                    {msg.duration_ms && (
                                                        <span>
                                                            {(
                                                                msg.duration_ms /
                                                                1000
                                                            ).toFixed(1)}
                                                            s
                                                        </span>
                                                    )}
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleCopy(
                                                            msg.id,
                                                            msg.content,
                                                        )
                                                    }
                                                    className="h-7 gap-1 px-2 text-xs"
                                                >
                                                    {copiedId === msg.id ? (
                                                        <>
                                                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                            Copied
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="h-3.5 w-3.5" />
                                                            Copy
                                                        </>
                                                    )}
                                                </Button>
                                            </div>

                                            <div className="space-y-2.5 text-sm leading-relaxed break-words">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        h1: ({ children }) => (
                                                            <h1 className="mt-3 text-base font-bold first:mt-0">
                                                                {children}
                                                            </h1>
                                                        ),
                                                        h2: ({ children }) => (
                                                            <h2 className="mt-3 text-sm font-bold first:mt-0">
                                                                {children}
                                                            </h2>
                                                        ),
                                                        h3: ({ children }) => (
                                                            <h3 className="mt-2.5 text-sm font-semibold first:mt-0">
                                                                {children}
                                                            </h3>
                                                        ),
                                                        p: ({ children }) => (
                                                            <p className="leading-relaxed">
                                                                {children}
                                                            </p>
                                                        ),
                                                        ul: ({ children }) => (
                                                            <ul className="list-disc space-y-1 pl-5">
                                                                {children}
                                                            </ul>
                                                        ),
                                                        ol: ({ children }) => (
                                                            <ol className="list-decimal space-y-1 pl-5">
                                                                {children}
                                                            </ol>
                                                        ),
                                                        table: ({
                                                            children,
                                                        }) => (
                                                            <div className="my-2 overflow-x-auto rounded-lg border">
                                                                <table className="w-full text-left text-xs">
                                                                    {children}
                                                                </table>
                                                            </div>
                                                        ),
                                                        thead: ({
                                                            children,
                                                        }) => (
                                                            <thead className="border-b bg-muted/60">
                                                                {children}
                                                            </thead>
                                                        ),
                                                        tbody: ({
                                                            children,
                                                        }) => (
                                                            <tbody className="divide-y">
                                                                {children}
                                                            </tbody>
                                                        ),
                                                        th: ({ children }) => (
                                                            <th className="px-3 py-2 font-semibold">
                                                                {children}
                                                            </th>
                                                        ),
                                                        td: ({ children }) => (
                                                            <td className="px-3 py-2">
                                                                {children}
                                                            </td>
                                                        ),
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>

                                            {msg.rag_sources &&
                                                msg.rag_sources.length > 0 && (
                                                    <details className="mt-3 border-t pt-2.5 text-xs text-muted-foreground">
                                                        <summary className="inline-flex cursor-pointer items-center gap-1.5 font-medium select-none hover:text-foreground">
                                                            <BookOpen className="h-3.5 w-3.5" />
                                                            RAG Sources (
                                                            {
                                                                msg.rag_sources
                                                                    .length
                                                            }
                                                            )
                                                        </summary>
                                                        <ol className="mt-2 space-y-1.5">
                                                            {msg.rag_sources.map(
                                                                (src, idx) => (
                                                                    <li
                                                                        key={
                                                                            idx
                                                                        }
                                                                        className="rounded-md border bg-background p-2"
                                                                    >
                                                                        <div className="font-medium text-foreground">
                                                                            {
                                                                                src.name
                                                                            }{' '}
                                                                            ·
                                                                            score{' '}
                                                                            {
                                                                                src.score
                                                                            }
                                                                        </div>
                                                                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                                            {
                                                                                src.excerpt
                                                                            }
                                                                        </p>
                                                                    </li>
                                                                ),
                                                            )}
                                                        </ol>
                                                    </details>
                                                )}
                                        </div>
                                    </div>
                                ),
                            )
                        )}

                        {sending && (
                            <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                {category === 'astrology'
                                    ? 'RAG knowledge base ရှာပြီး OpenCode Go ဖြင့် တွက်ချက်နေပါသည်...'
                                    : 'HTUT AI အဖြေထုတ်ပေးနေပါသည်...'}
                            </div>
                        )}

                        {(() => {
                            if (sending) return null;
                            const lastAssistant = [...messages]
                                .reverse()
                                .find((m) => m.role === 'assistant');
                            const related =
                                lastAssistant?.structured?.related_questions ??
                                [];
                            if (related.length === 0) return null;
                            return (
                                <div className="flex flex-col items-start gap-1.5 pt-1">
                                    {related.slice(0, 3).map((q, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() =>
                                                handleSelectRelatedQuestion(q)
                                            }
                                            className="w-fit max-w-full rounded-full border bg-muted/40 px-3.5 py-1.5 text-left text-xs text-foreground transition-colors hover:border-primary hover:bg-primary/5 cursor-pointer"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            );
                        })()}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Footer Composer */}
                    <footer className="border-t p-3">
                        {category === 'astrology' && messages.length === 0 && (
                            <div className="mb-2 flex flex-wrap gap-1.5">
                                {QUICK_ASTROLOGY_PROMPTS.map((q) => (
                                    <button
                                        key={q}
                                        type="button"
                                        disabled={sending}
                                        onClick={() =>
                                            handleSelectRelatedQuestion(q)
                                        }
                                        className="rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50 cursor-pointer"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSend();
                            }}
                            className="flex items-end gap-2"
                        >
                            <textarea
                                ref={promptInputRef}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (
                                        e.key === 'Enter' &&
                                        !e.shiftKey &&
                                        !e.nativeEvent.isComposing
                                    ) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                rows={2}
                                placeholder="မေးခွန်းရိုက်ထည့်ပါ... (Enter to send, Shift+Enter for new line)"
                                className="max-h-36 min-h-[44px] flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            <Button
                                type="submit"
                                disabled={sending || !prompt.trim()}
                                className="h-[44px] gap-1.5 px-4"
                            >
                                {sending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                                Send
                            </Button>
                        </form>
                    </footer>
                </section>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'AI Chat', href: '/admin/ai-chat' }],
};
