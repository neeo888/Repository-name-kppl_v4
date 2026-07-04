/* ────────────────────────────────────────────────────────────
   กปภ.พิษณุโลก Dashboard — js/ui.js
   Greeting · Leaderboard+Ticker · Expand panels
   ──────────────────────────────────────────────────────────── */

// ════════════════════════════════════════════════════════════════
//  GREETING — คำทักทายตามวันหยุดและเวลา
// ════════════════════════════════════════════════════════════════

const HOLIDAYS = [
  // เดือน(0-based), วัน, ข้อความ, emoji, สี gradient
  { m:0,  d:1,  range:3, title:'สวัสดีปีใหม่! 🎆',        sub:'Happy New Year — ขอให้โชคดีตลอดปี',          emoji:'🎊', color:'rgba(0,200,255,0.12)' },
  { m:1,  d:14, range:1, title:'Happy Valentine\'s Day 💕', sub:'วันแห่งความรัก — รักกันนะทุกคน',            emoji:'💝', color:'rgba(255,100,150,0.12)' },
  { m:3,  d:13, range:3, title:'สวัสดีวันสงกรานต์! 💦',   sub:'ปีใหม่ไทย — ขอให้ชีวิตสดใสเหมือนสายน้ำ',   emoji:'💦', color:'rgba(0,180,255,0.12)' },
  { m:4,  d:1,  range:1, title:'วันแรงงาน 👷',             sub:'Happy Labour Day — ขอบคุณแรงงานทุกคน',       emoji:'⚒️', color:'rgba(255,171,0,0.12)' },
  { m:4,  d:5,  range:1, title:'วันฉัตรมงคล 👑',           sub:'น้อมใจถวายพระพรแด่ในหลวง',                  emoji:'👑', color:'rgba(255,215,0,0.12)' },
  { m:5,  d:3,  range:1, title:'วันเฉลิมพระชนมพรรษา QueenB',sub:'ทรงพระเจริญยิ่งยืนนาน',                  emoji:'💜', color:'rgba(180,100,255,0.12)' },
  { m:6,  d:28, range:1, title:'วันสถาปนา กปภ. 💧',        sub:'ครบรอบการก่อตั้งการประปาส่วนภูมิภาค',       emoji:'💧', color:'rgba(0,150,255,0.12)' },
  { m:7,  d:12, range:1, title:'วันแม่แห่งชาติ 👩',         sub:'Happy Mother\'s Day — รักแม่ที่สุดในโลก',   emoji:'🌷', color:'rgba(255,150,200,0.12)' },
  { m:9,  d:13, range:1, title:'วันคล้ายวันสวรรคต ร.9',   sub:'น้อมรำลึกในพระมหากรุณาธิคุณ',               emoji:'🖤', color:'rgba(100,100,100,0.15)' },
  { m:9,  d:23, range:1, title:'วันปิยมหาราช',             sub:'น้อมรำลึกในพระมหากรุณาธิคุณ รัชกาลที่ 5',  emoji:'🌹', color:'rgba(200,150,50,0.12)' },
  { m:11, d:5,  range:1, title:'วันพ่อแห่งชาติ 👨',         sub:'Happy Father\'s Day — รักพ่อที่สุดในโลก',   emoji:'🌻', color:'rgba(255,200,0,0.12)' },
  { m:11, d:10, range:1, title:'วันรัฐธรรมนูญ',            sub:'น้อมรำลึกวันประชาธิปไตยไทย',               emoji:'📜', color:'rgba(0,200,100,0.10)' },
  { m:11, d:25, range:2, title:'Merry Christmas! 🎄',       sub:'สุขสันต์วันคริสต์มาส — Happy Holidays',    emoji:'🎅', color:'rgba(255,100,100,0.12)' },
  { m:11, d:31, range:1, title:'ส่งท้ายปีเก่า 🎇',          sub:'Happy New Year\'s Eve — คืนสุดท้ายของปี',   emoji:'🥂', color:'rgba(200,0,200,0.10)' },
];

