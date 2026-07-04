<?php
/**
 * กปภ.พิษณุโลก — สร้างตาราง database (รัน 1 ครั้งตอนติดตั้ง)
 * เรียกผ่าน browser: https://yourdomain.com/api/init_db.php
 *
 * ⚠️  ลบไฟล์นี้ออกหลังรันแล้ว หรือเพิ่ม password ป้องกัน
 */

require_once __DIR__ . '/config.php';

// ── Guard: ต้องส่ง ?token=121212 ──
if (($_GET['token'] ?? '') !== IMPORT_PASSWORD) {
    jsonOut(['error' => 'Forbidden — ต้องส่ง ?token=รหัสผ่าน'], 403);
}

try {
    $db = getDB();

    // ── ตารางหลัก ──────────────────────────────────────────────────
    $db->exec("
        CREATE TABLE IF NOT EXISTS `pipe_repair_docs` (
            `id`          INT           NOT NULL AUTO_INCREMENT,
            `job_id`      VARCHAR(50)   NOT NULL
                            COMMENT 'เลขที่งาน CC-XXXX-NNNNN/FY',
            `job_date`    DATETIME      DEFAULT NULL
                            COMMENT 'วันที่ปิดงาน',
            `contractor`  VARCHAR(120)  NOT NULL DEFAULT ''
                            COMMENT 'ผู้รับจ้าง',
            `note`        VARCHAR(255)  NOT NULL DEFAULT ''
                            COMMENT 'หมายเหตุ',
            `imported_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                            COMMENT 'วันที่นำเข้า',
            `source_file` VARCHAR(255)  NOT NULL DEFAULT ''
                            COMMENT 'ชื่อไฟล์ต้นทาง',
            PRIMARY KEY (`id`),
            UNIQUE KEY  `uk_job_id`      (`job_id`),
            KEY         `idx_job_date`   (`job_date`),
            KEY         `idx_contractor` (`contractor`(40)),
            KEY         `idx_imported`   (`imported_at`)
        ) ENGINE=InnoDB
          DEFAULT CHARSET=utf8mb4
          COLLATE=utf8mb4_unicode_ci
          COMMENT='งานซ่อมท่อประปา กปภ.สาขาพิษณุโลก'
    ");

    // ── ตาราง import log ────────────────────────────────────────────
    $db->exec("
        CREATE TABLE IF NOT EXISTS `import_log` (
            `id`          INT           NOT NULL AUTO_INCREMENT,
            `file_name`   VARCHAR(255)  NOT NULL,
            `rows_total`  INT           NOT NULL DEFAULT 0,
            `rows_added`  INT           NOT NULL DEFAULT 0,
            `rows_dup`    INT           NOT NULL DEFAULT 0,
            `imported_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `ip_address`  VARCHAR(45)   NOT NULL DEFAULT '',
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    jsonOut([
        'success' => true,
        'message' => 'สร้างตารางสำเร็จ — pipe_repair_docs + import_log',
        'note'    => 'ลบไฟล์ init_db.php ออกหลังรันเรียบร้อยแล้ว',
    ]);

} catch (PDOException $e) {
    jsonOut(['error' => 'DB Error: ' . $e->getMessage()], 500);
}
