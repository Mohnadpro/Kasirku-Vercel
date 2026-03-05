import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselIndicators, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { EditIcon, ImageIcon, PlusIcon, SearchIcon, TrashIcon, UploadIcon, XIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// Types
interface Category {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
}

interface ProductPhoto {
    id: number;
    product_id: string;
    url: string;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
}

interface Product {
    id: string;
    name: string;
    category_id: number;
    price: number;
    created_at: string;
    updated_at: string;
    category?: Category;
    photos?: ProductPhoto[];
}

interface ProductFormData {
    name: string;
    category_id: number | '';
    price: number | '';
    photos: File[];
    remove_photos: number[];
}

interface Props {
    products: Product[];
    categories: Category[];
    pagination?: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        has_more_pages: boolean;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'لوحة التحكم',
        href: '/admin/dashboard',
    },
    {
        title: 'المنتجات',
        href: '/admin/products',
    },
];

export default function ProductsIndex({ products: initialProducts, categories, pagination }: Props) {
    // State
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Infinite scroll state
    const [currentPage, setCurrentPage] = useState(pagination?.current_page || 1);
    const [hasMorePages, setHasMorePages] = useState(pagination?.has_more_pages || false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const observerRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        category_id: '',
        price: '',
        photos: [],
        remove_photos: [],
    });

    // Update products when props change
    useEffect(() => {
        setProducts(initialProducts);
        setCurrentPage(pagination?.current_page || 1);
        setHasMorePages(pagination?.has_more_pages || false);
    }, [initialProducts, pagination]);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Filter products based on search term and category
    const filteredProducts = products.filter((product) => {
        const matchesSearch =
            product.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            product.category?.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        const matchesCategory = categoryFilter === '' || categoryFilter === 'all' || product.category_id.toString() === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    // Load more products function
    const loadMoreProducts = useCallback(async () => {
        if (isLoadingMore || !hasMorePages) return;

        setIsLoadingMore(true);

        try {
            const params = new URLSearchParams({
                page: (currentPage + 1).toString(),
            });

            if (debouncedSearchTerm) {
                params.append('search', debouncedSearchTerm);
            }

            if (categoryFilter && categoryFilter !== 'all') {
                params.append('category', categoryFilter);
            }

            const response = await fetch(`/admin/products?${params.toString()}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();

                setProducts((prev) => [...prev, ...data.products]);
                setCurrentPage(data.pagination.current_page);
                setHasMorePages(data.pagination.has_more_pages);
            }
        } catch (error) {
            console.error('Failed to load more products:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [currentPage, hasMorePages, isLoadingMore, debouncedSearchTerm, categoryFilter]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMorePages && !isLoadingMore) {
                    loadMoreProducts();
                }
            },
            {
                threshold: 0.1,
                rootMargin: '100px',
            },
        );

        if (observerRef.current) {
            observer.observe(observerRef.current);
        }

        return () => {
            if (observerRef.current) {
                observer.unobserve(observerRef.current);
            }
        };
    }, [loadMoreProducts, hasMorePages, isLoadingMore]);

    // Reset pagination when search or filter changes
    useEffect(() => {
        setCurrentPage(1);
        setHasMorePages(true);
    }, [debouncedSearchTerm, categoryFilter]);

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            category_id: '',
            price: '',
            photos: [],
            remove_photos: [],
        });
        setErrors({});
    };

    // Handle form input changes
    const handleInputChange = (field: keyof ProductFormData, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // Handle file upload
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const fileArray = Array.from(files);
            setFormData((prev) => ({
                ...prev,
                photos: [...prev.photos, ...fileArray],
            }));
        }
    };

    // Remove photo from form
    const removePhoto = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index),
        }));
    };

    // Mark existing photo for removal
    const markPhotoForRemoval = (photoId: number) => {
        setFormData((prev) => ({
            ...prev,
            remove_photos: [...prev.remove_photos, photoId],
        }));
    };

    // Unmark existing photo for removal
    const unmarkPhotoForRemoval = (photoId: number) => {
        setFormData((prev) => ({
            ...prev,
            remove_photos: prev.remove_photos.filter((id) => id !== photoId),
        }));
    };

    // Handle create product
    const handleCreate = async () => {
        setIsLoading(true);
        setErrors({});

        const formDataToSend = new FormData();
        formDataToSend.append('name', formData.name);
        formDataToSend.append('category_id', formData.category_id.toString());
        formDataToSend.append('price', formData.price.toString());

        formData.photos.forEach((photo, index) => {
            formDataToSend.append(`photos[${index}]`, photo);
        });

        router.post('/admin/products', formDataToSend, {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                resetForm();
            },
            onError: (errors) => {
                setErrors(errors);
            },
            onFinish: () => {
                setIsLoading(false);
            },
        });
    };

    // Handle edit product
    const handleEdit = async () => {
        if (!selectedProduct) return;

        setIsLoading(true);
        setErrors({});

        const formDataToSend = new FormData();
        formDataToSend.append('_method', 'PUT');
        formDataToSend.append('name', formData.name);
        formDataToSend.append('category_id', formData.category_id.toString());
        formDataToSend.append('price', formData.price.toString());

        // Add new photos
        formData.photos.forEach((photo, index) => {
            formDataToSend.append(`photos[${index}]`, photo);
        });

        // Add photos to remove
        formData.remove_photos.forEach((photoId, index) => {
            formDataToSend.append(`remove_photos[${index}]`, photoId.toString());
        });

        router.post(`/admin/products/${selectedProduct.id}`, formDataToSend, {
            onSuccess: () => {
                setIsEditModalOpen(false);
                setSelectedProduct(null);
                resetForm();
            },
            onError: (errors) => {
                setErrors(errors);
            },
            onFinish: () => {
                setIsLoading(false);
            },
        });
    };

    // Handle delete product
    const handleDelete = async () => {
        if (!selectedProduct) return;

        setIsLoading(true);

        router.delete(`/admin/products/${selectedProduct.id}`, {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                setSelectedProduct(null);
            },
            onFinish: () => {
                setIsLoading(false);
            },
        });
    };

    // Open edit modal with selected product data
    const openEditModal = (product: Product) => {
        setSelectedProduct(product);
        setFormData({
            name: product.name,
            category_id: product.category_id,
            price: product.price,
            photos: [],
            remove_photos: [],
        });
        setIsEditModalOpen(true);
    };

    // Open delete modal
    const openDeleteModal = (product: Product) => {
        setSelectedProduct(product);
        setIsDeleteModalOpen(true);
    };

    // تم تعديل الدالة لتصبح بالريال اليمني
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ar-YE', {
            style: 'currency',
            currency: 'YER',
        }).format(amount);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="إدارة المنتجات" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6 text-right" dir="rtl">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">إدارة المنتجات</h1>
                        <p className="text-muted-foreground">إدارة كتالوج المنتجات الخاصة بك</p>
                    </div>

                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => resetForm()} className="gap-2">
                                <PlusIcon className="h-4 w-4" />
                                إضافة منتج
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto text-right" dir="rtl">
                            <DialogHeader>
                                <DialogTitle className="text-right">إضافة منتج جديد</DialogTitle>
                                <DialogDescription className="text-right">إنشاء منتج جديد لكتالوجك</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                {/* Product Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">اسم المنتج</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        placeholder="أدخل اسم المنتج"
                                        className="text-right"
                                    />
                                    {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                                </div>

                                {/* Category */}
                                <div className="space-y-2 text-right">
                                    <Label htmlFor="category">الفئة</Label>
                                    <Select
                                        value={formData.category_id.toString()}
                                        onValueChange={(value) => handleInputChange('category_id', parseInt(value))}
                                    >
                                        <SelectTrigger className="flex-row-reverse text-right">
                                            <SelectValue placeholder="اختر الفئة" />
                                        </SelectTrigger>
                                        <SelectContent dir="rtl">
                                            {categories.map((category) => (
                                                <SelectItem key={category.id} value={category.id.toString()}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.category_id && <p className="text-sm text-red-600">{errors.category_id}</p>}
                                </div>

                                {/* Price */}
                                <div className="space-y-2">
                                    <Label htmlFor="price">السعر (ريال يمني)</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || '')}
                                        placeholder="أدخل السعر"
                                        className="text-right"
                                        min="0"
                                        step="50"
                                    />
                                    {errors.price && <p className="text-sm text-red-600">{errors.price}</p>}
                                </div>

                                {/* Photos */}
                                <div className="space-y-2">
                                    <Label>صور المنتج</Label>
                                    <div className="rounded-lg border-2 border-dashed border-gray-300 p-4">
                                        <div className="text-center">
                                            <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="mt-2">
                                                <Input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={handleFileUpload}
                                                    className="hidden"
                                                    id="photo-upload"
                                                />
                                                <Label htmlFor="photo-upload" className="cursor-pointer text-sm text-blue-600 hover:text-blue-500">
                                                    اضغط لرفع الصور
                                                </Label>
                                            </div>
                                            <p className="text-xs text-gray-500">PNG، JPG بحد أقصى 5 ميجابايت لكل صورة</p>
                                        </div>
                                    </div>

                                    {/* Preview uploaded photos */}
                                    {formData.photos.length > 0 && (
                                        <div className="mt-4 grid grid-cols-3 gap-2">
                                            {formData.photos.map((photo, index) => (
                                                <div key={index} className="relative">
                                                    <img
                                                        src={URL.createObjectURL(photo)}
                                                        alt={`Upload ${index + 1}`}
                                                        className="h-20 w-full rounded object-cover"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute -top-2 -right-2 h-6 w-6"
                                                        onClick={() => removePhoto(index)}
                                                    >
                                                        <XIcon className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {errors.photos && <p className="text-sm text-red-600">{errors.photos}</p>}
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:justify-start">
                                <Button onClick={handleCreate} disabled={isLoading || !formData.name || !formData.category_id || !formData.price}>
                                    {isLoading ? 'جاري الإنشاء...' : 'إنشاء المنتج'}
                                </Button>
                                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isLoading}>
                                    إلغاء
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative max-w-md w-full">
                        <SearchIcon className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                        <Input
                            placeholder="البحث عن المنتجات..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pr-10 text-right"
                        />
                    </div>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[200px] flex-row-reverse text-right">
                            <SelectValue placeholder="كل الفئات" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                            <SelectItem value="all">كل الفئات</SelectItem>
                            {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Products Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredProducts.map((product) => (
                        <Card key={product.id} className="overflow-hidden text-right">
                            <div className="relative aspect-square bg-gray-100">
                                {product.photos && product.photos.length > 0 ? (
                                    product.photos.length === 1 ? (
                                        <img src={product.photos[0].url} alt={product.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <Carousel className="aspect-square w-full" dir="ltr">
                                            <CarouselContent className="aspect-square">
                                                {product.photos.map((photo, index) => (
                                                    <CarouselItem key={photo.id} className="aspect-square">
                                                        <img
                                                            src={photo.url}
                                                            alt={`${product.name} - صورة ${index + 1}`}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </CarouselItem>
                                                ))}
                                            </CarouselContent>
                                            <CarouselPrevious />
                                            <CarouselNext />
                                            <CarouselIndicators />
                                        </Carousel>
                                    )
                                ) : (
                                    <div className="flex h-full items-center justify-center">
                                        <ImageIcon className="h-12 w-12 text-gray-400" />
                                    </div>
                                )}
                            </div>

                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">{product.name}</CardTitle>
                                <div className="flex items-center justify-between flex-row-reverse">
                                    <Badge variant="secondary">{product.category?.name}</Badge>
                                    <span className="text-lg font-semibold text-green-600">{formatCurrency(product.price)}</span>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0">
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => openEditModal(product)}>
                                        تعديل
                                        <EditIcon className="h-4 w-4" />
                                    </Button>
                                    <Button variant="destructive" size="sm" className="flex-1 gap-2" onClick={() => openDeleteModal(product)}>
                                        حذف
                                        <TrashIcon className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Infinite Scroll Observer */}
                {hasMorePages && (
                    <div ref={observerRef} className="flex justify-center py-8">
                        {isLoadingMore ? (
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-gray-900"></div>
                                <span className="text-muted-foreground">جاري تحميل المزيد من المنتجات...</span>
                            </div>
                        ) : (
                            <div className="text-muted-foreground">مرر للأسفل لتحميل المزيد من المنتجات</div>
                        )}
                    </div>
                )}

                {/* End of results indicator */}
                {!hasMorePages && filteredProducts.length > 0 && (
                    <div className="flex justify-center py-8">
                        <div className="text-center text-muted-foreground">
                            <div className="mx-auto mb-4 h-px w-24 bg-border"></div>
                            <p>لقد وصلت إلى نهاية قائمة المنتجات.</p>
                            <p className="mt-1 text-sm">عرض الكل {filteredProducts.length} منتج</p>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {filteredProducts.length === 0 && !isLoadingMore && (
                    <div className="py-12 text-center">
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">لم يتم العثور على منتجات</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {searchTerm || (categoryFilter && categoryFilter !== 'all')
                                ? 'حاول تعديل معايير البحث الخاصة بك'
                                : 'ابدأ بإضافة منتج جديد لمتجرك'}
                        </p>
                    </div>
                )}

                {/* Edit Modal */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto text-right" dir="rtl">
                        <DialogHeader>
                            <DialogTitle className="text-right">تعديل المنتج</DialogTitle>
                            <DialogDescription className="text-right">تحديث معلومات المنتج</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">اسم المنتج</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    placeholder="أدخل اسم المنتج"
                                    className="text-right"
                                />
                                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-category">الفئة</Label>
                                <Select
                                    value={formData.category_id.toString()}
                                    onValueChange={(value) => handleInputChange('category_id', parseInt(value))}
                                >
                                    <SelectTrigger className="flex-row-reverse text-right">
                                        <SelectValue placeholder="اختر الفئة" />
                                    </SelectTrigger>
                                    <SelectContent dir="rtl">
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={category.id.toString()}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.category_id && <p className="text-sm text-red-600">{errors.category_id}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-price">السعر (ريال يمني)</Label>
                                <Input
                                    id="edit-price"
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || '')}
                                    placeholder="أدخل السعر"
                                    className="text-right"
                                    min="0"
                                    step="50"
                                />
                                {errors.price && <p className="text-sm text-red-600">{errors.price}</p>}
                            </div>

                            {selectedProduct?.photos && selectedProduct.photos.length > 0 && (
                                <div className="space-y-2">
                                    <Label>الصور الحالية</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {selectedProduct.photos.map((photo) => (
                                            <div key={photo.id} className="relative">
                                                <img src={photo.url} alt="Product" className="h-20 w-full rounded object-cover" />
                                                <Button
                                                    type="button"
                                                    variant={formData.remove_photos.includes(photo.id) ? 'default' : 'destructive'}
                                                    size="icon"
                                                    className="absolute -top-2 -right-2 h-6 w-6"
                                                    onClick={() => formData.remove_photos.includes(photo.id) ? unmarkPhotoForRemoval(photo.id) : markPhotoForRemoval(photo.id)}
                                                >
                                                    <XIcon className="h-3 w-3" />
                                                </Button>
                                                {formData.remove_photos.includes(photo.id) && (
                                                    <div className="bg-opacity-50 absolute inset-0 flex items-center justify-center rounded bg-red-500">
                                                        <span className="text-xs font-bold text-white">سيتم الحذف</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>إضافة صور جديدة</Label>
                                <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center">
                                    <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                                    <Input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" id="edit-photo-upload" />
                                    <Label htmlFor="edit-photo-upload" className="cursor-pointer text-sm text-blue-600 hover:text-blue-500">انقر لتحميل صور جديدة</Label>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:justify-start">
                            <Button onClick={handleEdit} disabled={isLoading || !formData.name || !formData.category_id || !formData.price}>
                                {isLoading ? 'جاري التحديث...' : 'تحديث المنتج'}
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
                            <DialogTitle className="text-right">حذف المنتج</DialogTitle>
                            <DialogDescription className="text-right">
                                هل أنت متأكد أنك تريد حذف المنتج "{selectedProduct?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter className="gap-2 sm:justify-start">
                            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                                {isLoading ? 'جاري الحذف...' : 'حذف المنتج نهائياً'}
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