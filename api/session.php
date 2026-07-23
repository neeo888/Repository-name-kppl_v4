<?php
require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    $user = requireUser();
    jsonOut(['authenticated' => true, 'user' => $user]);
}

if ($method === 'POST') {
    startSecureSession();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    jsonOut(['success' => true]);
}

jsonOut(['error' => 'Method not allowed'], 405);
