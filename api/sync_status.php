<?php
/**
 * ═══════════════════════════════════════════════════════════════
 *  กปภ.พิษณุโลก — api/sync_status.php
 *  📊 ดูสถานะและประวัติการ sync ทั้งหมด
 *  GET sync_status.php?token=CRON_SECRET&limit=20
 * ═══════════════════════════════════════════════════════════════
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/fetch_config.php';

$token = $_GET['token'] ?? '';
if ($token !== CRON_SECRET) jsonOut(['ok' => false, 'error' => 'Unauthorized'], 403);

$limit = min((int)($_GET['limit'] ?? 20), 100);

try {
    $db = getDB();

    // ── ดึง log ล่าสุด ────────────────────────────────────────
    $logs = [];
    try {
        $logs = $db->query("
            SELECT * FROM `" . SYNC_LOG_TABLE . "`
            ORDER BY synced_at DESC
            LIMIT {$limit}
        ")->fetchAll();
    } catch (Throwable $e) {
        $logs = []; // table ยังไม่มี
    }

    // ── สถิติรวม ──────────────────────────────────────────────
    $totalAdded  = array_sum(array_column($logs, 'rows_added'));
    $successRuns = count(array_filter($logs, fn($l) => $l['status'] === 'success'));
    $lastSuccess = null;
    foreach ($logs as $l) {
        if ($l['status'] === 'success') { $lastSuccess = $l['synced_at']; break; }
    }

    // ── Current source config ──────────────────────────────────
    $sourceConfig = [
        'type'          => SOURCE_TYPE,
        'delta_only'    => FETCH_DELTA_ONLY,
        'fetch_days_back' => FETCH_DAYS_BACK,
        'batch_size'    => FETCH_BATCH_SIZE,
    ];
    if (SOURCE_TYPE === 'rest_api') {
        $sourceConfig['url']      = API_URL;
        $sourceConfig['method']   = API_METHOD;
        $sourceConfig['auth']     = API_AUTH_TYPE;
    } elseif (SOURCE_TYPE === 'erp_db') {
        $sourceConfig['dsn']      = ERP_DSN;
    } elseif (SOURCE_TYPE === 'scraper') {
        $sourceConfig['url']      = SCRAPE_URL;
    } elseif (SOURCE_TYPE === 'sftp') {
        $sourceConfig['host']     = SFTP_HOST;
        $sourceConfig['path']     = SFTP_PATH;
    }

    // ── Current DB row count ──────────────────────────────────
    $rowCount = (int)$db->query("SELECT COUNT(*) FROM `pipe_repair_docs`")->fetchColumn();

    jsonOut([
        'ok'           => true,
        'source'       => $sourceConfig,
        'last_success' => $lastSuccess,
        'total_added'  => $totalAdded,
        'success_runs' => $successRuns,
        'db_rows'      => $rowCount,
        'logs'         => $logs,
    ]);
} catch (Throwable $e) {
    jsonOut(['ok' => false, 'error' => $e->getMessage()], 500);
}
