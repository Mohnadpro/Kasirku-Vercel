<?php
// 1. إنشاء الملف إذا لم يكن موجوداً
if (!file_exists('/tmp/database.sqlite')) {
    touch('/tmp/database.sqlite');
}

// 2. تحميل النظام
require __DIR__ . '/../public/index.php';

// 3. تنفيذ الـ Migrations برمجياً (سيحدث هذا في الخلفية عند كل طلب أو حتى يكتمل البناء)
// ملاحظة: يمكنك حذف هذا الجزء بعد أن يفتح الموقع لأول مرة بنجاح
try {
    \Illuminate\Support\Facades\Artisan::call('migrate', [
        '--force' => true,
    ]);
} catch (\Exception $e) {
    // تجاهل الخطأ إذا كانت الجداول موجودة بالفعل
}