import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CalendarIcon, EditIcon, FolderIcon, PlusIcon, SearchIcon, TrashIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

// Types
interface Category {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
    products_count: number; // Laravel withCount will always return this
}

interface CategoryFormData {
    name: string;
}

interface Props {
    categories: Category[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'لوحة التحكم',
        href: '/admin/dashboard',
    },
    {
        title: 'الفئات',
        href: '/admin/categories',
    },
];

export default function CategoriesIndex({ categories: initialCategories }: Props) {
    // State
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState<CategoryFormData>({
        name: '',
    });

    // Update categories when props change
    useEffect(() => {
        setCategories(initialCategories);
    }, [initialCategories]);

    // Filter categories based on search term
    const filteredCategories = categories.filter((category) => category.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
        });
    };

    // Handle form input changes
    const handleInputChange = (field: keyof CategoryFormData, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // Handle create category
    const handleCreate = async () => {
        setIsLoading(true);

        router.post(
            '/admin/categories',
            {
                name: formData.name,
            },
            {
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    resetForm();
                },
                onFinish: () => {
                    setIsLoading(false);
                },
            },
        );
    };

    // Handle edit category
    const handleEdit = async () => {
        if (!selectedCategory) return;

        setIsLoading(true);

        router.put(
            `/admin/categories/${selectedCategory.id}`,
            {
                name: formData.name,
            },
            {
                onSuccess: () => {
                    setIsEditModalOpen(false);
                    setSelectedCategory(null);
                    resetForm();
                },
                onFinish: () => {
                    setIsLoading(false);
                },
            },
        );
    };

    // Handle delete category
    const handleDelete = async () => {
        if (!selectedCategory) return;

        setIsLoading(true);

        router.delete(`/admin/categories/${selectedCategory.id}`, {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                setSelectedCategory(null);
            },
            onFinish: () => {
                setIsLoading(false);
            },
        });
    };

    // Open edit modal with selected category data
    const openEditModal = (category: Category) => {
        setSelectedCategory(category);
        setFormData({
            name: category.name,
        });
        setIsEditModalOpen(true);
    };

    // Open delete modal
    const openDeleteModal = (category: Category) => {
        setSelectedCategory(category);
        setIsDeleteModalOpen(true);
    };

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="إدارة الفئات" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6 text-right" dir="rtl">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">إدارة الفئات</h1>
                        <p className="text-muted-foreground">تنظيم منتجاتك باستخدام الفئات</p>
                    </div>

                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => resetForm()}>
                                <PlusIcon className="ml-2 h-4 w-4" />
                                إضافة فئة
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md text-right" dir="rtl">
                            <DialogHeader>
                                <DialogTitle className="text-right">إضافة فئة جديدة</DialogTitle>
                                <DialogDescription className="text-right">قم بإنشاء فئة جديدة لتنظيم منتجاتك</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                {/* Category Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">اسم الفئة</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        placeholder="أدخل اسم الفئة"
                                        className="text-right"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <DialogFooter className="flex-row-reverse justify-start gap-2">
                                <Button onClick={handleCreate} disabled={isLoading || !formData.name.trim()}>
                                    {isLoading ? 'جاري الإنشاء...' : 'إنشاء فئة'}
                                </Button>
                                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isLoading}>
                                    إلغاء
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <SearchIcon className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                    <Input placeholder="البحث في الفئات..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10 text-right" />
                </div>

                {/* Categories Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredCategories.map((category) => (
                        <Card key={category.id} className="overflow-hidden transition-shadow hover:shadow-md text-right">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                        <FolderIcon className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <CardTitle className="truncate text-lg">{category.name}</CardTitle>
                                        <div className="mt-1 flex items-center gap-2">
                                            <Badge variant="secondary" className="text-xs">
                                                {category.products_count} منتج
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground justify-end">
                                        <span>تم الإنشاء في {formatDate(category.created_at)}</span>
                                        <CalendarIcon className="h-4 w-4" />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditModal(category)}>
                                            <EditIcon className="ml-2 h-4 w-4" />
                                            تعديل
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => openDeleteModal(category)}
                                            disabled={category.products_count > 0}
                                        >
                                            <TrashIcon className="ml-2 h-4 w-4" />
                                            حذف
                                        </Button>
                                    </div>

                                    {category.products_count > 0 && (
                                        <p className="rounded bg-amber-50 p-2 text-xs text-amber-600">⚠️ لا يمكن حذف فئة تحتوي على منتجات</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Empty state */}
                {filteredCategories.length === 0 && (
                    <div className="py-12 text-center">
                        <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">لم يتم العثور على فئات</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {searchTerm ? 'حاول تعديل معايير البحث الخاصة بك' : 'ابدأ بإضافة فئة جديدة'}
                        </p>
                        {!searchTerm && (
                            <div className="mt-6">
                                <Button onClick={() => setIsCreateModalOpen(true)}>
                                    <PlusIcon className="ml-2 h-4 w-4" />
                                    أضف أول فئة لك
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Statistics */}
                {categories.length > 0 && (
                    <div className="border-t pt-6" dir="rtl">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <Card className="text-right">
                                <CardContent className="p-4">
                                    <div className="text-2xl font-bold text-primary">{categories.length}</div>
                                    <p className="text-sm text-muted-foreground">إجمالي الفئات</p>
                                </CardContent>
                            </Card>
                            <Card className="text-right">
                                <CardContent className="p-4">
                                    <div className="text-2xl font-bold text-green-600">
                                        {categories.filter((cat) => cat.products_count > 0).length}
                                    </div>
                                    <p className="text-sm text-muted-foreground">فئات تحتوي على منتجات</p>
                                </CardContent>
                            </Card>
                            <Card className="text-right">
                                <CardContent className="p-4">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {categories.reduce((total, cat) => total + cat.products_count, 0)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">إجمالي المنتجات</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="max-w-md text-right" dir="rtl">
                        <DialogHeader>
                            <DialogTitle className="text-right">تعديل الفئة</DialogTitle>
                            <DialogDescription className="text-right">تحديث معلومات الفئة</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* Category Name */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">اسم الفئة</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    placeholder="أدخل اسم الفئة"
                                    className="text-right"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <DialogFooter className="flex-row-reverse justify-start gap-2">
                            <Button onClick={handleEdit} disabled={isLoading || !formData.name.trim()}>
                                {isLoading ? 'جاري التحديث...' : 'تحديث الفئة'}
                            </Button>
                            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isLoading}>
                                إلغاء
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Modal */}
                <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                    <DialogContent className="text-right" dir="rtl">
                        <DialogHeader>
                            <DialogTitle className="text-right">حذف الفئة</DialogTitle>
                            <DialogDescription className="text-right">
                                هل أنت متأكد أنك تريد حذف "{selectedCategory?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                                {selectedCategory?.products_count && selectedCategory.products_count > 0 && (
                                    <span className="mt-2 block font-medium text-amber-600">
                                        تحذير: هذه الفئة تحتوي على {selectedCategory.products_count} منتج(ات). يرجى نقل أو حذف هذه المنتجات
                                        أولاً.
                                    </span>
                                )}
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter className="flex-row-reverse justify-start gap-2">
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isLoading || (selectedCategory ? selectedCategory.products_count > 0 : false)}
                            >
                                {isLoading ? 'جاري الحذف...' : 'حذف الفئة'}
                            </Button>
                            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isLoading}>
                                إلغاء
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}