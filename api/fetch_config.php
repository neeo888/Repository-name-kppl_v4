<?php
/**
 * ═══════════════════════════════════════════════════════════════
 *  กปภ.พิษณุโลก — api/fetch_config.php
 *  ⚙️  ตั้งค่า API Source — แก้ไขที่นี่จุดเดียว พอได้ข้อมูลจริง
 * ═══════════════════════════════════════════════════════════════
 *
 *  วิธีใช้:
 *  1. เลือก SOURCE_TYPE ที่ตรงกับระบบจริง
 *  2. กรอก URL / credentials ในส่วนที่เลือก
 *  3. รัน auto_fetch.php ผ่าน cron หรือ Admin Panel
 * ═══════════════════════════════════════════════════════════════
 */

// ══════════════════════════════════════════════════════════════
//  🔧 เลือกประเภท API Source (uncomment ที่ต้องการ)
// ══════════════════════════════════════════════════════════════
define('SOURCE_TYPE', 'mock');       // ← ใช้ข้อมูลจำลอง (ทดสอบ)
// define('SOURCE_TYPE', 'rest_api');   // ← REST API (JSON/XML)
// define('SOURCE_TYPE', 'erp_db');     // ← ERP / SAP Database โดยตรง
// define('SOURCE_TYPE', 'scraper');    // ← Web Scraping (HTML)
// define('SOURCE_TYPE', 'sftp');       // ← ดาวน์โหลด Excel จาก SFTP


// ══════════════════════════════════════════════════════════════
//  🌐 A: REST API (JSON / XML)
//     ใช้เมื่อ กปภ.ส่วนกลาง หรือระบบอื่นมี endpoint ให้เรียก
// ══════════════════════════════════════════════════════════════
define('API_URL',     'https://api.example.pwa.co.th/v1/jobs');   // ← URL จริง
define('API_METHOD',  'GET');          // GET หรือ POST
define('API_FORMAT',  'json');         // json | xml
define('API_TIMEOUT', 30);            // วินาที

// Authentication (เลือกแบบที่ใช้)
define('API_AUTH_TYPE',  'bearer');    // none | bearer | basic | apikey
define('API_TOKEN',      envValue('KPPL_API_TOKEN'));
define('API_USERNAME',   envValue('KPPL_API_USERNAME'));
define('API_PASSWORD_EXT', envValue('KPPL_API_PASSWORD'));
define('API_KEY_HEADER', 'X-API-Key');             // API Key header name
define('API_KEY_VALUE',  envValue('KPPL_API_KEY'));

// POST body (ถ้า METHOD = POST)
define('API_POST_BODY', json_encode([
    'branch_code' => 'PLK',           // ← รหัสสาขาพิษณุโลก
    'start_date'  => '',              // ← ว่าง = ดึงตาม FETCH_DAYS_BACK
    'end_date'    => '',
]));

// JSON path ไปยัง array ของข้อมูล (dot notation)
// เช่น ถ้า response = {"data":{"jobs":[...]}} ใส่ "data.jobs"
// ถ้า response = [...] โดยตรง ใส่ "" (ว่าง)
define('API_DATA_PATH', 'data');

// Field mapping: ชื่อ field ใน API → column ใน DB
// แก้ key ให้ตรงกับ field จริงที่ API ส่งมา
define('API_FIELD_MAP', json_encode([
    'job_id'     => 'job_no',         // ← ชื่อ field เลขที่งานใน API
    'job_date'   => 'close_date',     // ← ชื่อ field วันที่ปิดงานใน API
    'contractor' => 'technician',     // ← ชื่อ field ผู้รับจ้างใน API
    'note'       => 'remark',         // ← ชื่อ field หมายเหตุใน API
]));


// ══════════════════════════════════════════════════════════════
//  🏢 B: ERP / SAP Database Connection
//     ใช้เมื่อข้อมูลอยู่ใน DB ภายในองค์กร
// ══════════════════════════════════════════════════════════════
define('ERP_DSN',    'sqlsrv:Server=erp-server;Database=ERP_DB');  // ← DSN จริง
// define('ERP_DSN', 'oci:dbname=//oracle-server/ERPDB');           // Oracle
// define('ERP_DSN', 'mysql:host=erp-db;dbname=erp');               // MySQL
define('ERP_USER',   envValue('KPPL_ERP_USER'));
define('ERP_PASS',   envValue('KPPL_ERP_PASS'));

// SQL Query สำหรับดึงงานซ่อมท่อ
define('ERP_QUERY', "
    SELECT
        job_no          AS job_id,
        close_date      AS job_date,
        technician_name AS contractor,
        remark          AS note
    FROM
        repair_jobs
    WHERE
        branch_code = 'PLK'
        AND close_date >= :since
    ORDER BY close_date DESC
");


// ══════════════════════════════════════════════════════════════
//  🕷️ C: Web Scraper
//     ใช้เมื่อไม่มี API แต่มีหน้าเว็บรายงาน
// ══════════════════════════════════════════════════════════════
define('SCRAPE_URL',       'https://internal.pwa.co.th/reports/jobs');
define('SCRAPE_LOGIN_URL', 'https://internal.pwa.co.th/login');
define('SCRAPE_USER',      envValue('KPPL_SCRAPE_USER'));
define('SCRAPE_PASS',      envValue('KPPL_SCRAPE_PASS'));

// CSS/XPath selector ของ table ที่ต้องการ
define('SCRAPE_TABLE_SELECTOR', 'table#job_list');

// index ของ column ใน HTML table (0-based)
define('SCRAPE_COL_MAP', json_encode([
    'job_id'     => 0,   // column ที่ 1 = เลขที่งาน
    'job_date'   => 1,   // column ที่ 2 = วันที่
    'contractor' => 2,   // column ที่ 3 = ผู้รับจ้าง
    'note'       => 3,   // column ที่ 4 = หมายเหตุ
]));


// ══════════════════════════════════════════════════════════════
//  📁 D: SFTP / FTP File Download (Excel)
//     ใช้เมื่อมีการวาง Excel ไว้บน FTP server
// ══════════════════════════════════════════════════════════════
define('SFTP_HOST',     'files.pwa.co.th');
define('SFTP_PORT',     22);
define('SFTP_USER',     envValue('KPPL_SFTP_USER'));
define('SFTP_PASS',     envValue('KPPL_SFTP_PASS'));
define('SFTP_PATH',     '/reports/plk/jobs_latest.xlsx');  // path บน FTP
define('SFTP_LOCAL',    __DIR__ . '/tmp/downloaded.xlsx'); // save ที่ local


// ══════════════════════════════════════════════════════════════
//  ⏰ Scheduler Settings
// ══════════════════════════════════════════════════════════════

// ดึงข้อมูลย้อนหลังกี่วัน (ครั้งแรก หรือ full-sync)
define('FETCH_DAYS_BACK', 365);

// ดึงเฉพาะ delta: ข้อมูลหลังจาก last sync (ประหยัด API call)
define('FETCH_DELTA_ONLY', true);

// ตาราง sync log
define('SYNC_LOG_TABLE', 'kppl_sync_log');

// Token สำหรับเรียก cron จากภายนอก (เปลี่ยนให้ยากๆ)
define('CRON_SECRET', envValue('KPPL_CRON_SECRET'));

// Max rows ต่อ batch (ป้องกัน timeout)
define('FETCH_BATCH_SIZE', 500);

// Email แจ้งเตือนเมื่อ error (ว่างเปล่า = ไม่ส่ง)
define('ALERT_EMAIL', '');  // ← ใส่ email เช่น 'admin@pwa.co.th'
