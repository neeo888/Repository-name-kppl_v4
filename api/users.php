<?php
require_once __DIR__ . '/config.php';
requireAdmin();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

try {
    $db = getDB();

    if ($method === 'GET') {
        // List all users
        $stmt = $db->query("SELECT id, first_name, last_name, employee_id, branch, role, approved, created_at FROM `users` ORDER BY id ASC");
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Normalize format for JS admin panel compatibility
        $mappedUsers = array_map(function($u) {
            return [
                'id' => $u['id'],
                'user' => $u['employee_id'],
                'pass' => '******', // Hide actual hash
                'role' => $u['role'],
                'name' => trim($u['first_name'] . ' ' . $u['last_name']),
                'first_name' => $u['first_name'],
                'last_name' => $u['last_name'],
                'branch' => $u['branch'],
                'approved' => (int)$u['approved'] === 1,
                'createdAt' => $u['created_at']
            ];
        }, $users);

        jsonOut(['success' => true, 'users' => $mappedUsers]);
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        if (!$data) {
            jsonOut(['error' => 'Invalid JSON input'], 400);
        }

        $empId = trim($data['employee_id'] ?? '');
        if (!$empId) {
            jsonOut(['error' => 'Missing employee ID'], 400);
        }
        if (!preg_match('/^[A-Za-z0-9_-]{2,50}$/', $empId)) {
            jsonOut(['error' => 'Invalid employee ID'], 400);
        }

        if ($action === 'create') {
            $firstName = trim($data['first_name'] ?? '');
            $lastName = trim($data['last_name'] ?? '-');
            $branch = trim($data['branch'] ?? '');
            $password = (string)($data['password'] ?? '');
            $role = trim($data['role'] ?? 'user');
            if ($firstName === '' || $branch === '' || strlen($password) < 8) {
                jsonOut(['error' => 'Missing fields or password is shorter than 8 characters'], 400);
            }
            if (!in_array($role, ['admin', 'user', 'contractor'], true)) {
                jsonOut(['error' => 'Invalid role value'], 400);
            }
            $stmt = $db->prepare("INSERT INTO `users` (`first_name`,`last_name`,`employee_id`,`branch`,`password_hash`,`role`,`approved`) VALUES (?,?,?,?,?,?,1)");
            $stmt->execute([$firstName, $lastName, $empId, $branch, password_hash($password, PASSWORD_DEFAULT), $role]);
            jsonOut(['success' => true, 'message' => 'User created']);
        }

        if ($action === 'toggle_approve') {
            $approved = isset($data['approved']) ? (int)$data['approved'] : 1;
            $stmt = $db->prepare("UPDATE `users` SET `approved` = ? WHERE `employee_id` = ?");
            $stmt->execute([$approved, $empId]);
            jsonOut(['success' => true, 'message' => 'Status updated']);
        }

        if ($action === 'change_role') {
            $role = trim($data['role'] ?? 'user');
            if (!in_array($role, ['admin', 'user', 'contractor'])) {
                jsonOut(['error' => 'Invalid role value'], 400);
            }
            $stmt = $db->prepare("UPDATE `users` SET `role` = ? WHERE `employee_id` = ?");
            $stmt->execute([$role, $empId]);
            jsonOut(['success' => true, 'message' => 'Role updated']);
        }

        if ($action === 'reset_password') {
            $password = (string)($data['password'] ?? '');
            if (strlen($password) < 12) {
                jsonOut(['error' => 'Password must be at least 12 characters'], 400);
            }
            $stmt = $db->prepare("UPDATE `users` SET `password_hash` = ? WHERE `employee_id` = ?");
            $stmt->execute([password_hash($password, PASSWORD_DEFAULT), $empId]);
            if ($stmt->rowCount() !== 1) {
                jsonOut(['error' => 'User not found'], 404);
            }
            jsonOut(['success' => true, 'message' => 'Password reset']);
        }

        if ($action === 'delete') {
            if ($empId === '9235' || $empId === 'admin') {
                jsonOut(['error' => 'Cannot delete default admin users'], 400);
            }
            $stmt = $db->prepare("DELETE FROM `users` WHERE `employee_id` = ?");
            $stmt->execute([$empId]);
            jsonOut(['success' => true, 'message' => 'User deleted']);
        }

        jsonOut(['error' => 'Action not found'], 404);
    }

    jsonOut(['error' => 'Method not allowed'], 405);

} catch (Throwable $e) {
    safeError($e, 'users');
}
