<?php
/**
 * ═══════════════════════════════════════════════════════════════
 *  กปภ.พิษณุโลก — api/auto_fetch.php
 *  🤖 Engine กวาดข้อมูลอัตโนมัติ
 *
 *  เรียกได้ 3 วิธี:
 *  1. Cron Job:   php auto_fetch.php --mode=cron
 *  2. HTTP GET:   auto_fetch.php?token=CRON_SECRET&mode=full
 *  3. Admin Panel: POST { token, mode: "delta"|"full" }
 * ═══════════════════════════════════════════════════════════════
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/fetch_config.php';

// ── ป้องกัน timeout ──────────────────────────────────────────
set_time_limit(300);
ini_set('memory_limit', '256M');

// ── ตรวจสอบ Authorization ────────────────────────────────────
$isCron = (php_sapi_name() === 'cli');
$token  = $_GET['token'] ?? ($_POST['token'] ?? '');
$mode   = $_GET['mode']  ?? ($_POST['mode']  ?? 'delta');

if (!$isCron) {
    if ($token !== CRON_SECRET) {
        jsonOut(['ok' => false, 'error' => 'Unauthorized — token required'], 403);
    }
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
}

// ── Init sync log table ──────────────────────────────────────
_initSyncLogTable();

// ── ดึง last_sync timestamp ──────────────────────────────────
$lastSync = ($mode === 'full') ? null : _getLastSync();
$since    = $lastSync
    ? $lastSync
    : date('Y-m-d H:i:s', strtotime('-' . FETCH_DAYS_BACK . ' days'));

_log("🚀 START | mode={$mode} | source=" . SOURCE_TYPE . " | since={$since}");

// ══════════════════════════════════════════════════════════════
//  DISPATCH → เลือก fetcher ตาม SOURCE_TYPE
// ══════════════════════════════════════════════════════════════
$result = ['rows' => [], 'error' => null, 'source_info' => ''];

try {
    switch (SOURCE_TYPE) {
        case 'mock':      $result = _fetchMock($since);     break;
        case 'rest_api':  $result = _fetchRestAPI($since);  break;
        case 'erp_db':    $result = _fetchERPDatabase($since); break;
        case 'scraper':   $result = _fetchWebScraper($since);  break;
        case 'sftp':      $result = _fetchSFTP($since);     break;
        default:
            $result['error'] = 'Unknown SOURCE_TYPE: ' . SOURCE_TYPE;
    }
} catch (Throwable $e) {
    $result['error'] = $e->getMessage();
    _log("❌ Fetch error: " . $e->getMessage(), 'error');
}

if (!empty($result['error'])) {
    _saveLog('error', 0, 0, $result['error']);
    _sendAlert($result['error']);
    if ($isCron) { echo "ERROR: " . $result['error'] . "\n"; exit(1); }
    jsonOut(['ok' => false, 'error' => $result['error'], 'source' => SOURCE_TYPE]);
}

// ══════════════════════════════════════════════════════════════
//  INSERT ลง MySQL
// ══════════════════════════════════════════════════════════════
$rows = $result['rows'] ?? [];
_log("📦 Fetched " . count($rows) . " rows from " . SOURCE_TYPE);

[$added, $skipped, $errors] = _insertRows($rows);

$syncTime = date('Y-m-d H:i:s');
_saveLog('success', $added, $skipped, null, count($rows));
_updateLastSync($syncTime);

$summary = [
    'ok'          => true,
    'source'      => SOURCE_TYPE,
    'mode'        => $mode,
    'since'       => $since,
    'fetched'     => count($rows),
    'added'       => $added,
    'skipped'     => $skipped,
    'errors'      => $errors,
    'sync_time'   => $syncTime,
    'source_info' => $result['source_info'] ?? '',
];

_log("✅ DONE | added={$added} skipped={$skipped} errors={$errors}");

if ($isCron) {
    echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    exit(0);
}
jsonOut($summary);


// ══════════════════════════════════════════════════════════════
//  FETCHER A: Mock Data (ทดสอบ — สร้างข้อมูลจำลอง)
// ══════════════════════════════════════════════════════════════
function _fetchMock(string $since): array {
    _log("🎭 Mock fetcher — generating fake new rows");

    $contractors = ['สมชาย ใจดี', 'วิชัย รักงาน', 'ประสิทธิ์ เก่งมาก', 'สุรชัย ทำเร็ว', 'นิพนธ์ มือทอง'];
    $notes       = ['ท่อรั่ว', 'ท่อแตก', 'ท่ออุด', 'วาล์วชำรุด', 'มิเตอร์เสีย'];

    $rows = [];
    $now  = time();
    // สร้าง 5–15 รายการใหม่
    $count = rand(5, 15);
    for ($i = 0; $i < $count; $i++) {
        $ts   = $now - rand(0, 3 * 86400); // ย้อนหลัง 0–3 วัน
        $year = (int)date('Y', $ts);
        $fy   = (date('n', $ts) >= 10) ? $year + 543 + 1 : $year + 543;
        $num  = rand(10000, 99999);

        $rows[] = [
            'job_id'     => sprintf('CC-%04d-%05d/%02d', rand(1,9999), $num, $fy % 100),
            'job_date'   => date('Y-m-d H:i:s', $ts),
            'contractor' => $contractors[array_rand($contractors)],
            'note'       => $notes[array_rand($notes)],
        ];
    }

    return ['rows' => $rows, 'source_info' => 'mock:' . $count . '_rows'];
}


// ══════════════════════════════════════════════════════════════
//  FETCHER B: REST API (JSON / XML)
//  ▶ แก้ fetch_config.php → API_URL, API_TOKEN, API_FIELD_MAP
// ══════════════════════════════════════════════════════════════
function _fetchRestAPI(string $since): array {
    _log("🌐 REST API: " . API_URL);

    // สร้าง URL + query params
    $url = API_URL;
    if (API_METHOD === 'GET') {
        $params = ['since' => $since, 'branch' => 'PLK', 'limit' => FETCH_BATCH_SIZE];
        $url .= (strpos($url, '?') === false ? '?' : '&') . http_build_query($params);
    }

    // Headers
    $headers = ['Content-Type: application/json', 'Accept: application/json'];
    switch (API_AUTH_TYPE) {
        case 'bearer':
            $headers[] = 'Authorization: Bearer ' . API_TOKEN;
            break;
        case 'basic':
            $headers[] = 'Authorization: Basic ' . base64_encode(API_USERNAME . ':' . API_PASSWORD_EXT);
            break;
        case 'apikey':
            $headers[] = API_KEY_HEADER . ': ' . API_KEY_VALUE;
            break;
    }

    // cURL request
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => API_TIMEOUT,
        CURLOPT_SSL_VERIFYPEER => false, // ← true สำหรับ production
        CURLOPT_FOLLOWLOCATION => true,
    ]);

    if (API_METHOD === 'POST') {
        $body = API_POST_BODY;
        // แทน placeholder วันที่
        $body = str_replace('"start_date":""', '"start_date":"' . $since . '"', $body);
        $body = str_replace('"end_date":""',   '"end_date":"'   . date('Y-m-d H:i:s') . '"', $body);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr) throw new RuntimeException("cURL error: $curlErr");
    if ($httpCode >= 400) throw new RuntimeException("HTTP $httpCode: " . substr($response, 0, 200));

    // Parse response
    $data = (API_FORMAT === 'json')
        ? json_decode($response, true)
        : _parseXML($response);

    if (!$data) throw new RuntimeException("Parse error — invalid response");

    // เดิน path ถ้าระบุไว้
    $path = API_DATA_PATH;
    if ($path) {
        foreach (explode('.', $path) as $key) {
            $data = $data[$key] ?? null;
            if ($data === null) throw new RuntimeException("Path '$path' not found in response");
        }
    }

    // Map fields
    $fieldMap = json_decode(API_FIELD_MAP, true);
    $rows = [];
    foreach ((array)$data as $item) {
        $rows[] = [
            'job_id'     => trim((string)($item[$fieldMap['job_id']]     ?? '')),
            'job_date'   => trim((string)($item[$fieldMap['job_date']]   ?? '')),
            'contractor' => trim((string)($item[$fieldMap['contractor']] ?? '')),
            'note'       => trim((string)($item[$fieldMap['note']]       ?? '')),
        ];
    }

    return ['rows' => $rows, 'source_info' => "rest_api:{$httpCode}:" . count($rows)];
}


// ══════════════════════════════════════════════════════════════
//  FETCHER C: ERP / SAP Database
//  ▶ แก้ fetch_config.php → ERP_DSN, ERP_USER, ERP_PASS, ERP_QUERY
// ══════════════════════════════════════════════════════════════
function _fetchERPDatabase(string $since): array {
    _log("🏢 ERP DB: " . ERP_DSN);

    $erp = new PDO(ERP_DSN, ERP_USER, ERP_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $stmt = $erp->prepare(ERP_QUERY);
    $stmt->execute([':since' => $since]);
    $raw = $stmt->fetchAll();

    // normalize (ERP_QUERY ต้องใช้ alias ที่ตรงกับ job_id, job_date, contractor, note)
    $rows = array_map(fn($r) => [
        'job_id'     => trim((string)($r['job_id']     ?? '')),
        'job_date'   => trim((string)($r['job_date']   ?? '')),
        'contractor' => trim((string)($r['contractor'] ?? '')),
        'note'       => trim((string)($r['note']       ?? '')),
    ], $raw);

    return ['rows' => $rows, 'source_info' => 'erp_db:' . count($rows)];
}


// ══════════════════════════════════════════════════════════════
//  FETCHER D: Web Scraper
//  ▶ แก้ fetch_config.php → SCRAPE_URL, SCRAPE_USER, SCRAPE_PASS
// ══════════════════════════════════════════════════════════════
function _fetchWebScraper(string $since): array {
    _log("🕷️ Scraper: " . SCRAPE_URL);

    $cookieFile = sys_get_temp_dir() . '/kppl_scrape_cookie.txt';

    // ── Step 1: Login ─────────────────────────────────────────
    $ch = curl_init(SCRAPE_LOGIN_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query([
            'username' => SCRAPE_USER,
            'password' => SCRAPE_PASS,
        ]),
        CURLOPT_COOKIEJAR      => $cookieFile,
        CURLOPT_COOKIEFILE     => $cookieFile,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 30,
    ]);
    $loginResp = curl_exec($ch);
    curl_close($ch);
    if (!$loginResp) throw new RuntimeException("Scraper login failed");

    // ── Step 2: Fetch report page ────────────────────────────
    $reportUrl = SCRAPE_URL . '?since=' . urlencode($since);
    $ch = curl_init($reportUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_COOKIEFILE     => $cookieFile,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT        => 30,
    ]);
    $html = curl_exec($ch);
    curl_close($ch);
    if (!$html) throw new RuntimeException("Scraper fetch failed");

    // ── Step 3: Parse HTML table ─────────────────────────────
    $colMap = json_decode(SCRAPE_COL_MAP, true);
    $rows   = _parseHTMLTable($html, SCRAPE_TABLE_SELECTOR, $colMap);

    @unlink($cookieFile);
    return ['rows' => $rows, 'source_info' => 'scraper:' . count($rows)];
}


// ══════════════════════════════════════════════════════════════
//  FETCHER E: SFTP / FTP File Download
//  ▶ แก้ fetch_config.php → SFTP_HOST, SFTP_USER, SFTP_PASS
// ══════════════════════════════════════════════════════════════
function _fetchSFTP(string $since): array {
    _log("📁 SFTP: " . SFTP_HOST . SFTP_PATH);

    if (!function_exists('ssh2_connect')) {
        throw new RuntimeException("PHP ssh2 extension not installed");
    }

    $conn = ssh2_connect(SFTP_HOST, SFTP_PORT);
    if (!$conn) throw new RuntimeException("SFTP connect failed");

    if (!ssh2_auth_password($conn, SFTP_USER, SFTP_PASS)) {
        throw new RuntimeException("SFTP auth failed");
    }

    $sftp = ssh2_sftp($conn);
    $dir  = dirname(SFTP_LOCAL);
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    // ดาวน์โหลดไฟล์
    ssh2_scp_recv($conn, SFTP_PATH, SFTP_LOCAL);
    if (!file_exists(SFTP_LOCAL)) throw new RuntimeException("SFTP download failed");

    // อ่าน Excel (ต้องมี PhpSpreadsheet หรือ SimpleXLSX)
    $rows = _parseExcelFile(SFTP_LOCAL);
    @unlink(SFTP_LOCAL);

    return ['rows' => $rows, 'source_info' => 'sftp:' . count($rows)];
}


// ══════════════════════════════════════════════════════════════
//  INSERT ROWS ลง MySQL
// ══════════════════════════════════════════════════════════════
function _insertRows(array $rows): array {
    if (!$rows) return [0, 0, 0];

    $db   = getDB();
    $stmt = $db->prepare("
        INSERT IGNORE INTO `pipe_repair_docs`
            (`job_id`, `job_date`, `contractor`, `note`, `imported_at`, `source_file`)
        VALUES
            (:jid, :jdt, :ct, :nt, :at, :sf)
    ");

    $added   = 0;
    $skipped = 0;
    $errors  = 0;
    $now     = date('Y-m-d H:i:s');
    $source  = 'auto_fetch:' . SOURCE_TYPE;

    $db->beginTransaction();
    try {
        foreach ($rows as $r) {
            $jid = trim((string)($r['job_id'] ?? ''));
            if ($jid === '') { $skipped++; continue; }

            // normalize date
            $jdt = _normalizeDate((string)($r['job_date'] ?? ''));

            try {
                $stmt->execute([
                    ':jid' => $jid,
                    ':jdt' => $jdt,
                    ':ct'  => substr(trim((string)($r['contractor'] ?? '')), 0, 120),
                    ':nt'  => substr(trim((string)($r['note'] ?? '')), 0, 255),
                    ':at'  => $now,
                    ':sf'  => $source,
                ]);
                ($stmt->rowCount() > 0) ? $added++ : $skipped++;
            } catch (PDOException $e) {
                _log("⚠️ Row error [{$jid}]: " . $e->getMessage(), 'warn');
                $errors++;
            }
        }
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }

    return [$added, $skipped, $errors];
}


// ══════════════════════════════════════════════════════════════
//  SYNC LOG TABLE
// ══════════════════════════════════════════════════════════════
function _initSyncLogTable(): void {
    try {
        getDB()->exec("
            CREATE TABLE IF NOT EXISTS `" . SYNC_LOG_TABLE . "` (
                `id`           INT          NOT NULL AUTO_INCREMENT,
                `synced_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `status`       VARCHAR(20)  NOT NULL DEFAULT 'success',
                `rows_fetched` INT          NOT NULL DEFAULT 0,
                `rows_added`   INT          NOT NULL DEFAULT 0,
                `rows_skipped` INT          NOT NULL DEFAULT 0,
                `error_msg`    TEXT,
                `source`       VARCHAR(50)  NOT NULL DEFAULT '',
                PRIMARY KEY (`id`),
                KEY `idx_synced_at` (`synced_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
    } catch (Throwable $e) {
        _log("⚠️ Cannot create sync_log table: " . $e->getMessage(), 'warn');
    }
}

function _getLastSync(): ?string {
    try {
        $row = getDB()
            ->query("SELECT MAX(synced_at) AS last FROM `" . SYNC_LOG_TABLE . "` WHERE status='success'")
            ->fetch();
        return $row['last'] ?? null;
    } catch (Throwable $e) { return null; }
}

function _updateLastSync(string $ts): void {
    // บันทึกใน table เดิมแล้ว — ไม่ต้องทำเพิ่ม
}

function _saveLog(string $status, int $added, int $skipped, ?string $err, int $fetched = 0): void {
    try {
        getDB()->prepare("
            INSERT INTO `" . SYNC_LOG_TABLE . "`
                (`status`,`rows_fetched`,`rows_added`,`rows_skipped`,`error_msg`,`source`)
            VALUES (:st, :rf, :ra, :rs, :em, :src)
        ")->execute([
            ':st'  => $status,
            ':rf'  => $fetched,
            ':ra'  => $added,
            ':rs'  => $skipped,
            ':em'  => $err,
            ':src' => SOURCE_TYPE,
        ]);
    } catch (Throwable $e) {
        _log("⚠️ Cannot save sync log: " . $e->getMessage(), 'warn');
    }
}


// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════
function _normalizeDate(string $raw): ?string {
    if (!$raw || $raw === '' || $raw === '0') return null;
    // รองรับหลาย format
    $formats = [
        'Y-m-d H:i:s', 'Y-m-d H:i', 'Y-m-d',
        'd/m/Y H:i:s', 'd/m/Y',
        'd-m-Y', 'Ymd',
        'Y-m-d\TH:i:s', 'Y-m-d\TH:i:sP',
    ];
    // แปลง พ.ศ. → ค.ศ.
    if (preg_match('/^\d{2}\/\d{2}\/(\d{4})/', $raw, $m) && (int)$m[1] > 2500) {
        $raw = str_replace($m[1], (string)((int)$m[1] - 543), $raw);
    }
    foreach ($formats as $fmt) {
        $dt = DateTime::createFromFormat($fmt, $raw);
        if ($dt) return $dt->format('Y-m-d H:i:s');
    }
    $ts = strtotime($raw);
    return $ts ? date('Y-m-d H:i:s', $ts) : null;
}

function _parseXML(string $xml): array {
    libxml_use_internal_errors(true);
    $obj = simplexml_load_string($xml);
    if (!$obj) return [];
    return json_decode(json_encode($obj), true) ?? [];
}

function _parseHTMLTable(string $html, string $selector, array $colMap): array {
    $dom = new DOMDocument();
    @$dom->loadHTML('<?xml encoding="utf-8"?>' . $html);
    $xpath = new DOMXPath($dom);

    // แปลง CSS selector เป็น XPath อย่างง่าย
    $xpathExpr = str_replace(['#', '.'], ['//*[@id="', '//*[@class="'], $selector);
    if (strpos($selector, '#') !== false) {
        $id       = ltrim($selector, '#');
        $tables   = $xpath->query("//*[@id='{$id}']//tr");
    } else {
        $tables   = $xpath->query("//table//tr");
    }

    $rows = [];
    foreach ($tables as $i => $tr) {
        if ($i === 0) continue; // skip header
        $cells = $tr->getElementsByTagName('td');
        if ($cells->length === 0) continue;

        $row = [];
        foreach (['job_id','job_date','contractor','note'] as $field) {
            $idx = $colMap[$field] ?? null;
            $row[$field] = ($idx !== null && $cells->item($idx))
                ? trim($cells->item($idx)->textContent)
                : '';
        }
        if ($row['job_id']) $rows[] = $row;
    }
    return $rows;
}

function _parseExcelFile(string $path): array {
    // ถ้ามี PhpSpreadsheet
    if (class_exists('PhpOffice\PhpSpreadsheet\IOFactory')) {
        $sheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($path)->getActiveSheet();
        $rows  = [];
        foreach ($sheet->getRowIterator(2) as $row) {
            $cells = $row->getCellIterator();
            $cells->setIterateOnlyExistingCells(false);
            $c = [];
            foreach ($cells as $cell) { $c[] = $cell->getValue(); }
            if (empty($c[0])) continue;
            $rows[] = [
                'job_id'     => (string)($c[0] ?? ''),
                'job_date'   => (string)($c[1] ?? ''),
                'contractor' => (string)($c[2] ?? ''),
                'note'       => (string)($c[3] ?? ''),
            ];
        }
        return $rows;
    }
    throw new RuntimeException("ต้องติดตั้ง PhpSpreadsheet เพื่ออ่านไฟล์ Excel");
}

function _sendAlert(string $msg): void {
    if (!ALERT_EMAIL) return;
    $subject = '[KPPL AutoFetch] ERROR: ' . date('Y-m-d H:i');
    $body    = "Auto-fetch error:\n\n{$msg}\n\nServer: " . ($_SERVER['SERVER_NAME'] ?? 'CLI');
    @mail(ALERT_EMAIL, $subject, $body);
}

function _log(string $msg, string $level = 'info'): void {
    $line = '[' . date('Y-m-d H:i:s') . '] [' . strtoupper($level) . '] ' . $msg . "\n";
    $logFile = __DIR__ . '/logs/auto_fetch.log';
    if (!is_dir(dirname($logFile))) @mkdir(dirname($logFile), 0755, true);
    @file_put_contents($logFile, $line, FILE_APPEND);
    if (php_sapi_name() === 'cli') echo $line;
}
