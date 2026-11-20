import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import {
    NotificationForm,
    type CustomerOption,
    type TemplateOption,
} from './NotificationForm';

type Props = {
    customers: CustomerOption[];
    templates: TemplateOption[];
};

export default function Create({ customers, templates }: Props) {
    return (
        <>
            <Head title="Create Push Notification" />

            <div className="space-y-6 max-w-3xl">
                <div className="flex items-center justify-between gap-4">
                    <Heading
                        title="Create Push Notification"
                        description="Promote a template, link custom web/mobile URLs, attach an image, or schedule for later."
                    />
                    <Button variant="outline" asChild>
                        <Link href="/admin/notifications">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Link>
                    </Button>
                </div>

                <NotificationForm customers={customers} templates={templates} />
            </div>
        </>
    );
}
