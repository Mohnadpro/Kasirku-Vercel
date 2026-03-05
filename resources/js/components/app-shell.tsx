import { SidebarProvider } from '@/components/ui/sidebar';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}

export function AppShell({ children, variant = 'header' }: AppShellProps) {
    const isOpen = usePage<SharedData>().props.sidebarOpen;

    if (variant === 'header') {
        return <div className="flex min-h-screen w-full flex-col">{children}</div>;
    }

    /* التعديل الجذري:
       1. أضفنا dir="rtl" لكي يفهم المزود أن الحسابات انقلبت.
       2. أضفنا ستايل direction: 'rtl' لضمان أن المتصفح يعيد توزيع الـ Flexbox بشكل صحيح.
    */
    return (
        <SidebarProvider defaultOpen={isOpen} dir="rtl" style={{ direction: 'rtl' }}>
            {children}
        </SidebarProvider>
    );
}