function initGreeting() {
  const now   = new Date();
  const month = now.getMonth();
  const day   = now.getDate();
  const hour  = now.getHours();

  let holiday = null;
  for (const h of HOLIDAYS) {
    const endDay = h.d + (h.range || 1) - 1;
    if (h.m === month && day >= h.d && day <= endDay) { holiday = h; break; }
  }

  const emojiEl = document.getElementById('hgEmoji');
  const titleEl = document.getElementById('hgTitle');
  const subEl   = document.getElementById('hgSub');
  const box     = document.getElementById('headerGreeting');
  if (!emojiEl) return;

  if (holiday) {
    emojiEl.textContent = holiday.emoji;
    titleEl.textContent = holiday.title;
    subEl.textContent   = holiday.sub;
    box.style.background = `linear-gradient(135deg,${holiday.color},rgba(2,8,20,0.3))`;
    box.style.borderColor = 'rgba(255,200,100,0.25)';
    return;
  }

  let greeting, emoji;
  if      (hour>=5  && hour<12) { greeting='อรุณสวัสดิ์ — ขอให้วันนี้เป็นวันที่ดี';  emoji='🌅'; }
  else if (hour>=12 && hour<17) { greeting='สวัสดียามบ่าย — พร้อมทำงานแล้วใช่ไหม?'; emoji='☀️'; }
  else if (hour>=17 && hour<20) { greeting='สวัสดียามเย็น — ขอบคุณที่ทุ่มเทตลอดวัน'; emoji='🌇'; }
  else                          { greeting='สวัสดียามค่ำ — พักบ้างนะครับ 😊';         emoji='🌙'; }

  const days = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
  const p = n=>String(n).padStart(2,'0');
  const M = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  emojiEl.textContent = emoji;
  titleEl.textContent = greeting;
  subEl.textContent   = `วัน${days[now.getDay()]}ที่ ${p(now.getDate())} ${M[now.getMonth()]} ${now.getFullYear()+543}`;
}

/* คำนวณวันตัดยอด: 20 พ.ย. ของทุกปี */
function getCutoffCountdown() {
  const now   = new Date();
  const year  = now.getFullYear();
  // 20 พ.ย. = เดือน 10 (0-based = ต.ค.=9, พ.ย.=10)
  let cutoff  = new Date(year, 10, 20, 23, 59, 59);
  if (now > cutoff) cutoff = new Date(year + 1, 10, 20, 23, 59, 59);
  const diffMs   = cutoff - now;
  const diffDays = Math.ceil(diffMs / 86400000);
  const diffHrs  = Math.floor((diffMs % 86400000) / 3600000);
  return { days: diffDays, hours: diffHrs, cutoff };
}


// ════════════════════════════════════════════════════════════════
//  LEADERBOARD — คะแนนปิดงานเร็ว/ช้า + TICKER
// ════════════════════════════════════════════════════════════════

function computeLeaderboard(data) {
  // คำนวณ avg days-to-close ต่อ contractor
  // data row = [jobId, datetime, contractor, note]
  // สมมติว่า jobs ใน 30 วันล่าสุด = นับจำนวนงานและ avg gap ระหว่างงาน
  const now      = new Date();
  const ctxJobs  = {};   // { contractor: [dates] }

  data.forEach(r => {
    if (!r[1] || !r[2]) return;
    const d = new Date(r[1]);
    if (isNaN(d)) return;
    const ct = r[2];
    if (!ctxJobs[ct]) ctxJobs[ct] = [];
    ctxJobs[ct].push(d);
  });

  const scores = Object.entries(ctxJobs).map(([ct, dates]) => {
    dates.sort((a,b)=>a-b);
    const count = dates.length;
    // คะแนน = จำนวนงาน (มากกว่า = ดีกว่า) + ปัจจัยความถี่
    // หา avg interval ระหว่างงาน (วัน) → น้อย = เร็ว
    let avgInterval = 999;
    if (dates.length > 1) {
      const intervals = [];
      for (let i=1;i<dates.length;i++) {
        intervals.push((dates[i]-dates[i-1]) / 86400000);
      }
      avgInterval = intervals.reduce((s,v)=>s+v,0) / intervals.length;
    }
    // คะแนน 100 = เร็วที่สุด
    const score = Math.round(Math.min(100, (count / data.length) * 100 * 3));
    const lastDate = dates[dates.length - 1];
    const daysSinceLast = Math.round((now - lastDate) / 86400000);
    return { ct: shortName(ct), count, avgInterval: Math.round(avgInterval*10)/10, score, daysSinceLast, lastDate };
  });

  const sorted     = [...scores].sort((a,b) => b.score - a.score || a.avgInterval - b.avgInterval);
  const sortedSlow = [...scores].sort((a,b) => a.score - b.score || b.avgInterval - a.avgInterval);

  return { fast: sorted.slice(0,3), slow: sortedSlow.slice(0,3), all: sorted };
}

