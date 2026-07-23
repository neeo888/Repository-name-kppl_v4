/* ═══════════════════════════════════════════════════════════════
   กปภ.พิษณุโลก — js/admin.js
   Admin Panel — protected by the server-verified admin role
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── ผู้ที่มีสิทธิ์ admin ──────────────────────────────────────
  const USER_STORE  = 'kppl_users';   // localStorage key สำหรับรายชื่อสมาชิก

  // ── User Store helpers ────────────────────────────────────────
  function _getUsers() {
    if (window.cachedUsers) return window.cachedUsers;
    try {
      const raw = localStorage.getItem(USER_STORE);
      return raw ? JSON.parse(raw) : _defaultUsers();
    } catch { return _defaultUsers(); }
  }
  window._getUsers = _getUsers;
  function _saveUsers(users) {
    localStorage.setItem(USER_STORE, JSON.stringify(users));
    // sync กลับไปที่ USERS array ใน login.js
    if (typeof _syncLoginUsers === 'function') _syncLoginUsers(users);
  }
  function _defaultUsers() {
    return [];
  }
  function _initUserStore() {
    // ถ้ายังไม่เคย init → ใช้ค่า default
    if (!localStorage.getItem(USER_STORE)) {
      _saveUsers(_defaultUsers());
    }
  }

  // ── Activity Log (in-memory) ──────────────────────────────────
  const _log = [];
  function _addLog(msg, type = 'info') {
    const now = new Date();
    const hms = now.toTimeString().slice(0,8);
    _log.unshift({ time: hms, msg, type });
    if (_log.length > 50) _log.pop();
    _renderLog();
  }
  function _renderLog() {
    const el = document.getElementById('adminLogList');
    if (!el) return;
    el.innerHTML = _log.length
      ? _log.map(l => `
          <div class="admin-log-item">
            <span class="admin-log-time">${l.time}</span>
            <span class="admin-log-msg ${l.type}">${l.msg}</span>
          </div>`).join('')
      : '<div class="admin-log-item"><span class="admin-log-msg">ยังไม่มีกิจกรรม</span></div>';
  }

  // ── Toast ────────────────────────────────────────────────────
  function adminToast(msg, type = 'ok', duration = 3000) {
    const icons = { ok:'✅', err:'❌', warn:'⚠️', info:'ℹ️' };
    let t = document.getElementById('adminToast');
    if (t) t.remove();
    t = document.createElement('div');
    t.id = 'adminToast';
    t.className = `admin-toast toast-${type}`;
    t.innerHTML = `<span>${icons[type]||'•'}</span><span>${msg}</span>`;
    document.body.appendChild(t);
    setTimeout(() => {
      t.classList.add('toast-out');
      setTimeout(() => t.remove(), 280);
    }, duration);
  }

  // ── ตรวจว่าเป็น admin ────────────────────────────────────────
  window.isAdmin = function () {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    return !!user && user.role === 'admin';
  };

  // ── เปิด Panel ───────────────────────────────────────────────
  window.openAdminPanel = function () {
    if (!isAdmin()) {
      adminToast('ไม่มีสิทธิ์เข้าถึง Admin Panel', 'err');
      return;
    }
    if (document.getElementById('adminOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'adminOverlay';
    overlay.className = 'admin-overlay';
    overlay.innerHTML = _buildPanelHTML();
    document.body.appendChild(overlay);

    // click outside = close
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeAdminPanel();
    });

    _initUserStore();
    _populateStats();
    _renderLog();
    adminSwitchTab('overview');
    _addLog('เปิด Admin Panel', 'info');
  };

  // ── ปิด Panel ────────────────────────────────────────────────
  window.closeAdminPanel = function () {
    const ov = document.getElementById('adminOverlay');
    if (!ov) return;
    ov.classList.add('closing');
    setTimeout(() => ov.remove(), 300);
  };

  // ── Switch Tab ───────────────────────────────────────────────
  window.adminSwitchTab = function (tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.admin-section').forEach(s => s.classList.toggle('active', s.id === 'adminSec_' + tab));
    if (tab === 'overview') _populateStats();
    if (tab === 'log') _renderLog();
    if (tab === 'db')      _populateDBSection();
    if (tab === 'autosync') adminLoadSyncStatus();
    if (tab === 'members') adminRenderUsers();
  };

  // ── Build Panel HTML ─────────────────────────────────────────
  function _buildPanelHTML() {
    return `
<div class="admin-panel">
  <!-- Header -->
  <div class="admin-header">
    <div class="admin-header-top">
      <div class="admin-title">
        <span class="admin-title-crown">👑</span>
        <span>Admin Panel</span>
        <span class="admin-badge">ADMIN</span>
      </div>
      <button class="admin-close" onclick="closeAdminPanel()">✕</button>
    </div>
    <div class="admin-user-tag">
      <div class="admin-user-dot"></div>
      <span>เข้าสู่ระบบในฐานะ ผู้ดูแลระบบ (${ADMIN_USER})</span>
    </div>
  </div>

  <!-- Tabs -->
  <div class="admin-tabs">
    <button class="admin-tab" data-tab="overview" onclick="adminSwitchTab('overview')">
      <span class="admin-tab-ico">📊</span> ภาพรวม
    </button>
    <button class="admin-tab" data-tab="data" onclick="adminSwitchTab('data')">
      <span class="admin-tab-ico">🗄️</span> ข้อมูล
    </button>
    <button class="admin-tab" data-tab="db" onclick="adminSwitchTab('db')">
      <span class="admin-tab-ico">🔌</span> Database
    </button>
    <button class="admin-tab" data-tab="settings" onclick="adminSwitchTab('settings')">
      <span class="admin-tab-ico">⚙️</span> ตั้งค่า
    </button>
    <button class="admin-tab" data-tab="autosync" onclick="adminSwitchTab('autosync')">
      <span class="admin-tab-ico">🤖</span> Auto Sync
    </button>
    <button class="admin-tab" data-tab="members" onclick="adminSwitchTab('members')">
      <span class="admin-tab-ico">👥</span> สมาชิก
    </button>
    <button class="admin-tab" data-tab="log" onclick="adminSwitchTab('log')">
      <span class="admin-tab-ico">📋</span> Log
    </button>
  </div>

  <!-- Body -->
  <div class="admin-body">

    <!-- ══ TAB: OVERVIEW ══ -->
    <div id="adminSec_overview" class="admin-section">
      <div class="admin-section-title">สถิติระบบ</div>
      <div class="admin-stats" id="adminStatsGrid">
        <!-- filled by JS -->
      </div>

      <div class="admin-section-title">การใช้งาน localStorage</div>
      <div class="admin-progress-wrap">
        <div class="admin-progress-label">
          <span>ข้อมูลที่เก็บไว้</span>
          <span id="adminLsSize">—</span>
        </div>
        <div class="admin-progress-track">
          <div class="admin-progress-fill" id="adminLsBar" style="width:0%"></div>
        </div>
      </div>

      <div class="admin-section-title">ข้อมูล Session</div>
      <div class="admin-log" style="max-height:120px" id="adminSessionInfo">—</div>
    </div>

    <!-- ══ TAB: DATA ══ -->
    <div id="adminSec_data" class="admin-section">
      <div class="admin-section-title">นำเข้า / ส่งออก</div>
      <div class="admin-actions">
        <div class="admin-action-row">
          <div class="admin-action-info">
            <div class="admin-action-label">📥 นำเข้าไฟล์ข้อมูล</div>
            <div class="admin-action-desc">เปิดหน้าต่างเลือกไฟล์ (.xlsx, .csv, .txt)</div>
          </div>
          <button class="admin-btn admin-btn-primary" onclick="adminImportFile()">เลือกไฟล์</button>
        </div>
        <div class="admin-action-row">
          <div class="admin-action-info">
            <div class="admin-action-label">📊 ส่งออก Excel</div>
            <div class="admin-action-desc">ดาวน์โหลดตารางข้อมูลทั้งหมดเป็น .xlsx</div>
          </div>
          <button class="admin-btn admin-btn-success" onclick="adminExportExcel()">Export</button>
        </div>
        <div class="admin-action-row">
          <div class="admin-action-info">
            <div class="admin-action-label">📄 ส่งออก PDF</div>
            <div class="admin-action-desc">พิมพ์ตารางรายงานเป็น PDF</div>
          </div>
          <button class="admin-btn admin-btn-success" onclick="adminExportPDF()">Export</button>
        </div>
        <div class="admin-action-row">
          <div class="admin-action-info">
            <div class="admin-action-label">🗃️ ส่งออก SQL</div>
            <div class="admin-action-desc">สร้างไฟล์ database.sql สำหรับ backup</div>
          </div>
          <button class="admin-btn admin-btn-amber" onclick="adminExportSQL()">Export SQL</button>
        </div>
      </div>

      <div class="admin-section-title" style="margin-top:8px">เครื่องมือข้อมูล</div>
      <div class="admin-actions">
        <div class="admin-action-row">
          <div class="admin-action-info">
            <div class="admin-action-label">🔄 โหลดข้อมูลใหม่จาก MySQL</div>
            <div class="admin-action-desc">ดึงข้อมูลล่าสุดจาก server โดยไม่ reload หน้า</div>
          </div>
          <button class="admin-btn admin-btn-primary" onclick="adminRefreshData()">Refresh</button>
        </div>
        <div class="admin-action-row">
          <div class="admin-action-info">
            <div class="admin-action-label">✏️ แก้ไขข้อความ Ticker</div>
            <div class="admin-action-desc">เพิ่ม/แก้ไขข้อความที่แถบวิ่งด้านบน</div>
          </div>
          <button class="admin-btn admin-btn-ghost" onclick="adminEditTicker()">แก้ไข</button>
        </div>
      </div>

      <div class="admin-section-title" style="margin-top:8px; color:rgba(255,60,60,0.7)">โซนอันตราย</div>
      <div class="admin-danger-box">⚠️ การล้างข้อมูลจะลบข้อมูลทั้งหมดออกจาก localStorage และไม่สามารถกู้คืนได้</div>
      <div class="admin-actions">
        <div class="admin-action-row">
          <div class="admin-action-info">
            <div class="admin-action-label">🗑️ ล้างข้อมูลทั้งหมด</div>
            <div class="admin-action-desc">ลบข้อมูลออกจาก localStorage (ต้องยืนยันรหัสผ่าน)</div>
          </div>
          <button class="admin-btn admin-btn-danger" onclick="adminClearData()">ล้างข้อมูล</button>
        </div>
      </div>
    </div>

    <!-- ══ TAB: DATABASE ══ -->
    <div id="adminSec_db" class="admin-section">
      <div class="admin-section-title">สถานะ MySQL Server</div>
      <div id="adminDbStatus" class="admin-info-box">กำลังตรวจสอบ...</div>

      <div class="admin-section-title">เครื่องมือ Database</div>
      <div class="admin-actions">
        <div class="admin-action-row">
          <div class="admin-action-info">
            <div class="admin-action-label">🔍 ตรวจสอบสถานะ DB</div>
            <div class="admin-action-desc">เรียก api/status.php เพื่อดู connection และจำนวน rows</div>
          </div>
          <button class="admin-btn admin-btn-primary" onclick="adminCheckDB()">ตรวจสอบ</button>
        </div>
        <div class="admin-action-row">
          <div class="admin-action-info">
            <div class="admin-action-label">📤 Sync ข้อมูล Local → MySQL</div>
            <div class="admin-action-desc">ส่งข้อมูลใน localStorage ทั้งหมดขึ้น MySQL server</div>
          </div>
          <button class="admin-btn admin-btn-success" onclick="adminSyncToMySQL()">Sync ขึ้น DB</button>
        </div>
        <div class="admin-action-row">
          <div class="admin-action-info">
            <div class="admin-action-label">📥 โหลดข้อมูลจาก MySQL</div>
            <div class="admin-action-desc">ดึงข้อมูลจาก MySQL มาแทนที่ข้อมูลปัจจุบัน</div>
          </div>
          <button class="admin-btn admin-btn-ghost" onclick="adminLoadFromMySQL()">โหลดจาก DB</button>
        </div>
      </div>

      <div class="admin-section-title" style="margin-top:8px">ผลลัพธ์</div>
      <div class="admin-log" id="adminDbLog" style="min-height:80px">—</div>
    </div>

    <!-- ══ TAB: SETTINGS ══ -->
    <div id="adminSec_settings" class="admin-section">
      <div class="admin-section-title">การตั้งค่าระบบ</div>

      <div class="admin-toggle-row">
        <div>
          <div class="admin-toggle-label">🔄 Auto-Refresh</div>
          <div class="admin-toggle-desc">รีเฟรชข้อมูลอัตโนมัติทุก 5 นาที</div>
        </div>
        <label class="admin-toggle">
          <input type="checkbox" id="adminToggleRefresh" checked onchange="adminToggleSetting('autoRefresh', this.checked)">
          <span class="admin-toggle-slider"></span>
        </label>
      </div>

      <div class="admin-toggle-row">
        <div>
          <div class="admin-toggle-label">🌤️ Weather Widget</div>
          <div class="admin-toggle-desc">แสดงข้อมูลสภาพอากาศในหัว Dashboard</div>
        </div>
        <label class="admin-toggle">
          <input type="checkbox" id="adminToggleWeather" checked onchange="adminToggleSetting('weather', this.checked)">
          <span class="admin-toggle-slider"></span>
        </label>
      </div>

      <div class="admin-section-title" style="margin-top:20px">สิทธิ์นำเข้าข้อมูล</div>
      <div class="admin-pw-form">
        <div class="admin-pw-title">🔒 รหัสผ่านสำหรับนำเข้าข้อมูล</div>
        <div class="admin-info-box">การนำเข้าและล้างข้อมูลตรวจสิทธิ์ Admin ผ่าน session ฝั่ง server</div>
        <div class="admin-input-group">
          <label>รหัสผ่านปัจจุบัน</label>
          <input type="password" class="admin-input" id="adminPwOld" placeholder="••••••">
        </div>
        <div class="admin-input-group">
          <label>รหัสผ่านใหม่</label>
          <input type="password" class="admin-input" id="adminPwNew" placeholder="••••••">
        </div>
        <div class="admin-input-group">
          <label>ยืนยันรหัสผ่านใหม่</label>
          <input type="password" class="admin-input" id="adminPwNew2" placeholder="••••••">
        </div>
        <button class="admin-btn admin-btn-amber" style="width:100%;justify-content:center;margin-top:4px"
                onclick="adminChangePW()">🔑 เปลี่ยนรหัสผ่าน</button>
      </div>

      <div class="admin-section-title" style="margin-top:8px">ข้อมูล Ticker</div>
      <div class="admin-input-group">
        <label>ข้อความ Ticker (คั่นด้วย |)</label>
        <textarea class="admin-input" id="adminTickerText" rows="3"
          placeholder="ข้อความที่ 1 | ข้อความที่ 2 | ข้อความที่ 3"
          style="resize:vertical; min-height:80px; line-height:1.5"></textarea>
      </div>
      <button class="admin-btn admin-btn-primary" style="width:100%;justify-content:center"
              onclick="adminSaveTicker()">💾 บันทึก Ticker</button>
    </div>

    <!-- ══ TAB: AUTO SYNC ══ -->
    <div id="adminSec_autosync" class="admin-section">

      <!-- Status bar -->
      <div id="syncStatusBar" style="border-radius:10px;padding:14px 16px;margin-bottom:18px;
           background:rgba(0,98,255,0.08);border:1px solid rgba(0,98,255,0.2);
           font-size:0.8rem;color:rgba(255,255,255,0.6)">
        ⏳ กำลังโหลดสถานะ...
      </div>

      <!-- Source type badge -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap">
        <div class="admin-section-title" style="margin:0">แหล่งข้อมูลปัจจุบัน</div>
        <div id="syncSourceBadge" style="background:rgba(255,180,0,0.12);border:1px solid rgba(255,180,0,0.25);
             border-radius:8px;padding:5px 14px;font-size:0.78rem;font-weight:700;color:#ffb400">
          🎭 MOCK (จำลอง)
        </div>
      </div>

      <!-- Manual controls -->
      <div class="admin-section-title">รัน Manual</div>
      <div class="admin-actions" style="margin-bottom:20px">
        <div class="admin-action-row">
          <div class="admin-action-info">
            <div class="admin-action-label">⚡ Delta Sync</div>
            <div class="admin-action-desc">ดึงเฉพาะข้อมูลใหม่หลังจาก sync ล่าสุด (เร็ว)</div>
          </div>
          <button class="admin-btn admin-btn-primary" onclick="adminRunSync('delta')"
                  id="syncBtnDelta">▶ รัน Delta</button>
        </div>
        <div class="admin-action-row">
          <div class="admin-action-info">
            <div class="admin-action-label">🔄 Full Sync</div>
            <div class="admin-action-desc">ดึงข้อมูลทั้งหมดย้อนหลัง (ช้า — ใช้ครั้งแรก)</div>
          </div>
          <button class="admin-btn admin-btn-amber" onclick="adminRunSync('full')"
                  id="syncBtnFull">▶ รัน Full</button>
        </div>
      </div>

      <!-- Progress bar -->
      <div id="syncProgress" style="display:none;margin-bottom:20px">
        <div class="admin-progress-label">
          <span id="syncProgressLabel">กำลังดึงข้อมูล...</span>
          <span id="syncProgressPct">0%</span>
        </div>
        <div class="admin-progress-track">
          <div class="admin-progress-fill" id="syncProgressFill" style="width:0%;
               background:linear-gradient(90deg,#0062ff,#00d4ff);transition:width 0.5s"></div>
        </div>
      </div>

      <!-- Result box -->
      <div id="syncResult" style="display:none;margin-bottom:20px"></div>

      <!-- Cron setup guide -->
      <div class="admin-section-title" style="margin-top:4px">ตั้งค่า Cron Job (Auto)</div>
      <div style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.07);
                  border-radius:10px;padding:16px;margin-bottom:16px">
        <div style="font-size:0.72rem;color:rgba(255,180,0,0.8);margin-bottom:10px;font-weight:600">
          📋 คำสั่ง crontab (วางบน server)
        </div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:0.72rem;
                    color:rgba(100,220,100,0.9);line-height:2">
          <div style="color:rgba(255,255,255,0.25)"># รันทุกวัน ตี 1:00 น.</div>
          <div id="cronCmd1" style="cursor:pointer" onclick="adminCopyCron(this)"
               title="คลิกเพื่อคัดลอก">0 1 * * * php /path/to/kppl_v3/api/auto_fetch.php --mode=delta</div>
          <div style="margin-top:6px;color:rgba(255,255,255,0.25)"># Full sync ทุกวันอาทิตย์</div>
          <div id="cronCmd2" style="cursor:pointer" onclick="adminCopyCron(this)"
               title="คลิกเพื่อคัดลอก">0 2 * * 0 php /path/to/kppl_v3/api/auto_fetch.php --mode=full</div>
        </div>
        <div style="font-size:0.68rem;color:rgba(255,255,255,0.25);margin-top:10px">
          💡 คลิกที่คำสั่งเพื่อคัดลอก · แก้ /path/to/ ให้ตรงกับ path จริงบน server
        </div>
      </div>

      <!-- Source change guide -->
      <div class="admin-section-title">เปลี่ยนแหล่งข้อมูล</div>
      <div class="admin-warn-box" style="margin-bottom:12px">
        ⚙️ แก้ไขไฟล์ <code style="background:rgba(0,0,0,0.4);padding:1px 6px;border-radius:4px;font-family:monospace">api/fetch_config.php</code>
        แล้ว uncomment SOURCE_TYPE ที่ต้องการ จากนั้น กรอก URL / credentials ในส่วนที่เลือก
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${['mock','rest_api','erp_db','scraper','sftp'].map((t,i) => {
          const icons = ['🎭','🌐','🏢','🕷️','📁'];
          const labels = ['Mock (ทดสอบ)','REST API','ERP/SAP DB','Web Scraper','SFTP/FTP'];
          const descs  = ['ข้อมูลจำลอง พร้อมใช้','JSON/XML endpoint','Database ตรง','ดึงจากหน้าเว็บ','ไฟล์ Excel'];
          return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
                       border-radius:8px;padding:10px 12px">
            <div style="font-size:0.82rem;font-weight:600;color:#fff;margin-bottom:3px">${icons[i]} ${labels[i]}</div>
            <div style="font-size:0.68rem;color:rgba(255,255,255,0.3)">${descs[i]}</div>
          </div>`;
        }).join('')}
      </div>

      <!-- Sync Log -->
      <div class="admin-section-title" style="margin-top:20px">
        ประวัติ Sync
        <button class="admin-btn admin-btn-ghost" onclick="adminLoadSyncLogs()"
                style="margin-left:auto;padding:4px 10px;font-size:0.7rem">🔄 โหลด</button>
      </div>
      <div class="admin-log" id="syncLogList" style="min-height:100px">
        <div class="admin-log-item"><span class="admin-log-msg">กด 🔄 โหลด เพื่อดูประวัติ</span></div>
      </div>
    </div>

    <!-- ══ TAB: MEMBERS ══ -->
    <div id="adminSec_members" class="admin-section">

      <!-- ปุ่มเพิ่มสมาชิก -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div class="admin-section-title" style="margin:0">รายชื่อสมาชิก</div>
        <button class="admin-btn admin-btn-primary" onclick="adminShowAddUser()" style="padding:7px 14px">
          ➕ เพิ่มสมาชิก
        </button>
      </div>

      <!-- ฟอร์มเพิ่มสมาชิก (ซ่อนไว้ก่อน) -->
      <div id="adminAddUserForm" style="display:none;margin-bottom:20px">
        <div style="background:rgba(0,98,255,0.06);border:1px solid rgba(0,98,255,0.2);
                    border-radius:12px;padding:18px">
          <div class="admin-pw-title" style="margin-bottom:14px">➕ เพิ่มสมาชิกใหม่</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div class="admin-input-group">
              <label>ชื่อ-นามสกุล / ชื่อผู้ใช้งาน</label>
              <input class="admin-input" id="newUserName" placeholder="เช่น นายสมชาย ใจดี">
            </div>
            <div class="admin-input-group">
              <label>Username (ใช้ Login)</label>
              <input class="admin-input" id="newUserUname" placeholder="เช่น user001" autocomplete="off">
            </div>
            <div class="admin-input-group">
              <label>Password</label>
              <input type="password" class="admin-input" id="newUserPass" placeholder="รหัสผ่าน" autocomplete="off">
            </div>
            <div class="admin-input-group">
              <label>บทบาท (Role)</label>
              <select class="admin-input" id="newUserRole">
                <option value="user">👤 ผู้ใช้ทั่วไป</option>
                <option value="contractor">👷 ผู้รับจ้าง / ช่าง</option>
                <option value="admin">👑 ผู้ดูแลระบบ</option>
              </select>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:4px">
            <button class="admin-btn admin-btn-success" onclick="adminAddUser()" style="flex:1;justify-content:center">
              ✅ บันทึกสมาชิก
            </button>
            <button class="admin-btn admin-btn-ghost" onclick="adminHideAddUser()">ยกเลิก</button>
          </div>
        </div>
      </div>

      <!-- ตารางสมาชิก -->
      <div id="adminUserTable"></div>
    </div>

    <!-- ══ TAB: LOG ══ -->
    <div id="adminSec_log" class="admin-section">
      <div class="admin-section-title">
        กิจกรรมล่าสุด
        <button class="admin-btn admin-btn-ghost" style="margin-left:auto;padding:4px 10px;font-size:0.7rem"
                onclick="adminClearLog()">ล้าง Log</button>
      </div>
      <div class="admin-log" id="adminLogList" style="max-height:none; min-height:200px">
        <div class="admin-log-item"><span class="admin-log-msg">กำลังโหลด...</span></div>
      </div>
    </div>

  </div>
</div>`;
  }

  // ── Populate Stats ────────────────────────────────────────────
  function _populateStats() {
    const grid = document.getElementById('adminStatsGrid');
    if (!grid) return;

    // ดึงข้อมูลจาก global allData
    const rows = (typeof allData !== 'undefined') ? allData : [];
    const total = rows.length;

    // นับผู้รับจ้างไม่ซ้ำ
    const contractors = new Set(rows.map(r => (r[2]||'').trim()).filter(Boolean)).size;

    // นับงานปีงบฯปัจจุบัน
    const now = new Date();
    const fyStart = now.getMonth() >= 9
      ? new Date(now.getFullYear(), 9, 1)
      : new Date(now.getFullYear() - 1, 9, 1);
    const thisFY = rows.filter(r => {
      if (!r[1]) return false;
      const d = new Date(r[1]);
      return d >= fyStart && d <= now;
    }).length;

    // LS size
    let lsBytes = 0;
    try {
      for (const k of Object.keys(localStorage)) {
        lsBytes += (localStorage.getItem(k)||'').length * 2;
      }
    } catch {}
    const lsKB = (lsBytes / 1024).toFixed(1);
    const lsPct = Math.min((lsBytes / (5 * 1024 * 1024)) * 100, 100).toFixed(1);

    grid.innerHTML = `
      <div class="admin-stat accent-gold">
        <div class="admin-stat-ico">📦</div>
        <div class="admin-stat-val">${total.toLocaleString()}</div>
        <div class="admin-stat-label">รายการทั้งหมด</div>
      </div>
      <div class="admin-stat accent-cyan">
        <div class="admin-stat-ico">👷</div>
        <div class="admin-stat-val">${contractors}</div>
        <div class="admin-stat-label">ผู้รับจ้าง</div>
      </div>
      <div class="admin-stat accent-green">
        <div class="admin-stat-ico">📅</div>
        <div class="admin-stat-val">${thisFY.toLocaleString()}</div>
        <div class="admin-stat-label">งานปีงบฯ นี้</div>
      </div>
      <div class="admin-stat accent-red">
        <div class="admin-stat-ico">💾</div>
        <div class="admin-stat-val">${lsKB}</div>
        <div class="admin-stat-label">KB ใน localStorage</div>
      </div>`;

    // LS bar
    const bar = document.getElementById('adminLsBar');
    const lbl = document.getElementById('adminLsSize');
    if (bar) setTimeout(() => { bar.style.width = lsPct + '%'; }, 100);
    if (lbl) lbl.textContent = `${lsKB} KB / 5120 KB (${lsPct}%)`;

    // Session info
    const si = document.getElementById('adminSessionInfo');
    if (si) {
      try {
        const s = typeof getCurrentUser === 'function' ? (getCurrentUser() || {}) : {};
        si.innerHTML = `
          <div class="admin-log-item"><span class="admin-log-time">User</span><span class="admin-log-msg ok">${escapeHTML(s.user||'—')}</span></div>
          <div class="admin-log-item"><span class="admin-log-time">Role</span><span class="admin-log-msg warn">${escapeHTML(s.role||'—')}</span></div>`;
      } catch { si.textContent = '—'; }
    }
  }

  // ── Populate DB Section ───────────────────────────────────────
  function _populateDBSection() {
    adminCheckDB();
  }

  // ── Admin Actions ─────────────────────────────────────────────

  window.adminImportFile = function () {
    closeAdminPanel();
    _addLog('เปิดหน้าต่างนำเข้าไฟล์', 'info');
    // trigger file input (same as click on dropzone)
    setTimeout(() => {
      const fi = document.getElementById('fileInput');
      if (fi) fi.click();
      else if (typeof pwShowModal === 'function') {
        // trigger password modal
        const zone = document.getElementById('dropZone');
        if (zone) zone.click();
      }
    }, 350);
  };

  window.adminExportExcel = function () {
    _addLog('ส่งออก Excel', 'info');
    closeAdminPanel();
    setTimeout(() => {
      if (typeof exportTableExcel === 'function') exportTableExcel();
      else adminToast('ฟังก์ชัน exportTableExcel ไม่พร้อม', 'err');
    }, 350);
  };

  window.adminExportPDF = function () {
    _addLog('ส่งออก PDF', 'info');
    closeAdminPanel();
    setTimeout(() => {
      if (typeof exportTablePDF === 'function') exportTablePDF();
      else adminToast('ฟังก์ชัน exportTablePDF ไม่พร้อม', 'err');
    }, 350);
  };

  window.adminExportSQL = function () {
    _addLog('ส่งออก SQL', 'info');
    closeAdminPanel();
    setTimeout(() => {
      const rows = (typeof allData !== 'undefined') ? allData : [];
      if (typeof exportSQL === 'function') exportSQL(rows, 'admin_export', true);
      else adminToast('ฟังก์ชัน exportSQL ไม่พร้อม', 'err');
    }, 350);
  };

  window.adminRefreshData = function () {
    _addLog('โหลดข้อมูลใหม่จาก MySQL...', 'info');
    if (typeof lsBootData === 'function') {
      lsBootData();
      adminToast('กำลังโหลดข้อมูลใหม่...', 'info', 2000);
      setTimeout(() => {
        const rows = (typeof allData !== 'undefined') ? allData : [];
        _addLog(`โหลดสำเร็จ — ${rows.length} รายการ`, 'ok');
        adminToast(`โหลดสำเร็จ — ${rows.length} รายการ`, 'ok');
      }, 2500);
    }
  };

  window.adminEditTicker = function () {
    closeAdminPanel();
    setTimeout(() => {
      if (typeof tickerMsgModal === 'function') tickerMsgModal();
    }, 350);
  };

  window.adminClearData = function () {
    closeAdminPanel();
    setTimeout(() => {
      if (typeof pwClearData === 'function') pwClearData();
    }, 350);
    _addLog('เรียกใช้ฟังก์ชันล้างข้อมูล', 'warn');
  };

  window.adminCheckDB = async function () {
    const statusEl = document.getElementById('adminDbStatus');
    const logEl    = document.getElementById('adminDbLog');
    if (statusEl) statusEl.innerHTML = '⏳ กำลังตรวจสอบ...';
    if (logEl) logEl.innerHTML = '<div class="admin-log-item"><span class="admin-log-msg info">กำลังเรียก api/status.php...</span></div>';

    try {
      const API = (typeof API_BASE !== 'undefined') ? API_BASE : './api';
      const data = (typeof supabaseGetStatus === 'function')
        ? await supabaseGetStatus()
        : await (await fetch(`${API}/status.php`, { cache:'no-store' })).json();
      if (data.ok !== false) {
        const rows = data.total_rows ?? '?';
        if (statusEl) statusEl.className = 'admin-info-box';
        const dbType = (typeof supabaseGetStatus === 'function') ? 'Supabase' : 'MySQL';
        if (statusEl) statusEl.innerHTML = `✅ เชื่อมต่อ ${dbType} สำเร็จ &nbsp;·&nbsp; มีข้อมูล <strong>${rows}</strong> รายการ`;
        if (logEl) logEl.innerHTML = `
          <div class="admin-log-item"><span class="admin-log-time">${new Date().toTimeString().slice(0,8)}</span><span class="admin-log-msg ok">Connection OK</span></div>
          <div class="admin-log-item"><span class="admin-log-time">rows</span><span class="admin-log-msg info">${rows}</span></div>
          <div class="admin-log-item"><span class="admin-log-time">raw</span><span class="admin-log-msg">${JSON.stringify(data).slice(0,120)}</span></div>`;
        _addLog(`DB OK — ${rows} rows`, 'ok');
      } else {
        throw new Error(data.error || 'ok:false');
      }
    } catch(e) {
      if (statusEl) { statusEl.className = 'admin-danger-box'; statusEl.innerHTML = `❌ เชื่อมต่อ MySQL ไม่ได้<br><small>${e.message}</small>`; }
      if (logEl) logEl.innerHTML = `<div class="admin-log-item"><span class="admin-log-msg err">${e.message}</span></div>`;
      _addLog(`DB Error: ${e.message}`, 'err');
    }
  };

  window.adminSyncToMySQL = async function () {
    const rows = (typeof allData !== 'undefined') ? allData : [];
    if (!rows.length) { adminToast('ไม่มีข้อมูลใน localStorage', 'warn'); return; }
    _addLog(`Sync ${rows.length} rows → MySQL`, 'info');
    adminToast(`กำลัง Sync ${rows.length} รายการ...`, 'info', 2500);

    try {
      const API = (typeof API_BASE !== 'undefined') ? API_BASE : './api';
      const data = await (await fetch(`${API}/save_rows.php`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ fileName: 'admin_sync', rows }),
          })).json();
      if (data.ok) {
        adminToast(`Sync สำเร็จ — เพิ่ม ${data.added} รายการ ซ้ำ ${data.dup}`, 'ok');
        _addLog(`Sync OK — added:${data.added} dup:${data.dup} total:${data.total_in_db}`, 'ok');
        const logEl = document.getElementById('adminDbLog');
        if (logEl) logEl.innerHTML = `
          <div class="admin-log-item"><span class="admin-log-msg ok">Sync สำเร็จ — เพิ่ม ${data.added} / ซ้ำ ${data.dup} / รวม ${data.total_in_db}</span></div>`;
      } else { throw new Error(data.error || 'save failed'); }
    } catch(e) {
      adminToast(`Sync ล้มเหลว: ${e.message}`, 'err');
      _addLog(`Sync Error: ${e.message}`, 'err');
    }
  };

  window.adminLoadFromMySQL = async function () {
    _addLog('โหลดข้อมูลจาก MySQL', 'info');
    if (typeof lsBootData === 'function') {
      lsBootData();
      adminToast('กำลังโหลดจาก MySQL...', 'info', 2000);
      setTimeout(() => _addLog('โหลดจาก MySQL เสร็จ', 'ok'), 2000);
    }
  };

  window.adminToggleSetting = function (key, val) {
    try {
      const cfg = JSON.parse(localStorage.getItem('kppl_admin_cfg') || '{}');
      cfg[key] = val;
      localStorage.setItem('kppl_admin_cfg', JSON.stringify(cfg));
    } catch {}
    _addLog(`ตั้งค่า ${key} = ${val}`, 'info');
    adminToast(`${key} = ${val ? 'เปิด' : 'ปิด'}`, 'ok', 1500);
  };

  window.adminChangePW = function () {
    adminToast('ระบบใช้สิทธิ์ Admin จาก server แล้ว ไม่มีรหัส Import แยก', 'info');
  };

  window.adminSaveTicker = function () {
    const raw = (document.getElementById('adminTickerText')?.value || '').trim();
    if (!raw) { adminToast('กรุณากรอกข้อความ Ticker', 'warn'); return; }

    // แยกข้อความด้วย |
    const msgs = raw.split('|').map(s => s.trim()).filter(Boolean);
    try {
      localStorage.setItem('kppl_custom_msgs', JSON.stringify(msgs));
      _addLog(`บันทึก Ticker ${msgs.length} ข้อความ`, 'ok');
      adminToast(`บันทึก Ticker ${msgs.length} ข้อความ`, 'ok');
      // reload ticker ถ้า buildTicker พร้อม
      if (typeof buildTicker === 'function' && typeof allData !== 'undefined') {
        buildTicker(allData);
      }
    } catch(e) { adminToast('บันทึกไม่สำเร็จ', 'err'); }
  };

  window.adminClearLog = function () {
    _log.length = 0;
    _renderLog();
    adminToast('ล้าง Log แล้ว', 'ok', 1500);
  };

  // ── Add Admin Trigger Button to Header ───────────────────────
  function _addAdminButton() {
    if (!isAdmin()) return;
    if (document.getElementById('adminTriggerBtn')) return;
    const target = document.querySelector('.header-right .clock-block');
    if (!target) return;

    const btn = document.createElement('button');
    btn.id = 'adminTriggerBtn';
    btn.className = 'admin-trigger';
    btn.innerHTML = '<span class="admin-crown">👑</span> Admin';
    btn.onclick = openAdminPanel;
    target.parentNode.insertBefore(btn, target);
  }

  // ── Load Ticker text into settings field ─────────────────────
  function _loadTickerToForm() {
    try {
      const raw = localStorage.getItem('kppl_custom_msgs');
      if (!raw) return;
      const msgs = JSON.parse(raw);
      const el = document.getElementById('adminTickerText');
      if (el) el.value = msgs.join(' | ');
    } catch {}
  }

  // ── Init ─────────────────────────────────────────────────────
  // รอให้ login เสร็จก่อน แล้วค่อยเพิ่มปุ่ม
  const _origShowApp = window.showApp;
  document.addEventListener('DOMContentLoaded', function () {
    // ถ้า isAdmin ตั้งแต่ต้น (มี session อยู่แล้ว)
    setTimeout(_addAdminButton, 700);
  });

  // Hook หลัง showApp ถูกเรียก
  const _checkAfterLogin = setInterval(function () {
    if (isAdmin() && document.getElementById('mainApp') &&
        document.getElementById('mainApp').style.display !== 'none') {
      _addAdminButton();
      clearInterval(_checkAfterLogin);
    }
  }, 500);

  // Expose สำหรับ login.js ที่จะเรียกหลัง showApp
  window._adminInit = _addAdminButton;

})();

const _getUsers = () => window._getUsers ? window._getUsers() : [];

// ════════════════════════════════════════════════════════════════
//  MEMBER MANAGEMENT
// ════════════════════════════════════════════════════════════════

window.adminRenderUsers = async function () {
  const el = document.getElementById('adminUserTable');
  if (!el) return;

  el.innerHTML = '<div class="admin-info-box">กำลังโหลดรายชื่อสมาชิก...</div>';

  try {
    const data = await (await fetch('/api/users', { cache: 'no-store' })).json();
    if (!data.success) {
      el.innerHTML = `<div class="admin-info-box">${data.error || 'โหลดข้อมูลล้มเหลว'}</div>`;
      return;
    }
    const users = data.users || [];
    window.cachedUsers = users;

    if (!users.length) {
      el.innerHTML = '<div class="admin-info-box">ยังไม่มีสมาชิก</div>';
      return;
    }

    const rows = users.map((u, i) => {
      let roleTag = '';
      if (u.role === 'admin') {
        roleTag = `<span style="background:linear-gradient(135deg,#ffb400,#ff6400);color:#000;border-radius:5px;
                 padding:2px 8px;font-size:0.68rem;font-weight:800;letter-spacing:0.06em">👑 ADMIN</span>`;
      } else if (u.role === 'contractor') {
        roleTag = `<span style="background:rgba(168,85,247,0.15);color:#c084fc;border-radius:5px;
                 padding:2px 8px;font-size:0.68rem;font-weight:600">👷 CONTRACTOR</span>`;
      } else {
        roleTag = `<span style="background:rgba(0,212,255,0.12);color:#00d4ff;border-radius:5px;
                 padding:2px 8px;font-size:0.68rem;font-weight:600">👤 USER</span>`;
      }

      const approvedTag = u.approved
        ? `<span style="color:#32c864;font-size:0.75rem">✅ อนุมัติแล้ว</span>`
        : `<span style="color:#ff7070;font-size:0.75rem">⏳ รออนุมัติ</span>`;

      const isBuiltin = (u.user === '9235');
      const actionBtns = isBuiltin
        ? `<span style="font-size:0.7rem;color:rgba(255,255,255,0.2)">ล็อก</span>`
        : `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            ${!u.approved
              ? `<button class="admin-btn admin-btn-success" style="padding:5px 10px;font-size:0.72rem"
                   onclick="adminApproveUser('${u.user}')">✅ อนุมัติ</button>`
              : `<button class="admin-btn admin-btn-ghost" style="padding:5px 10px;font-size:0.72rem"
                   onclick="adminRevokeUser('${u.user}')">🚫 ระงับ</button>`}
            
            <select class="admin-input" style="padding:4px 8px;font-size:0.72rem;width:110px;height:auto;margin:0"
                    onchange="adminChangeRole('${u.user}', this.value)">
              <option value="user" ${u.role === 'user' ? 'selected' : ''}>👤 User</option>
              <option value="contractor" ${u.role === 'contractor' ? 'selected' : ''}>👷 Contractor</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>👑 Admin</option>
            </select>

            <button class="admin-btn admin-btn-primary" style="padding:5px 10px;font-size:0.72rem;
              background:rgba(80,100,255,0.18);border:1px solid rgba(80,100,255,0.35);color:#99aaff"
              onclick="adminShowPermEditor('${u.user}')">🔐 สิทธิ์</button>
            <button class="admin-btn" style="padding:5px 10px;font-size:0.72rem;
              background:rgba(255,180,0,0.12);border:1px solid rgba(255,180,0,0.3);color:#ffcc66"
              onclick="adminResetUserPassword('${u.user}')">🔑 รีเซ็ตรหัส</button>
            <button class="admin-btn" style="padding:5px 10px;font-size:0.72rem;
              background:rgba(255,60,60,0.12);border:1px solid rgba(255,60,60,0.3);color:#ff7070"
              onclick="adminDeleteUser('${u.user}')">🗑️</button>
          </div>`;

      return `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
                    border-radius:10px;padding:14px 16px;margin-bottom:10px;
                    transition:all 0.2s" class="admin-user-row">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
                <span style="font-size:0.92rem;font-weight:700;color:#fff">${escapeHTML(u.name || u.user)}</span>
                ${roleTag}
                ${approvedTag}
              </div>
              <div style="display:flex;gap:16px;font-size:0.72rem;color:rgba(255,255,255,0.35);flex-wrap:wrap">
                <span>👤 Username: <span style="color:rgba(255,255,255,0.6);font-family:'JetBrains Mono',monospace">${escapeHTML(u.user)}</span></span>
                ${u.branch ? `<span>📍 สังกัด: <span style="color:rgba(255,255,255,0.6)">${escapeHTML(u.branch)}</span></span>` : ''}
                ${u.createdAt ? `<span>📅 ${new Date(u.createdAt).toLocaleDateString('th-TH')}</span>` : ''}
              </div>
            </div>
            <div style="flex-shrink:0">${actionBtns}</div>
          </div>
        </div>`;
    }).join('');

    const pending = users.filter(u => !u.approved).length;
    const adminCount = users.filter(u => u.role === 'admin').length;

    el.innerHTML = `
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
                    border-radius:8px;padding:8px 14px;font-size:0.75rem;color:rgba(255,255,255,0.5)">
          👥 สมาชิกทั้งหมด <strong style="color:#fff">${users.length}</strong>
        </div>
        <div style="background:rgba(255,180,0,0.08);border:1px solid rgba(255,180,0,0.2);
                    border-radius:8px;padding:8px 14px;font-size:0.75rem;color:rgba(255,180,0,0.8)">
          👑 Admin <strong>${adminCount}</strong>
        </div>
        ${pending ? `<div style="background:rgba(255,60,60,0.1);border:1px solid rgba(255,60,60,0.25);
                    border-radius:8px;padding:8px 14px;font-size:0.75rem;color:#ff9090">
          ⏳ รออนุมัติ <strong>${pending}</strong>
        </div>` : ''}
      </div>
      ${rows}`;
  } catch (err) {
    el.innerHTML = `<div class="admin-info-box">เกิดข้อผิดพลาดในการโหลดสมาชิก: ${escapeHTML(err.message)}</div>`;
  }
};

window.adminShowAddUser = function () {
  const f = document.getElementById('adminAddUserForm');
  if (f) { f.style.display = 'block'; document.getElementById('newUserName')?.focus(); }
};
window.adminHideAddUser = function () {
  const f = document.getElementById('adminAddUserForm');
  if (f) f.style.display = 'none';
  ['newUserName','newUserUname','newUserPass'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
};

window.adminAddUser = function () {
  const name  = (document.getElementById('newUserName')?.value  || '').trim();
  const uname = (document.getElementById('newUserUname')?.value || '').trim();
  const pass  = (document.getElementById('newUserPass')?.value  || '').trim();
  const role  = document.getElementById('newUserRole')?.value || 'user';

  if (!uname) { adminToast('กรุณากรอก Username', 'warn'); return; }
  if (!pass)  { adminToast('กรุณากรอก Password', 'warn'); return; }

  const regPromise = fetch('/api/users?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: name || uname,
          last_name: '-',
          employee_id: uname,
          branch: 'กปภ.สาขาพิษณุโลก',
          password: pass,
          role: role
        })
      }).then(r => r.json());

  regPromise
  .then(res => {
    if (res.success) {
      adminRenderUsers();
      adminHideAddUser();
      _addLog(`เพิ่มสมาชิก ${uname} (${role})`, 'ok');
      adminToast(`เพิ่มสมาชิก "${uname}" สำเร็จ`, 'ok');
    } else {
      adminToast(res.error || 'เพิ่มสมาชิกล้มเหลว', 'err');
    }
  })
  .catch(err => {
    adminToast('เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว', 'err');
  });
};

window.adminApproveUser = function (uname) {
  const approvePromise = fetch('/api/users?action=toggle_approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: uname, approved: 1 })
      }).then(r => r.json());

  approvePromise
  .then(res => {
    if (res.success) {
      adminRenderUsers();
      _addLog(`อนุมัติสมาชิก ${uname}`, 'ok');
      adminToast(`อนุมัติ "${uname}" แล้ว`, 'ok');
    } else {
      adminToast(res.error || 'ดำเนินการล้มเหลว', 'err');
    }
  });
};

window.adminRevokeUser = function (uname) {
  const revokePromise = fetch('/api/users?action=toggle_approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: uname, approved: 0 })
      }).then(r => r.json());

  revokePromise
  .then(res => {
    if (res.success) {
      adminRenderUsers();
      _addLog(`ระงับสมาชิก ${uname}`, 'warn');
      adminToast(`ระงับ "${uname}" แล้ว`, 'warn');
    } else {
      adminToast(res.error || 'ดำเนินการล้มเหลว', 'err');
    }
  });
};

window.adminChangeRole = function (uname, newRole) {
  const rolePromise = fetch('/api/users?action=change_role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: uname, role: newRole })
      }).then(r => r.json());

  rolePromise
  .then(res => {
    if (res.success) {
      adminRenderUsers();
      const msg = `เปลี่ยน Role "${uname}" เป็น ${newRole}`;
      _addLog(msg, newRole === 'admin' ? 'warn' : 'info');
      adminToast(msg, 'ok');
    } else {
      adminToast(res.error || 'เปลี่ยน Role ล้มเหลว', 'err');
    }
  });
};

window.adminResetUserPassword = function (uname) {
  const password = prompt(`กำหนดรหัสผ่านใหม่สำหรับ "${uname}"\nอย่างน้อย 12 ตัวอักษร`);
  if (password === null) return;
  if (password.length < 12) {
    adminToast('รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร', 'warn');
    return;
  }
  const confirmation = prompt('กรอกรหัสผ่านใหม่ซ้ำอีกครั้ง');
  if (confirmation !== password) {
    adminToast('รหัสผ่านทั้งสองครั้งไม่ตรงกัน', 'err');
    return;
  }

  fetch('/api/users?action=reset_password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_id: uname, password })
  })
  .then(async response => {
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'รีเซ็ตรหัสผ่านไม่สำเร็จ');
    _addLog(`รีเซ็ตรหัสผ่าน ${uname}`, 'warn');
    adminToast(`รีเซ็ตรหัสผ่าน "${uname}" แล้ว`, 'ok');
  })
  .catch(error => adminToast(error.message || 'รีเซ็ตรหัสผ่านไม่สำเร็จ', 'err'));
};

window.adminDeleteUser = function (uname) {
  if (!confirm(`ยืนยันลบสมาชิก "${uname}" ออกจากระบบ?`)) return;
  const deletePromise = fetch('/api/users?action=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: uname })
      }).then(r => r.json());

  deletePromise
  .then(res => {
    if (res.success) {
      adminRenderUsers();
      _addLog(`ลบสมาชิก ${uname}`, 'warn');
      adminToast(`ลบ "${uname}" แล้ว`, 'warn');
    } else {
      adminToast(res.error || 'ลบสมาชิกล้มเหลว', 'err');
    }
  });
};

// ════════════════════════════════════════════════════════════════
//  PERMISSION SYSTEM — กำหนดสิทธิ์การมองเห็นส่วนต่างๆ
// ════════════════════════════════════════════════════════════════

const PERM_STORE = 'kppl_permissions';

// ── Section definitions ───────────────────────────────────────
const SECTIONS = [
  { id:'import',      label:'📥 นำเข้าข้อมูล',              desc:'แถบอัพโหลดไฟล์ Excel/CSV' },
  { id:'stats',       label:'📊 ภาพรวมระบบ (KPI Cards)',    desc:'การ์ดสถิติ 4 ใบด้านบน' },
  { id:'kpi',         label:'🎯 ตัวชี้วัด KPI ปีงบฯ',       desc:'Banner ปีงบฯ + KPI Bar' },
  { id:'team',        label:'👷 เป้าหมายรายทีม',             desc:'การ์ดช่างแต่ละคน' },
  { id:'analysis',    label:'📈 วิเคราะห์เชิงลึก',           desc:'Forecast + YoY Comparison' },
  { id:'ai',          label:'🤖 AI วิเคราะห์',               desc:'แผง AI วิเคราะห์ข้อมูล' },
  { id:'leaderboard', label:'🏆 อันดับการปิดงาน',            desc:'Top ช่างเร็ว/ช้า' },
  { id:'grandtotal',  label:'📊 ยอดรวมเอกสารทั้งหมด',       desc:'Counter รวมทุกปีงบฯ' },
  { id:'charts',      label:'📉 กราฟวิเคราะห์',              desc:'Trend, ช่าง, รายวัน, Aging, Stacked' },
  { id:'teamcharts',  label:'📋 Trend รายทีม',               desc:'ปริมาณงานรายทีม + ความคืบหน้า' },
  { id:'table',       label:'📋 ตารางรายการเอกสาร',          desc:'ตารางข้อมูลทั้งหมด + ค้นหา + Export' },
];

// ── Permission helpers ────────────────────────────────────────
function _getPerms() {
  try {
    const raw = localStorage.getItem(PERM_STORE);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function _savePerms(p) {
  localStorage.setItem(PERM_STORE, JSON.stringify(p));
}

/** คืน default permissions สำหรับ role */
function _defaultPerms(role) {
  // admin เห็นทุกอย่าง, user เห็นทุกอย่างยกเว้น import
  const all = SECTIONS.map(s => s.id);
  if (role === 'admin') return all;
  return all.filter(s => s !== 'import');
}

