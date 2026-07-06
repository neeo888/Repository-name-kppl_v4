/* ═══════════════════════════════════════════════════════════════
   กปภ.พิษณุโลก — js/supabase.js
   Supabase Client Connection & Data Adapters (Pure Serverless)
   ═══════════════════════════════════════════════════════════════ */

// ── Credentials Keys in LocalStorage ──
const SUPABASE_URL_KEY = 'kppl_supabase_url';
const SUPABASE_KEY_KEY = 'kppl_supabase_anon_key';

// ── Default Fallback Credentials (Pre-configured) ──
const DEFAULT_SUPABASE_URL = 'https://ybxwvqjtsopawosgqchi.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_6pAPeMJsu-m0uFgGvaTaAw_b7qO4nnl'; // สามารถกรอก public anon key (Public Key) ตรงนี้ได้เพื่อความสะดวก

let supabaseClient = null;

// Initialize Supabase Client
function initSupabase() {
  const url = localStorage.getItem(SUPABASE_URL_KEY) || DEFAULT_SUPABASE_URL;
  const key = localStorage.getItem(SUPABASE_KEY_KEY) || DEFAULT_SUPABASE_KEY;

  if (url && key) {
    try {
      supabaseClient = supabase.createClient(url, key);
      console.log('[Supabase] Initialized successfully.');
    } catch (e) {
      console.error('[Supabase] Initialization failed:', e);
      supabaseClient = null;
    }
  } else {
    console.warn('[Supabase] Credentials not set. Please configure via the settings button.');
    supabaseClient = null;
  }
}

// Auto init on script load
initSupabase();

// Settings Modal Handlers
window.openSupabaseSettingsModal = function() {
  const modal = document.getElementById('supabaseSettingsModal');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('supabaseUrlInput').value = localStorage.getItem(SUPABASE_URL_KEY) || '';
    document.getElementById('supabaseKeyInput').value = localStorage.getItem(SUPABASE_KEY_KEY) || '';
  }
};

window.closeSupabaseSettingsModal = function() {
  const modal = document.getElementById('supabaseSettingsModal');
  if (modal) {
    modal.style.display = 'none';
  }
};

window.saveSupabaseSettings = function() {
  const url = document.getElementById('supabaseUrlInput').value.trim();
  const key = document.getElementById('supabaseKeyInput').value.trim();

  if (!url || !key) {
    alert('กรุณากรอกข้อมูลให้ครบถ้วน');
    return;
  }

  localStorage.setItem(SUPABASE_URL_KEY, url);
  localStorage.setItem(SUPABASE_KEY_KEY, key);

  initSupabase();
  alert('บันทึกการตั้งค่าเชื่อมต่อ Supabase สำเร็จ!');
  window.closeSupabaseSettingsModal();
  
  // Reload data if logged in
  if (typeof lsBootData === 'function') {
    lsBootData();
  }
};

// ── Database Operations ──

// 1. Load rows equivalent to api/load_rows.php
window.supabaseLoadRows = async function() {
  if (!supabaseClient) {
    return { ok: false, rows: [], error: 'Supabase ยังไม่ได้ตั้งค่าหรือเชื่อมต่อไม่ได้' };
  }

  try {
    const sess = JSON.parse(localStorage.getItem('kppl_session') || '{}');
    const role = sess.role || '';
    const name = sess.name || '';

    let query = supabaseClient
      .from('pipe_repair_docs')
      .select('job_id, job_date, contractor, note, budget, source_file');

    if (role === 'contractor' && name) {
      const parts = name.split(' ').filter(Boolean);
      if (parts.length > 0) {
        const orClauses = parts.map(p => `contractor.ilike.%${p}%`).join(',');
        query = query.or(orClauses);
      }
    }

    query = query.order('job_date', { ascending: true, nullsFirst: true }).order('id', { ascending: true });
    
    const { data: rows, error: loadError } = await query;
    if (loadError) throw loadError;

    // Fetch last import metadata from import_log
    const { data: logData, error: logError } = await supabaseClient
      .from('import_log')
      .select('file_name, rows_total, imported_at')
      .order('imported_at', { ascending: false })
      .limit(2);

    const formattedRows = (rows || []).map(r => [
      String(r.job_id || ''),
      r.job_date ? String(r.job_date).substring(0, 19).replace('T', ' ') : '',
      String(r.contractor || ''),
      String(r.note || ''),
      String(r.budget || ''),
      String(r.source_file || '')
    ]);

    const lastLog = logData && logData[0] ? logData[0] : null;
    const prevLog = logData && logData[1] ? logData[1] : null;

    return {
      ok: true,
      rows: formattedRows,
      meta: {
        rowCount: formattedRows.length,
        lastFile: lastLog ? lastLog.file_name : null,
        lastImport: lastLog ? lastLog.imported_at : null,
        lastFileTotal: lastLog ? lastLog.rows_total : 0,
        prevFileTotal: prevLog ? prevLog.rows_total : 0
      }
    };
  } catch (err) {
    console.error('[Supabase] Load rows error:', err);
    return { ok: false, rows: [], error: err.message || err };
  }
};