function renderLeaderboard(data) {
  const { fast, slow, all } = computeLeaderboard(data);

  // ── Top 3 Fast ──
  const medals   = ['🥇','🥈','🥉'];
  const stars    = ['⭐⭐⭐','⭐⭐','⭐'];
  const colors   = ['#ffd700','#c0c0c0','#cd7f32'];
  const rankCls  = ['rank-1','rank-2','rank-3'];

  const emptyLB = `<div style="padding:28px;text-align:center;color:var(--text3);font-family:var(--mono)">
    <div style="font-size:28px;margin-bottom:8px;opacity:.4">📭</div>
    <div style="font-size:11px">ยังไม่มีข้อมูลเพียงพอ</div>
    <div style="font-size:9px;margin-top:4px;opacity:.7">นำเข้าข้อมูลเพื่อแสดงอันดับ</div>
  </div>`;

  document.getElementById('lbFast').innerHTML = fast.length ? fast.map((r,i) => `
    <div class="lb-row ${rankCls[i]}">
      <div class="lb-shine"></div>
      <div class="lb-medal">${medals[i]}</div>
      <div class="lb-info">
        <div class="lb-name">${r.ct}</div>
        <div class="lb-detail">${r.count} งาน · avg ${r.avgInterval} วัน/งาน · ล่าสุด ${r.daysSinceLast} วันที่แล้ว</div>
        <div class="lb-stars" style="color:${colors[i]}">${stars[i]}</div>
      </div>
      <div class="lb-score">
        <div class="lb-score-num" style="color:${colors[i]}">${r.score}</div>
        <span class="lb-score-unit">คะแนน</span>
      </div>
    </div>`).join('') : emptyLB;

  // ── Bottom 3 Slow ──
  const slowCls = ['slow-1','slow-2','slow-3'];
  document.getElementById('lbSlow').innerHTML = slow.length ? slow.map((r,i) => `
    <div class="lb-row ${slowCls[i]}">
      <div class="lb-rank-num">${i+1}</div>
      <div class="lb-info">
        <div class="lb-name">${r.ct}</div>
        <div class="lb-detail">${r.count} งาน · avg ${r.avgInterval} วัน/งาน</div>
        <div class="lb-warn-badge">⚠️ ต้องเร่งดำเนินการ</div>
      </div>
      <div class="lb-score">
        <div class="lb-score-num" style="color:#ff4757">${r.score}</div>
        <span class="lb-score-unit">คะแนน</span>
      </div>
    </div>`).join('') : emptyLB;

  // ── Ticker content ──
  buildTicker(data, fast, slow);
}

