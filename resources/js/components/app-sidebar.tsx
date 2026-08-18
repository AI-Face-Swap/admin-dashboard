import { Link } from '@inertiajs/react';
import {
    BookOpen,
    LayoutGrid,
    LayoutTemplate,
    Server,
    Settings,
    ShieldCheck,
    Sparkles,
    TerminalSquare,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'AI Generation',
        href: '/admin/ai',
        icon: Sparkles,
        permission: 'ai.view',
    },
    {
        title: 'Templates',
        href: '/admin/templates',
        icon: LayoutTemplate,
        permission: 'templates.view',
    },
    {
        title: 'Providers',
        href: '/admin/providers',
        icon: Server,
        permission: 'providers.view',
    },
    {
        title: 'Users',
        href: '/admin/users',
        icon: Users,
        permission: 'users.view',
    },
    {
        title: 'Roles & Permissions',
        href: '/admin/roles',
        icon: ShieldCheck,
        permission: 'roles.view',
    },
    {
        title: 'API Playground',
        href: '/api-playground',
        icon: TerminalSquare,
    },
    {
        title: 'Settings',
        href: '/settings/profile',
        icon: Settings,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
