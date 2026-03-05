import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDate } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    Calendar,
    CreditCard,
    EditIcon,
    EyeIcon,
    FileText,
    ImageIcon,
    Minus,
    Package,
    PlusIcon,
    Printer,
    SearchIcon,
    ShoppingCart,
    TrashIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// Types
interface OrderItem {
    id: number;
    product: {
        id: number;
        name: string;
        photos: Array<{ id: number; photo_url: string }>;
    };
    quantity: number;
    price: number;
    subtotal: number;
}

interface Payment {
    id: number;
    method: string;
    status: string;
    amount: number;
    transaction_id: string;
    paid_at: string | null;
}

interface Order {
    id: number;
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    total_amount: number;
    status: string;
    order_type: string;
    notes: string | null;
    created_at: string;
    order_items: OrderItem[];
    payment: Payment;
}

interface Product {
    id: number;
    name: string;
    price: number;
    stock: number;
    photos: Array<{
        id: number;
        url: string;
    }>;
}

interface CartItem {
    product_id: number;
    product: Product;
    quantity: number;
    subtotal: number;
}

interface OrdersData {
    data: Order[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

interface Props {
    orders: OrdersData;
    products: Product[];
    filters: {
        status?: string;
        search?: string;
    };
}

interface OrderFormData {
    customer_name: string;
    payment_method: string;
    table_number: number;
    status?: string; // Order status for editing
    items: { product_id: number; quantity: number }[];
    [key: string]: any;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'لوحة التحكم',
        href: '/admin/dashboard',
    },
    {
        title: 'الطلبات',
        href: '/admin/orders',
    },
];

const statusConfig = {
    pending: { label: 'قيد الانتظار', variant: 'secondary' as const },
    completed: { label: 'مكتمل', variant: 'default' as const },
    cancelled: { label: 'ملغي', variant: 'destructive' as const },
};

const paymentStatusConfig = {
    pending: { label: 'قيد الانتظار', variant: 'secondary' as const },
    completed: { label: 'مكتمل', variant: 'default' as const },
    failed: { label: 'فاشل', variant: 'destructive' as const },
};

export default function OrdersIndex({ orders, products, filters }: Props) {
    // State
    const [ordersList, setOrdersList] = useState<Order[]>(orders.data || []);
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>(filters?.status || '');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderToPrint, setOrderToPrint] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // الحل لمشكلة الاختفاء: نستخدم useRef لمنع التنفيذ عند التحميل الأول
    const isFirstRender = useRef(true);

    // Infinite scroll state
    const [currentPage, setCurrentPage] = useState(orders?.current_page || 1);
    const [hasMorePages, setHasMorePages] = useState(orders?.current_page < orders?.last_page);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const observerRef = useRef<HTMLDivElement>(null);

    // Create order states
    const [cart, setCart] = useState<CartItem[]>([]);
    const [productSearchTerm, setProductSearchTerm] = useState('');

    const [formData, setFormData] = useState<OrderFormData>({
        customer_name: '',
        payment_method: 'cash',
        table_number: 0,
        items: [],
    });

    // Update orders when props change
    useEffect(() => {
        setOrdersList(orders.data || []);
        setCurrentPage(orders?.current_page || 1);
        setHasMorePages(orders?.current_page < orders?.last_page);
    }, [orders]);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Since filtering is now done server-side, we don't need client-side filtering
    const filteredOrders = ordersList;

    // Calculate if we should show infinite scroll
    const shouldShowInfiniteScroll = () => {
        // Always show if there are more pages from server
        return hasMorePages;
    };

