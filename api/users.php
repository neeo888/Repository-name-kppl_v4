<?php
require_once __DIR__ . '/config.php';

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
    jsonOut(['error' => 'DB Error: ' . $e->getMessage()], 500);
}
