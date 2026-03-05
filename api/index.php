<?php
// إعداد قاعدة البيانات
if (!file_exists('/tmp/database.sqlite')) {
    touch('/tmp/database.sqlite');
}

// تشغيل لارافيل
require __DIR__ . '/../public/index.php';

// تنفيذ الميجريشن برمجياً
try {
    $app = require __DIR__ . '/../bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->call('migrate', ['--force' => true]);
} catch (\Exception $e) {
    // تم التنفيذ مسبقاً
}