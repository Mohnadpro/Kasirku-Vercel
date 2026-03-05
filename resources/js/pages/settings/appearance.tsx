import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/appearance-tabs';
import HeadingSmall from '@/components/heading-small';
import { type BreadcrumbItem } from '@/types';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'إعدادات المظهر',
        href: '/settings/appearance',
    },
];

export default function Appearance() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="إعدادات المظهر" />

            <SettingsLayout>
                {/* تم إضافة dir="rtl" وضبط محاذاة النص لليمين */}
                <div className="space-y-6 text-right" dir="rtl">
                    <HeadingSmall 
                        title="إعدادات المظهر" 
                        description="قم بتحديث إعدادات مظهر حسابك واختيار الوضع المفضل لديك" 
                    />
                    <AppearanceTabs />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}