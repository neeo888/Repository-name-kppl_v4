<?php
/**
 * กปภ.พิษณุโลก — สร้างตาราง database (รัน 1 ครั้งตอนติดตั้ง)
 * เรียกผ่าน browser: https://yourdomain.com/api/init_db.php
 *
 * ⚠️  ลบไฟล์นี้ออกหลังรันแล้ว หรือเพิ่ม password ป้องกัน
 */

require_once __DIR__ . '/config.php';

// Guarded by a one-time secret supplied through the environment.
if (!hash_equals(envRequired('KPPL_SETUP_SECRET'), (string)($_GET['token'] ?? ''))) {
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
            `budget`      VARCHAR(100)  NOT NULL DEFAULT ''
                            COMMENT 'วงเงิน คาดการณ์',
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

    // Upgrade installations created from older database.sql versions.
    $budgetColumn = $db->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pipe_repair_docs' AND COLUMN_NAME = 'budget'");
    $budgetColumn->execute();
    if ((int)$budgetColumn->fetchColumn() === 0) {
        $db->exec("ALTER TABLE `pipe_repair_docs` ADD COLUMN `budget` VARCHAR(100) NOT NULL DEFAULT '' AFTER `note`");
    }

    // ── ตารางผู้ใช้งาน ────────────────────────────────────────────
    $db->exec("
        CREATE TABLE IF NOT EXISTS `users` (
            `id`            INT           NOT NULL AUTO_INCREMENT,
            `first_name`    VARCHAR(100)  NOT NULL DEFAULT '',
            `last_name`     VARCHAR(100)  NOT NULL DEFAULT '',
            `employee_id`   VARCHAR(50)   NOT NULL,
            `branch`        VARCHAR(100)  NOT NULL DEFAULT '',
            `password_hash` VARCHAR(255)  NOT NULL DEFAULT '',
            `role`          VARCHAR(20)   NOT NULL DEFAULT 'user',
            `approved`      TINYINT(1)    NOT NULL DEFAULT 0,
            `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `uk_employee_id` (`employee_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    $db->exec("ALTER TABLE `users` ALTER COLUMN `approved` SET DEFAULT 0");

    jsonOut([
        'success' => true,
        'message' => 'สร้างตารางสำเร็จ — pipe_repair_docs + import_log + users',
        'note'    => 'ลบไฟล์ init_db.php ออกหลังรันเรียบร้อยแล้ว',
    ]);

} catch (PDOException $e) {
    safeError($e, 'init_db');
}
