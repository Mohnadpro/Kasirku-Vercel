<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItems;
use App\Models\Payment;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /**
     * Display a listing of orders.
     */
    public function index(Request $request)
    {
        try {
            $query = Order::with(['orderItems.product.photos', 'payment'])
                ->orderBy('created_at', 'desc');

            if ($request->has('status') && $request->status !== '') {
                $query->where('status', $request->status);
            }

            if ($request->has('search') && $request->search !== '') {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('customer_name', 'like', "%{$search}%")
                        ->orWhere('id', 'like', "%{$search}%");
                });
            }

            $orders = $query->paginate(10)->through(function ($order) {
                return [
                    'id' => $order->id,
                    'customer_name' => $order->customer_name,
                    'customer_phone' => null,
                    'customer_email' => null,
                    'total_amount' => $order->payment->amount ?? 0,
                    'status' => $order->status,
                    'order_type' => 'admin',
                    'notes' => null,
                    'created_at' => $order->created_at,
                    'order_items' => $order->orderItems->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'product' => [
                                'id' => $item->product->id,
                                'name' => $item->product->name,
                                'photos' => $item->product->photos->map(function ($photo) {
                                    return [
                                        'id' => $photo->id,
                                        'photo_url' => $photo->url
                                    ];
                                })
                            ],
                            'quantity' => $item->quantity,
                            'price' => $item->product->price,
                            'subtotal' => $item->quantity * $item->product->price
                        ];
                    }),
                    'payment' => [
                        'id' => $order->payment->id ?? 0,
                        'method' => $order->payment->payment_method ?? 'cash',
                        'status' => $order->payment->status ?? 'completed',
                        'amount' => $order->payment->amount ?? 0,
                        'transaction_id' => $order->payment->transaction_id ?? '',
                        'paid_at' => $order->payment->paid_at ?? null
                    ]
                ];
            });

            $products = Product::with('photos')->get();

            return Inertia::render('admin/orders/index', [
                'orders' => $orders,
                'products' => $products,
                'filters' => $request->only(['status', 'search'])
            ]);
        } catch (\Exception $e) {
            dd('Error: ' . $e->getMessage(), $e->getTraceAsString());
        }
    }

    /**
     * Store a newly created order in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'customer_name' => 'required|string|max:255',
            'table_number' => 'nullable|integer|min:0',
            'status' => 'nullable|in:pending,completed,cancelled',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'payment_method' => 'required|in:cash,digital',
        ]);

        DB::beginTransaction();

        try {
            $subtotalAmount = 0;
            $validatedItems = [];

            foreach ($request->items as $item) {
                $product = Product::findOrFail($item['product_id']);
                $subtotal = $product->price * $item['quantity'];
                $subtotalAmount += $subtotal;

                $validatedItems[] = [
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'price' => $product->price,
                    'subtotal' => $subtotal
                ];
            }

            $taxAmount = $subtotalAmount * 0.1;
            $totalAmount = $subtotalAmount + $taxAmount;

            $order = Order::create([
                'customer_name' => $request->customer_name,
                'table_number' => $request->table_number ?? 0,
                'status' => $request->status ?? 'pending',
            ]);

            foreach ($validatedItems as $item) {
                OrderItems::create([
                    'order_id' => $order->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['subtotal'],
                ]);
            }

            Payment::create([
                'order_id' => $order->id,
                'amount' => $totalAmount,
                'payment_method' => $request->payment_method,
                'status' => 'completed',
                'transaction_id' => 'ADMIN-' . time() . '-' . $order->id,
                'paid_at' => now(),
            ]);

            DB::commit();

            // العودة لصفحة الطلبات مع رسالة نجاح
            return redirect()->route('orders.index')->with('success', 'تم إنشاء الطلب بنجاح!');

        } catch (\Exception $e) {
            DB::rollback();
            return redirect()->back()->withErrors(['error' => 'فشل في إنشاء الطلب: ' . $e->getMessage()]);
        }
    }

    /**
     * Display the specified order.
     */
    public function show(Order $order)
    {
        $order->load(['orderItems.product.photos', 'payment']);

        return Inertia::render('admin/orders/show', [
            'order' => $order,
            'printReceipt' => session('print_receipt', false)
        ]);
    }

    /**
     * Show the form for editing the specified order.
     */
    public function edit(Order $order)
    {
        $order->load(['orderItems.product', 'payment']);
        $products = Product::with('photos')->where('is_active', true)->get();

        return Inertia::render('admin/orders/edit', [
            'order' => $order,
            'products' => $products
        ]);
    }

    /**
     * Update the specified order in storage.
     */
    public function update(Request $request, Order $order)
    {
        $request->validate([
            'customer_name' => 'required|string|max:255',
            'status' => 'required|in:pending,completed,cancelled',
        ]);

        $order->update([
            'customer_name' => $request->customer_name,
            'status' => $request->status,
        ]);

        return redirect()->route('orders.index')->with('success', 'تم تحديث الطلب بنجاح!');
    }

    /**
     * Remove the specified order from storage.
     */
    public function destroy(Request $request, Order $order)
    {
        if ($order->status !== 'cancelled') {
            return back()->withErrors(['error' => 'لا يمكن حذف إلا الطلبات الملغاة فقط.']);
        }

        DB::beginTransaction();

        try {
            $order->orderItems()->delete();
            $order->payment()->delete();
            $order->delete();

            DB::commit();

            return redirect()->route('orders.index')->with('success', 'تم حذف الطلب بنجاح!');
        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'فشل في الحذف: ' . $e->getMessage()]);
        }
    }

    /**
     * Print receipt for the order.
     */
    public function printReceipt(Order $order)
    {
        $order->load(['orderItems.product', 'payment']);

        $items = $order->orderItems->map(function ($item) {
            return [
                'name' => $item->product->name,
                'quantity' => $item->quantity,
                'price' => $item->price,
                'subtotal' => $item->subtotal
            ];
        });

        $printData = [
            'customer_name' => $order->customer_name,
            'customer_phone' => $order->customer_phone,
            'items' => $items,
            'total_amount' => $order->total_amount,
            'payment_method' => $order->payment->method,
            'order_date' => $order->created_at->format('d/m/Y H:i'),
            'order_id' => $order->id
        ];

        return redirect()->route('print.index', $printData);
    }

    /**
     * Update order status.
     */
    public function updateStatus(Request $request, Order $order)
    {
        $request->validate([
            'status' => 'required|in:pending,completed,cancelled'
        ]);

        $order->update(['status' => $request->status]);

        // هنا نترك الـ JSON لأنها عملية خلفية بسيطة لتغيير الحالة
        return response()->json([
            'success' => true,
            'message' => 'تم تحديث الحالة بنجاح!'
        ]);
    }
}