    // Load more orders function
    const loadMoreOrders = useCallback(async () => {
        if (isLoadingMore || !hasMorePages) return;

        setIsLoadingMore(true);

        try {
            const params = new URLSearchParams({
                page: (currentPage + 1).toString(),
            });

            // Add search parameter if exists
            if (debouncedSearchTerm) {
                params.append('search', debouncedSearchTerm);
            }

            // Add status filter parameter if exists and not 'all'
            if (statusFilter && statusFilter !== '' && statusFilter !== 'all') {
                params.append('status', statusFilter);
            }

            const response = await fetch(`/admin/orders?${params.toString()}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();

                // Always append data for infinite scroll
                setOrdersList((prev) => [...prev, ...data.orders.data]);
                setCurrentPage(data.orders.current_page);
                setHasMorePages(data.orders.current_page < data.orders.last_page);
            }
        } catch (error) {
            console.error('Failed to load more orders:', error);
        } finally {
            setIsLoadingMore(false);
        }
    }, [currentPage, hasMorePages, isLoadingMore, debouncedSearchTerm, statusFilter]); // Intersection Observer for infinite scroll
    useEffect(() => {
        if (!shouldShowInfiniteScroll()) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && shouldShowInfiniteScroll() && !isLoadingMore) {
                    loadMoreOrders();
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
    }, [loadMoreOrders, hasMorePages, isLoadingMore, debouncedSearchTerm, statusFilter]);

    // Reset data and pagination when search or filter changes
    useEffect(() => {
        // منع التنفيذ عند أول ريندر (هذا هو السطر الذي يحل مشكلة الاختفاء)
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        // Reset to first page and reload data when filters change
        setCurrentPage(1);
        setHasMorePages(true);

        // Reload data with new filters
        const loadInitialData = async () => {
            try {
                const params = new URLSearchParams({ page: '1' });

                if (debouncedSearchTerm) {
                    params.append('search', debouncedSearchTerm);
                }

                if (statusFilter && statusFilter !== '' && statusFilter !== 'all') {
                    params.append('status', statusFilter);
                }

                const response = await fetch(`/admin/orders?${params.toString()}`, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        Accept: 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setOrdersList(data.orders.data);
                    setCurrentPage(data.orders.current_page);
                    setHasMorePages(data.orders.current_page < data.orders.last_page);
                } else {
                    console.error('Failed to fetch filtered orders:', response.status);
                    // Fallback to empty state if filter request fails
                    setOrdersList([]);
                    setHasMorePages(false);
                }
            } catch (error) {
                console.error('Failed to load filtered orders:', error);
                // Fallback to empty state if network error
                setOrdersList([]);
                setHasMorePages(false);
            }
        };

        // Always reload data when filters change (including switching to "all")
        loadInitialData();
    }, [debouncedSearchTerm, statusFilter]);

    // Auto print order when orderToPrint is set
    useEffect(() => {
        if (orderToPrint) {
            handlePrint(orderToPrint);
            setOrderToPrint(null); // Reset after printing
        }
    }, [orderToPrint]);

    // Reset form
    const resetForm = () => {
        setFormData({
            customer_name: '',
            payment_method: 'cash',
            table_number: 0,
            status: 'pending', // Default order status
            items: [],
        });
        setCart([]);
        setErrors({});
    };

    // Handle form input changes
    const handleInputChange = (field: keyof OrderFormData, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const filteredProducts = (products || []).filter((product) => product.name.toLowerCase().includes(productSearchTerm.toLowerCase()));

    // Cart functions
    const addToCart = (product: Product) => {
        const existingItem = cart.find((item) => item.product_id === product.id);

        if (existingItem) {
            updateQuantity(product.id, existingItem.quantity + 1);
        } else {
            const newItem: CartItem = {
                product_id: product.id,
                product,
                quantity: 1,
                subtotal: product.price,
            };
            setCart([...cart, newItem]);
        }
    };

    const updateQuantity = (productId: number, newQuantity: number) => {
        if (newQuantity <= 0) {
            removeFromCart(productId);
            return;
        }

        setCart(
            cart.map((item) => {
                if (item.product_id === productId) {
                    return {
                        ...item,
                        quantity: newQuantity,
                        subtotal: item.product.price * newQuantity,
                    };
                }
                return item;
            }),
        );
    };

    const removeFromCart = (productId: number) => {
        setCart(cart.filter((item) => item.product_id !== productId));
    };

    const getSubtotal = () => {
        return cart.reduce((total, item) => total + item.subtotal, 0);
    };

    const getTaxAmount = () => {
        return getSubtotal() * 0.1; // 10% tax
    };

    const getTotalAmount = () => {
        return getSubtotal() + getTaxAmount();
    };

    // Handle create order
    const handleCreate = async () => {
        if (cart.length === 0) {
            setErrors({ items: 'يرجى إضافة منتج واحد على الأقل إلى السلة' });
            return;
        }

        if (!formData.customer_name.trim()) {
            setErrors({ customer_name: 'اسم العميل مطلوب' });
            return;
        }

        if (!formData.status) {
            setErrors({ status: 'حالة الطلب مطلوبة' });
            return;
        }

        setIsLoading(true);
        setErrors({});

        const items = cart.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
        }));

        const formDataToSend = {
            ...formData,
            items,
            tax_rate: 0.1, // 10% tax rate
        };

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            const response = await fetch('/admin/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(formDataToSend),
            });

            if (response.ok) {
                console.log('Order created successfully');
                setIsCreateModalOpen(false);

                // Create a mock order for printing based on cart data
                const mockOrder: Order = {
                    id: Date.now(), // temporary ID
                    customer_name: formData.customer_name,
                    customer_phone: null, // Not stored in database
                    customer_email: null, // Not stored in database
                    total_amount: getTotalAmount(),
                    status: formData.status || 'pending',
                    order_type: 'admin',
                    notes: null, // Not stored in database
                    created_at: new Date().toISOString(),
                    order_items: cart.map((item) => ({
                        id: item.product_id,
                        product: {
                            id: item.product.id,
                            name: item.product.name,
                            photos: item.product.photos.map((p) => ({ id: p.id, photo_url: p.url })),
                        },
                        quantity: item.quantity,
                        price: item.product.price,
                        subtotal: item.subtotal,
                    })),
                    payment: {
                        id: Date.now(),
                        method: formData.payment_method,
                        status: 'completed',
                        amount: getTotalAmount(),
                        transaction_id: `TXN-${Date.now()}`,
                        paid_at: new Date().toISOString(),
                    },
                };

                // Set order to print
                setOrderToPrint(mockOrder);
                resetForm();

                // Reload to get updated data
                window.location.reload();
            } else {
                const errorData = await response.json();
                console.error('Order creation failed:', errorData);
                setErrors(errorData.errors || { general: 'فشل في إنشاء الطلب' });
            }
        } catch (error) {
            console.error('Network error:', error);
            setErrors({ general: 'حدث خطأ في الاتصال بالشبكة' });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle edit order
    const handleEdit = async () => {
        if (!selectedOrder) return;

        setIsLoading(true);
        setErrors({});

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            const response = await fetch(`/admin/orders/${selectedOrder.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                console.log('Order updated successfully');
                setIsEditModalOpen(false);
                setSelectedOrder(null);
                resetForm();

                // Reload to get updated data
                window.location.reload();
            } else {
                const errorData = await response.json();
                console.error('Order update failed:', errorData);
                setErrors(errorData.errors || { general: 'فشل في تحديث الطلب' });
            }
        } catch (error) {
            console.error('Network error:', error);
            setErrors({ general: 'حدث خطأ في الاتصال بالشبكة' });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle delete order
    const handleDelete = async () => {
        if (!selectedOrder) return;

        setIsLoading(true);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            const response = await fetch(`/admin/orders/${selectedOrder.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
            });

            if (response.ok) {
                console.log('Order deleted successfully');
                setIsDeleteModalOpen(false);
                setSelectedOrder(null);

                // Reload to get updated data
                window.location.reload();
            } else {
                console.error('Order deletion failed:', response.status);
            }
        } catch (error) {
            console.error('Network error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle status update
    const handleStatusUpdate = (orderId: number, newStatus: string) => {
        router.post(
            `/admin/orders/${orderId}/status`,
            {
                status: newStatus,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload({ only: ['orders'] });
                },
            },
        );
    };

    // Open edit modal
    const openEditModal = (order: Order) => {
        setSelectedOrder(order);
        setFormData({
            customer_name: order.customer_name,
            payment_method: order.payment.method,
            table_number: 0, // Default for existing orders
            status: order.status, // Order status, not payment status
            items: [],
        });
        setIsEditModalOpen(true);
    };

    // Open view modal
    const openViewModal = (order: Order) => {
        setSelectedOrder(order);
        setIsViewModalOpen(true);
    };

    // Open delete modal
    const openDeleteModal = (order: Order) => {
        setSelectedOrder(order);
        setIsDeleteModalOpen(true);
    };

    // Handle print order
    const handlePrint = async (order: Order) => {
        const items =
            order.order_items?.map((item) => ({
                name: item.product?.name || 'منتج غير معروف',
                quantity: item.quantity,
                price: item.price,
            })) || [];

        const paid = order.payment?.amount || order.total_amount || 0;

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            const response = await fetch('/print', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    items: items,
                    paid: paid,
                }),
            });

            if (response.ok) {
                console.log('Print request successful');
            } else {
                console.error('Print request failed:', response.statusText);
            }
        } catch (error) {
            console.error('Error printing order:', error);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="إدارة الطلبات" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6" dir="rtl">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-right">
                        <h1 className="text-2xl font-semibold">إدارة الطلبات</h1>
                        <p className="text-muted-foreground">تتبع طلبات العملاء وإنشاء طلبات جديدة</p>
                    </div>

                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => resetForm()} className="flex items-center gap-2">
                                <PlusIcon className="h-4 w-4" />
                                إضافة طلب
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto" dir="rtl">
                            <DialogHeader>
                                <DialogTitle className="text-right">إنشاء طلب جديد</DialogTitle>
                                <DialogDescription className="text-right">قم بإنشاء طلب جديد للعملاء المتواجدين</DialogDescription>
                            </DialogHeader>

                            <div className="grid grid-cols-1 gap-6">
                                {/* Product Selection */}
                                <div className="text-right">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>اختر المنتجات</CardTitle>
                                            <Input
                                                placeholder="ابحث عن المنتجات..."
                                                value={productSearchTerm}
                                                onChange={(e) => setProductSearchTerm(e.target.value)}
                                                className="text-right"
                                            />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid max-h-64 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2">
                                                {filteredProducts.map((product) => (
                                                    <div
                                                        key={product.id}
                                                        className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50"
                                                        onClick={() => addToCart(product)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {product.photos.length > 0 ? (
                                                                <img
                                                                    src={product.photos[0].url}
                                                                    alt={product.name}
                                                                    className="h-12 w-12 rounded object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-200">
                                                                    <ImageIcon className="h-6 w-6 text-gray-400" />
                                                                </div>
                                                            )}
                                                            <div className="text-right">
                                                                <h4 className="text-sm font-medium">{product.name}</h4>
                                                                <p className="text-sm font-semibold text-green-600">
                                                                    {formatCurrency(product.price)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <PlusIcon className="h-4 w-4 text-gray-400" />
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Cart & Customer Form */}
                                <div className="space-y-4">
                                    {/* Cart */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-base justify-end">
                                                <span>سلة المشتريات ({cart.length})</span>
                                                <ShoppingCart className="h-4 w-4" />
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {cart.length === 0 ? (
                                                <p className="py-2 text-center text-sm text-muted-foreground">السلة فارغة حالياً</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {cart.map((item) => (
                                                        <div key={item.product_id} className="flex items-center gap-2 border-b pb-2">
                                                            <div className="flex-1 text-right">
                                                                <p className="text-xs font-medium">{item.product.name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {formatCurrency(item.product.price)} × {item.quantity}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0"
                                                                    onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                                                >
                                                                    <Minus className="h-3 w-3" />
                                                                </Button>
                                                                <span className="w-6 text-center text-xs">{item.quantity}</span>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0"
                                                                    onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                                                >
                                                                    <PlusIcon className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                            <p className="min-w-[60px] text-left text-xs font-semibold">
                                                                {formatCurrency(item.subtotal)}
                                                            </p>
                                                        </div>
                                                    ))}

                                                    <div className="space-y-2 pt-3">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span>المجموع الفرعي:</span>
                                                            <span>{formatCurrency(getSubtotal())}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span>الضريبة (10%):</span>
                                                            <span>{formatCurrency(getTaxAmount())}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between border-t pt-2 text-sm font-bold">
                                                            <span>الإجمالي:</span>
                                                            <span>{formatCurrency(getTotalAmount())}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Customer Form */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base text-right">بيانات العميل</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="text-right">
                                                <Label htmlFor="customer_name" className="text-sm">
                                                    اسم العميل *
                                                </Label>
                                                <Input
                                                    id="customer_name"
                                                    value={formData.customer_name}
                                                    onChange={(e) => handleInputChange('customer_name', e.target.value)}
                                                    className="h-8 text-right"
                                                />
                                                {errors.customer_name && <p className="mt-1 text-xs text-red-500">{errors.customer_name}</p>}
                                            </div>

                                            <div className="text-right">
                                                <Label htmlFor="payment_method" className="text-sm">
                                                    طريقة الدفع *
                                                </Label>
                                                <Select
                                                    value={formData.payment_method}
                                                    onValueChange={(value) => handleInputChange('payment_method', value)}
                                                >
                                                    <SelectTrigger className="h-8 flex-row-reverse">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent dir="rtl">
                                                        <SelectItem value="cash">نقداً</SelectItem>
                                                        <SelectItem value="digital">دفع إلكتروني</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="text-right">
                                                <Label htmlFor="order_status" className="text-sm">
                                                    حالة الطلب *
                                                </Label>
                                                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                                                    <SelectTrigger className="h-8 flex-row-reverse">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent dir="rtl">
                                                        <SelectItem value="pending">قيد الانتظار</SelectItem>
                                                        <SelectItem value="completed">مكتمل</SelectItem>
                                                        <SelectItem value="cancelled">ملغي</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            {errors.items && <p className="text-sm text-red-600 text-right mt-2">{errors.items}</p>}

                            <DialogFooter className="flex gap-2 justify-start mt-4">
                                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isLoading}>
                                    إلغاء
                                </Button>
                                <Button onClick={handleCreate} disabled={isLoading || cart.length === 0 || !formData.customer_name}>
                                    {isLoading ? 'جاري الإنشاء...' : 'إنشاء الطلب'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-end">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[200px] flex-row-reverse text-right">
                            <SelectValue placeholder="كل الحالات" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                            <SelectItem value="all">جميع الحالات</SelectItem>
                            <SelectItem value="pending">قيد الانتظار</SelectItem>
                            <SelectItem value="completed">مكتمل</SelectItem>
                            <SelectItem value="cancelled">ملغي</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="relative max-w-md w-full">
                        <SearchIcon className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                        <Input placeholder="البحث في الطلبات..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10 text-right" />
                    </div>
                </div>

                {/* Orders Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" dir="rtl">
                    {filteredOrders.map((order) => (
                        <Card key={order.id} className="overflow-hidden text-right">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between gap-2">
                                    <Badge variant={statusConfig[order.status as keyof typeof statusConfig]?.variant}>
                                        {statusConfig[order.status as keyof typeof statusConfig]?.label}
                                    </Badge>
                                    <CardTitle className="text-lg">طلب #{order.id}</CardTitle>
                                </div>
                                <div className="space-y-1 pt-2">
                                    <p className="text-sm font-medium">{order.customer_name}</p>
                                    {order.customer_phone && <p className="text-xs text-muted-foreground">{order.customer_phone}</p>}
                                    <p className="text-lg font-semibold text-green-600">{formatCurrency(order.total_amount)}</p>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0">
                                <div className="space-y-2 border-t pt-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <Badge
                                            variant={paymentStatusConfig[order.payment.status as keyof typeof paymentStatusConfig]?.variant}
                                            className="text-xs"
                                        >
                                            {paymentStatusConfig[order.payment.status as keyof typeof paymentStatusConfig]?.label}
                                        </Badge>
                                        <span className="text-muted-foreground">حالة الدفع:</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <Badge variant="outline" className="text-xs">
                                            {order.order_type === 'admin' ? 'إداري' : 'عميل'}
                                        </Badge>
                                        <span className="text-muted-foreground">نوع الطلب:</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                                        <span>{formatDate(order.created_at)}</span>
                                        <Calendar className="h-3 w-3" />
                                    </div>
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openViewModal(order)}>
                                        عرض
                                        <EyeIcon className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEditModal(order)}>
                                        تعديل
                                        <EditIcon className="h-4 w-4" />
                                    </Button>
                                    {order.status === 'cancelled' && (
                                        <Button variant="destructive" size="sm" className="flex-1 gap-1" onClick={() => openDeleteModal(order)}>
                                            حذف
                                            <TrashIcon className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Infinite Scroll Observer */}
                {shouldShowInfiniteScroll() && (
                    <div ref={observerRef} className="flex justify-center py-8">
                        {isLoadingMore ? (
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-gray-900"></div>
                                <span className="text-muted-foreground">جاري تحميل المزيد...</span>
                            </div>
                        ) : (
                            <div className="text-muted-foreground">قم بالتمرير للأسفل لتحميل المزيد من الطلبات</div>
                        )}
                    </div>
                )}

                {/* End of results indicator */}
                {!hasMorePages && filteredOrders.length > 0 && (
                    <div className="flex justify-center py-8">
                        <div className="text-center text-muted-foreground">
                            <div className="mx-auto mb-4 h-px w-24 bg-border"></div>
                            <p>وصلت إلى نهاية قائمة الطلبات</p>
                            <p className="mt-1 text-sm">يتم عرض {filteredOrders.length} طلب</p>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {filteredOrders.length === 0 && !isLoadingMore && (
                    <div className="py-12 text-center">
                        <Package className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد طلبات</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {searchTerm || (statusFilter && statusFilter !== '' && statusFilter !== 'all')
                                ? 'حاول تعديل خيارات البحث أو التصفية'
                                : 'ابدأ بإنشاء أول طلب لك الآن'}
                        </p>
                    </div>
                )}

                {/* View Order Modal */}
                <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                    <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto" dir="rtl">
                        <DialogHeader>
                            <DialogTitle className="text-right">تفاصيل الطلب #{selectedOrder?.id}</DialogTitle>
                            <DialogDescription className="text-right">المعلومات الكاملة عن الطلب والعميل</DialogDescription>
                        </DialogHeader>

                        {selectedOrder && (
                            <div className="grid grid-cols-1 gap-6">
                                {/* Order Items */}
                                <div className="text-right">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-end gap-2">
                                                <span>منتجات الطلب</span>
                                                <Package className="h-5 w-5" />
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {selectedOrder.order_items.map((item) => (
                                                    <div key={item.id} className="flex items-center gap-3 rounded border p-3">
                                                        {item.product.photos.length > 0 ? (
                                                            <img
                                                                src={item.product.photos[0].photo_url}
                                                                alt={item.product.name}
                                                                className="h-12 w-12 rounded object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-200">
                                                                <ImageIcon className="h-6 w-6 text-gray-400" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 text-right">
                                                            <p className="font-medium">{item.product.name}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {formatCurrency(item.price)} × {item.quantity}
                                                            </p>
                                                        </div>
                                                        <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                                                    </div>
                                                ))}

                                                <div className="space-y-2 border-t pt-3">
                                                    {(() => {
                                                        const orderSubtotal = selectedOrder.order_items.reduce(
                                                            (total, item) => total + item.subtotal,
                                                            0,
                                                        );
                                                        const orderTax = selectedOrder.total_amount - orderSubtotal;

                                                        return (
                                                            <>
                                                                <div className="flex items-center justify-between text-sm">
                                                                    <span>المجموع الفرعي:</span>
                                                                    <span>{formatCurrency(orderSubtotal)}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-sm">
                                                                    <span>الضريبة (10%):</span>
                                                                    <span>{formatCurrency(orderTax)}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between border-t pt-2 text-lg font-bold">
                                                                    <span>الإجمالي:</span>
                                                                    <span>{formatCurrency(selectedOrder.total_amount)}</span>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Notes */}
                                    {selectedOrder.notes && (
                                        <Card className="mt-4">
                                            <CardHeader>
                                                <CardTitle className="flex items-center justify-end gap-2">
                                                    <span>ملاحظات الطلب</span>
                                                    <FileText className="h-5 w-5" />
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-gray-700">{selectedOrder.notes}</p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                {/* Order Info Sidebar */}
                                <div className="space-y-4 text-right">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>حالة الطلب</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Badge variant={statusConfig[selectedOrder.status as keyof typeof statusConfig]?.variant}>
                                                    {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.label}
                                                </Badge>
                                                <span>الحالة:</span>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline">{selectedOrder.order_type === 'admin' ? 'إداري' : 'عميل'}</Badge>
                                                <span>النوع:</span>
                                            </div>

                                            <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                                                <span>{formatDate(selectedOrder.created_at)}</span>
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>بيانات العميل</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <div>
                                                <p className="font-medium">{selectedOrder.customer_name}</p>
                                            </div>

                                            {selectedOrder.customer_phone && (
                                                <div className="text-sm">
                                                    <span>{selectedOrder.customer_phone}</span>
                                                    <span className="text-muted-foreground"> :الهاتف </span>
                                                </div>
                                            )}

                                            {selectedOrder.customer_email && (
                                                <div className="text-sm">
                                                    <span>{selectedOrder.customer_email}</span>
                                                    <span className="text-muted-foreground"> :البريد </span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center justify-end gap-2">
                                                <span>الدفع</span>
                                                <CreditCard className="h-5 w-5" />
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Badge
                                                    variant={
                                                        paymentStatusConfig[selectedOrder.payment.status as keyof typeof paymentStatusConfig]?.variant
                                                    }
                                                >
                                                    {paymentStatusConfig[selectedOrder.payment.status as keyof typeof paymentStatusConfig]?.label}
                                                </Badge>
                                                <span>الحالة:</span>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="capitalize">{selectedOrder.payment.method === 'cash' ? 'نقدي' : 'إلكتروني'}</span>
                                                <span>الوسيلة:</span>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">{formatCurrency(selectedOrder.payment.amount)}</span>
                                                <span>المبلغ:</span>
                                            </div>

                                            <div className="text-xs text-muted-foreground border-t pt-2">
                                                <p>:رقم المعاملة</p>
                                                <p className="font-mono">{selectedOrder.payment.transaction_id}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="flex gap-2 justify-start">
                            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                                إغلاق
                            </Button>
                            {selectedOrder && (
                                <Button onClick={() => handlePrint(selectedOrder)} className="gap-2">
                                    <Printer className="h-4 w-4" />
                                    طباعة الإيصال
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Order Modal */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="max-w-md" dir="rtl">
                        <DialogHeader>
                            <DialogTitle className="text-right">تعديل الطلب #{selectedOrder?.id}</DialogTitle>
                            <DialogDescription className="text-right">تحديث معلومات العميل وحالة الطلب</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 text-right">
                            <div>
                                <Label htmlFor="edit_customer_name">اسم العميل *</Label>
                                <Input
                                    id="edit_customer_name"
                                    value={formData.customer_name}
                                    onChange={(e) => handleInputChange('customer_name', e.target.value)}
                                    className="text-right"
                                />
                                {errors.customer_name && <p className="mt-1 text-sm text-red-500">{errors.customer_name}</p>}
                            </div>

                            <div>
                                <Label htmlFor="edit_status">حالة الطلب *</Label>
                                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                                    <SelectTrigger className="flex-row-reverse">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent dir="rtl">
                                        <SelectItem value="pending">قيد الانتظار</SelectItem>
                                        <SelectItem value="completed">مكتمل</SelectItem>
                                        <SelectItem value="cancelled">ملغي</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter className="flex gap-2 justify-start">
                            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isLoading}>
                                إلغاء
                            </Button>
                            <Button onClick={handleEdit} disabled={isLoading || !formData.customer_name || !formData.status}>
                                {isLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Modal */}
                <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                    <DialogContent dir="rtl">
                        <DialogHeader>
                            <DialogTitle className="text-right">حذف الطلب</DialogTitle>
                            <DialogDescription className="text-right">
                                هل أنت متأكد من حذف الطلب #{selectedOrder?.id} للعميل "{selectedOrder?.customer_name}"؟ هذا الإجراء لا يمكن التراجع عنه.
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter className="flex gap-2 justify-start">
                            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isLoading}>
                                إلغاء
                            </Button>
                            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                                {isLoading ? 'جاري الحذف...' : 'حذف الطلب نهائياً'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}