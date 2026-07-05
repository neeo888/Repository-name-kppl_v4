/* ────────────────────────────────────────────────────────────
   กปภ.พิษณุโลก Dashboard — js/table.js
   Table render/filter/sort · Excel+PDF export
   ──────────────────────────────────────────────────────────── */

// ════════════════════════════════
//  TABLE
// ════════════════════════════════
let activeTableTab = 'all';

function getMonLabel(dtStr) {
  if (!dtStr) return '';
  const d = new Date(dtStr);
  if (isNaN(d)) return '';
  return `${MONTHS_TH[d.getMonth()]} ${String(d.getFullYear()+543).slice(-2)}`;
}
function inferType() { return 'ท่อรั่ว'; }

function setTableTab(tab) {
  activeTableTab = tab;
  document.querySelectorAll('.table-tab').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(`tab_${tab}`);
  if (activeEl) activeEl.classList.add('active');

  const titles = {
    all: 'รายการทั้งหมด',
    estimate: '1) รอประมาณราคา',
    set: '2) รอจัดชุด',
    my: '3) ชุดเบิกของฉัน'
  };
  const titleEl = document.getElementById('tableTitleText');
  if (titleEl) titleEl.textContent = titles[tab] || 'รายการเอกสาร';

  filterAndRender();
}

function updateTableTabBadges() {
  if (!allData) return;
  const countAll = allData.length;
  const countEstimate = allData.filter(d => 
    (d[3] || '').includes('รอประมาณราคา') || (d[3] || '').startsWith('1)') ||
    (d[4] || '').includes('รอประมาณราคา') || (d[4] || '').startsWith('1)')
  ).length;
  const countSet = allData.filter(d => 
    (d[3] || '').includes('รอจัดชุด') || (d[3] || '').startsWith('2)') ||
    (d[4] || '').includes('รอจัดชุด') || (d[4] || '').startsWith('2)')
  ).length;
  const countMy = allData.filter(d => 
    (d[3] || '').includes('ชุดเบิก') || (d[3] || '').includes('เบิกของฉัน') || (d[3] || '').startsWith('3)') ||
    (d[4] || '').includes('ชุดเบิก') || (d[4] || '').includes('เบิกของฉัน') || (d[4] || '').startsWith('3)')
  ).length;

  const elAll = document.getElementById('tab_all_badge');
  const elEstimate = document.getElementById('tab_estimate_badge');
  const elSet = document.getElementById('tab_set_badge');
  const elMy = document.getElementById('tab_my_badge');

  if (elAll) elAll.textContent = countAll.toLocaleString();
  if (elEstimate) elEstimate.textContent = countEstimate.toLocaleString();
  if (elSet) elSet.textContent = countSet.toLocaleString();
  if (elMy) elMy.textContent = countMy.toLocaleString();
}

window.activeDashboardFilter = null;