/** คืน array ของ section IDs ที่ user คนนี้มีสิทธิ์ */
function _userPerms(uname) {
  const perms = _getPerms();
  if (perms[uname] !== undefined) return perms[uname];
  // fallback: ดึง role จาก user store
  const users = _getUsers();
  const u = users.find(x => x.user === uname);
  return _defaultPerms(u?.role || 'user');
}

/** apply permissions — ซ่อน/แสดง elements พร้อม smooth transition */
window.applyPermissions = function () {
  try {
    const sess = typeof getCurrentUser === 'function' ? (getCurrentUser() || {}) : {};
    const uname = sess.user;
    if (!uname) return;

    const allowed = _userPerms(uname);

    // group elements by section to hide entire section at once
    const secMap = {};
    document.querySelectorAll('[data-section]').forEach(el => {
      const sec = el.getAttribute('data-section');
      if (!secMap[sec]) secMap[sec] = [];
      secMap[sec].push(el);
    });

    Object.keys(secMap).forEach(sec => {
      const show = allowed.includes(sec);
      secMap[sec].forEach(el => {
        el.style.transition = 'opacity 0.3s, transform 0.3s';
        if (show) {
          el.style.display   = '';
          el.style.opacity   = '0';
          el.style.transform = 'translateY(8px)';
          requestAnimationFrame(() => {
            el.style.opacity   = '1';
            el.style.transform = '';
          });
        } else {
          el.style.display = 'none';
        }
      });
    });

    console.log('[PERM]', uname, '→ allowed:', allowed.join(', '));
  } catch(e) {
    console.warn('[PERM] applyPermissions error:', e.message);
  }
};

