import { usePage } from '@inertiajs/react';
import type { Auth } from '@/types';

export function usePermissions() {
    const { auth } = usePage<{ auth: Auth }>().props;

    const can = (permission: string): boolean => auth.permissions.includes(permission);

    return { permissions: auth.permissions, can };
}
