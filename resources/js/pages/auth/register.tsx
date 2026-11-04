import { Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { login } from '@/routes';

export default function Register() {
    return (
        <>
            <Head title="Registration Disabled" />
            <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-sm text-muted-foreground">
                    Public registration is disabled for the Admin Control Panel.
                </p>
                <TextLink href={login()}>Return to Log in</TextLink>
            </div>
        </>
    );
}