function buildTicker(data, fast, slow) {
  const now  = new Date();
  const items = [];

  // ── 0. วันตัดยอด 20 พ.ย. ──
  const co = getCutoffCountdown();
  const p  = n=>String(n).padStart(2,'0');
  const M  = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const cutoffStr = `20 ${M[10]} ${co.cutoff.getFullYear()+543}`;

  let cutoffClass, cutoffIcon;
  if (co.days <= 7)  { cutoffClass='t-item-cutoff';      cutoffIcon='🚨'; }
  else if(co.days<=30){ cutoffClass='t-item-cutoff-soon'; cutoffIcon='⏰'; }
  else               { cutoffClass='t-item-info';         cutoffIcon='📅'; }

  items.push(`<span class="t-item ${cutoffClass}">${cutoffIcon} <strong>ตัดยอดงาน ${cutoffStr}</strong> — เหลืออีก <strong>${co.days} วัน ${co.hours} ชั่วโมง!</strong></span><span class="t-sep">◆</span>`);
  // ซ้ำ 2 รอบเพื่อให้วิ่งต่อเนื่อง
  items.push(`<span class="t-item ${cutoffClass}">${cutoffIcon} <strong>กำหนดตัดยอด 20 พ.ย. ทุกปี</strong> — เหลือเวลา <strong>${co.days} วัน</strong> เร่งปิดงานและจัดเอกสาร!</span><span class="t-sep">◆</span>`);

  // ── 0.5 ข้อความพิเศษจากผู้ดูแล ──
  const customMsgs = cmsgLoad();
  if (customMsgs.length) {
    const icons = {info:'🔵',ok:'✅',alert:'📣',warn:'🚨'};
    const cls   = {info:'t-item-info',ok:'t-item-ok',alert:'t-item-alert',warn:'t-item-warn'};
    customMsgs.forEach(m => {
      const ico = icons[m.type]||'🔵';
      const c   = cls[m.type]||'t-item-info';
      items.push(`<span class="t-item ${c}">${ico} <strong>${m.text}</strong></span><span class="t-sep">◆</span>`);
    });
  }

  // ── 1. งานที่ปิดใน 3 วันล่าสุด ──
  const recentJobs = data.filter(r => {
    if (!r[1]) return false;
    const d = new Date(r[1]);
    return !isNaN(d) && (now-d)/86400000 <= 3;
  });
  if (recentJobs.length) {
    items.push(`<span class="t-item t-item-alert">📋 มีงานที่ปิดใน 3 วันล่าสุด <strong>${recentJobs.length} งาน</strong> — ⏰ ต้องเร่งจัดทำเอกสารให้เสร็จภายใน 3 วัน!</span><span class="t-sep">◆</span>`);
    recentJobs.slice(0,5).forEach(r => {
      const d    = new Date(r[1]);
      const diff = Math.round((now-d)/86400000);
      const ds   = `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()+543}`;
      const when = diff===0?'วันนี้':diff+' วันที่แล้ว';
      items.push(`<span class="t-item t-item-alert">📌 <strong>${r[0]}</strong> — ${shortName(r[2])} — ปิด ${ds} (${when}) ⚠️ รีบจัดเอกสารด่วน!</span><span class="t-sep">◆</span>`);
    });
  }

  // ── 2. เชิดชู Top 3 Fast ──
  const medals = ['🥇','🥈','🥉'];
  fast.forEach((r,i) => {
    items.push(`<span class="t-item t-item-ok">${medals[i]} <strong>${r.ct}</strong> — ปิดงานรวดเร็ว! คะแนน ${r.score} ⭐ ยอดเยี่ยม!</span><span class="t-sep">◆</span>`);
  });

  // ── 3. เตือน Slow 3 ──
  slow.forEach(r => {
    items.push(`<span class="t-item t-item-warn">⚠️ <strong>${r.ct}</strong> — กรุณาเร่งดำเนินการ! เฉลี่ย ${r.avgInterval} วัน/งาน</span><span class="t-sep">◆</span>`);
  });

  // ── 4. Stats ──
  items.push(`<span class="t-item t-item-info">📊 รวมทั้งหมด <strong>${data.length.toLocaleString()}</strong> งาน · ผู้รับจ้าง <strong>${new Set(data.map(r=>r[2])).size}</strong> ราย</span><span class="t-sep">◆</span>`);

  // ซ้ำ content เพื่อให้วิ่งวนต่อเนื่อง (double content trick)
  const half = items.join('');
  const el   = document.getElementById('tickerContent');
  if (!el) return;
  el.innerHTML = half + half;   // ซ้ำ 2 เที่ยวทำให้วิ่ง seamless loop
  el.style.animation = 'none';
  el.offsetHeight;
  const speed = Math.max(50, items.length * 7);
  el.style.animation = `htRun ${speed}s linear infinite`;
}


// ════════════════════════════════════════════════════════════════
//  EXPAND / COLLAPSE PANELS
// ════════════════════════════════════════════════════════════════

function toggleExpand(which) {
  const panelId  = which === 'forecast' ? 'panelForecast' : 'panelYoy';
  const trigId   = which === 'forecast' ? 'trigForecast'  : 'trigYoy';
  const panel    = document.getElementById(panelId);
  const trigger  = document.getElementById(trigId);
  if (!panel || !trigger) return;

  const isOpen = _expandState[which];
  _expandState[which] = !isOpen;

  if (!isOpen) {
    // ── Check data availability before opening ──
    const data = typeof allData !== 'undefined' ? allData : [];
    const fyData = typeof fyFilterData === 'function' ? fyFilterData(data) : data;

    if (which === 'forecast' && fyData.length === 0) {
      _showExpandEmpty(panel, trigger, '📈', 'ยังไม่มีข้อมูลปีงบประมาณนี้',
        'นำเข้าข้อมูลเพื่อดูกราฟ Forecast<br>ข้อมูลจะเริ่มนับใหม่ทุก 1 ต.ค. ของทุกปี');
      return;
    }
    if (which === 'forecast' && fyData.length < 2) {
      _showExpandEmpty(panel, trigger, '📈', 'ข้อมูลยังน้อยเกินไป',
        `มีข้อมูล <strong style="color:var(--cyan)">${fyData.length}</strong> รายการ<br>ต้องการอย่างน้อย 2 รายการเพื่อแสดง Trend`);
      return;
    }
    if (which === 'yoy' && data.length === 0) {
      _showExpandEmpty(panel, trigger, '📊', 'ยังไม่มีข้อมูล',
        'นำเข้าข้อมูลเพื่อเปรียบเทียบปีงบประมาณ<br>ระบบจะแบ่งข้อมูลตามปีงบฯ อัตโนมัติ');
      return;
    }

    // ── OPEN normally ──
    _clearExpandEmpty(panel);
    panel.classList.add('open');
    trigger.classList.add('open');
    setTimeout(() => panel.scrollIntoView({ behavior:'smooth', block:'nearest' }), 80);

    if (which === 'forecast') {
      setTimeout(() => { if (forecastChartInst) forecastChartInst.resize(); }, 600);
    }
    if (which === 'yoy') {
      setTimeout(() => {
        if (yoyChartInst) yoyChartInst.resize();
        if (typeof renderYoy === 'function' && _yoyAllData) renderYoy(_yoyAllData);
      }, 600);
    }
  } else {
    // ── CLOSE ──
    panel.classList.remove('open');
    trigger.classList.remove('open');
    _expandState[which] = false;
    _clearExpandEmpty(panel);
  }
}

