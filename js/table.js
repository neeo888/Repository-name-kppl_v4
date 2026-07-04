/* ────────────────────────────────────────────────────────────
   กปภ.พิษณุโลก Dashboard — js/table.js
   Table render/filter/sort · Excel+PDF export
   ──────────────────────────────────────────────────────────── */

// ════════════════════════════════
//  TABLE
// ════════════════════════════════
function getMonLabel(dtStr) {
  if (!dtStr) return '';
  const d = new Date(dtStr);
  if (isNaN(d)) return '';
  return `${MONTHS_TH[d.getMonth()]} ${String(d.getFullYear()+543).slice(-2)}`;
}
function inferType() { return 'ท่อรั่ว'; }

function clearFilters() {
  ['filterContractor2','filterMonth','filterType','searchInput'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  document.querySelectorAll('.f-select-wrap').forEach(w=>w.classList.remove('active'));
  filterAndRender();
}

function filterAndRender() {
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
    return mSearch&&mCt&&mMo&&mTyp;
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

  if (!slice.length) { tbody.innerHTML='<tr><td colspan="5" class="no-data">ไม่พบข้อมูล</td></tr>'; renderPager(0); return; }

  tbody.innerHTML = slice.map((d,i)=>{
    const num  = String(start+i+1).padStart(3,'0');
    const ctag = CT_COLORS[d[2]]||{bg:'rgba(100,116,139,0.1)',color:'#7aa8cc'};
    const mo   = getMonLabel(d[1]);
    return `<tr>
      <td><span class="seq-num">${num}</span></td>
      <td><span class="job-id">${d[0]||'—'}</span></td>
      <td><span class="type-pill t-red">${inferType(d[0])}</span></td>
      <td><span class="ct-badge" style="background:${ctag.bg};color:${ctag.color}">${d[2]||'—'}</span></td>
      <td><span class="mo-cell">${mo||'—'}</span></td>
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
  if(th) th.textContent=sortCol===1?`เดือน ${sortDir===1?'↑':'↓'}`:'เดือน ↕';
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
    ['ระบบติดตามเอกสารรอเบิกงานซ่อมท่อ — กปภ.สาขาพิษณุโลก'],
    [`ส่งออกเมื่อ: ${fmtDateThai(now.toISOString())} ${p(now.getHours())}:${p(now.getMinutes())} น.   ·   ตัวกรอง: ${getFilterLabel()}   ·   จำนวน: ${rows.length} รายการ`],
    [], // blank row
    ['#', 'รหัสงาน (CC)', 'วันที่ปิดงาน', 'เวลา', 'ช่าง / บริษัท', 'ประเภทงาน', 'หมายเหตุ'],
  ];

  rows.forEach((r, i) => {
    const typ = inferType ? inferType(r[0]) : (r[3] || '—');
    wsData.push([
      i + 1,
      r[0] || '—',
      fmtDateThai(r[1]),
      fmtTimeThai(r[1]),
      shortName(r[2] || '—'),
      typ,
      r[3] || '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    {wch:6}, {wch:26}, {wch:20}, {wch:8}, {wch:22}, {wch:14}, {wch:20}
  ];

  // Merge title row
  ws['!merges'] = [
    { s:{r:0,c:0}, e:{r:0,c:6} },
    { s:{r:1,c:0}, e:{r:1,c:6} },
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
    const typ = inferType ? inferType(r[0]) : (r[3] || '—');
    const badgeColor = {
      'ท่อรั่ว':'#f472b6','ท่อแตก':'#ff6b7a','ท่ออุด':'#fbbf24','อื่นๆ':'#94a3b8'
    }[typ] || '#94a3b8';
    return `<tr>
      <td style="text-align:center;color:#64748b">${i+1}</td>
      <td style="font-family:monospace;font-size:11px;color:#00c8ff">${r[0]||'—'}</td>
      <td>${fmtDateThai(r[1])}</td>
      <td style="text-align:center;font-family:monospace;font-size:11px">${fmtTimeThai(r[1])}</td>
      <td>${shortName(r[2]||'—')}</td>
      <td style="text-align:center">
        <span style="background:${badgeColor}22;color:${badgeColor};border:1px solid ${badgeColor}55;
          padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700">${typ}</span>
      </td>
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
      <div class="title">ระบบติดตามเอกสารรอเบิกงานซ่อมท่อ<br>กปภ.สาขาพิษณุโลก</div>
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
        <th style="width:22%">รหัสงาน (CC)</th>
        <th style="width:18%">วันที่ปิดงาน</th>
        <th style="width:8%">เวลา</th>
        <th>ช่าง / บริษัท</th>
        <th style="width:10%">ประเภทงาน</th>
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="footer">ส่งออกจากระบบติดตามเอกสารรอเบิกงานซ่อมท่อ กปภ.สาขาพิษณุโลก · ${stampThai}</div>
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

