import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import {
    NotificationForm,
    type CustomerOption,
    type PushNotificationRecord,
    type TemplateOption,
} from './NotificationForm';

type Props = {
    notification: PushNotificationRecord;
    customers: CustomerOption[];
    templates: TemplateOption[];
};

export default function Edit({ notification, customers, templates }: Props) {
    return (
        <>
            <Head title="Edit Push Notification" />

            <div className="space-y-6 max-w-3xl">
                <div className="flex items-center justify-between gap-4">
                    <Heading
                        title="Edit Push Notification"
                        description="Update notification content, target audience, links, or schedule."
                    />
                    <Button variant="outline" asChild>
                        <Link href="/admin/notifications">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Link>
                    </Button>
                </div>

                <NotificationForm
                    notification={notification}
                    customers={customers}
                    templates={templates}
                />
            </div>
        </>
    );
}
