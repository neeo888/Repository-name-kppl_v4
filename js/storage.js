/* ──────────────────────────────────────────────────────
   กปภ.พิษณุโลก — js/storage.js
   LocalStorage + MySQL API + File Import + Password + SQL export
   ────────────────────────────────────────────────────── */

// ════════════════════════════════════════════════════════════════
//  SERVER API — MySQL backend
//  เปลี่ยน API_BASE ให้ตรงกับ path จริงบน host
// ════════════════════════════════════════════════════════════════

const API_BASE = './api';   // หรือ '/kppl_v2/api' ตาม path บน server

/**
 * บันทึกแถวใหม่ลง MySQL
 * @param {Array[]} rows  — array ของ [job_id, job_date, contractor, note]
 * @param {string}  fileName
 * @returns {Promise<{ok,added,dup,total_in_db}|{ok:false,error}>}
 */
async function apiSaveRows(rows, fileName) {
  if (typeof supabaseSaveRows === 'function') {
    return await supabaseSaveRows(rows, fileName);
  }
  const res = await fetch(`${API_BASE}/save_rows.php`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({
      password: IMPORT_PASSWORD_JS,
      fileName,
      rows,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=>'');
    return { ok: false, error: `HTTP ${res.status}: ${txt.slice(0,120)}` };
  }
  return res.json();
}

/**
 * โหลดข้อมูลทั้งหมดจาก MySQL
 * @returns {Promise<{ok,rows,meta}|{ok:false,rows:[]}>}
 */
async function apiLoadRows() {
  if (typeof supabaseLoadRows === 'function') {
    return await supabaseLoadRows();
  }
  const sess = JSON.parse(localStorage.getItem('kppl_session') || '{}');
  const params = new URLSearchParams();
  if (sess.user)   params.append('user', sess.user);
  if (sess.role)   params.append('role', sess.role);
  if (sess.name)   params.append('name', sess.name);

  const res = await fetch(`${API_BASE}/load_rows.php?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) {
    let txt = '';
    try { txt = await res.text(); } catch(e) {}
    let err = `HTTP ${res.status}`;
    if (txt.includes('Could not find PHP executable') || txt.includes('Five Server')) {
      err = 'Five Server error: Cannot find PHP. Please open http://localhost/kppl_v3 2/';
    }
    return { ok: false, rows: [], error: err };
  }
  return res.json();
}

// รหัสผ่านฝั่ง JS (ต้องตรงกับ IMPORT_PASSWORD ใน config.php)
const IMPORT_PASSWORD_JS = (() => {
  try { return localStorage.getItem('kppl_pw_cache') || '121212'; }
  catch { return '121212'; }
})();

// ════════════════════════════════
//  FILE IMPORT
// ════════════════════════════════


// ════════════════════════════════════════════════════════════════
//  LOCAL STORAGE fallback (ใช้เมื่อไม่มี Firebase)
// ════════════════════════════════════════════════════════════════
const LS_KEY      = 'kppl_data';
const LS_META_KEY = 'kppl_meta';

function lsSave(rows, fileName) {
  try {
    localStorage.setItem(LS_KEY,      JSON.stringify(rows));
    localStorage.setItem(LS_META_KEY, JSON.stringify({ fileName, rowCount:rows.length, savedAt:new Date().toISOString() }));
  } catch(e) { console.warn('[LS] บันทึกไม่สำเร็จ:', e); }
}

function lsLoad() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const rawM = localStorage.getItem(LS_META_KEY);
    return { rows: raw ? JSON.parse(raw) : null, meta: rawM ? JSON.parse(rawM) : null };
  } catch(e) { return { rows:null, meta:null }; }
}

/**
 * lsBootData — โหลดข้อมูลตอนเปิดหน้าและ auto-refresh
 *
 * ลำดับความสำคัญ:
 *   1. MySQL server (ทุกเครื่องเห็นเหมือนกัน) ← สำคัญสุด
 *   2. localStorage เครื่องนี้ (offline fallback)
 *   3. BUILTIN_DATA (ข้อมูลเริ่มต้น)
 *
 * ⚠️  ถ้า MySQL ตอบกลับ (แม้ rows = 0) → ไม่ใช้ localStorage เดิม
 *     เพื่อให้ทุกเครื่องแสดงข้อมูลเดียวกันเสมอ
 */
function lsBootData() {
  // แสดงสถานะกำลังโหลด
  dbRenderStatus(null, 'saving');

  apiLoadRows()
    .then(res => {
      if (!res.ok) {
        // Server ตอบกลับแต่ error (เช่น DB config ผิด) → fallback local
        console.warn('[DB] server error:', res.error);
        _bootFromLocal();
        return;
      }

      // ✅ Server ตอบกลับสำเร็จ — ใช้ข้อมูลจาก MySQL เสมอ
      // (แม้จะว่าง = 0 rows ก็ตาม เพราะนั่นคือ "ข้อมูลจริง" บน server)
      allData = res.rows || [];
      const meta = res.meta || {};
      const cnt  = allData.length;
      const file = meta.lastFile   || (cnt ? 'MySQL DB' : 'ฐานข้อมูลว่าง');
      window.lastImportedFile = file;
      updateAll();

      const dt   = meta.lastImport || new Date().toISOString();

      dbRenderStatus({
        fileName : file,
        rowCount : cnt,
        savedAt  : dt,
      }, cnt > 0 ? 'db' : 'builtin');

      document.getElementById('uibImportInfo').innerHTML =
        cnt > 0
          ? `<span class="uib-file">🗄️ ${file}</span>
             <span class="uib-rows">✔ ${cnt.toLocaleString()} รายการ (MySQL)</span>
             <span class="uib-sep2">·</span>
             <span class="uib-import-dt">${dbFmtDate(dt)}</span>`
          : `<span class="uib-file" style="color:var(--amber)">🗄️ ยังไม่มีข้อมูลใน MySQL</span>
             <span style="font-size:10px;color:var(--text3)"> — นำเข้าไฟล์เพื่อเริ่มใช้งาน</span>`;

      console.log('[DB] MySQL rows =', cnt, cnt === 0 ? '(empty DB)' : '');
    })
    .catch(err => {
      // ไม่สามารถเชื่อมต่อ server ได้เลย → fallback localStorage
      console.warn('[DB] cannot reach server:', err.message, '→ fallback local');
      _bootFromLocal();
    });
}

/**
 * _bootFromLocal — ใช้เฉพาะเมื่อ server ไม่ตอบสนองเท่านั้น
 */
function _bootFromLocal() {
  const { rows, meta } = lsLoad();
  if (rows && rows.length) {
    allData = rows;
    updateAll();
    dbRenderStatus(meta, 'offline');
    const el = document.getElementById('uibImportInfo');
    if (el && meta) {
      el.innerHTML = `
        <span class="uib-file" style="color:var(--amber)">📴 ${meta.fileName} (offline)</span>
        <span class="uib-rows">✔ ${meta.rowCount.toLocaleString()} รายการ</span>
        <span class="uib-sep2">·</span>
        <span class="uib-import-dt">${dbFmtDate(meta.savedAt)}</span>`;
    }
    console.warn('[DB] offline — localStorage', rows.length, 'rows');
  } else {
    allData = BUILTIN_DATA;
    updateAll();
    dbRenderStatus(null, 'builtin');
    console.warn('[DB] offline — BUILTIN_DATA', BUILTIN_DATA.length, 'rows');
  }
}


// ════════════════════════════════════════════════════════════════
//  FILE IMPORT
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
//  UNIVERSAL FLEXIBLE PARSER
//  รองรับไฟล์ทุกรูปแบบ: Excel, CSV, TSV, TXT
//  ไม่บังคับ format — ตรวจจับ column อัตโนมัติ
// ════════════════════════════════════════════════════════════════

/* แปลงวันที่ทุกรูปแบบ → ISO string */
function _parseDate(v) {
  if (!v && v !== 0) return '';
  // Excel serial number (number < 100000)
  if (typeof v === 'number' && v > 1000 && v < 100000) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    if (!isNaN(d)) return d.toISOString().replace('T',' ').slice(0,19);
  }
  const s = String(v).trim();
  if (!s) return '';
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,19);
  // DD/MM/YYYY or DD-MM-YYYY (Thai common)
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (dmy) {
    let [,dd,mm,yy] = dmy;
    if (+yy > 2400) yy = +yy - 543;  // พ.ศ. → ค.ศ.
    else if (+yy > 100 && +yy < 2400) yy = +yy;
    else if (+yy < 100) yy = +yy + 2000;
    const d = new Date(`${yy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`);
    if (!isNaN(d)) return d.toISOString().replace('T',' ').slice(0,19);
  }
  // Try native Date parse
  const d = new Date(v);
  if (!isNaN(d) && d.getFullYear() > 1990) return d.toISOString().replace('T',' ').slice(0,19);
  return s;
}

/* score ว่า column นี้เป็น "รหัสงาน" แค่ไหน */
function _scoreJobId(val) {
  const s = String(val||'').trim();
  if (!s) return 0;
  let score = 0;
  if (/CC-/i.test(s)) score += 10;
  if (/\d{4,}/.test(s)) score += 3;
  if (/[-\/]\d/.test(s)) score += 2;
  if (s.length >= 8 && s.length <= 40) score += 2;
  return score;
}

/* score ว่า column นี้เป็น "วันที่" แค่ไหน */
function _scoreDate(val) {
  const s = String(val||'').trim();
  if (!s) return 0;
  if (typeof val === 'number' && val > 40000 && val < 60000) return 10; // Excel serial
  if (/\d{4}-\d{2}-\d{2}/.test(s)) return 10;
  if (/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(s)) return 8;
  if (/^\d{4,}$/.test(s) && s.length <= 6) return 4; // YYYYMM
  return 0;
}

/* score ว่า column นี้เป็น "ผู้รับจ้าง/ทีม" แค่ไหน */
function _scoreContractor(val) {
  const s = String(val||'').trim();
  if (!s || s.length < 2) return 0;
  if (/[\u0E00-\u0E7F]/.test(s)) return 6;  // Thai text
  if (/[a-zA-Z]{2,}/.test(s)) return 4;
  if (s.length >= 2 && s.length <= 60) return 2;
  return 0;
}

/* หา header row และ column mapping อัตโนมัติ */
function _detectColumns(rows) {
  const JOB_KW  = ['เลขที่งาน','เลขที่','jobid','job_id','job id','รหัสงาน','เลขงาน','ใบสั่งงาน','work no','order no'];
  const DATE_KW = ['วันที่','date','datetime','วัน','เวลา','ปิดงาน'];
  const CT_KW   = ['ผู้รับจ้าง','ช่าง','contractor','team','ทีม','หน่วยงาน','บริษัท','ผู้ดำเนินการ','มิสเตอร์'];
  const NOTE_KW = ['หมายเหตุ','note','remark','บันทึก'];
  const BUDGET_KW = ['วงเงิน','คาดการณ์','budget','ราคา'];

  let headerRow = -1, colJobId = -1, colDate = -1, colContractor = -1, colNote = -1, colBudget = -1;

  // ── PASS 1: หา header row จาก keyword ──
  for (let i = 0; i < Math.min(25, rows.length); i++) {
    const row = rows[i] || [];
    let jobHit = -1, dateHit = -1, ctHit = -1, noteHit = -1, budgetHit = -1;
    for (let c = 0; c < row.length; c++) {
      // ข้าม Date objects ใน header scan
      if (row[c] instanceof Date) continue;
      const cell = String(row[c] ?? '').trim().toLowerCase();
      if (!cell) continue;
      if (jobHit  < 0 && JOB_KW.some(k  => cell.includes(k))) jobHit  = c;
      if (dateHit < 0 && DATE_KW.some(k => cell.includes(k))) dateHit = c;
      if (ctHit   < 0 && CT_KW.some(k   => cell.includes(k))) ctHit   = c;
      if (noteHit < 0 && NOTE_KW.some(k => cell.includes(k))) noteHit = c;
      if (budgetHit < 0 && BUDGET_KW.some(k => cell.includes(k))) budgetHit = c;
    }
    const hits = [jobHit, dateHit, ctHit, noteHit, budgetHit].filter(x => x >= 0).length;
    if (hits >= 2) {
      headerRow = i;
      colJobId = jobHit; colDate = dateHit; colContractor = ctHit; colNote = noteHit; colBudget = budgetHit;
      break;
    }
  }

  // ── PASS 2: ไม่เจอ header → หา data row แรกที่มี CC- pattern ──
  if (headerRow < 0) {
    for (let i = 0; i < Math.min(25, rows.length); i++) {
      const row = rows[i] || [];
      for (let c = 0; c < row.length; c++) {
        if (_scoreJobId(row[c]) >= 8) {
          headerRow = i - 1;
          colJobId  = c;
          break;
        }
      }
      if (headerRow >= 0) break;
    }
  }

  // ── PASS 3: fallback ──
  if (headerRow < 0) headerRow = 0;

  // ── scoring บน data rows เพื่อหา column ที่ยังขาด ──
  if (colJobId < 0 || colDate < 0 || colContractor < 0) {
    const sampleStart = Math.max(0, headerRow + 1);
    // ข้าม zero/null rows ในการ sample
    const sampleRows = rows
      .slice(sampleStart, sampleStart + 40)
      .filter(r => r && r.some(v => v !== null && v !== undefined && v !== 0 && v !== ''));
    const maxCols = Math.max(...sampleRows.map(r => r.length), 1);

    const sJob  = Array(maxCols).fill(0);
    const sDt   = Array(maxCols).fill(0);
    const sCt   = Array(maxCols).fill(0);

    sampleRows.forEach(row => {
      for (let c = 0; c < Math.min(row.length, maxCols); c++) {
        const v = row[c];
        sJob[c] += _scoreJobId(v);
        // Date object = strong date signal
        sDt[c]  += (v instanceof Date) ? 15 : _scoreDate(v);
        sCt[c]  += _scoreContractor(v);
      }
    });

    if (colJobId < 0) {
      colJobId = sJob.indexOf(Math.max(...sJob));
    }
    if (colDate < 0) {
      const copy = [...sDt]; copy[colJobId] = -1;
      colDate = copy.indexOf(Math.max(...copy));
    }
    if (colContractor < 0) {
      const copy = [...sCt]; copy[colJobId] = -1; copy[colDate] = -1;
      colContractor = copy.indexOf(Math.max(...copy));
    }
    if (colNote < 0) {
      const used = new Set([colJobId, colDate, colContractor, colBudget]);
      for (let c = 0; c < maxCols; c++) {
        if (!used.has(c) && c >= 0) { colNote = c; break; }
      }
    }
    if (colBudget < 0) {
      const used = new Set([colJobId, colDate, colContractor, colNote]);
      for (let c = 0; c < maxCols; c++) {
        if (!used.has(c) && c >= 0) { colBudget = c; break; }
      }
    }
  }

  return { headerRow, colJobId, colDate, colContractor, colNote, colBudget };
}

/* parser หลัก — ยืดหยุ่นทุกรูปแบบ */
function processRows(rows) {
  if (!rows || !rows.length) return [];

  // normalize: แปลง null/undefined เป็น '' ทุก cell
  const norm = rows.map(r => Array.isArray(r) ? r : []);

  const { headerRow, colJobId, colDate, colContractor, colNote, colBudget } = _detectColumns(norm);

  const data    = [];
  const seenIds = new Set();

  for (let i = Math.max(0, headerRow + 1); i < norm.length; i++) {
    const row = norm[i];

    // ── ข้าม row ว่างทั้ง row ──
    if (!row.length || row.every(v => v === null || v === undefined || v === '' || v === 0)) continue;

    // ── Job ID: ดึงค่าจาก column ที่ detect ได้ ──
    const rawJob = row[colJobId];

    // ข้าม cell ว่าง, null, 0
    if (rawJob === null || rawJob === undefined || rawJob === 0 || rawJob === '') continue;

    let jobId = String(rawJob).trim().replace(/\s+/g, ' ');
    if (!jobId || jobId === '0') continue;

    // ── ข้ามแถว header ซ้ำ (ไฟล์บางไฟล์มี header row ซ้ำหลายครั้ง) ──
    const jLow = jobId.toLowerCase();
    if (jLow.includes('เลขที่') || jLow.includes('job') || jLow === 'jobid' || jLow === 'job id') continue;

    // ── ข้าม row รวม/ผลรวม/footer ──
    if (/^(รวม|total|sum|ผลรวม|grand|หมายเหตุ|note|page)/i.test(jLow)) continue;

    // ── วันที่: รองรับ JS Date object (จาก XLSX raw:true) ──
    let dt = '';
    const dv = row[colDate];
    if (dv instanceof Date) {
      // XLSX.read cellDates:true ให้ JS Date โดยตรง
      if (!isNaN(dv)) dt = dv.toISOString().replace('T', ' ').slice(0, 19);
    } else {
      dt = _parseDate(dv);
    }

    // ── ผู้รับจ้าง ──
    let contractor = (row[colContractor] !== null && row[colContractor] !== undefined)
      ? String(row[colContractor]).trim() : '';
    // กรอง: header text ซ้ำ, dash เดี่ยว, ตัวเลขล้วน
    if (!contractor || contractor === '0' || contractor === '-' || contractor === '–'
        || /^(ผู้รับจ้าง|contractor|ช่าง|team|ทีม)$/i.test(contractor)
        || /^[\d\s]+$/.test(contractor)) contractor = 'ไม่ระบุ';

    // ── หมายเหตุ ──
    const note = (colNote >= 0 && row[colNote] != null) ? String(row[colNote]).trim() : '';

    // ── วงเงิน (คาดการณ์) ──
    const budget = (colBudget >= 0 && row[colBudget] != null) ? String(row[colBudget]).trim() : '';

    // ── de-duplicate ──
    const key = jobId + '|' + dt;
    if (seenIds.has(key)) continue;
    seenIds.add(key);

    data.push([jobId, dt, contractor, note, budget]);
  }

  return data;
}

/* ── แสดงผลการ detect columns ใน status bar ── */
function _previewDetect(rows, file) {
  if (!rows || rows.length < 2) return;
  const { headerRow, colJobId, colDate, colContractor, colNote } = _detectColumns(rows);
  const h = rows[headerRow] || [];
  const labels = [
    `รหัสงาน: col ${colJobId} "${String(h[colJobId]||'').slice(0,12)}"`,
    `วันที่: col ${colDate} "${String(h[colDate]||'').slice(0,12)}"`,
    `ผู้รับจ้าง: col ${colContractor} "${String(h[colContractor]||'').slice(0,12)}"`,
  ];
  console.log(`[Parser] ${file?.name || ''} → header row ${headerRow} | ${labels.join(' | ')}`);
}

function handleFile(file) {
  const name = file.name.toLowerCase();
  const ext  = name.split('.').pop();
  const status = document.getElementById('importStatus');

  // ── แสดง progress ──
  status.className = 'import-status';
  status.innerHTML = `<span style="color:var(--cyan)">⏳ กำลังอ่านไฟล์ <strong>${file.name}</strong>…</span>`;

  // ── callback เมื่อสำเร็จ ──
  function onSuccess(data, sheetInfo) {
    if (!data || !data.length) {
      onError('ไม่พบข้อมูลในไฟล์ — ตรวจสอบ format หรือลองไฟล์อื่น');
      return;
    }

    // ── Merge local: เพิ่มเฉพาะ job_id ใหม่ ──
    const existingIds = new Set(allData.map(r => String(r[0]||'').trim()).filter(Boolean));
    const newRecs     = data.filter(r => {
      const jid = String(r[0]||'').trim();
      return jid && !existingIds.has(jid);
    });
    const addedCount = newRecs.length;
    const dupCount   = data.length - addedCount;

    allData = [...allData, ...newRecs].sort((a,b) => {
      const da = a[1] ? new Date(a[1]) : new Date(0);
      const db = b[1] ? new Date(b[1]) : new Date(0);
      return da - db;
    });

    updateAll();
    const now = new Date();
    const p   = n => String(n).padStart(2,'0');
    const M   = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    const ds  = `${p(now.getDate())} ${M[now.getMonth()]} ${now.getFullYear()+543}`;
    const ts  = `${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;

    document.getElementById('uibImportInfo').innerHTML = `
      <span class="uib-file">📄 ${file.name}</span>
      <span class="uib-rows">✔ รวม ${allData.length.toLocaleString()} รายการ
        <span style="color:var(--green);font-size:10px">(+${addedCount} ใหม่${dupCount?` · ข้าม ${dupCount} ซ้ำ`:''})</span>
      </span>
      <span class="uib-sep2">·</span>
      <span class="uib-import-dt"><strong>${ds}</strong> เวลา <strong>${ts}</strong> น.</span>`;

    // ── บันทึก localStorage (backup เครื่องตัวเอง) ──
    lsSave(allData, file.name);
    dbRenderStatus({ fileName:file.name, rowCount:allData.length, savedAt:new Date().toISOString() }, 'saved');

    const extra = sheetInfo ? ` · ${sheetInfo}` : '';

    if (addedCount === 0) {
      status.className = 'import-status';
      status.innerHTML = `<span style="color:var(--amber)">⚠️ ไม่มีรายการใหม่ — ข้อมูล ${data.length} รายการมีอยู่แล้วทั้งหมด${extra}</span>`;
      return;
    }

    // ── ส่งไป MySQL server ──
    status.className = 'import-status';
    status.innerHTML = `<span style="color:var(--cyan)">⏳ กำลังบันทึก ${addedCount} รายการลง database…</span>`;

    apiSaveRows(newRecs, file.name)
      .then(res => {
        if (res.ok) {
          // ✅ อัพเดท allData ด้วยข้อมูลทั้งหมดจาก DB ทันที
          if (res.all_rows && res.all_rows.length) {
            allData = res.all_rows;
            window.lastImportedFile = file.name;
            updateAll();
            lsSave(allData, file.name);
          }
          const total = res.total_in_db || allData.length;
          status.className = 'import-status success';
          status.innerHTML =
            `✅ บันทึกลง DB สำเร็จ · เพิ่ม <strong>${res.added}</strong> รายการ`
            + (res.dup ? ` <span style="color:var(--text3);font-size:10px">(ข้าม ${res.dup} ซ้ำ)</span>` : '')
            + ` · รวมใน DB <strong>${total.toLocaleString()}</strong> รายการ${extra}`;
          document.getElementById('uibImportInfo').innerHTML =
            `<span class="uib-file">🗄️ ${file.name}</span>
             <span class="uib-rows">✔ ${total.toLocaleString()} รายการ (MySQL)</span>
             <span class="uib-sep2">·</span>
             <span class="uib-import-dt">${dbFmtDate(new Date().toISOString())}</span>`;
          dbRenderStatus({ fileName:file.name, rowCount:total, savedAt:new Date().toISOString() }, 'db');
          console.log('[DB] saved', res.added, 'new rows → allData =', allData.length);
        } else {
          status.className = 'import-status';
          status.innerHTML =
            `<span style="color:var(--amber)">⚠️ บันทึก local สำเร็จ แต่ DB error: ${res.error||'unknown'}</span>
             <span style="font-size:10px;color:var(--text3)"> — เครื่องอื่นจะยังไม่เห็นข้อมูลนี้</span>`;
        }
      })
      .catch(err => {
        status.className = 'import-status';
        status.innerHTML =
          `<span style="color:var(--amber)">⚠️ ไม่สามารถเชื่อมต่อ server: ${err.message}</span>
           <span style="font-size:10px;color:var(--text3)"> — ข้อมูลบันทึก local แล้ว เครื่องอื่นจะยังไม่เห็น</span>`;
        console.warn('[DB] offline fallback:', err.message);
      });
  }

  // ── callback เมื่อ error ──
  function onError(msg) {
    status.className = 'import-status error';
    status.innerHTML = `❌ <strong>${msg}</strong><br>
      <span style="font-size:10px;color:var(--text3)">
        รองรับ: .xlsx .xls .csv .txt .tsv — ต้องมีคอลัมน์ เลขที่งาน / วันที่ / ผู้รับจ้าง
      </span>`;
  }

  // ── Excel / XLSX / XLS ──
  if (ext === 'xlsx' || ext === 'xls') {
    const r = new FileReader();
    r.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), {
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false,
        });

        // ลอง parse ทุก sheet แล้วเอาอันที่ได้ข้อมูลมากที่สุด
        let bestData = [], bestSheet = '';
        for (const shName of wb.SheetNames) {
          const ws   = wb.Sheets[shName];
          const rows = XLSX.utils.sheet_to_json(ws, {
            header:  1,
            raw:     true,          // เอา raw value (Date object + number)
            defval:  null,
            blankrows: false,
          });
          const parsed = processRows(rows);
          if (parsed.length > bestData.length) {
            bestData  = parsed;
            bestSheet = shName;
          }
        }
        onSuccess(bestData, wb.SheetNames.length > 1 ? `Sheet: ${bestSheet}` : '');
      } catch(err) {
        onError(`อ่านไฟล์ Excel ไม่ได้: ${err.message}`);
      }
    };
    r.onerror = () => onError('ไม่สามารถเปิดไฟล์ได้');
    r.readAsArrayBuffer(file);

  // ── CSV / TXT / TSV ──
  } else if (['csv','txt','tsv'].includes(ext)) {
    const r = new FileReader();
    r.onload = e => {
      try {
        // ลอง detect delimiter อัตโนมัติ
        const raw = e.target.result;
        let delim = ',';
        if (ext === 'tsv') delim = '\t';
        else {
          const firstLine = raw.split('\n')[0] || '';
          const tabs  = (firstLine.match(/\t/g)||[]).length;
          const commas= (firstLine.match(/,/g)||[]).length;
          const pipes = (firstLine.match(/\|/g)||[]).length;
          if (tabs >= commas && tabs >= pipes) delim = '\t';
          else if (pipes > commas) delim = '|';
          else delim = ',';
        }
        const result = Papa.parse(raw, {
          delimiter:      delim,
          skipEmptyLines: true,
          dynamicTyping:  false,
        });
        onSuccess(processRows(result.data));
      } catch(err) {
        onError(`อ่านไฟล์ข้อความไม่ได้: ${err.message}`);
      }
    };
    // ลอง encoding ไทย: UTF-8 ก่อน ถ้าเสีย fallback TIS-620
    r.onerror = () => {
      const r2 = new FileReader();
      r2.onload = e2 => {
        try {
          const result = Papa.parse(e2.target.result, { skipEmptyLines: true });
          onSuccess(processRows(result.data));
        } catch(err) { onError(`อ่านไฟล์ไม่ได้: ${err.message}`); }
      };
      r2.readAsText(file, 'TIS-620');
    };
    r.readAsText(file, 'UTF-8');

  // ── ไฟล์ประเภทอื่น — ลองอ่านเป็น text ──
  } else {
    const r = new FileReader();
    r.onload = e => {
      try {
        const result = Papa.parse(e.target.result, { skipEmptyLines: true });
        const data = processRows(result.data);
        if (data.length) {
          onSuccess(data, `(อ่านเป็น CSV)`);
        } else {
          onError(`ไม่รู้จักไฟล์ประเภท ".${ext}" — ลองบันทึกเป็น .xlsx หรือ .csv แล้วนำเข้าใหม่`);
        }
      } catch { onError(`ไม่รู้จักไฟล์ประเภท ".${ext}"`); }
    };
    r.readAsText(file, 'UTF-8');
  }
}


