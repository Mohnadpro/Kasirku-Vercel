<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItems;
use App\Models\Payment;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class CheckoutController extends Controller
{
    public function index()
    {
        return Inertia::render('customer/checkout/index');
    }

    public function processCheckout(Request $request)
    {
        $request->validate([
            'customer_name' => 'required|string|max:255',
            'table_number' => 'required|integer|min:1',
            'cart' => 'required|array|min:1',
            'cart.*.product.id' => 'required|exists:products,id',
            'cart.*.quantity' => 'required|integer|min:1',
            'cart.*.notes' => 'nullable|string|max:255',
        ]);

        try {
            DB::beginTransaction();

            // 1. إنشاء الطلب
            $order = Order::create([
                'customer_name' => $request->customer_name,
                'table_number' => $request->table_number,
                'status' => 'pending',
            ]);

            $subtotalAmount = 0;

            // 2. إنشاء أصناف الطلب وحساب المجموع
            foreach ($request->cart as $cartItem) {
                $product = Product::findOrFail($cartItem['product']['id']);

                OrderItems::create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'quantity' => $cartItem['quantity'],
                    'notes' => $cartItem['notes'] ?? null,
                    'price' => $product->price, // تأكد من تخزين السعر وقت الشراء
                ]);

                $subtotalAmount += $product->price * $cartItem['quantity'];
            }

            // 3. حساب الضريبة (10%) والإجمالي بالريال اليمني
            $taxAmount = $subtotalAmount * 0.1;
            $totalAmount = $subtotalAmount + $taxAmount;

            // 4. إنشاء سجل الدفع (كـ دفع نقدي مباشرة)
            $payment = Payment::create([
                'order_id' => $order->id,
                'amount' => $totalAmount,
                'status' => 'pending', // يبقى معلقاً حتى يستلم الكاشير المبلغ
                'payment_method' => 'cash', // تم التغيير من midtrans إلى cash
                'transaction_id' => 'CASH-' . time() . '-' . $order->id,
            ]);

            DB::commit();

            // 5. الرد بنجاح (بدون Snap Token لأننا لا نحتاج لشركة Midtrans)
            return response()->json([
                'success' => true,
                'redirect_url' => route('checkout.finish', ['order_id' => $order->id, 'transaction_status' => 'pending']),
                'order_id' => $order->id,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'حدث خطأ أثناء معالجة الطلب: ' . $e->getMessage()
            ], 500);
        }
    }

    public function paymentFinish(Request $request)
    {
        $orderId = $request->query('order_id');
        $status = $request->query('transaction_status');

        return Inertia::render('customer/payment/finish', [
            'order_id' => $orderId,
            'status' => $status,
        ]);
    }

    // تم تعطيل الدوال الخاصة بـ Midtrans لأننا لم نعد نستخدمها
    public function paymentUnfinish() { return redirect('/'); }
    public function paymentError() { return redirect('/'); }
    public function paymentNotification() { return response()->json(['status' => 'ignored']); }

    public function orderStatus($orderId)
    {
        $order = Order::with(['orderItems.product.photos', 'payment'])
            ->findOrFail($orderId);

        return Inertia::render('customer/order/status', [
            'order' => $order,
        ]);
    }

    public function checkOrderStatus($orderId)
    {
        $order = Order::with(['orderItems.product.photos', 'payment'])
            ->findOrFail($orderId);

        return response()->json(['order' => $order]);
    }
}