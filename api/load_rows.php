<?php
/**
 * GET /api/load_rows.php
 * ส่งข้อมูลทั้งหมดจาก MySQL ให้ทุก browser
 *
 * IMPORTANT:
 *   ok:true  = เชื่อมต่อ DB ได้ (rows อาจว่างก็ได้)
 *   ok:false = เชื่อมต่อ DB ไม่ได้เลย (config ผิด / server down)
 *
 * JS จะใช้ localStorage เฉพาะเมื่อ ok:false เท่านั้น
 */
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') jsonOut(['error'=>'GET only'],405);

try {
    $db = getDB();   // ถ้า connect ไม่ได้ → throw → ok:false

    $rows = $db->query("
        SELECT `job_id`, `job_date`, `contractor`, `note`
        FROM   `pipe_repair_docs`
        ORDER  BY `job_date` ASC, `id` ASC
    ")->fetchAll(PDO::FETCH_NUM);

    // แปลง null/datetime → string ให้ JS ใช้ได้
    $rows = array_map(function($r) {
        return [
            (string)($r[0] ?? ''),
            $r[1] ? substr((string)$r[1], 0, 19) : '',  // "Y-m-d H:i:s"
            (string)($r[2] ?? ''),
            (string)($r[3] ?? ''),
        ];
    }, $rows);

    // import log ล่าสุด
    $log = $db->query("
        SELECT `file_name`, `imported_at`
        FROM   `import_log`
        ORDER  BY `imported_at` DESC
        LIMIT  1
    ")->fetch();

    // ✅ ok:true เสมอถ้าเชื่อม DB ได้ (แม้ rows=0)
    jsonOut([
        'ok'   => true,
        'rows' => $rows,
        'meta' => [
            'rowCount'   => count($rows),
            'lastFile'   => $log['file_name']   ?? null,
            'lastImport' => $log['imported_at'] ?? null,
        ],
    ]);

} catch (PDOException $e) {
    // เชื่อม DB ไม่ได้เลย → ok:false → JS จะ fallback localStorage
    http_response_code(200);   // ยังคืน 200 เพื่อให้ JS อ่าน JSON ได้
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
    echo json_encode([
        'ok'    => false,
        'rows'  => [],
        'meta'  => ['rowCount' => 0],
        'error' => 'DB connection failed: ' . $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