// 2. Save rows equivalent to api/save_rows.php
window.supabaseSaveRows = async function(rows, fileName) {
  if (!supabaseClient) {
    return { ok: false, error: 'Supabase ยังไม่ได้ตั้งค่าหรือเชื่อมต่อไม่ได้' };
  }

  try {
    const formattedRows = rows.map(r => {
      const jid = String(r[0] || '').trim();
      const rawDate = String(r[1] || '').trim();
      
      // Use helper to parse date correctly
      let jdt = null;
      if (rawDate) {
        if (typeof _parseDate === 'function') {
          jdt = _parseDate(rawDate);
        } else {
          jdt = rawDate;
        }
      }

      return {
        job_id: jid,
        job_date: jdt || null,
        contractor: String(r[2] || '').substring(0, 120),
        note: String(r[3] || '').substring(0, 255),
        budget: String(r[4] || '').substring(0, 100),
        source_file: fileName.substring(0, 255)
      };
    }).filter(r => r.job_id !== '');

    if (formattedRows.length === 0) {
      return { ok: false, error: 'ไม่มีข้อมูลที่จะนำเข้า' };
    }

    // Get existing job_ids to prevent duplicates (acting like INSERT IGNORE)
    const { data: existingJobs, error: existError } = await supabaseClient
      .from('pipe_repair_docs')
      .select('job_id');
    
    if (existError) throw existError;
    const existingSet = new Set((existingJobs || []).map(j => j.job_id));

    const newRows = formattedRows.filter(r => !existingSet.has(r.job_id));
    const added = newRows.length;
    const dup = formattedRows.length - added;

    // Use upsert to insert new rows and update duplicates' source_file (and details) to the latest imported file
    const { error: upsertError } = await supabaseClient
      .from('pipe_repair_docs')
      .upsert(formattedRows, { onConflict: 'job_id' });
    
    if (upsertError) throw upsertError;

    // Record import log
    await supabaseClient
      .from('import_log')
      .insert({
        file_name: fileName,
        rows_total: rows.length,
        rows_added: added,
        rows_dup: dup,
        ip_address: 'client-side'
      });

    // Load all rows to sync frontend state
    const allRowsResult = await window.supabaseLoadRows();

    return {
      ok: true,
      added,
      dup,
      total_in_db: allRowsResult.rows.length,
      file: fileName,
      all_rows: allRowsResult.rows,
      meta: allRowsResult.meta
    };
  } catch (err) {
    console.error('[Supabase] Save rows error:', err);
    return { ok: false, error: err.message || err };
  }
};

// 3. User Login equivalent to api/login.php
window.supabaseLogin = async function(employeeId, password) {
  if (!supabaseClient) {
    return { success: false, error: 'Supabase ยังไม่ได้ตั้งค่าหรือเชื่อมต่อไม่ได้' };
  }

  try {
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      return { success: false, error: 'ไม่พบรหัสพนักงานนี้ในระบบ' };
    }

    if (parseInt(user.approved) !== 1) {
      return { success: false, error: 'บัญชีผู้ใช้ของคุณยังไม่ได้รับการอนุมัติ หรือถูกระงับการใช้งาน' };
    }

    // Verify password hash
    const passwordMatch = dcodeIO.bcrypt.compareSync(password, user.password_hash);
    if (!passwordMatch) {
      return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
    }

    return {
      success: true,
      user: {
        first_name: user.first_name,
        last_name: user.last_name,
        employee_id: user.employee_id,
        branch: user.branch,
        role: user.role
      }
    };
  } catch (err) {
    console.error('[Supabase] Login error:', err);
    return { success: false, error: 'DB Error: ' + (err.message || err) };
  }
};

