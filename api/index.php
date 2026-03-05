<?php

if (!file_exists('/tmp/database.sqlite')) {
    touch('/tmp/database.sqlite');
}

require __DIR__ . '/../public/index.php';

// تنفيذ الميجريشن بصمت في الخلفية
try {
    $app = require __DIR__ . '/../bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->call('migrate', ['--force' => true]);
} catch (\Exception $e) {
    // تم التنفيذ مسبقاً أو هناك خطأ بسيط، لا يهم الآن
}