// ════════════════════════════════════════════════════════════════
//  PASSWORD GATE — รหัสผ่านสำหรับนำเข้าข้อมูล
// ════════════════════════════════════════════════════════════════

const IMPORT_PASSWORD = '121212';
let _pendingFiles = null;   // ไฟล์ที่รอ password confirm

function pwShowModal(files) {
  _pendingFiles = files;
  const existing = document.getElementById('pwModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'pwModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:380px">
      <h2>🔒 ยืนยันตัวตน</h2>
      <p>กรอกรหัสผ่านเพื่อนำเข้าข้อมูล<br>
         <span style="color:var(--amber);font-family:var(--mono);font-size:11px">
           ไฟล์: ${[...files].map(f=>f.name).join(', ')}
         </span>
      </p>
      <div class="modal-field">
        <label>รหัสผ่าน</label>
        <input id="pwInput" type="password" placeholder="••••••"
               autofocus autocomplete="off"
               onkeydown="if(event.key==='Enter') pwConfirm()">
      </div>
      <div id="pwError" style="color:var(--red);font-size:11px;font-family:var(--mono);
           margin-top:-8px;margin-bottom:12px;display:none">
        ❌ รหัสผ่านไม่ถูกต้อง
      </div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-primary" onclick="pwConfirm()">✅ ยืนยัน</button>
        <button class="modal-btn modal-btn-skip" onclick="pwCancel()">ยกเลิก</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(()=>document.getElementById('pwInput').focus(), 100);
}

function pwConfirm() {
  const val = document.getElementById('pwInput').value;
  if (val !== IMPORT_PASSWORD) {
    const err = document.getElementById('pwError');
    err.style.display = 'block';
    document.getElementById('pwInput').value = '';
    document.getElementById('pwInput').focus();
    // shake animation
    const box = document.querySelector('#pwModal .modal-box');
    box.style.animation = 'none';
    box.style.transform = 'translateX(-8px)';
    setTimeout(()=>{ box.style.transform='translateX(8px)'; }, 80);
    setTimeout(()=>{ box.style.transform='translateX(0)'; }, 160);
    return;
  }
  document.getElementById('pwModal').remove();
  // ผ่าน password → นำเข้าไฟล์
  if (_pendingFiles) {
    [..._pendingFiles].forEach(handleFile);
    _pendingFiles = null;
  }
}

function pwCancel() {
  document.getElementById('pwModal').remove();
  _pendingFiles = null;
  // reset file input
  document.getElementById('fileInput').value = '';
}

/* ── ล้างข้อมูล — ต้องใช้ password ── */
function pwClearData() {
  const existing = document.getElementById('pwModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'pwModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:380px">
      <h2>🗑️ ล้างข้อมูลทั้งหมด</h2>
      <p style="color:var(--red)">การดำเนินการนี้จะลบข้อมูลทั้งหมดออกจากระบบ<br>
         และไม่สามารถกู้คืนได้ — กรุณายืนยันด้วยรหัสผ่าน</p>
      <div class="modal-field">
        <label>รหัสผ่าน</label>
        <input id="pwInput" type="password" placeholder="••••••"
               autofocus autocomplete="off"
               onkeydown="if(event.key==='Enter') pwConfirmClear()">
      </div>
      <div id="pwError" style="color:var(--red);font-size:11px;font-family:var(--mono);
           margin-top:-8px;margin-bottom:12px;display:none">❌ รหัสผ่านไม่ถูกต้อง</div>
      <div class="modal-actions">
        <button class="modal-btn" style="flex:1;padding:11px;border-radius:9px;cursor:pointer;
          background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.4);
          color:var(--red);font-family:var(--font);font-size:13px;font-weight:700;"
          onclick="pwConfirmClear()">🗑️ ยืนยันล้างข้อมูล</button>
        <button class="modal-btn modal-btn-skip" onclick="pwCancel()">ยกเลิก</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(()=>document.getElementById('pwInput').focus(), 100);
}

function pwConfirmClear() {
  const val = document.getElementById('pwInput').value;
  if (val !== IMPORT_PASSWORD) {
    const err = document.getElementById('pwError');
    err.style.display = 'block';
    document.getElementById('pwInput').value = '';
    document.getElementById('pwInput').focus();
    const box = document.querySelector('#pwModal .modal-box');
    box.style.transform = 'translateX(-8px)';
    setTimeout(()=>{ box.style.transform='translateX(8px)'; }, 80);
    setTimeout(()=>{ box.style.transform='translateX(0)'; }, 160);
    return;
  }
  document.getElementById('pwModal').remove();
  localStorage.removeItem('kppl_data');
  localStorage.removeItem('kppl_meta');
  allData = BUILTIN_DATA;
  updateAll();
  dbRenderStatus(null, 'cleared');
  document.getElementById('uibImportInfo').innerHTML =
    '<span class="uib-nodata">— ยังไม่มีการนำเข้าไฟล์ —</span>';
  document.getElementById('importStatus').className = '';
  document.getElementById('importStatus').textContent = '';
  console.log('[DB] ล้างข้อมูลแล้ว');
}


// ════════════════════════════════════════════════════════════════
//  SQL EXPORT — บันทึกข้อมูลเป็น database.sql
// ════════════════════════════════════════════════════════════════

// ── กุญแจ localStorage สำหรับเก็บ job_id ที่เคย export ไปแล้ว ──
const LS_SQL_IDS_KEY = 'kppl_sql_exported_ids';

/** โหลด Set ของ job_id ที่เคย export ไปแล้ว */
function sqlLoadExportedIds() {
  try {
    const raw = localStorage.getItem(LS_SQL_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

/** บันทึก Set ของ job_id ที่ export ไปแล้วลง localStorage */
function sqlSaveExportedIds(idSet) {
  try {
    localStorage.setItem(LS_SQL_IDS_KEY, JSON.stringify([...idSet]));
  } catch(e) { console.warn('[SQL] บันทึก exported IDs ไม่สำเร็จ:', e); }
}

/**
 * exportSQL — ส่งออก SQL เฉพาะรายการใหม่ที่ยังไม่เคย export
 * @param {Array}   rows      — allData ชุดปัจจุบัน
 * @param {string}  fileName  — ชื่อไฟล์ต้นทาง
 * @param {boolean} forceAll  — true = export ทั้งหมด (reset)
 */
function exportSQL(rows, fileName, forceAll = false) {
  const now    = new Date();
  const p      = n => String(n).padStart(2,'0');
  const M      = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const ts     = `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
  const tsThai = `${p(now.getDate())} ${M[now.getMonth()]} ${now.getFullYear()+543} ${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
  const esc    = s => String(s||'').replace(/'/g, "''");

  // ── หา job_id ที่เคย export ไปแล้ว ──
  const exportedIds = forceAll ? new Set() : sqlLoadExportedIds();

  // ── แยกรายการใหม่ (ยังไม่เคย export) ──
  const newRows = rows.filter(r => {
    const jid = String(r[0]||'').trim();
    return jid && !exportedIds.has(jid);
  });

  if (newRows.length === 0) {
    // ไม่มีรายการใหม่ → แจ้ง user แต่ไม่ดาวน์โหลดไฟล์ว่าง
    const st = document.getElementById('importStatus');
    if (st) {
      st.className = 'import-status';
      st.innerHTML = `<span style="color:var(--amber)">⚠️ ไม่มีรายการใหม่ — ข้อมูลทั้งหมดถูก export ไปแล้ว
        <button onclick="exportSQL(allData,'${esc(fileName)}',true)"
          style="margin-left:8px;padding:2px 8px;font-size:10px;background:rgba(255,171,0,.15);
                 border:1px solid var(--amber);border-radius:4px;color:var(--amber);cursor:pointer">
          Export ใหม่ทั้งหมด
        </button></span>`;
    }
    console.log('[SQL] ไม่มีรายการใหม่ทั้งหมด', rows.length, 'รายการถูก export ไปแล้ว');
    return;
  }

  // ── สร้าง SQL header ──
  const isIncremental = !forceAll && exportedIds.size > 0;
  const mode = isIncremental
    ? `เพิ่มเฉพาะรายการใหม่ (${newRows.length} จาก ${rows.length} รายการ)`
    : `Export ทั้งหมด (${newRows.length} รายการ)`;

  let sql = `-- ════════════════════════════════════════════════════════
-- database.sql — ฐานข้อมูลระบบติดตามเอกสารรอประมาณราคางานซ่อมท่อ
-- กปภ.สาขาพิษณุโลก
-- ════════════════════════════════════════════════════════
-- นำเข้าจากไฟล์ : ${esc(fileName)}
-- วันที่บันทึก   : ${tsThai}
-- โหมด          : ${mode}
-- รายการที่ export: ${newRows.length} รายการ
-- รายการใน DB เดิม: ${exportedIds.size} รายการ
-- ════════════════════════════════════════════════════════

-- สร้างตาราง (ถ้ายังไม่มี)
CREATE TABLE IF NOT EXISTS pipe_repair_docs (
  id           INTEGER      PRIMARY KEY AUTOINCREMENT,
  job_id       VARCHAR(50)  NOT NULL UNIQUE,   -- UNIQUE = ป้องกัน duplicate
  job_date     DATETIME,
  contractor   VARCHAR(100),
  note         VARCHAR(255),
  imported_at  DATETIME     NOT NULL,
  source_file  VARCHAR(255)
);

-- ════════════════════════════════════════════════════════
${isIncremental
  ? `-- INSERT เฉพาะรายการใหม่ ${newRows.length} รายการ (ข้ามถ้า job_id ซ้ำ)
-- ใช้ INSERT OR IGNORE (SQLite) หรือ INSERT IGNORE (MySQL)`
  : `-- INSERT ทั้งหมด ${newRows.length} รายการ (ข้ามถ้า job_id ซ้ำ)`}
-- ════════════════════════════════════════════════════════

-- SQLite syntax:
INSERT OR IGNORE INTO pipe_repair_docs
  (job_id, job_date, contractor, note, imported_at, source_file)
VALUES\n`;

  const values = newRows.map(r =>
    `  ('${esc(r[0])}', ${r[1] ? `'${esc(r[1])}'` : 'NULL'}, '${esc(r[2]||'')}', '${esc(r[3]||'')}', '${ts}', '${esc(fileName)}')`
  );
  sql += values.join(',\n') + ';\n\n';

  // MySQL alternative
  sql += `-- ════════════════════════════════════════════════════════
-- MySQL / MariaDB syntax (ถ้าใช้ MySQL ให้ใช้ส่วนนี้แทน):
-- ════════════════════════════════════════════════════════
-- INSERT IGNORE INTO pipe_repair_docs
--   (job_id, job_date, contractor, note, imported_at, source_file)
-- VALUES
${values.map(v => `-- ${v}`).join(',\n')};\n\n`;

  sql += `-- ════════════════════════════════════════════════════════
-- รายการ job_id ที่ export ในครั้งนี้ (${newRows.length} รายการ):
${newRows.map(r=>`-- ${r[0]}`).join('\n')}
-- ════════════════════════════════════════════════════════
-- สิ้นสุดไฟล์ database.sql — บันทึกเมื่อ: ${ts}
-- ════════════════════════════════════════════════════════\n`;

  // ── อัพเดท exported IDs ใน localStorage ──
  const newIds = new Set(exportedIds);
  newRows.forEach(r => { const jid = String(r[0]||'').trim(); if(jid) newIds.add(jid); });
  sqlSaveExportedIds(newIds);

  // ── ชื่อไฟล์ดาวน์โหลด ──
  const nowTag = `${now.getFullYear()}${p(now.getMonth()+1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}`;
  const dlName = isIncremental ? `db_append_${nowTag}.sql` : `database_${nowTag}.sql`;

  // ── Download ──
  const blob = new Blob([sql], { type:'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = dlName;
  a.click();
  URL.revokeObjectURL(url);
  console.log(`[SQL] ดาวน์โหลด ${dlName} — ${newRows.length} รายการใหม่ (จาก ${rows.length} ทั้งหมด)`);

  // ── แสดงสถานะ ──
  const st = document.getElementById('importStatus');
  if (st) {
    const prev = exportedIds.size;
    st.className = 'import-status success';
    st.innerHTML = isIncremental
      ? `✅ นำเข้าสำเร็จ · เพิ่ม <strong>${newRows.length}</strong> รายการใหม่ลง SQL
         <span style="color:var(--text3);font-size:10px"> (มีอยู่แล้ว ${prev} · รวม ${newIds.size})</span>
         <button onclick="exportSQL(allData,'${esc(fileName)}',true)"
           style="margin-left:8px;padding:2px 8px;font-size:10px;background:rgba(0,200,80,.1);
                  border:1px solid rgba(0,200,80,.4);border-radius:4px;color:var(--green);cursor:pointer">
           Export ใหม่ทั้งหมด
         </button>`
      : `✅ Export ทั้งหมด <strong>${newRows.length}</strong> รายการ`;
  }
}

