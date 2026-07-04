<?php
/**
 * กปภ.พิษณุโลก — Database Configuration
 */
define('DB_HOST',    'localhost');
define('DB_PORT',    '3306');
define('DB_NAME',    'reg10_1');
define('DB_USER',    'reg10_1');
define('DB_PASS',    'reg10');
define('DB_CHARSET', 'utf8mb4');
define('IMPORT_PASSWORD', '121212');
define('ALLOWED_ORIGIN', '*');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $dsn = "mysql:host=".DB_HOST.";port=".DB_PORT.";dbname=".DB_NAME.";charset=".DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

function jsonOut(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
    http_response_code(204); exit;
}