// ════════════════════════════════════════════════════════════════
//  ADMIN UI — TAB "สิทธิ์" ใน Members section
// ════════════════════════════════════════════════════════════════

window.adminShowPermEditor = function (uname) {
  const allowed = _userPerms(uname);
  const users   = _getUsers();
  const u       = users.find(x => x.user === uname) || {};

  let existing = document.getElementById('permModal');
  if (existing) existing.remove();

  // จัดกลุ่ม sections
  const GROUPS = [
    { group: '📥 นำเข้า & จัดการ', color: '#0062ff',
      items: ['import'] },
    { group: '📊 Dashboard & KPI', color: '#00c864',
      items: ['stats','kpi','grandtotal'] },
    { group: '👷 ทีม & บุคคล', color: '#ffb400',
      items: ['team','leaderboard'] },
    { group: '📈 กราฟ & วิเคราะห์', color: '#ff6b35',
      items: ['charts','teamcharts','analysis'] },
    { group: '🤖 AI & ตาราง', color: '#a855f7',
      items: ['ai','table'] },
  ];

  const secMap = {};
  SECTIONS.forEach(s => { secMap[s.id] = s; });

  const modal = document.createElement('div');
  modal.id = 'permModal';
  modal.style.cssText = `position:fixed;inset:0;z-index:9500;
    background:rgba(5,13,26,0.92);backdrop-filter:blur(10px);
    display:flex;align-items:center;justify-content:center;padding:16px;
    animation:adminOverlayIn 0.25s ease`;

  modal.innerHTML = `
    <div style="background:linear-gradient(180deg,#0d1b35,#080f1e);
                border:1px solid rgba(255,180,0,0.18);border-radius:20px;
                width:600px;max-width:100%;max-height:92vh;overflow:hidden;
                display:flex;flex-direction:column;
                box-shadow:0 40px 100px rgba(0,0,0,0.7);
                animation:cardIn 0.3s cubic-bezier(0.22,1,0.36,1)">

      <!-- Header -->
      <div style="padding:22px 24px 18px;border-bottom:1px solid rgba(255,255,255,0.06);
                  background:linear-gradient(135deg,rgba(255,180,0,0.07),transparent);flex-shrink:0">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:1.05rem;font-weight:700;color:#fff;
                        display:flex;align-items:center;gap:10px;margin-bottom:6px">
              🔐 กำหนดสิทธิ์การมองเห็น
              <span style="font-family:'JetBrains Mono',monospace;font-size:0.78rem;
                           background:rgba(0,212,255,0.12);color:#00d4ff;
                           border-radius:6px;padding:2px 10px">${uname}</span>
              ${u.role==='admin'
                ? '<span style="font-size:0.68rem;background:linear-gradient(135deg,#ffb400,#ff6400);color:#000;border-radius:4px;padding:2px 7px;font-weight:800">👑 ADMIN</span>'
                : '<span style="font-size:0.68rem;background:rgba(0,212,255,0.15);color:#00d4ff;border-radius:4px;padding:2px 7px">👤 USER</span>'}
            </div>
            <div style="font-size:0.75rem;color:rgba(255,255,255,0.35)">${u.name||uname}</div>
          </div>
          <button onclick="document.getElementById('permModal').remove()"
            style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
                   color:rgba(255,255,255,0.5);border-radius:8px;width:34px;height:34px;
                   cursor:pointer;font-size:16px;flex-shrink:0">✕</button>
        </div>

        <!-- Quick actions -->
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
          <button onclick="permSelectAll('${uname}',true)"
            style="background:rgba(50,200,100,0.12);border:1px solid rgba(50,200,100,0.25);
                   color:#32c864;border-radius:8px;padding:6px 14px;cursor:pointer;
                   font-family:'Kanit',sans-serif;font-size:0.75rem;font-weight:600">
            ✅ เปิดทั้งหมด</button>
          <button onclick="permSelectAll('${uname}',false)"
            style="background:rgba(255,60,60,0.1);border:1px solid rgba(255,60,60,0.25);
                   color:#ff7070;border-radius:8px;padding:6px 14px;cursor:pointer;
                   font-family:'Kanit',sans-serif;font-size:0.75rem;font-weight:600">
            ❌ ปิดทั้งหมด</button>
          <button onclick="permReset('${uname}')"
            style="background:rgba(255,180,0,0.1);border:1px solid rgba(255,180,0,0.25);
                   color:#ffb400;border-radius:8px;padding:6px 14px;cursor:pointer;
                   font-family:'Kanit',sans-serif;font-size:0.75rem;font-weight:600">
            🔄 ค่าเริ่มต้น</button>
          <div style="margin-left:auto;font-size:0.72rem;color:rgba(255,255,255,0.3);
                      display:flex;align-items:center;gap:6px">
            <span id="permCountLabel">${allowed.length}/${SECTIONS.length} ส่วน</span>
          </div>
        </div>
      </div>

      <!-- Body — scrollable -->
      <div style="flex:1;overflow-y:auto;padding:20px 24px;
                  scrollbar-width:thin;scrollbar-color:rgba(255,180,0,0.2) transparent">
        ${GROUPS.map(g => `
          <div style="margin-bottom:20px">
            <!-- Group header -->
            <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.14em;
                        text-transform:uppercase;color:${g.color};opacity:0.8;
                        margin-bottom:10px;display:flex;align-items:center;gap:8px">
              ${g.group}
              <div style="flex:1;height:1px;background:linear-gradient(90deg,${g.color}33,transparent)"></div>
            </div>
            <!-- Items -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              ${g.items.map(sid => {
                const sec = secMap[sid];
                if (!sec) return '';
                const isOn = allowed.includes(sid);
                return `
                <label id="permCard_${uname}_${sid}"
                  style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;
                         border-radius:10px;cursor:pointer;transition:all 0.15s;
                         border:1.5px solid ${isOn ? g.color+'55' : 'rgba(255,255,255,0.06)'};
                         background:${isOn ? g.color+'12' : 'rgba(255,255,255,0.025)'}"
                  onclick="permToggleCard('${uname}','${sid}','${g.color}')">
                  <div style="width:18px;height:18px;border-radius:5px;flex-shrink:0;margin-top:1px;
                               border:2px solid ${isOn ? g.color : 'rgba(255,255,255,0.2)'};
                               background:${isOn ? g.color : 'transparent'};
                               display:flex;align-items:center;justify-content:center;
                               transition:all 0.15s;font-size:11px"
                       id="permBox_${uname}_${sid}">
                    ${isOn ? '✓' : ''}
                  </div>
                  <input type="checkbox" id="perm_${uname}_${sid}"
                         ${isOn ? 'checked' : ''} style="display:none">
                  <div style="flex:1;min-width:0">
                    <div style="font-size:0.82rem;font-weight:600;
                                color:${isOn ? '#fff' : 'rgba(255,255,255,0.45)'};
                                transition:color 0.15s">${sec.label}</div>
                    <div style="font-size:0.68rem;color:rgba(255,255,255,0.28);
                                margin-top:2px;line-height:1.4">${sec.desc}</div>
                  </div>
                </label>`;
              }).join('')}
            </div>
          </div>`).join('')}
      </div>

      <!-- Footer -->
      <div style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);
                  display:flex;gap:10px;flex-shrink:0;
                  background:rgba(0,0,0,0.2)">
        <button onclick="permSave('${uname}')"
          style="flex:1;background:linear-gradient(135deg,#0062ff,#00b4ff);
                 border:none;border-radius:10px;color:#fff;padding:13px;cursor:pointer;
                 font-family:'Kanit',sans-serif;font-size:0.9rem;font-weight:700;
                 box-shadow:0 6px 20px rgba(0,98,255,0.35);transition:all 0.2s">
          💾 บันทึกสิทธิ์
        </button>
        <button onclick="document.getElementById('permModal').remove()"
          style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
                 border-radius:10px;color:rgba(255,255,255,0.5);padding:13px 20px;
                 cursor:pointer;font-family:'Kanit',sans-serif;font-size:0.88rem">
          ยกเลิก
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);
};


window.permSelectAll = function (uname, val) {
  SECTIONS.forEach(sec => {
    const cb   = document.getElementById(`perm_${uname}_${sec.id}`);
    const box  = document.getElementById(`permBox_${uname}_${sec.id}`);
    const card = document.getElementById(`permCard_${uname}_${sec.id}`);
    if (cb) cb.checked = val;
    if (box)  { box.innerHTML = val ? '✓' : ''; }
  });
  _permUpdateCount(uname);
};

window.permToggleCard = function (uname, sid, color) {
  const cb   = document.getElementById(`perm_${uname}_${sid}`);
  const box  = document.getElementById(`permBox_${uname}_${sid}`);
  const card = document.getElementById(`permCard_${uname}_${sid}`);
  if (!cb) return;
  cb.checked = !cb.checked;
  const on = cb.checked;
  if (box) {
    box.innerHTML = on ? '✓' : '';
    box.style.background     = on ? color : 'transparent';
    box.style.borderColor    = on ? color : 'rgba(255,255,255,0.2)';
  }
  if (card) {
    card.style.borderColor   = on ? color+'55' : 'rgba(255,255,255,0.06)';
    card.style.background    = on ? color+'12' : 'rgba(255,255,255,0.025)';
    // text color
    const label = card.querySelector('div > div:first-child');
    if (label) label.style.color = on ? '#fff' : 'rgba(255,255,255,0.45)';
  }
  _permUpdateCount(uname);
};

function _permUpdateCount(uname) {
  const total = SECTIONS.length;
  const on = SECTIONS.filter(s => document.getElementById(`perm_${uname}_${s.id}`)?.checked).length;
  const el = document.getElementById('permCountLabel');
  if (el) el.textContent = `${on}/${total} ส่วน`;
}

window.permReset = function (uname) {
  const users = _getUsers();
  const u = users.find(x => x.user === uname) || {};
  const defaults = _defaultPerms(u.role || 'user');
  SECTIONS.forEach(s => {
    const cb = document.getElementById(`perm_${uname}_${s.id}`);
    if (cb) cb.checked = defaults.includes(s.id);
  });
};

window.permSave = function (uname) {
  const allowed = SECTIONS
    .filter(s => document.getElementById(`perm_${uname}_${s.id}`)?.checked)
    .map(s => s.id);
  const perms = _getPerms();
  perms[uname] = allowed;
  _savePerms(perms);

  document.getElementById('permModal')?.remove();
  _addLog(`บันทึกสิทธิ์ ${uname} — ${allowed.length}/${SECTIONS.length} ส่วน`, 'ok');
  adminToast(`บันทึกสิทธิ์ "${uname}" แล้ว`, 'ok');

  // ถ้า user คนนั้น login อยู่ → apply ทันที
  try {
    const sess = typeof getCurrentUser === 'function' ? (getCurrentUser() || {}) : {};
    if (sess.user === uname) applyPermissions();
  } catch {}
};

// ════════════════════════════════════════════════════════════════
//  AUTO SYNC — Admin Panel Functions
// ════════════════════════════════════════════════════════════════

const SYNC_SOURCE_LABELS = {
  mock:     { icon:'🎭', label:'MOCK (จำลอง)',  color:'rgba(255,180,0,0.8)' },
  rest_api: { icon:'🌐', label:'REST API',       color:'rgba(0,212,255,0.8)' },
  erp_db:   { icon:'🏢', label:'ERP Database',   color:'rgba(50,200,100,0.8)' },
  scraper:  { icon:'🕷️', label:'Web Scraper',    color:'rgba(255,100,50,0.8)' },
  sftp:     { icon:'📁', label:'SFTP/FTP',        color:'rgba(160,100,255,0.8)' },
};

window.adminLoadSyncStatus = async function () {
  const bar    = document.getElementById('syncStatusBar');
  const badge  = document.getElementById('syncSourceBadge');
  if (!bar) return;

  try {
    const API = (typeof API_BASE !== 'undefined') ? API_BASE : './api';
    const PW  = (typeof CRON_SECRET !== 'undefined') ? CRON_SECRET : '';
    // ดึง secret จาก PHP — ใช้ status.php แทนเพราะ token ไม่ expose ใน JS
    const data = (typeof supabaseGetSyncStatus === 'function')
      ? await supabaseGetSyncStatus()
      : await (await fetch(`${API}/sync_status.php?limit=5`, { cache:'no-store' })).json();

    if (!data.ok) throw new Error(data.error || 'Sync failed');

    // badge แหล่งข้อมูล
    const src = data.source?.type || 'mock';
    const si  = SYNC_SOURCE_LABELS[src] || SYNC_SOURCE_LABELS.mock;
    if (badge) {
      badge.textContent  = `${si.icon} ${si.label.toUpperCase()}`;
      badge.style.color  = si.color;
    }

    // status bar
    const last = data.last_success
      ? new Date(data.last_success).toLocaleString('th-TH')
      : 'ยังไม่เคย Sync';
    bar.className = 'admin-info-box';
    bar.innerHTML = `
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <span>✅ <strong>Sync ล่าสุด:</strong> ${last}</span>
        <span>📦 <strong>เพิ่มรวม:</strong> ${(data.total_added||0).toLocaleString()} rows</span>
        <span>🗄️ <strong>ใน DB:</strong> ${(data.db_rows||0).toLocaleString()} rows</span>
        <span>🔄 <strong>รัน:</strong> ${data.success_runs||0} ครั้ง</span>
      </div>`;

    // mini log
    adminRenderSyncLogs(data.logs || []);

  } catch(e) {
    if (bar) {
      bar.className = 'admin-warn-box';
      bar.innerHTML = `⚠️ ยังไม่ได้เชื่อมต่อ DB หรือยังไม่เคย Sync — <small>${e.message}</small>`;
    }
  }
};

window.adminRunSync = async function (mode) {
  const btnId   = mode === 'delta' ? 'syncBtnDelta' : 'syncBtnFull';
  const btn     = document.getElementById(btnId);
  const prog    = document.getElementById('syncProgress');
  const progBar = document.getElementById('syncProgressFill');
  const progLbl = document.getElementById('syncProgressLabel');
  const progPct = document.getElementById('syncProgressPct');
  const result  = document.getElementById('syncResult');

  if (btn) { btn.disabled = true; btn.textContent = '⏳ กำลังรัน...'; }
  if (prog) prog.style.display = 'block';
  if (result) result.style.display = 'none';

  // animate progress (fake — เพราะ PHP ไม่รีพอร์ต progress จริง)
  let pct = 0;
  const ticker = setInterval(() => {
    pct = Math.min(pct + Math.random() * 8, 88);
    if (progBar) progBar.style.width = pct + '%';
    if (progPct) progPct.textContent = Math.round(pct) + '%';
    if (progLbl) progLbl.textContent = pct < 30 ? 'กำลังเชื่อมต่อ API...' :
                                        pct < 60 ? 'กำลังดึงข้อมูล...' :
                                        'กำลังบันทึกลง MySQL...';
  }, 400);

  try {
    const API = (typeof API_BASE !== 'undefined') ? API_BASE : './api';
    const data = (typeof supabaseTriggerAutoFetch === 'function')
      ? await supabaseTriggerAutoFetch(mode)
      : await (await fetch(
          `${API}/auto_fetch.php?mode=${mode}`,
          { cache: 'no-store' }
        )).json();

    clearInterval(ticker);
    if (progBar) progBar.style.width = '100%';
    if (progPct) progPct.textContent = '100%';
    setTimeout(() => { if (prog) prog.style.display = 'none'; }, 800);

    if (data.ok) {
      _addLog(`Auto Sync [${mode}] ✅ เพิ่ม ${data.added} / ข้าม ${data.skipped}`, 'ok');
      adminToast(`Sync สำเร็จ — เพิ่ม ${data.added} รายการ`, 'ok');

      if (result) {
        result.style.display = 'block';
        result.innerHTML = `
          <div style="background:rgba(50,200,100,0.08);border:1px solid rgba(50,200,100,0.2);
                      border-radius:10px;padding:16px">
            <div style="font-size:0.88rem;font-weight:700;color:#32c864;margin-bottom:12px">
              ✅ Sync สำเร็จ — ${new Date().toLocaleString('th-TH')}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
              ${[
                ['📦 ดึงมา',  data.fetched,  '#fff'],
                ['✅ เพิ่มใหม่', data.added,  '#32c864'],
                ['⏭️ ซ้ำข้าม', data.skipped, 'rgba(255,255,255,0.4)'],
              ].map(([l,v,c]) => `
                <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:10px;text-align:center">
                  <div style="font-size:1.2rem;font-weight:700;color:${c}">${(v||0).toLocaleString()}</div>
                  <div style="font-size:0.68rem;color:rgba(255,255,255,0.35);margin-top:3px">${l}</div>
                </div>`).join('')}
            </div>
            ${data.errors ? `<div style="margin-top:10px;font-size:0.72rem;color:#ff9090">⚠️ มี ${data.errors} รายการที่มีปัญหา</div>` : ''}
          </div>`;

        // reload dashboard data
        if (typeof lsBootData === 'function') {
          setTimeout(() => { lsBootData(); adminToast('Dashboard อัพเดทแล้ว', 'info', 2000); }, 1500);
        }
      }
      adminLoadSyncStatus();
    } else {
      throw new Error(data.error || 'Sync failed');
    }
  } catch(e) {
    clearInterval(ticker);
    if (prog) prog.style.display = 'none';
    _addLog(`Auto Sync [${mode}] ❌ ${e.message}`, 'err');
    adminToast(`Sync ล้มเหลว: ${e.message}`, 'err', 5000);

    if (result) {
      result.style.display = 'block';
      result.innerHTML = `
        <div class="admin-danger-box">
          ❌ <strong>Sync ล้มเหลว:</strong> ${e.message}<br>
          <small style="opacity:0.7">ตรวจสอบ api/fetch_config.php และการเชื่อมต่อ</small>
        </div>`;
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = mode === 'delta' ? '▶ รัน Delta' : '▶ รัน Full'; }
  }
};

window.adminLoadSyncLogs = async function () {
  const el = document.getElementById('syncLogList');
  if (!el) return;
  el.innerHTML = '<div class="admin-log-item"><span class="admin-log-msg info">กำลังโหลด...</span></div>';

  try {
    const API = (typeof API_BASE !== 'undefined') ? API_BASE : './api';
    const data = (typeof supabaseGetSyncStatus === 'function')
      ? await supabaseGetSyncStatus()
      : await (await fetch(`${API}/sync_status.php?limit=20`, { cache:'no-store' })).json();
    adminRenderSyncLogs(data.logs || []);
  } catch(e) {
    el.innerHTML = `<div class="admin-log-item"><span class="admin-log-msg err">${e.message}</span></div>`;
  }
};

function adminRenderSyncLogs(logs) {
  const el = document.getElementById('syncLogList');
  if (!el) return;
  if (!logs.length) {
    el.innerHTML = '<div class="admin-log-item"><span class="admin-log-msg">ยังไม่มีประวัติ</span></div>';
    return;
  }
  el.innerHTML = logs.map(l => {
    const ok    = l.status === 'success';
    const time  = l.synced_at ? new Date(l.synced_at).toLocaleString('th-TH') : '—';
    const cls   = ok ? 'ok' : 'err';
    const icon  = ok ? '✅' : '❌';
    const info  = ok
      ? `+${l.rows_added} เพิ่ม · ข้าม ${l.rows_skipped} · [${l.source}]`
      : l.error_msg || 'error';
    return `
      <div class="admin-log-item">
        <span class="admin-log-time">${time}</span>
        <span class="admin-log-msg ${cls}">${icon} ${info}</span>
      </div>`;
  }).join('');
}

window.adminCopyCron = function(el) {
  const text = el.textContent.trim();
  navigator.clipboard?.writeText(text).then(() => {
    adminToast('คัดลอกแล้ว ✓', 'ok', 1500);
  }).catch(() => {
    adminToast(text, 'info', 5000);
  });
};
