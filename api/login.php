<?php
require_once __DIR__ . '/config.php';

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data) {
    jsonOut(['error' => 'Invalid JSON input'], 400);
}

$employeeId = trim($data['employee_id'] ?? '');
$password = $data['password'] ?? '';

if (!$employeeId || !$password) {
    jsonOut(['error' => 'กรุณากรอกรหัสพนักงานและรหัสผ่าน'], 400);
}

try {
    $db = getDB();
    
    // Select user
    $stmt = $db->prepare("SELECT * FROM `users` WHERE `employee_id` = ?");
    $stmt->execute([$employeeId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        jsonOut(['error' => 'ไม่พบรหัสพนักงานนี้ในระบบ'], 400);
    }
    
    if ($user['approved'] != 1) {
        jsonOut(['error' => 'บัญชีผู้ใช้ของคุณยังไม่ได้รับการอนุมัติ หรือถูกระงับการใช้งาน'], 400);
    }
    
    if (!password_verify($password, $user['password_hash'])) {
        jsonOut(['error' => 'รหัสผ่านไม่ถูกต้อง'], 400);
    }
    
    // Return session data
    jsonOut([
        'success' => true,
        'user' => [
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'employee_id' => $user['employee_id'],
            'branch' => $user['branch'],
            'role' => $user['role'],
        ]
    ]);
} catch (Throwable $e) {
    jsonOut(['error' => 'DB Error: ' . $e->getMessage()], 500);
}