// 4. User Registration equivalent to api/register.php
window.supabaseRegister = async function(firstName, lastName, employeeId, branch, password) {
  if (!supabaseClient) {
    return { success: false, error: 'Supabase ยังไม่ได้ตั้งค่าหรือเชื่อมต่อไม่ได้' };
  }

  try {
    // Check duplicate
    const { data: existingUser, error: checkError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existingUser) {
      return { success: false, error: 'รหัสพนักงานนี้ถูกลงทะเบียนไว้แล้ว' };
    }

    // Hash password using bcryptjs
    const salt = dcodeIO.bcrypt.genSaltSync(12);
    const hash = dcodeIO.bcrypt.hashSync(password, salt);

    const { error: insertError } = await supabaseClient
      .from('users')
      .insert({
        first_name: firstName,
        last_name: lastName,
        employee_id: employeeId,
        branch: branch,
        password_hash: hash,
        role: 'user',
        approved: 1 // Approved by default
      });

    if (insertError) throw insertError;

    return { success: true, message: 'ลงทะเบียนสำเร็จ' };
  } catch (err) {
    console.error('[Supabase] Registration error:', err);
    return { success: false, error: 'DB Error: ' + (err.message || err) };
  }
};

// 5. List Users equivalent to api/users.php GET
window.supabaseListUsers = async function() {
  if (!supabaseClient) {
    return { success: false, error: 'Supabase ยังไม่ได้ตั้งค่าหรือเชื่อมต่อไม่ได้' };
  }

  try {
    const { data: users, error } = await supabaseClient
      .from('users')
      .select('id, first_name, last_name, employee_id, branch, role, approved, created_at')
      .order('id', { ascending: true });

    if (error) throw error;

    const mappedUsers = (users || []).map(u => ({
      id: u.id,
      user: u.employee_id,
      pass: '******',
      role: u.role,
      name: `${u.first_name} ${u.last_name}`.trim(),
      first_name: u.first_name,
      last_name: u.last_name,
      branch: u.branch,
      approved: parseInt(u.approved) === 1,
      createdAt: u.created_at
    }));

    return { success: true, users: mappedUsers };
  } catch (err) {
    console.error('[Supabase] List users error:', err);
    return { success: false, error: err.message || err };
  }
};

