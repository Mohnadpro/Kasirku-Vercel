import { Link } from '@inertiajs/react';
import { Home, LogOut, Package, Settings, ShoppingCart } from 'lucide-react';
import { type ReactNode } from 'react';

interface AdminLayoutProps {
    children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    return (
        // تم إضافة dir="rtl" لقلب اتجاه الصفحة بالكامل
        <div className="flex min-h-screen bg-gray-50 text-right" dir="rtl">
            {/* Sidebar - القائمة الجانبية */}
            {/* تم تغيير border-r (يمين) إلى border-l (يسار) لتناسب الاتجاه العربي */}
            <div className="w-64 border-l bg-white shadow-sm">
                <div className="p-6">
                    <Link href={route('admin.dashboard')} className="text-2xl font-bold text-gray-900">
                        لوحة الإدارة
                    </Link>
                </div>

                <nav className="mt-6">
                    <div className="px-3">
                        <Link
                            href={route('admin.dashboard')}
                            className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        >
                            {/* تم تغيير mr-3 إلى ml-3 لتباعد الأيقونة عن النص في العربي */}
                            <Home className="ml-3 h-5 w-5" />
                            لوحة التحكم
                        </Link>

                        <Link
                            href={route('orders.index')}
                            className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        >
                            <ShoppingCart className="ml-3 h-5 w-5" />
                            إدارة الطلبات
                        </Link>

                        <Link
                            href={route('products.index')}
                            className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        >
                            <Package className="ml-3 h-5 w-5" />
                            المنتجات
                        </Link>

                        <Link
                            href={route('categories.index')}
                            className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        >
                            <Settings className="ml-3 h-5 w-5" />
                            الفئات
                        </Link>
                    </div>

                    <div className="mt-8 px-3">
                        <Link
                            href={route('logout')}
                            method="post"
                            className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                            <LogOut className="ml-3 h-5 w-5" />
                            تسجيل الخروج
                        </Link>
                    </div>
                </nav>
            </div>

            {/* Main Content - المحتوى الرئيسي */}
            <div className="flex flex-1 flex-col">
                <main className="flex-1 p-6">{children}</main>
            </div>
        </div>
    );
}