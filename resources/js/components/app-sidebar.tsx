import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, ChartBarStacked, Folder, LayoutGrid, ShoppingCart, Utensils } from 'lucide-react';
import AppLogo from './app-logo';
import { MessageCircle, Info } from 'lucide-react';
const mainNavItems: NavItem[] = [
    {
        title: 'لوحة التحكم',
        href: '/admin/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'الطلبات',
        href: '/admin/orders',
        icon: ShoppingCart,
    },
    {
        title: 'الأطعمة والمشروبات',
        href: '/admin/products',
        icon: Utensils,
    },
    {
        title: 'الفئات',
        href: '/admin/categories',
        icon: ChartBarStacked,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'الدعم الفني',
        href: 'https://wa.me/967775484998', // الرابط الخاص بك
        icon: MessageCircle,
    },
    
];

export function AppSidebar() {
    return (
        /* الحل البرمجي الصحيح:
           1. نستخدم side="right" للنقل الفيزيائي.
           2. نستخدم dir="rtl" لكي يفهم نظام الحسابات (Provider) أن المساحة المحجوزة يجب أن تكون في اليمين.
        */
        <Sidebar collapsible="icon" variant="inset" side="right" dir="rtl">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/admin/dashboard" prefetch>
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
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}