/* ── Show elegant empty-state overlay inside the panel ── */
function _showExpandEmpty(panel, trigger, icon, title, desc) {
  // Remove any previous empty overlay
  _clearExpandEmpty(panel);

  // Create overlay inside expand-inner
  const inner = panel.querySelector('.expand-inner');
  const overlay = document.createElement('div');
  overlay.className = 'expand-empty-overlay';
  overlay.id = 'expandEmpty_' + panel.id;
  overlay.innerHTML = `
    <div class="eeo-icon">${icon}</div>
    <div class="eeo-title">${title}</div>
    <div class="eeo-desc">${desc}</div>
    <div class="eeo-actions">
      <button class="eeo-btn" onclick="document.getElementById('dropZone').click()">
        📂 นำเข้าข้อมูล
      </button>
      <button class="eeo-close" onclick="toggleExpand('${panel.id === 'panelForecast' ? 'forecast' : 'yoy'}')">
        ✕ ปิด
      </button>
    </div>`;

  if (inner) inner.appendChild(overlay);
  panel.classList.add('open');
  trigger.classList.add('open');
  setTimeout(() => panel.scrollIntoView({ behavior:'smooth', block:'nearest' }), 80);
}

function _clearExpandEmpty(panel) {
  const prev = document.getElementById('expandEmpty_' + panel.id);
  if (prev) prev.remove();
}


/* Update sub-text on buttons with live stats */
function updateExpandBtnSubs(fyData, kpiMeta) {
  const forecastSub = document.getElementById('forecastBtnSub');
  const yoySub      = document.getElementById('yoyBtnSub');
  if (!fyData || !kpiMeta) return;

  const fyTotal       = fyData.length;
  const forecastTotal = kpiMeta.forecastTotal || 0;
  const monthsLeft    = kpiMeta.monthsLeft    ?? '?';
  const needThisMo    = kpiMeta.needThisMo    ?? '?';

  if (forecastSub) {
    forecastSub.innerHTML =
      `สะสม FY <strong style="color:var(--cyan)">${fyTotal}</strong> รายการ · ` +
      `คาด EOY <strong style="color:var(--purple)">${forecastTotal}</strong> · ` +
      `เหลือ ${monthsLeft} เดือน · ` +
      `ต้องปิดเดือนนี้ <strong style="color:${needThisMo>0?'#ffab00':'#00e5a0'}">${needThisMo}</strong> รายการ`;
  }

  if (yoySub) {
    const fyMap  = allFYData(_yoyAllData || fyData);
    const fys    = Object.keys(fyMap).length;
    const curFY  = getFiscalYear();
    const prevFY = curFY - 1;
    const prev   = (fyMap[prevFY]||[]).length;
    const cur    = (fyMap[curFY] ||[]).length;
    const diff   = prev > 0 ? ((cur-prev)/prev*100).toFixed(1) : null;
    yoySub.innerHTML =
      `${fys} ปีงบประมาณ · FY${curFY+543}: <strong style="color:var(--green)">${cur}</strong> รายการ` +
      (diff !== null
        ? ` · เทียบปีก่อน <strong style="color:${+diff>=0?'#00e5a0':'#ff4757'}">${+diff>=0?'▲':'▼'}${Math.abs(diff)}%</strong>`
        : '');
  }
}