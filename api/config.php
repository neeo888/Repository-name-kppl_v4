<?php
/** Shared configuration, database access, sessions and authorization. */

function envRequired(string $name): string {
    $value = getenv($name);
    if ($value === false || trim($value) === '') {
        throw new RuntimeException("Missing required environment variable: {$name}");
    }
    return $value;
}

function envValue(string $name, string $default = ''): string {
    $value = getenv($name);
    return ($value === false || $value === '') ? $default : $value;
}

function getDB(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $host = envValue('KPPL_DB_HOST', '127.0.0.1');
    $port = envValue('KPPL_DB_PORT', '3306');
    $name = envRequired('KPPL_DB_NAME');
    $user = envRequired('KPPL_DB_USER');
    $pass = envRequired('KPPL_DB_PASS');
    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function jsonOut(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function startSecureSession(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_name('kppl_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function currentUser(): ?array {
    startSecureSession();
    return isset($_SESSION['user']) && is_array($_SESSION['user']) ? $_SESSION['user'] : null;
}

function requireUser(): array {
    $user = currentUser();
    if (!$user) jsonOut(['error' => 'Unauthorized'], 401);
    try {
        $stmt = getDB()->prepare("SELECT first_name,last_name,employee_id,branch,role,approved FROM `users` WHERE `employee_id` = ? LIMIT 1");
        $stmt->execute([(string)($user['employee_id'] ?? '')]);
        $fresh = $stmt->fetch();
    } catch (Throwable $error) {
        safeError($error, 'session authorization');
    }
    if (!$fresh || (int)$fresh['approved'] !== 1) {
        $_SESSION = [];
        session_destroy();
        jsonOut(['error' => 'Unauthorized'], 401);
    }
    $_SESSION['user'] = publicUser($fresh);
    return $_SESSION['user'];
}

function requireAdmin(): array {
    $user = requireUser();
    if (($user['role'] ?? '') !== 'admin') jsonOut(['error' => 'Forbidden'], 403);
    return $user;
}

function publicUser(array $user): array {
    return [
        'first_name' => (string)($user['first_name'] ?? ''),
        'last_name' => (string)($user['last_name'] ?? ''),
        'employee_id' => (string)($user['employee_id'] ?? ''),
        'branch' => (string)($user['branch'] ?? ''),
        'role' => (string)($user['role'] ?? 'user'),
    ];
}

function safeError(Throwable $error, string $context): void {
    error_log("[KPPL] {$context}: " . $error->getMessage());
    jsonOut(['error' => 'Internal server error'], 500);
}
