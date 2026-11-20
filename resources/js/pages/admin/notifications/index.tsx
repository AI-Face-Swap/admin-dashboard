import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Bell, CalendarClock, Image as ImageIcon, Link2, Pencil, Plus, Send, Sparkles, Trash2, User, Users } from 'lucide-react';
import { AnimatedButton } from '@/components/animated/AnimatedButton';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type CustomerOption = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
};

type TemplateOption = {
    id: number;
    name: string;
    slug: string;
};

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
    customers: CustomerOption[];
    templates: TemplateOption[];
};

const statusColorMap: Record<PushNotificationItem['status'], string> = {
    draft: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
    scheduled: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
    sending: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
    sent: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    failed: 'bg-red-500/15 text-red-600 dark:text-red-300',
};

function toDateTimeLocal(iso: string | null): string {
    if (!iso) {
        return '';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
        return '';
    }
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Yangon',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(d);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

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

export default function Index({ notifications, customers, templates }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PushNotificationItem | null>(null);

    const form = useForm<{
        title: string;
        body: string;
        target_type: 'all' | 'single';
        customer_id: string | number;
        template_id: string | number;
        web_url: string;
        mobile_url: string;
        image_url: string;
        image: File | null;
        scheduled_at: string;
        send_now: boolean;
    }>({
        title: '',
        body: '',
        target_type: 'all',
        customer_id: '',
        template_id: '',
        web_url: '',
        mobile_url: '',
        image_url: '',
        image: null,
        scheduled_at: '',
        send_now: true,
    });

    const openCreate = () => {
        setEditingItem(null);
        form.setData({
            title: '',
            body: '',
            target_type: 'all',
            customer_id: '',
            template_id: '',
            web_url: '',
            mobile_url: '',
            image_url: '',
            image: null,
            scheduled_at: '',
            send_now: true,
        });
        form.clearErrors();
        setDialogOpen(true);
    };

    const openEdit = (item: PushNotificationItem) => {
        setEditingItem(item);
        form.setData({
            title: item.title,
            body: item.body,
            target_type: item.target_type,
            customer_id: item.customer_id ?? '',
            template_id: item.template_id ?? '',
            web_url: item.web_url ?? '',
            mobile_url: item.mobile_url ?? '',
            image_url: item.image_url ?? '',
            image: null,
            scheduled_at: toDateTimeLocal(item.scheduled_at),
            send_now: false,
        });
        form.clearErrors();
        setDialogOpen(true);
    };

    const handleTemplateChange = (value: string) => {
        form.setData('template_id', value);
        const tpl = templates.find((t) => String(t.id) === value);
        if (tpl) {
            form.setData((prev) => ({
                ...prev,
                template_id: value,
                web_url: prev.web_url || `/templates/${tpl.slug}`,
                mobile_url: prev.mobile_url || `/templates/${tpl.slug}`,
            }));
        }
    };

    const submitForm = (sendNowOverride?: boolean) => {
        const sendNow = sendNowOverride ?? form.data.send_now;

        if (editingItem) {
            form.transform((data) => ({
                ...data,
                _method: 'put',
                customer_id: data.target_type === 'single' && data.customer_id ? Number(data.customer_id) : null,
                template_id: data.template_id ? Number(data.template_id) : null,
                scheduled_at: data.scheduled_at || null,
            }));

            form.post(`/admin/notifications/${editingItem.id}`, {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => setDialogOpen(false),
            });
            return;
        }

        form.transform((data) => ({
            ...data,
            customer_id: data.target_type === 'single' && data.customer_id ? Number(data.customer_id) : null,
            template_id: data.template_id ? Number(data.template_id) : null,
            scheduled_at: data.scheduled_at || null,
            send_now: data.scheduled_at ? false : sendNow,
        }));

        form.post('/admin/notifications', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setDialogOpen(false),
        });
    };

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
                    <AnimatedButton onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Notification
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
                                    <TableHead>Schedule / Sent</TableHead>
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
                                                                    onClick={() => openEdit(item)}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
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

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Notification' : 'Create Push Notification'}</DialogTitle>
                        <DialogDescription>
                            Promote a template, link custom web/mobile URLs, attach an optional image, or schedule for later.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="notif-title">Title</Label>
                            <Input
                                id="notif-title"
                                value={form.data.title}
                                onChange={(e) => form.setData('title', e.target.value)}
                                placeholder="e.g. Spiderman ပုံကလေးထုတ်ကြည့်လိုက်ပါ!"
                            />
                            {form.errors.title && <p className="text-xs text-destructive">{form.errors.title}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="notif-body">Message</Label>
                            <textarea
                                id="notif-body"
                                rows={3}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={form.data.body}
                                onChange={(e) => form.setData('body', e.target.value)}
                                placeholder="Write your notification message..."
                            />
                            {form.errors.body && <p className="text-xs text-destructive">{form.errors.body}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="notif-template" className="inline-flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5" />
                                Promote Template (Optional)
                            </Label>
                            <select
                                id="notif-template"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                value={form.data.template_id}
                                onChange={(e) => handleTemplateChange(e.target.value)}
                            >
                                <option value="">-- None (Custom URL or Plain Notification) --</option>
                                {templates.map((tpl) => (
                                    <option key={tpl.id} value={tpl.id}>
                                        {tpl.name} (/templates/{tpl.slug})
                                    </option>
                                ))}
                            </select>
                            {form.errors.template_id && <p className="text-xs text-destructive">{form.errors.template_id}</p>}
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="notif-web-url" className="inline-flex items-center gap-1.5">
                                    <Link2 className="h-3.5 w-3.5" />
                                    Web URL (Optional)
                                </Label>
                                <Input
                                    id="notif-web-url"
                                    value={form.data.web_url}
                                    onChange={(e) => form.setData('web_url', e.target.value)}
                                    placeholder="/templates/spiderman or https://..."
                                />
                                {form.errors.web_url && <p className="text-xs text-destructive">{form.errors.web_url}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="notif-mobile-url" className="inline-flex items-center gap-1.5">
                                    <Link2 className="h-3.5 w-3.5" />
                                    Mobile URL / Deep Link (Optional)
                                </Label>
                                <Input
                                    id="notif-mobile-url"
                                    value={form.data.mobile_url}
                                    onChange={(e) => form.setData('mobile_url', e.target.value)}
                                    placeholder="/templates/spiderman or htutai://..."
                                />
                                {form.errors.mobile_url && <p className="text-xs text-destructive">{form.errors.mobile_url}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="notif-image-url" className="inline-flex items-center gap-1.5">
                                    <ImageIcon className="h-3.5 w-3.5" />
                                    Image URL (Optional)
                                </Label>
                                <Input
                                    id="notif-image-url"
                                    value={form.data.image_url}
                                    onChange={(e) => form.setData('image_url', e.target.value)}
                                    placeholder="https://..."
                                />
                                {form.errors.image_url && <p className="text-xs text-destructive">{form.errors.image_url}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="notif-image-file">Or Upload Image (Optional)</Label>
                                <Input
                                    id="notif-image-file"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => form.setData('image', e.target.files?.[0] ?? null)}
                                />
                                {form.errors.image && <p className="text-xs text-destructive">{form.errors.image}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="notif-target">Target Audience</Label>
                                <select
                                    id="notif-target"
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    value={form.data.target_type}
                                    onChange={(e) => form.setData('target_type', e.target.value as 'all' | 'single')}
                                >
                                    <option value="all">Send All Customers</option>
                                    <option value="single">Send Single Customer</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="notif-schedule">Schedule (Yangon Time, Optional)</Label>
                                <Input
                                    id="notif-schedule"
                                    type="datetime-local"
                                    value={form.data.scheduled_at}
                                    onChange={(e) => form.setData('scheduled_at', e.target.value)}
                                />
                                {form.errors.scheduled_at && <p className="text-xs text-destructive">{form.errors.scheduled_at}</p>}
                            </div>
                        </div>

                        {form.data.target_type === 'single' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="notif-customer">Select Customer</Label>
                                <select
                                    id="notif-customer"
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    value={form.data.customer_id}
                                    onChange={(e) => form.setData('customer_id', e.target.value)}
                                >
                                    <option value="">-- Choose a customer --</option>
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} ({c.email || c.phone || `#${c.id}`})
                                        </option>
                                    ))}
                                </select>
                                {form.errors.customer_id && <p className="text-xs text-destructive">{form.errors.customer_id}</p>}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        {editingItem ? (
                            <Button onClick={() => submitForm(false)} disabled={form.processing}>
                                Save Changes
                            </Button>
                        ) : form.data.scheduled_at ? (
                            <Button onClick={() => submitForm(false)} disabled={form.processing}>
                                <CalendarClock className="mr-2 h-4 w-4" />
                                Schedule Notification
                            </Button>
                        ) : (
                            <>
                                <Button variant="secondary" onClick={() => submitForm(false)} disabled={form.processing}>
                                    Save Draft
                                </Button>
                                <Button onClick={() => submitForm(true)} disabled={form.processing}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Send Now
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
