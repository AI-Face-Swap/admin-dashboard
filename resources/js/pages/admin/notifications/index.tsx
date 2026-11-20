import { Head, Link, router } from '@inertiajs/react';
import { Bell, CalendarClock, Pencil, Plus, Send, Sparkles, Trash2, User, Users } from 'lucide-react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
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
import type { CustomerOption, TemplateOption } from './NotificationForm';

type PushNotificationItem = {
    id: number;
    title: string;
    body: string;
    target_type: 'all' | 'single';
    customer_id: number | null;
    customer: CustomerOption | null;
    template_id: number | null;
    template: TemplateOption | null;
    image_url: string | null;
    web_url: string | null;
    mobile_url: string | null;
    status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
    scheduled_at: string | null;
    sent_at: string | null;
    sent_count: number;
    failed_count: number;
    created_at: string;
};

type PaginatedNotifications = {
    data: PushNotificationItem[];
    current_page: number;
    last_page: number;
    total: number;
};

type Props = {
    notifications: PaginatedNotifications;
};

const statusColorMap: Record<PushNotificationItem['status'], string> = {
    draft: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
    scheduled: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
    sending: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
    sent: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    failed: 'bg-red-500/15 text-red-600 dark:text-red-300',
};

function formatYangonDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-US', {
        timeZone: 'Asia/Yangon',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function Index({ notifications }: Props) {
    const handleSendNow = (item: PushNotificationItem) => {
        if (!confirm(`Send "${item.title}" now?`)) {
            return;
        }
        router.post(`/admin/notifications/${item.id}/send`, {}, { preserveScroll: true });
    };

    const handleDelete = (item: PushNotificationItem) => {
        if (!confirm(`Delete notification "${item.title}"?`)) {
            return;
        }
        router.delete(`/admin/notifications/${item.id}`, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Notifications" />

            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Heading
                        title="Push Notifications"
                        description="Send broadcast or single-user push notifications with optional template links, web/mobile URLs, images, or scheduling."
                    />
                    <AnimatedButton asChild>
                        <Link href="/admin/notifications/create">
                            <Plus className="mr-2 h-4 w-4" />
                            New Notification
                        </Link>
                    </AnimatedButton>
                </div>

                <AnimatedCard>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title & Message</TableHead>
                                    <TableHead>Link / Promo</TableHead>
                                    <TableHead>Target</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Schedule / Sent (Yangon)</TableHead>
                                    <TableHead>Delivery</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {notifications.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                                            <Bell className="mx-auto mb-2 h-8 w-8 opacity-40" />
                                            No notifications created yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    notifications.data.map((item) => {
                                        const canEditOrSend = item.status === 'draft' || item.status === 'scheduled' || item.status === 'failed';
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell className="max-w-xs">
                                                    <div className="flex items-start gap-2.5">
                                                        {item.image_url && (
                                                            <img
                                                                src={item.image_url}
                                                                alt=""
                                                                className="h-10 w-10 shrink-0 rounded-md object-cover border"
                                                            />
                                                        )}
                                                        <div className="min-w-0">
                                                            <div className="font-medium truncate">{item.title}</div>
                                                            <div className="line-clamp-2 text-xs text-muted-foreground">{item.body}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-[200px] text-xs">
                                                    {item.template ? (
                                                        <Badge variant="secondary" className="gap-1 mb-1">
                                                            <Sparkles className="h-3 w-3" />
                                                            {item.template.name}
                                                        </Badge>
                                                    ) : null}
                                                    {item.web_url && (
                                                        <div className="truncate text-muted-foreground" title={item.web_url}>
                                                            Web: {item.web_url}
                                                        </div>
                                                    )}
                                                    {item.mobile_url && (
                                                        <div className="truncate text-muted-foreground" title={item.mobile_url}>
                                                            Mobile: {item.mobile_url}
                                                        </div>
                                                    )}
                                                    {!item.template && !item.web_url && !item.mobile_url && (
                                                        <span className="text-muted-foreground/60">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {item.target_type === 'all' ? (
                                                        <Badge variant="outline" className="gap-1">
                                                            <Users className="h-3 w-3" />
                                                            All Users
                                                        </Badge>
                                                    ) : (
                                                        <div className="flex items-center gap-1 text-xs">
                                                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                            <span>{item.customer?.name ?? `Customer #${item.customer_id}`}</span>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={statusColorMap[item.status]}>
                                                        {item.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {item.sent_at ? (
                                                        <span>Sent: {formatYangonDateTime(item.sent_at)}</span>
                                                    ) : item.scheduled_at ? (
                                                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
                                                            <CalendarClock className="h-3.5 w-3.5" />
                                                            {formatYangonDateTime(item.scheduled_at)}
                                                        </span>
                                                    ) : (
                                                        <span>Draft</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <span className="text-emerald-600 dark:text-emerald-400">{item.sent_count} sent</span>
                                                    {item.failed_count > 0 && (
                                                        <span className="ml-2 text-red-500">{item.failed_count} failed</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {canEditOrSend && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title="Send Now"
                                                                    onClick={() => handleSendNow(item)}
                                                                >
                                                                    <Send className="h-4 w-4 text-emerald-600" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title="Edit"
                                                                    asChild
                                                                >
                                                                    <Link href={`/admin/notifications/${item.id}/edit`}>
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Link>
                                                                </Button>
                                                            </>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Delete"
                                                            onClick={() => handleDelete(item)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </AnimatedCard>
            </div>
        </>
    );
}
