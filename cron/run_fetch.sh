#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  กปภ.พิษณุโลก — cron/run_fetch.sh
#  🕐 Shell script สำหรับ Cron Job
#
#  ติดตั้ง cron:
#  $ crontab -e
#
#  ตัวอย่าง crontab (เลือกแบบที่ต้องการ):
#  ─────────────────────────────────────────────────────────────
#  # รันทุกวัน ตี 1:00 น. (แนะนำ)
#  0 1 * * * /bin/bash /path/to/kppl_v3/cron/run_fetch.sh >> /var/log/kppl_fetch.log 2>&1
#
#  # รันทุก 6 ชั่วโมง
#  0 */6 * * * /bin/bash /path/to/kppl_v3/cron/run_fetch.sh delta
#
#  # รันทุกชั่วโมง (ถ้าต้องการ near-realtime)
#  0 * * * * /bin/bash /path/to/kppl_v3/cron/run_fetch.sh delta
#
#  # Full sync ทุกวันอาทิตย์ 02:00 น.
#  0 2 * * 0 /bin/bash /path/to/kppl_v3/cron/run_fetch.sh full
# ═══════════════════════════════════════════════════════════════

# ── Config ───────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PHP_BIN="/usr/bin/php"                         # ← path php บน server
API_DIR="${SCRIPT_DIR}/../api"
LOG_DIR="${SCRIPT_DIR}/../api/logs"
LOG_FILE="${LOG_DIR}/cron_$(date +%Y%m).log"  # log แยกตามเดือน
MODE="${1:-delta}"                              # delta | full (arg แรก)
MAX_LOG_DAYS=30                                # เก็บ log ไว้กี่วัน

# ── Create log dir ────────────────────────────────────────────
mkdir -p "${LOG_DIR}"

# ── Header ───────────────────────────────────────────────────
echo "═══════════════════════════════════════" >> "${LOG_FILE}"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] START | mode=${MODE}" >> "${LOG_FILE}"

# ── ตรวจ PHP ─────────────────────────────────────────────────
if ! command -v "${PHP_BIN}" &> /dev/null; then
    echo "[ERROR] PHP not found at ${PHP_BIN}" >> "${LOG_FILE}"
    exit 1
fi

# ── รัน auto_fetch.php ───────────────────────────────────────
"${PHP_BIN}" "${API_DIR}/auto_fetch.php" --mode="${MODE}" >> "${LOG_FILE}" 2>&1
EXIT_CODE=$?

# ── บันทึกผล ─────────────────────────────────────────────────
if [ $EXIT_CODE -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ SUCCESS | exit=0" >> "${LOG_FILE}"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ FAILED  | exit=${EXIT_CODE}" >> "${LOG_FILE}"
fi

# ── ลบ log เก่า ──────────────────────────────────────────────
find "${LOG_DIR}" -name "*.log" -mtime +${MAX_LOG_DAYS} -delete 2>/dev/null

echo "[$(date '+%Y-%m-%d %H:%M:%S')] END" >> "${LOG_FILE}"
echo "─────────────────────────────────────" >> "${LOG_FILE}"

exit $EXIT_CODE
