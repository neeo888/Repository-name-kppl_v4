<?php
require_once __DIR__ . '/config.php';
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') jsonOut(['error' => 'POST only'], 405);

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data) {
    jsonOut(['error' => 'Invalid JSON input'], 400);
}

$firstName = trim($data['first_name'] ?? '');
$lastName = trim($data['last_name'] ?? '');
$employeeId = trim($data['employee_id'] ?? '');
$branch = trim($data['branch'] ?? '');
$password = $data['password'] ?? '';

if (!$firstName || !$lastName || !$employeeId || !$branch || !$password) {
    jsonOut(['error' => 'กรุณากรอกข้อมูลให้ครบถ้วน'], 400);
}
if (!preg_match('/^[A-Za-z0-9_-]{2,50}$/', $employeeId)) {
    jsonOut(['error' => 'รูปแบบรหัสพนักงานไม่ถูกต้อง'], 400);
}

if (strlen($password) < 6) {
    jsonOut(['error' => 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'], 400);
}

try {
    $db = getDB();
    
    // Check duplicate employee_id
    $stmt = $db->prepare("SELECT COUNT(*) FROM `users` WHERE `employee_id` = ?");
    $stmt->execute([$employeeId]);
    if ($stmt->fetchColumn() > 0) {
        jsonOut(['error' => 'รหัสพนักงานนี้ถูกลงทะเบียนไว้แล้ว'], 400);
    }
    
    // Hash password
    $hash = password_hash($password, PASSWORD_DEFAULT);
    
    // Insert new user
    $stmt = $db->prepare("INSERT INTO `users` (`first_name`, `last_name`, `employee_id`, `branch`, `password_hash`, `role`, `approved`) VALUES (?, ?, ?, ?, ?, 'user', 0)");
    $stmt->execute([$firstName, $lastName, $employeeId, $branch, $hash]);
    
    jsonOut(['success' => true, 'message' => 'ลงทะเบียนสำเร็จ กรุณารอผู้ดูแลอนุมัติ']);
} catch (Throwable $e) {
    safeError($e, 'register');
}
