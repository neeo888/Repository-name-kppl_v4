<?php
/**
 * GET /api/status.php — ตรวจสอบสถานะ DB
 */
require_once __DIR__ . '/config.php';
requireAdmin();
try {
    $db    = getDB();
    $count = (int)$db->query("SELECT COUNT(*) FROM `pipe_repair_docs`")->fetchColumn();
    $logs  = $db->query("
        SELECT `file_name`,`rows_added`,`rows_dup`,`imported_at`
        FROM `import_log` ORDER BY `imported_at` DESC LIMIT 10
    ")->fetchAll();
    jsonOut(['ok'=>true,'total_rows'=>$count,'recent_imports'=>$logs]);
} catch (PDOException $e) {
    safeError($e, 'status');
}