// 6. Toggle User Approval Status
window.supabaseToggleApproveUser = async function(employeeId, approved) {
  if (!supabaseClient) {
    return { success: false, error: 'Supabase ยังไม่ได้ตั้งค่า' };
  }

  try {
    const { error } = await supabaseClient
      .from('users')
      .update({ approved: approved ? 1 : 0 })
      .eq('employee_id', employeeId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('[Supabase] Toggle approval error:', err);
    return { success: false, error: err.message || err };
  }
};

// 7. Change User Role
window.supabaseChangeUserRole = async function(employeeId, role) {
  if (!supabaseClient) {
    return { success: false, error: 'Supabase ยังไม่ได้ตั้งค่า' };
  }

  try {
    const { error } = await supabaseClient
      .from('users')
      .update({ role: role })
      .eq('employee_id', employeeId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('[Supabase] Change role error:', err);
    return { success: false, error: err.message || err };
  }
};

// 8. Delete User
window.supabaseDeleteUser = async function(employeeId) {
  if (!supabaseClient) {
    return { success: false, error: 'Supabase ยังไม่ได้ตั้งค่า' };
  }

  try {
    const { error } = await supabaseClient
      .from('users')
      .delete()
      .eq('employee_id', employeeId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('[Supabase] Delete user error:', err);
    return { success: false, error: err.message || err };
  }
};

// 9. Get status info equivalent to api/status.php
window.supabaseGetStatus = async function() {
  if (!supabaseClient) {
    return { ok: false, error: 'Supabase ยังไม่ได้ตั้งค่า' };
  }

  try {
    // Count rows
    const { count, error: countError } = await supabaseClient
      .from('pipe_repair_docs')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // Load recent imports
    const { data: logs, error: logsError } = await supabaseClient
      .from('import_log')
      .select('file_name, rows_added, rows_dup, imported_at')
      .order('imported_at', { ascending: false })
      .limit(10);

    if (logsError) throw logsError;

    const mappedLogs = (logs || []).map(l => ({
      file_name: l.file_name,
      rows_added: l.rows_added,
      rows_dup: l.rows_dup,
      imported_at: l.imported_at ? l.imported_at.substring(0, 19).replace('T', ' ') : ''
    }));

    return {
      ok: true,
      total_rows: count || 0,
      recent_imports: mappedLogs
    };
  } catch (err) {
    console.error('[Supabase] Get status error:', err);
    return { ok: false, error: err.message || err };
  }
};

// 10. Get sync status equivalent to api/sync_status.php
window.supabaseGetSyncStatus = async function() {
  if (!supabaseClient) {
    return { ok: false, error: 'Supabase ยังไม่ได้ตั้งค่า' };
  }

  try {
    const { count, error: countError } = await supabaseClient
      .from('pipe_repair_docs')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    const { data: syncLogs, error: logsError } = await supabaseClient
      .from('kppl_sync_log')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(20);

    if (logsError) throw logsError;

    const formattedLogs = (syncLogs || []).map(l => ({
      id: l.id,
      synced_at: l.synced_at ? l.synced_at.substring(0, 19).replace('T', ' ') : '',
      status: l.status,
      rows_fetched: l.rows_fetched,
      rows_added: l.rows_added,
      rows_skipped: l.rows_skipped,
      error_msg: l.error_msg,
      source: l.source
    }));

    const totalAdded = formattedLogs.reduce((sum, l) => sum + (l.rows_added || 0), 0);
    const successRuns = formattedLogs.filter(l => l.status === 'success').length;
    const lastSuccessLog = formattedLogs.find(l => l.status === 'success');

    return {
      ok: true,
      db_rows: count || 0,
      total_added: totalAdded,
      success_runs: successRuns,
      last_success: lastSuccessLog ? lastSuccessLog.synced_at : null,
      logs: formattedLogs,
      source: {
        type: 'mock',
        delta_only: true,
        fetch_days_back: 365,
        batch_size: 500
      }
    };
  } catch (err) {
    console.error('[Supabase] Get sync status error:', err);
    return { ok: false, error: err.message || err };
  }
};

// 11. Trigger Auto Fetch engine (equivalent to api/auto_fetch.php)
window.supabaseTriggerAutoFetch = async function(mode) {
  if (!supabaseClient) {
    return { ok: false, error: 'Supabase ยังไม่ได้ตั้งค่า' };
  }

  try {
    const contractors = ['สมชาย ใจดี', 'วิชัย รักงาน', 'ประสิทธิ์ เก่งมาก', 'สุรชัย ทำเร็ว', 'นิพนธ์ มือทอง'];
    const notes       = ['ท่อรั่ว', 'ท่อแตก', 'ท่ออุด', 'วาล์วชำรุด', 'มิเตอร์เสีย'];

    const rows = [];
    const now = Math.floor(Date.now() / 1000);
    const count = Math.floor(Math.random() * 11) + 5; // 5-15 rows

    for (let i = 0; i < count; i++) {
      const ts = now - Math.floor(Math.random() * 3 * 86400); // 0-3 days back
      const dObj = new Date(ts * 1000);
      const year = dObj.getFullYear();
      const month = dObj.getMonth() + 1;
      const fy = (month >= 10) ? year + 543 + 1 : year + 543;
      const num = Math.floor(Math.random() * 90000) + 10000;
      
      const format2 = val => String(val).padStart(2, '0');
      const dateStr = `${year}-${format2(month)}-${format2(dObj.getDate())} ${format2(dObj.getHours())}:${format2(dObj.getMinutes())}:${format2(dObj.getSeconds())}`;

      rows.push({
        job_id: `CC-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}-${num}/${String(fy % 100).padStart(2, '0')}`,
        job_date: dateStr,
        contractor: contractors[Math.floor(Math.random() * contractors.length)],
        note: notes[Math.floor(Math.random() * notes.length)]
      });
    }

    // Upsert (ignore duplicates)
    const { data: existingJobs } = await supabaseClient
      .from('pipe_repair_docs')
      .select('job_id');
    const existingSet = new Set((existingJobs || []).map(j => j.job_id));

    const newRows = rows.filter(r => !existingSet.has(r.job_id)).map(r => ({
      job_id: r.job_id,
      job_date: r.job_date,
      contractor: r.contractor,
      note: r.note,
      budget: '',
      source_file: 'mock_auto_fetch'
    }));

    const added = newRows.length;
    const skipped = rows.length - added;

    if (newRows.length > 0) {
      const { error: insertErr } = await supabaseClient
        .from('pipe_repair_docs')
        .insert(newRows);
      if (insertErr) throw insertErr;
    }

    const syncTime = new Date().toISOString();

    // Log auto fetch execution
    await supabaseClient
      .from('kppl_sync_log')
      .insert({
        synced_at: syncTime,
        status: 'success',
        rows_fetched: rows.length,
        rows_added: added,
        rows_skipped: skipped,
        source: 'mock'
      });

    return {
      ok: true,
      source: 'mock',
      mode: mode,
      fetched: rows.length,
      added: added,
      skipped: skipped,
      errors: 0,
      sync_time: syncTime.substring(0, 19).replace('T', ' ')
    };
  } catch (err) {
    console.error('[Supabase] Auto fetch error:', err);
    return { ok: false, error: err.message || err };
  }
};
