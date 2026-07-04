<?php
/**
 * POST /api/save_rows.php
 * รับข้อมูลจาก browser → INSERT IGNORE ลง MySQL (เฉพาะรายการใหม่)
 * หลัง save → ส่ง rows ทั้งหมดกลับ เพื่อให้ทุกเครื่องซิงค์ทันที
 */
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonOut(['error'=>'POST only'],405);

$body = json_decode(file_get_contents('php://input'), true);
if (!$body) jsonOut(['error'=>'Invalid JSON'],400);
if (($body['password']??'') !== IMPORT_PASSWORD) jsonOut(['error'=>'รหัสผ่านผิด'],403);

$rows     = $body['rows']     ?? [];
$fileName = trim($body['fileName'] ?? 'unknown');
if (!is_array($rows) || !count($rows)) jsonOut(['error'=>'ไม่มีข้อมูล'],400);

try {
    $db  = getDB();
    $now = date('Y-m-d H:i:s');
    $ip  = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';

    $stmt = $db->prepare("
        INSERT IGNORE INTO `pipe_repair_docs`
            (`job_id`,`job_date`,`contractor`,`note`,`imported_at`,`source_file`)
        VALUES (:jid,:jdt,:ct,:nt,:at,:sf)
    ");

    $added = 0;
    $db->beginTransaction();

    foreach ($rows as $r) {
        $jid = trim((string)($r[0]??''));
        if ($jid === '') continue;

        // แปลง date format
        $raw = (string)($r[1]??'');
        $jdt = null;
        if ($raw) {
            foreach (['Y-m-d H:i:s','Y-m-d','d/m/Y','d-m-Y','d/m/Y H:i:s'] as $fmt) {
                $dt = DateTime::createFromFormat($fmt, $raw);
                if ($dt) { $jdt = $dt->format('Y-m-d H:i:s'); break; }
            }
            if (!$jdt && ($ts = strtotime($raw))) {
                $jdt = date('Y-m-d H:i:s', $ts);
            }
        }

        $stmt->execute([
            ':jid' => $jid,
            ':jdt' => $jdt,
            ':ct'  => mb_substr((string)($r[2]??''),0,120),
            ':nt'  => mb_substr((string)($r[3]??''),0,255),
            ':at'  => $now,
            ':sf'  => mb_substr($fileName,0,255),
        ]);
        $added += $stmt->rowCount();
    }
    $db->commit();

    $dup   = count($rows) - $added;
    $total = (int)$db->query("SELECT COUNT(*) FROM `pipe_repair_docs`")->fetchColumn();

    // log
    $db->prepare("INSERT INTO `import_log`
        (`file_name`,`rows_in`,`rows_added`,`rows_dup`,`ip`) VALUES (?,?,?,?,?)")
       ->execute([$fileName, count($rows), $added, $dup, $ip]);

    // ── ส่ง ALL rows กลับ เพื่อ sync ทันที ──
    $allRows = $db->query("
        SELECT `job_id`,`job_date`,`contractor`,`note`
        FROM   `pipe_repair_docs`
        ORDER  BY `job_date` ASC, `id` ASC
    ")->fetchAll(PDO::FETCH_NUM);

    $allRows = array_map(function($r) {
        return [
            (string)($r[0]??''),
            $r[1] ? substr((string)$r[1],0,19) : '',
            (string)($r[2]??''),
            (string)($r[3]??''),
        ];
    }, $allRows);

    jsonOut([
        'ok'         => true,
        'added'      => $added,
        'dup'        => $dup,
        'total_in_db'=> $total,
        'file'       => $fileName,
        'all_rows'   => $allRows,   // ← ทุก row ใน DB ตอนนี้
    ]);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    jsonOut(['error'=>'DB: '.$e->getMessage()],500);
}
