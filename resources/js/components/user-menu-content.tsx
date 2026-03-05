import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { type User } from '@/types';
import { Link, router } from '@inertiajs/react';
import { LogOut, Settings } from 'lucide-react';

interface UserMenuContentProps {
    user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                {/* تم تغيير text-left إلى text-right */}
                <div className="flex items-center gap-2 px-1 py-1.5 text-right text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    {/* تم تغيير mr-2 إلى ml-2 لتباعد الأيقونة عن النص في العربي */}
                    <Link className="block w-full text-right" href={route('profile.edit')} as="button" prefetch onClick={cleanup}>
                        <Settings className="ml-2 inline-block size-4" />
                        الإعدادات
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link className="block w-full text-right" method="post" href={route('logout')} as="button" onClick={handleLogout}>
                    <LogOut className="ml-2 inline-block size-4" />
                    تسجيل الخروج
                </Link>
            </DropdownMenuItem>
        </>
    );
}