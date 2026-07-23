<?php
/**
 * Create or update the first administrator from server environment variables.
 *
 * Required:
 *   KPPL_ADMIN_EMPLOYEE_ID
 *   KPPL_ADMIN_PASSWORD
 * Optional:
 *   KPPL_ADMIN_FIRST_NAME, KPPL_ADMIN_LAST_NAME, KPPL_ADMIN_BRANCH
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../api/config.php';

$employeeId = envRequired('KPPL_ADMIN_EMPLOYEE_ID');
$password = envRequired('KPPL_ADMIN_PASSWORD');
$firstName = envValue('KPPL_ADMIN_FIRST_NAME', 'ผู้ดูแลระบบ');
$lastName = envValue('KPPL_ADMIN_LAST_NAME', '');
$branch = envValue('KPPL_ADMIN_BRANCH', 'กปภ.สาขาพิษณุโลก');

if (!preg_match('/^[A-Za-z0-9_-]{2,50}$/', $employeeId)) {
    fwrite(STDERR, "Invalid KPPL_ADMIN_EMPLOYEE_ID\n");
    exit(1);
}
if (strlen($password) < 12) {
    fwrite(STDERR, "KPPL_ADMIN_PASSWORD must be at least 12 characters\n");
    exit(1);
}

try {
    $db = getDB();
    $stmt = $db->prepare("
        INSERT INTO `users`
            (`first_name`,`last_name`,`employee_id`,`branch`,`password_hash`,`role`,`approved`)
        VALUES (?,?,?,?,?,'admin',1)
        ON DUPLICATE KEY UPDATE
            `first_name` = VALUES(`first_name`),
            `last_name` = VALUES(`last_name`),
            `branch` = VALUES(`branch`),
            `password_hash` = VALUES(`password_hash`),
            `role` = 'admin',
            `approved` = 1
    ");
    $stmt->execute([
        $firstName,
        $lastName,
        $employeeId,
        $branch,
        password_hash($password, PASSWORD_DEFAULT),
    ]);
    fwrite(STDOUT, "Administrator created or updated successfully.\n");
} catch (Throwable $error) {
    error_log('[KPPL] create_admin: ' . $error->getMessage());
    fwrite(STDERR, "Unable to create administrator. Check server logs.\n");
    exit(1);
}