window.setDashboardCardFilter = function(filterType) {
  // If the user clicks 'contractors', scroll to the leaderboard
  if (filterType === 'contractors') {
    const el = document.querySelector('[data-section="leaderboard"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  
  // If the user clicks 'average', scroll to the analysis section
  if (filterType === 'average') {
    const el = document.querySelector('.expand-btn-row');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  
  // Set custom filter type
  window.activeDashboardFilter = filterType;
  
  if (filterType === 'current_month') {
    // Set month selector to current month
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const selMo = document.getElementById('filterMonth');
    if (selMo) {
      selMo.value = currentMonthPrefix;
      document.getElementById('fMoWrap').classList.toggle('active', !!currentMonthPrefix);
    }
    window.activeDashboardFilter = null; // dropdown handles it
  } else if (filterType === 'total_estimate') {
    if (typeof clearFilters === 'function') {
      clearFilters();
    }
    return;
  }
  
  // Trigger filter and render
  if (typeof filterAndRender === 'function') {
    filterAndRender();
  }
  
  // Scroll to table panel
  const tableEl = document.querySelector('.panel');
  if (tableEl) {
    tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

function clearFilters() {
  window.activeDashboardFilter = null;
  ['filterContractor2','filterMonth','filterType','searchInput'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  document.querySelectorAll('.f-select-wrap').forEach(w=>w.classList.remove('active'));
  filterAndRender();
}

function filterAndRender() {
  updateTableTabBadges();
  const search = document.getElementById('searchInput').value.toLowerCase();
  const ct     = document.getElementById('filterContractor2').value;
  const mo     = document.getElementById('filterMonth').value;
  const typ    = document.getElementById('filterType').value;

  document.getElementById('fCtWrap').classList.toggle('active',!!ct);
  document.getElementById('fMoWrap').classList.toggle('active',!!mo);
  document.getElementById('fTypWrap').classList.toggle('active',!!typ);

  filteredData = allData.filter(d=>{
    const mSearch = !search||(d[0]||'').toLowerCase().includes(search)||(d[2]||'').toLowerCase().includes(search);
    const mCt  = !ct  || d[2]===ct;
    const mMo  = !mo  || (d[1]&&d[1].startsWith(mo));
    const mTyp = !typ;

    // Custom dashboard filter card click logic
    let mCustom = true;
    if (window.activeDashboardFilter) {
      const now = new Date();
      const currentFY = getFiscalYear();
      const rDate = d[1] ? new Date(d[1]) : null;
      
      const getRowFY = (dateStr) => {
        if (!dateStr) return null;
        const dt = new Date(dateStr);
        if (isNaN(dt)) return null;
        const y = dt.getFullYear();
        const m = dt.getMonth();
        return m >= 9 ? y + 1 + 543 : y + 543;
      };

      if (window.activeDashboardFilter === 'pending_estimate') {
        mCustom = d[5] === window.lastImportedFile;
      } else if (window.activeDashboardFilter === 'kpi_total' || window.activeDashboardFilter === 'kpi_forecast' || window.activeDashboardFilter === 'kpi_success') {
        mCustom = getRowFY(d[1]) === currentFY;
      } else if (window.activeDashboardFilter === 'kpi_rate') {
        const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        mCustom = d[1] && d[1].startsWith(currentMonthPrefix);
      } else if (window.activeDashboardFilter === 'kpi_carryover') {
        mCustom = getRowFY(d[1]) === currentFY && rDate && (now - rDate) / 86400000 > 30;
      } else if (window.activeDashboardFilter === 'estimated_today') {
        const todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
        mCustom = d[1] && d[1].startsWith(todayStr);
      }
    }

    // Tab filter
    let mTab = true;
    if (activeTableTab === 'estimate') {
      mTab = (d[3] || '').includes('รอประมาณราคา') || (d[3] || '').startsWith('1)') ||
             (d[4] || '').includes('รอประมาณราคา') || (d[4] || '').startsWith('1)');
    } else if (activeTableTab === 'set') {
      mTab = (d[3] || '').includes('รอจัดชุด') || (d[3] || '').startsWith('2)') ||
             (d[4] || '').includes('รอจัดชุด') || (d[4] || '').startsWith('2)');
    } else if (activeTableTab === 'my') {
      mTab = (d[3] || '').includes('ชุดเบิก') || (d[3] || '').includes('เบิกของฉัน') || (d[3] || '').startsWith('3)') ||
             (d[4] || '').includes('ชุดเบิก') || (d[4] || '').includes('เบิกของฉัน') || (d[4] || '').startsWith('3)');
    }

    return mSearch&&mCt&&mMo&&mTyp&&mTab&&mCustom;
  });

  if (sortCol>=0) {
    filteredData.sort((a,b)=>{
      let av,bv;
      if (sortCol===4){ av=inferType(a[0]); bv=inferType(b[0]); }
      else { av=a[sortCol]||''; bv=b[sortCol]||''; }
      return av<bv?-sortDir:av>bv?sortDir:0;
    });
  }
  currentPage=1;
  renderTable();
}

function renderTable() {
  const tbody=document.getElementById('tableBody');
  const total=filteredData.length;
  const start=(currentPage-1)*PAGE;
  const slice=filteredData.slice(start,start+PAGE);

  document.getElementById('tableCount').textContent=total.toLocaleString()+' rows';
  document.getElementById('pageInfo').textContent=`แสดง ${start+1}–${Math.min(start+PAGE,total)} จาก ${total}`;

  if (!slice.length) { tbody.innerHTML='<tr><td colspan="6" class="no-data">ไม่พบข้อมูล</td></tr>'; renderPager(0); return; }

  tbody.innerHTML = slice.map((d,i)=>{
    const num  = String(start+i+1).padStart(3,'0');
    const ctag = CT_COLORS[d[2]]||{bg:'rgba(100,116,139,0.1)',color:'#7aa8cc'};
    const closeDate = d[1] ? d[1].slice(0, 19) : '—';
    
    // Check if d[4] contains budget, fallback to parsing d[3] if undefined
    let budget = '0';
    if (d[4] !== undefined) {
      const val = d[4].replace(/,/g, '').trim();
      if (!isNaN(val) && val !== '') {
        budget = parseFloat(val).toLocaleString();
      } else {
        budget = d[4] || '0';
      }
    } else if (d[3]) {
      const match = d[3].match(/^\d+$/);
      if (match) {
        budget = parseInt(match[0]).toLocaleString();
      }
    }

    return `<tr>
      <td><span class="seq-num">${num}</span></td>
      <td><span class="job-id">${d[0]||'—'}</span></td>
      <td><span class="date-cell" style="font-family:var(--mono);font-size:11px">${closeDate}</span></td>
      <td><span class="ct-badge" style="background:${ctag.bg};color:${ctag.color}">${d[2]||'—'}</span></td>
      <td><span class="budget-cell" style="font-family:var(--mono);font-weight:600;color:var(--text)">${budget}</span></td>
      <td><span class="note-cell" style="font-size:12px;color:var(--text2)">${d[3]||'—'}</span></td>
    </tr>`;
  }).join('');

  renderPager(Math.ceil(total/PAGE));
}

function renderPager(pages) {
  const c=document.getElementById('pageBtns');
  if (pages<=1){ c.innerHTML=''; return; }
  let h='';
  if (currentPage>1) h+=`<button class="page-btn" onclick="goPage(${currentPage-1})">‹</button>`;
  for (let p=1;p<=pages;p++) {
    if (pages<=7||p===1||p===pages||Math.abs(p-currentPage)<=1)
      h+=`<button class="page-btn${p===currentPage?' active':''}" onclick="goPage(${p})">${p}</button>`;
    else if (Math.abs(p-currentPage)===2)
      h+=`<span style="color:var(--text3);padding:0 3px">…</span>`;
  }
  if (currentPage<pages) h+=`<button class="page-btn" onclick="goPage(${currentPage+1})">›</button>`;
  c.innerHTML=h;
}
function goPage(p){ currentPage=p; renderTable(); }
function sortTable(col){
  if(sortCol===col) sortDir*=-1; else{sortCol=col;sortDir=1;}
  const th=document.getElementById('thDate');
  if(th) th.textContent=sortCol===1?`วันที่ปิดงาน ${sortDir===1?'↑':'↓'}`:'วันที่ปิดงาน ↕';
  renderTable();
}


// ════════════════════════════════════════════════════════════════
//  TABLE EXPORT — Excel (.xlsx) และ PDF
// ════════════════════════════════════════════════════════════════

const MONTHS_TH_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                        'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

function getExportRows() {
  // ใช้ filteredData (ข้อมูลที่กรองอยู่ตอนนี้) — ถ้ายังไม่กรองจะเป็นทั้งหมด
  return filteredData.length ? filteredData : allData;
}

function fmtDateThai(dtStr) {
  if (!dtStr) return '—';
  const d = new Date(dtStr);
  if (isNaN(d)) return dtStr;
  const p = n => String(n).padStart(2,'0');
  return `${p(d.getDate())} ${MONTHS_TH_FULL[d.getMonth()]} ${d.getFullYear()+543}`;
}

function fmtTimeThai(dtStr) {
  if (!dtStr) return '—';
  const d = new Date(dtStr);
  if (isNaN(d)) return '';
  const p = n => String(n).padStart(2,'0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

function getFilterLabel() {
  const ct  = document.getElementById('filterContractor2').value;
  const mo  = document.getElementById('filterMonth').value;
  const typ = document.getElementById('filterType').value;
  const parts = [];
  if (ct)  parts.push(`ช่าง: ${ct}`);
  if (mo)  parts.push(`เดือน: ${mo}`);
  if (typ) parts.push(`ประเภท: ${typ}`);
  return parts.length ? parts.join(' · ') : 'ทั้งหมด';
}

/* ─────────────────────────────────────────
   EXCEL EXPORT
───────────────────────────────────────── */
function exportTableExcel() {
  const rows = getExportRows();
  if (!rows.length) { alert('ไม่มีข้อมูลสำหรับ Export'); return; }

  const now = new Date();
  const p   = n => String(n).padStart(2,'0');
  const stamp = `${p(now.getDate())}${p(now.getMonth()+1)}${now.getFullYear()+543}`;

  // สร้าง workbook
  const wb = XLSX.utils.book_new();

  // Header rows
  const wsData = [
    ['ระบบติดตามเอกสารรอประมาณราคางานซ่อมท่อ — กปภ.สาขาพิษณุโลก'],
    [`ส่งออกเมื่อ: ${fmtDateThai(now.toISOString())} ${p(now.getHours())}:${p(now.getMinutes())} น.   ·   ตัวกรอง: ${getFilterLabel()}   ·   จำนวน: ${rows.length} รายการ`],
    [], // blank row
    ['#', 'เลขที่งาน', 'วันที่ปิดงาน', 'ผู้รับจ้าง/มิสเตอร์', 'วงเงิน (คาดการณ์)', 'บันทึก'],
  ];

  rows.forEach((r, i) => {
    let budget = 0;
    if (r[3]) {
      const match = r[3].match(/^\d+$/);
      if (match) {
        budget = parseInt(match[0]);
      }
    }
    wsData.push([
      i + 1,
      r[0] || '—',
      r[1] ? r[1].slice(0, 19) : '—',
      r[2] || '—',
      budget,
      r[3] || '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    {wch:6}, {wch:26}, {wch:22}, {wch:26}, {wch:18}, {wch:30}
  ];

  // Merge title row
  ws['!merges'] = [
    { s:{r:0,c:0}, e:{r:0,c:5} },
    { s:{r:1,c:0}, e:{r:1,c:5} },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'รายการเอกสาร');
  XLSX.writeFile(wb, `รายการเอกสาร_${stamp}.xlsx`);
  console.log('[Export] Excel:', rows.length, 'rows');
}

/* ─────────────────────────────────────────
   PDF EXPORT (print-to-PDF via browser)
───────────────────────────────────────── */
function exportTablePDF() {
  const rows = getExportRows();
  if (!rows.length) { alert('ไม่มีข้อมูลสำหรับ Export'); return; }

  const now = new Date();
  const p   = n => String(n).padStart(2,'0');
  const stampThai = `${p(now.getDate())} ${MONTHS_TH_FULL[now.getMonth()]} ${now.getFullYear()+543}  ${p(now.getHours())}:${p(now.getMinutes())} น.`;

  const tableRows = rows.map((r, i) => {
    let budget = '0';
    if (r[3]) {
      const match = r[3].match(/^\d+$/);
      if (match) {
        budget = parseInt(match[0]).toLocaleString();
      }
    }
    return `<tr>
      <td style="text-align:center;color:#64748b">${i+1}</td>
      <td style="font-family:monospace;font-size:11px;color:#00c8ff">${r[0]||'—'}</td>
      <td style="font-family:monospace;font-size:11px">${r[1] ? r[1].slice(0,19) : '—'}</td>
      <td>${r[2]||'—'}</td>
      <td style="font-family:monospace;font-size:11px;text-align:right">${budget}</td>
      <td style="color:#475569">${r[3]||'—'}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="th"><head>
    <meta charset="UTF-8">
    <title>รายการเอกสาร — กปภ.สาขาพิษณุโลก</title>
    <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'Kanit',sans-serif; font-size:12px; color:#1e293b; background:#fff; padding:24px; }
      .header { border-bottom:3px solid #0ea5e9; padding-bottom:16px; margin-bottom:20px; }
      .title { font-size:18px; font-weight:700; color:#0c4a6e; line-height:1.3; }
      .subtitle { font-size:10px; color:#64748b; margin-top:4px; font-family:monospace; }
      .meta { display:flex; gap:24px; margin-top:10px; }
      .meta-item { font-size:11px; color:#475569; }
      .meta-item strong { color:#0c4a6e; }
      table { width:100%; border-collapse:collapse; margin-top:4px; }
      th { background:#0c4a6e; color:#fff; padding:8px 10px; text-align:left;
           font-size:10px; font-weight:700; letter-spacing:0.05em; }
      td { padding:7px 10px; border-bottom:1px solid #e2e8f0; font-size:11px; }
      tr:nth-child(even) td { background:#f8fafc; }
      tr:last-child td { border-bottom:2px solid #0ea5e9; }
      .footer { margin-top:16px; font-size:9px; color:#94a3b8; text-align:right; font-family:monospace; }
      @media print {
        body { padding:12px; }
        @page { size:A4 landscape; margin:12mm; }
      }
    </style>
  </head><body>
    <div class="header">
      <div class="title">ระบบติดตามเอกสารรอประมาณราคางานซ่อมท่อ<br>กปภ.สาขาพิษณุโลก</div>
      <div class="subtitle">PIPE REPAIR DOCUMENT TRACKING · PROVINCIAL WATERWORKS AUTHORITY</div>
      <div class="meta">
        <div class="meta-item">📅 วันที่พิมพ์: <strong>${stampThai}</strong></div>
        <div class="meta-item">🔍 ตัวกรอง: <strong>${getFilterLabel()}</strong></div>
        <div class="meta-item">📋 จำนวน: <strong>${rows.length} รายการ</strong></div>
      </div>
    </div>
    <table>
      <thead><tr>
        <th style="width:40px">#</th>
        <th style="width:20%">เลขที่งาน</th>
        <th style="width:22%">วันที่ปิดงาน</th>
        <th style="width:22%">ผู้รับจ้าง/มิสเตอร์</th>
        <th style="width:14%">วงเงิน (คาดการณ์)</th>
        <th>บันทึก</th>
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="footer">ส่งออกจากระบบติดตามเอกสารรอประมาณราคางานซ่อมท่อ กปภ.สาขาพิษณุโลก · ${stampThai}</div>
    <script>window.onload=()=>{ window.print(); window.onafterprint=()=>window.close(); }<\/script>
  </body></html>`;

  const win = window.open('', '_blank', 'width=1100,height=750');
  win.document.write(html);
  win.document.close();
}

// ════════════════════════════════════════════════════════════════
//  CUSTOM TICKER MESSAGES — เพิ่มข้อความแจ้งเตือนพิเศษ
//  ต้องใช้ password 121212 ก่อนแก้ไข
// ════════════════════════════════════════════════════════════════

const CMSG_KEY = 'kppl_custom_msgs';

function cmsgLoad() {
  try { return JSON.parse(localStorage.getItem(CMSG_KEY) || '[]'); }
  catch(e) { return []; }
}
function cmsgSave(msgs) {
  localStorage.setItem(CMSG_KEY, JSON.stringify(msgs));
}

/* ── Modal แก้ไขข้อความ (เปิดหลังจาก verify password แล้ว) ── */
function tickerMsgModal() {
  // ต้อง verify password ก่อน
  _tickerMsgAction = 'openEditor';
  showPwForTickerMsg();
}

let _tickerMsgAction = null;

function showPwForTickerMsg() {
  const existing = document.getElementById('pwModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'pwModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:360px">
      <h2>✏️ แก้ไขข้อความ Ticker</h2>
      <p>กรอกรหัสผ่านเพื่อเพิ่ม/แก้ไขข้อความแจ้งเตือน</p>
      <div class="modal-field">
        <label>รหัสผ่าน</label>
        <input id="pwInput" type="password" placeholder="••••••"
               autofocus autocomplete="off"
               onkeydown="if(event.key==='Enter') pwTickerConfirm()">
      </div>
      <div id="pwError" style="color:var(--red);font-size:11px;font-family:var(--mono);
           margin-top:-8px;margin-bottom:12px;display:none">❌ รหัสผ่านไม่ถูกต้อง</div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-primary" onclick="pwTickerConfirm()">✅ ยืนยัน</button>
        <button class="modal-btn modal-btn-skip" onclick="pwCancel()">ยกเลิก</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  setTimeout(()=>document.getElementById('pwInput').focus(), 100);
}

function pwTickerConfirm() {
  const val = document.getElementById('pwInput').value;
  if (val !== IMPORT_PASSWORD) {
    const err = document.getElementById('pwError');
    err.style.display = 'block';
    document.getElementById('pwInput').value = '';
    document.getElementById('pwInput').focus();
    const box = document.querySelector('#pwModal .modal-box');
    box.style.transform='translateX(-8px)';
    setTimeout(()=>{ box.style.transform='translateX(8px)'; },80);
    setTimeout(()=>{ box.style.transform='translateX(0)'; },160);
    return;
  }
  document.getElementById('pwModal').remove();
  openTickerEditor();
}

/* ── เปิด Editor ── */
function openTickerEditor() {
  const existing = document.getElementById('tickerEditorModal');
  if (existing) existing.remove();

  const msgs   = cmsgLoad();
  const typeOpts = [
    { key:'info',  label:'🔵 ทั่วไป',   color:'#67e8f9' },
    { key:'ok',    label:'🟢 ดี/ชม',     color:'#4ade80' },
    { key:'alert', label:'🟡 แจ้งเตือน', color:'#fbbf24' },
    { key:'warn',  label:'🔴 ด่วน',      color:'#ff6b7a' },
  ];

  const listHtml = msgs.length
    ? msgs.map((m,i)=>`
        <div class="cmsg-item" id="cmsg_${i}">
          <span style="font-size:13px">${{info:'🔵',ok:'🟢',alert:'🟡',warn:'🔴'}[m.type]||'🔵'}</span>
          <span class="cmsg-text">${m.text}</span>
          <span class="cmsg-del" onclick="cmsgDelete(${i})" title="ลบ">✕</span>
        </div>`).join('')
    : '<div class="cmsg-empty">ยังไม่มีข้อความพิเศษ</div>';

  const modal = document.createElement('div');
  modal.id = 'tickerEditorModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:520px">
      <h2>✏️ ข้อความแจ้งเตือนพิเศษ</h2>
      <p>ข้อความเหล่านี้จะปรากฏใน Ticker ตัววิ่งบน Header</p>

      <div style="font-size:11px;color:var(--cyan2);font-family:var(--mono);font-weight:700;
                  letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">
        ข้อความปัจจุบัน
      </div>
      <div class="cmsg-list" id="cmsgList">${listHtml}</div>

      <div style="font-size:11px;color:var(--cyan2);font-family:var(--mono);font-weight:700;
                  letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">
        เพิ่มข้อความใหม่
      </div>
      <textarea class="cmsg-textarea" id="cmsgInput"
        placeholder="พิมพ์ข้อความแจ้งเตือน เช่น ประชุมประจำเดือน วันที่ 15 ม.ค. 2568 เวลา 09.00 น."></textarea>

      <div class="cmsg-type-row" id="cmsgTypeRow">
        ${typeOpts.map(t=>`
          <button class="cmsg-type-btn ${t.key==='info'?'active':''}"
            id="cmsgType_${t.key}"
            style="background:${t.key==='info'?t.color+'22':'rgba(255,255,255,0.04)'};
                   border-color:${t.key==='info'?t.color:'rgba(255,255,255,0.12)'};
                   color:${t.color}"
            onclick="cmsgSelectType('${t.key}','${t.color}')">${t.label}</button>`).join('')}
      </div>
      <input type="hidden" id="cmsgSelectedType" value="info">

      <div class="modal-actions" style="margin-top:16px">
        <button class="modal-btn modal-btn-primary" onclick="cmsgAdd()">➕ เพิ่มข้อความ</button>
        <button class="modal-btn modal-btn-skip" onclick="document.getElementById('tickerEditorModal').remove()">ปิด</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function cmsgSelectType(key, color) {
  document.getElementById('cmsgSelectedType').value = key;
  // reset all buttons
  ['info','ok','alert','warn'].forEach(k => {
    const btn = document.getElementById(`cmsgType_${k}`);
    const colors = {info:'#67e8f9',ok:'#4ade80',alert:'#fbbf24',warn:'#ff6b7a'};
    btn.style.background = k===key ? colors[k]+'22' : 'rgba(255,255,255,0.04)';
    btn.style.borderColor = k===key ? colors[k] : 'rgba(255,255,255,0.12)';
    btn.classList.toggle('active', k===key);
  });
}

function cmsgAdd() {
  const text = document.getElementById('cmsgInput').value.trim();
  if (!text) { document.getElementById('cmsgInput').focus(); return; }
  const type = document.getElementById('cmsgSelectedType').value;
  const msgs = cmsgLoad();
  msgs.push({ text, type, addedAt: new Date().toISOString() });
  cmsgSave(msgs);
  document.getElementById('cmsgInput').value = '';
  // refresh list
  const icons = {info:'🔵',ok:'🟢',alert:'🟡',warn:'🔴'};
  const listEl = document.getElementById('cmsgList');
  listEl.innerHTML = msgs.map((m,i)=>`
    <div class="cmsg-item" id="cmsg_${i}">
      <span style="font-size:13px">${icons[m.type]||'🔵'}</span>
      <span class="cmsg-text">${m.text}</span>
      <span class="cmsg-del" onclick="cmsgDelete(${i})" title="ลบ">✕</span>
    </div>`).join('');
  // rebuild ticker
  if (allData.length) renderLeaderboard(allData);
}

function cmsgDelete(i) {
  const msgs = cmsgLoad();
  msgs.splice(i, 1);
  cmsgSave(msgs);
  // ลบ element ออกจาก list
  const el = document.getElementById(`cmsg_${i}`);
  if (el) {
    el.style.transition = 'opacity .2s,transform .2s';
    el.style.opacity = '0'; el.style.transform = 'translateX(20px)';
    setTimeout(()=>{ openTickerEditor(); }, 200);
  }
  if (allData.length) renderLeaderboard(allData);
}

