/* ═══════════════════════════════════════════════════════════════
   กปภ.พิษณุโลก — js/login.js
   Login & Registration Gate via Local MySQL Database
   ═══════════════════════════════════════════════════════════════ */

(function () {
  const SESSION_KEY   = 'kppl_session';
  const REMEMBER_KEY  = 'kppl_remember';

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

  // ── Check existing session ────────────────────────────────────
  function isLoggedIn() {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      if (!s) return false;
      const obj = JSON.parse(s);
      return obj && obj.ok === true;
    } catch { return false; }
  }

  function saveSession(u, role, branch, name) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      ok:     true,
      at:     Date.now(),
      user:   u,
      role:   role || 'user',
      branch: branch || '',
      name:   name || ''
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

  // ── Tab switcher ──────────────────────────────────────────────
  window.switchLoginTab = function(tabName) {
    const tabSignIn = document.getElementById('tabSignIn');
    const tabSignUp = document.getElementById('tabSignUp');
    const formSignIn = document.getElementById('formSignIn');
    const formSignUp = document.getElementById('formSignUp');
    
    // Clear errors
    const errBoxLogin = document.getElementById('loginError');
    const errBoxReg = document.getElementById('regError');
    if (errBoxLogin) errBoxLogin.style.display = 'none';
    if (errBoxReg) errBoxReg.style.display = 'none';
    
    if (tabName === 'signin') {
      if (tabSignIn) tabSignIn.classList.add('active');
      if (tabSignUp) tabSignUp.classList.remove('active');
      if (formSignIn) formSignIn.style.display = 'flex';
      if (formSignUp) formSignUp.style.display = 'none';
    } else {
      if (tabSignIn) tabSignIn.classList.remove('active');
      if (tabSignUp) tabSignUp.classList.add('active');
      if (formSignIn) formSignIn.style.display = 'none';
      if (formSignUp) formSignUp.style.display = 'flex';
    }
  };

  // ── Registration submit action ────────────────────────────────
  window.doRegister = function() {
    const regFirst = document.getElementById('regFirst');
    const regLast = document.getElementById('regLast');
    const regEmpId = document.getElementById('regEmpId');
    const regBranch = document.getElementById('regBranch');
    const regPass = document.getElementById('regPass');
    const regPassConfirm = document.getElementById('regPassConfirm');
    
    const errBox = document.getElementById('regError');
    const errMsg = document.getElementById('regErrorMsg');
    const btn = document.getElementById('regBtn');
    
    if (errBox) errBox.style.display = 'none';
    
    const first = (regFirst.value || '').trim();
    const last = (regLast.value || '').trim();
    const empId = (regEmpId.value || '').trim();
    const branch = regBranch.value;
    const pass = regPass.value;
    const passConfirm = regPassConfirm.value;
    
    if (!first || !last || !empId || !branch || !pass || !passConfirm) {
      if (errMsg) errMsg.textContent = 'กรุณากรอกข้อมูลให้ครบถ้วนทุกช่อง';
      if (errBox) errBox.style.display = 'flex';
      return;
    }
    
    if (pass.length < 6) {
      if (errMsg) errMsg.textContent = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
      if (errBox) errBox.style.display = 'flex';
      return;
    }
    
    if (pass !== passConfirm) {
      if (errMsg) errMsg.textContent = 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน';
      if (errBox) errBox.style.display = 'flex';
      return;
    }
    
    // Loading state
    if (btn) {
      btn.classList.add('loading');
      btn.disabled = true;
      const btnText = btn.querySelector('.login-btn-text');
      if (btnText) btnText.textContent = 'กำลังลงทะเบียน...';
    }
    
    // Call Register API (Supabase)
    const regPromise = (typeof supabaseRegister === 'function')
      ? supabaseRegister(first, last, empId, branch, pass)
      : fetch('api/register.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: first,
            last_name: last,
            employee_id: empId,
            branch: branch,
            password: pass
          })
        }).then(r => r.json());

    regPromise
    .then(res => {
      if (btn) {
        btn.classList.remove('loading');
        btn.disabled = false;
        const btnText = btn.querySelector('.login-btn-text');
        if (btnText) btnText.textContent = 'ลงทะเบียน';
      }
      
      if (res.success) {
        alert('🎉 ลงทะเบียนสำเร็จเรียบร้อยแล้ว!\nระบบเปิดใช้งานและอนุมัติสิทธิ์ให้ท่านเรียบร้อย สามารถเข้าสู่ระบบได้ทันที');
        
        // Reset form
        regFirst.value = '';
        regLast.value = '';
        regEmpId.value = '';
        regBranch.selectedIndex = 0;
        regPass.value = '';
        regPassConfirm.value = '';
        
        // Switch to signin tab and pre-fill user ID
        switchLoginTab('signin');
        const loginUser = document.getElementById('loginUser');
        if (loginUser) {
          loginUser.value = empId;
          const loginPass = document.getElementById('loginPass');
          if (loginPass) loginPass.focus();
        }
      } else {
        if (errMsg) errMsg.textContent = res.error || 'การลงทะเบียนล้มเหลว';
        if (errBox) errBox.style.display = 'flex';
      }
    })
    .catch(err => {
      if (btn) {
        btn.classList.remove('loading');
        btn.disabled = false;
        const btnText = btn.querySelector('.login-btn-text');
        if (btnText) btnText.textContent = 'ลงทะเบียน';
      }
      if (errMsg) errMsg.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
      if (errBox) errBox.style.display = 'flex';
    });
  };

  // ── Login submit action ───────────────────────────────────────
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
    if (errBox) errBox.style.display = 'none';
    if (fUser) fUser.classList.remove('error');
    if (fPass) fPass.classList.remove('error');

    // validate
    if (!u) {
      if (fUser) fUser.classList.add('error');
      if (errMsg) errMsg.textContent = 'กรุณากรอกรหัสพนักงาน';
      if (errBox) errBox.style.display = 'flex';
      userEl.focus();
      return;
    }
    if (!p) {
      if (fPass) fPass.classList.add('error');
      if (errMsg) errMsg.textContent = 'กรุณากรอกรหัสผ่าน';
      if (errBox) errBox.style.display = 'flex';
      passEl.focus();
      return;
    }

    // loading state
    if (btn) {
      btn.classList.add('loading');
      btn.disabled = true;
      const btnText = btn.querySelector('.login-btn-text');
      if (btnText) btnText.textContent = 'กำลังตรวจสอบ...';
    }

    // Fetch login API (Supabase)
    const loginPromise = (typeof supabaseLogin === 'function')
      ? supabaseLogin(u, p)
      : fetch('api/login.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employee_id: u, password: p })
        }).then(r => {
          if (!r.ok) {
            return r.text().then(t => { throw new Error(t); });
          }
          return r.json();
        });

    loginPromise
    .then(res => {
      if (res.success) {
        // Handle Remember Me
        const rememberCb = document.getElementById('loginRemember');
        if (rememberCb && rememberCb.checked) {
          saveRemember(u, p);
        } else {
          clearRemember();
        }

        const user = res.user;
        saveSession(user.employee_id, user.role, user.branch, `${user.first_name} ${user.last_name}`);
        showApp();
        
        // apply permissions after login
        setTimeout(() => {
          if (typeof applyPermissions === 'function') applyPermissions();
          if (typeof _adminInit === 'function') _adminInit();
        }, 400);
      } else {
        if (btn) {
          btn.classList.remove('loading');
          btn.disabled = false;
          const btnText = btn.querySelector('.login-btn-text');
          if (btnText) btnText.textContent = 'เข้าสู่ระบบ';
        }

        if (errMsg) errMsg.textContent = res.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
        if (errBox) errBox.style.display = 'flex';
        
        if (res.error && res.error.includes('รหัสผ่าน')) {
          if (fPass) fPass.classList.add('error');
          passEl.focus();
        } else {
          if (fUser) fUser.classList.add('error');
          userEl.focus();
        }
      }
    })
    .catch(err => {
      if (btn) {
        btn.classList.remove('loading');
        btn.disabled = false;
        const btnText = btn.querySelector('.login-btn-text');
        if (btnText) btnText.textContent = 'เข้าสู่ระบบ';
      }
      let msg = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
      if (err.message && (err.message.includes('Could not find PHP executable') || err.message.includes('Five Server'))) {
        msg = 'กรุณาเปิดหน้าเว็บผ่าน http://localhost/kppl_v3 2/';
      }
      if (errMsg) errMsg.textContent = msg;
      if (errBox) errBox.style.display = 'flex';
    });
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
    
    // Determine which form is active
    const formSignUp = document.getElementById('formSignUp');
    if (formSignUp && formSignUp.style.display === 'flex') {
      doRegister();
    } else {
      doLogin();
    }
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
      // Fill remembered credentials
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

  // Empty placeholder to support old admin.js callbacks
  window._syncLoginUsers = function() {};

})();
