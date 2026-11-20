import { Link, useForm } from '@inertiajs/react';
import { CalendarClock, Image as ImageIcon, Link2, Send, Sparkles } from 'lucide-react';
import { AnimatedCard } from '@/components/animated/AnimatedCard';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type CustomerOption = {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
};

export type TemplateOption = {
    id: number;
    name: string;
    slug: string;
};

export type PushNotificationRecord = {
    id: number;
    title: string;
    body: string;
    target_type: 'all' | 'single';
    customer_id: number | null;
    template_id: number | null;
    image_url: string | null;
    web_url: string | null;
    mobile_url: string | null;
    scheduled_at: string | null;
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

type Props = {
    notification?: PushNotificationRecord;
    customers: CustomerOption[];
    templates: TemplateOption[];
};

export function NotificationForm({ notification, customers, templates }: Props) {
    const isEditing = !!notification;

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
        title: notification?.title ?? '',
        body: notification?.body ?? '',
        target_type: notification?.target_type ?? 'all',
        customer_id: notification?.customer_id ?? '',
        template_id: notification?.template_id ?? '',
        web_url: notification?.web_url ?? '',
        mobile_url: notification?.mobile_url ?? '',
        image_url: notification?.image_url ?? '',
        image: null,
        scheduled_at: toDateTimeLocal(notification?.scheduled_at ?? null),
        send_now: !isEditing,
    });

    const handleTemplateChange = (value: string) => {
        const tpl = templates.find((t) => String(t.id) === value);
        form.setData((prev) => ({
            ...prev,
            template_id: value,
            web_url: tpl && !prev.web_url ? `/templates/${tpl.slug}` : prev.web_url,
            mobile_url: tpl && !prev.mobile_url ? `/templates/${tpl.slug}` : prev.mobile_url,
        }));
    };

    const submitForm = (sendNowOverride?: boolean) => {
        const sendNow = sendNowOverride ?? form.data.send_now;

        if (isEditing && notification) {
            form.transform((data) => ({
                ...data,
                _method: 'put',
                customer_id: data.target_type === 'single' && data.customer_id ? Number(data.customer_id) : null,
                template_id: data.template_id ? Number(data.template_id) : null,
                scheduled_at: data.scheduled_at || null,
            }));

            form.post(`/admin/notifications/${notification.id}`, {
                forceFormData: true,
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
        });
    };

    return (
        <AnimatedCard>
            <CardContent className="p-6 space-y-5">
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
                        rows={4}
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

                {form.data.image_url && (
                    <div>
                        <img
                            src={form.data.image_url}
                            alt="Preview"
                            className="h-24 w-24 rounded-lg border object-cover"
                        />
                    </div>
                )}

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

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
                    <Button variant="outline" asChild>
                        <Link href="/admin/notifications">Cancel</Link>
                    </Button>
                    {isEditing ? (
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
                </div>
            </CardContent>
        </AnimatedCard>
    );
}
