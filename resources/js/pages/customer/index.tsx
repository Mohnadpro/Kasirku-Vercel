import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselIndicators, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Head, Link } from '@inertiajs/react';
import { ImageIcon, LogIn, MessageCircle, SearchIcon, Utensils } from 'lucide-react';
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

export default function CustomerIndex({ products: initialProducts, categories, pagination }: Props) {
    // State
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    // Infinite scroll state
    const [currentPage, setCurrentPage] = useState(pagination?.current_page || 1);
    const [hasMorePages, setHasMorePages] = useState(pagination?.has_more_pages || false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const observerRef = useRef<HTMLDivElement>(null);

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
        const matchesCategory = categoryFilter === 'all' || product.category_id.toString() === categoryFilter;
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

            const response = await fetch(`/?${params.toString()}`, {
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ar-YE', {
            style: 'currency',
            currency: 'YER',
        }).format(amount);
    };

    // دالة الواتساب
    const contactWhatsApp = (productName: string) => {
        const phoneNumber = "967737858889npm run build"; // استبدل بالأرقام الحقيقية هنا
        const message = encodeURIComponent(`السلام عليكم دكّة، أريد طلب وجبة: ${productName}`);
        window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-background" dir="rtl">
            <Head title="دكة- المنيو" />

            {/* Header */}
            <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-[#7e5b45] dark:text-[#d3c3b3]">دكة</h1>
                            <p className="text-muted-foreground">اختر وجبتك المفضلة</p>
                        </div>

                        {/* تعديل الزر ليستخدم window.location لضمان الانتقال لصفحة تسجيل الدخول */}
                        <Button 
                            className="bg-[#7e5b45] hover:bg-[#634837] text-white gap-2"
                            onClick={() => { window.location.href = '/login'; }}
                        >
                            <LogIn className="ml-2 h-5 w-5" />
                            تسجيل الدخول
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6">
                {/* ترتيب البحث والأقسام الأصلي */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative max-w-md flex-grow">
                        <SearchIcon className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                        <Input placeholder="بحث عن صنف..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10 text-right" />
                    </div>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[200px] text-right">
                            <SelectValue placeholder="جميع الأقسام" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">جميع الأقسام</SelectItem>
                            {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Products Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredProducts.map((product) => (
                        <Card key={product.id} className="overflow-hidden transition-shadow hover:shadow-lg text-right">
                            <div className="relative aspect-square bg-muted">
                                {product.photos && product.photos.length > 0 ? (
                                    product.photos.length === 1 ? (
                                        <img src={product.photos[0].url} alt={product.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <Carousel className="aspect-square w-full">
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
                                            <CarouselPrevious className="right-2" />
                                            <CarouselNext className="left-2" />
                                            <CarouselIndicators />
                                        </Carousel>
                                    )
                                ) : (
                                    <div className="flex h-full items-center justify-center">
                                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                                    </div>
                                )}
                            </div>

                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg text-[#7e5b45] dark:text-[#d3c3b3]">{product.name}</CardTitle>
                                <div className="flex items-center justify-between flex-row-reverse">
                                    <Badge variant="secondary">{product.category?.name}</Badge>
                                    <span className="text-lg font-semibold text-green-600">{formatCurrency(product.price)}</span>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0 pb-4">
                                {/* زر الواتساب المتوافق مع ألوان الموقع */}
                                <Button 
                                    className="w-full bg-[#7e5b45] hover:bg-[#634837] text-white gap-2 font-bold py-5 rounded-xl transition-all"
                                    onClick={() => contactWhatsApp(product.name)}
                                >
                                    <MessageCircle className="h-5 w-5" />
                                    تواصل واتس
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Infinite Scroll Observer */}
                {hasMorePages && (
                    <div ref={observerRef} className="flex justify-center py-8">
                        {isLoadingMore ? (
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-[#7e5b45]"></div>
                                <span className="text-muted-foreground">جاري تحميل المزيد...</span>
                            </div>
                        ) : (
                            <div className="text-muted-foreground">مرر للأسفل لعرض المزيد</div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}