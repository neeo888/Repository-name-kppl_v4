/* ═══════════════════════════════════════════════════════════════
   กปภ.พิษณุโลก — js/login.js
   Login gate: จำ session ไว้ถ้าไม่ logout
   ═══════════════════════════════════════════════════════════════ */

(function () {
  // ── Credentials — โหลดจาก localStorage (ถ้ามี) ──────────────
  const SESSION_KEY   = 'kppl_session';
  const USER_STORE    = 'kppl_users';
  const REMEMBER_KEY  = 'kppl_remember';  // เก็บ username+password ที่จำไว้

  // ── Remember Me helpers ──────────────────────────────────────
  function saveRemember(u, p) {
    try {
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({ user: u, pass: p }));
    } catch {}
  }
  function loadRemember() {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function clearRemember() {
    localStorage.removeItem(REMEMBER_KEY);
  }

  // ── default fallback ถ้ายังไม่เคย init
  const DEFAULT_USERS = [
    { user:'9235',  pass:'A19070719a', role:'admin', approved:true },
    { user:'admin', pass:'admin',      role:'user',  approved:true },
  ];

  function _getUsers() {
    try {
      const raw = localStorage.getItem(USER_STORE);
      return raw ? JSON.parse(raw) : DEFAULT_USERS;
    } catch { return DEFAULT_USERS; }
  }

  // admin.js เรียกฟังก์ชันนี้เมื่อบันทึกสมาชิกใหม่
  window._syncLoginUsers = function(users) {
    // ไม่ต้องทำอะไร — _getUsers() ดึงจาก localStorage ทุกครั้งอยู่แล้ว
  };

  // ── Check existing session ────────────────────────────────────
  function isLoggedIn() {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      if (!s) return false;
      const obj = JSON.parse(s);
      // session ไม่หมดอายุ (ไม่กำหนด expire)
      return obj && obj.ok === true;
    } catch { return false; }
  }

  function saveSession(u, role) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      ok:   true,
      at:   Date.now(),
      user: u,
      role: role || 'user',
    }));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  // ── Show/Hide UI ──────────────────────────────────────────────
  function showApp() {
    const overlay = document.getElementById('loginOverlay');
    const app     = document.getElementById('mainApp');
    if (!overlay || !app) return;
    overlay.classList.add('hide');
    app.style.display = '';
    setTimeout(() => { overlay.style.display = 'none'; }, 650);
    addLogoutButton();
  }

  function showLogin() {
    const overlay = document.getElementById('loginOverlay');
    const app     = document.getElementById('mainApp');
    if (!overlay || !app) return;
    overlay.style.display = 'flex';
    overlay.classList.remove('hide');
    app.style.display = 'none';
  }

  // ── Add logout button to header ───────────────────────────────
  function addLogoutButton() {
    if (document.getElementById('logoutBtn')) return;
    const target = document.querySelector('.header-right .clock-block');
    if (!target) return;
    const btn = document.createElement('button');
    btn.id = 'logoutBtn';
    btn.className = 'logout-btn';
    btn.innerHTML = '🚪 ออกจากระบบ';
    btn.onclick = doLogout;
    target.parentNode.insertBefore(btn, target.nextSibling);
  }

  // ── Login action ──────────────────────────────────────────────
  window.doLogin = function () {
    const userEl  = document.getElementById('loginUser');
    const passEl  = document.getElementById('loginPass');
    const btn     = document.getElementById('loginBtn');
    const errBox  = document.getElementById('loginError');
    const errMsg  = document.getElementById('loginErrorMsg');
    const fUser   = document.getElementById('loginFieldUser');
    const fPass   = document.getElementById('loginFieldPass');

    const u = (userEl.value || '').trim();
    const p = passEl.value || '';

    // clear errors
    errBox.style.display = 'none';
    fUser.classList.remove('error');
    fPass.classList.remove('error');

    // validate
    if (!u) {
      fUser.classList.add('error');
      errMsg.textContent = 'กรุณากรอกชื่อผู้ใช้';
      errBox.style.display = 'flex';
      userEl.focus();
      return;
    }
    if (!p) {
      fPass.classList.add('error');
      errMsg.textContent = 'กรุณากรอกรหัสผ่าน';
      errBox.style.display = 'flex';
      passEl.focus();
      return;
    }

    // loading state
    btn.classList.add('loading');
    btn.querySelector('.login-btn-text').textContent = 'กำลังตรวจสอบ...';

    setTimeout(() => {
      const users = _getUsers();
      const matched = users.find(x => x.user === u && x.pass === p);
      if (matched && matched.approved !== false) {
        // จดจำ หรือ ล้าง
        const rememberCb = document.getElementById('loginRemember');
        if (rememberCb && rememberCb.checked) {
          saveRemember(u, p);
        } else {
          clearRemember();
        }

        saveSession(u, matched?.role || 'user');
        showApp();
        // apply permissions หลัง login
        setTimeout(() => {
          if (typeof applyPermissions === 'function') applyPermissions();
          if (typeof _adminInit === 'function') _adminInit();
        }, 400);
      } else {
        btn.classList.remove('loading');
        btn.querySelector('.login-btn-text').textContent = 'เข้าสู่ระบบ';

        // ตรวจว่า username มีในระบบไหม
        const userExists = _getUsers().some(x => x.user === u);
        if (!userExists) {
          fUser.classList.add('error');
          userEl.value = '';
          userEl.focus();
        } else {
          fPass.classList.add('error');
          passEl.value = '';
          passEl.focus();
        }

        const revoked = _getUsers().find(x => x.user === u && x.pass === p && x.approved === false);
        errMsg.textContent = revoked
          ? '⛔ บัญชีนี้ถูกระงับ — กรุณาติดต่อผู้ดูแลระบบ'
          : 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        errBox.style.display = 'flex';
      }
    }, 600); // delay เล็กน้อยให้รู้สึก responsive
  };

  // ── Logout action ─────────────────────────────────────────────
  window.doLogout = function () {
    clearSession();
    // reset fields
    const u = document.getElementById('loginUser');
    const p = document.getElementById('loginPass');
    if (u) u.value = '';
    if (p) p.value = '';
    showLogin();
  };

  // ── Toggle password visibility ────────────────────────────────
  window.toggleLoginPass = function (btn) {
    const inp = btn.previousElementSibling;
    if (!inp) return;
    if (inp.type === 'password') {
      inp.type = 'text';
      btn.textContent = '🙈';
    } else {
      inp.type = 'password';
      btn.textContent = '👁';
    }
  };

  // ── Enter key support ─────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    const overlay = document.getElementById('loginOverlay');
    if (!overlay || overlay.style.display === 'none') return;
    doLogin();
  });

  // ── Boot: check session + fill remembered credentials ─────────
  document.addEventListener('DOMContentLoaded', function () {
    if (isLoggedIn()) {
      showApp();
      setTimeout(() => {
        if (typeof applyPermissions === 'function') applyPermissions();
        if (typeof _adminInit === 'function') _adminInit();
      }, 500);
    } else {
      showLogin();
      // เติม username/password ที่จำไว้
      const mem = loadRemember();
      if (mem) {
        const uEl = document.getElementById('loginUser');
        const pEl = document.getElementById('loginPass');
        const cb  = document.getElementById('loginRemember');
        if (uEl) uEl.value = mem.user || '';
        if (pEl) pEl.value = mem.pass || '';
        if (cb)  cb.checked = true;
      }
    }
  });

})();
