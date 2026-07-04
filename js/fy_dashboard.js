/* ────────────────────────────────────────────────────────────
   กปภ.พิษณุโลก Dashboard — js/fy_dashboard.js
   Forecast · Team charts · Team cards · FY banner · KPI · Master update · Fixes
   ──────────────────────────────────────────────────────────── */

// ════════════════════════════════════════════════════════════════
//  FORECAST CHART
// ════════════════════════════════════════════════════════════════

function buildForecastChart(fyData, monthlyBuckets, fyPct) {
  const canvas = document.getElementById('forecastChart');
  if (!canvas) return;
  if (forecastChartInst) { forecastChartInst.destroy(); forecastChartInst = null; }

  // No data — show placeholder on canvas
  if (!fyData || fyData.length === 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(122,168,204,0.25)';
    ctx.font = '13px Kanit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ยังไม่มีข้อมูลปีงบประมาณนี้', canvas.width/2, canvas.height/2 - 10);
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(122,168,204,0.15)';
    ctx.fillText('นำเข้าข้อมูลเพื่อดูกราฟ Forecast', canvas.width/2, canvas.height/2 + 12);
    return;
  }

  const prog = fyProgress();
  const currentFYMonth = fyMonthIndex(prog.now); // which month we're in (0=Oct)
  const labels = FY_MONTHS_TH;

  // Actual data (only past months)
  const actual = monthlyBuckets.map((v,i) => i <= currentFYMonth ? v : null);

  // Linear trend forecast for future months
  const pastMonths = monthlyBuckets.slice(0, currentFYMonth + 1).filter(v=>v>0);
  const avgRate = pastMonths.length ? pastMonths.reduce((a,b)=>a+b,0)/pastMonths.length : 0;
  const forecast = monthlyBuckets.map((v,i) => {
    if (i < currentFYMonth) return null;
    if (i === currentFYMonth) return v;
    return Math.round(avgRate);
  });

  // Target line — even distribution
  const fyTotal = monthlyBuckets.reduce((a,b)=>a+b,0);
  const projected = fyTotal > 0 ? Math.round(fyTotal / Math.max(0.01,fyPct)) : 0;
  const monthlyTarget = Math.round(projected / 12);
  const target = labels.map(()=> monthlyTarget);

  // Aging 90+ days per month (estimate from current data)
  const agingData = fyData ? fyData.map(r=>{
    const d = new Date(r[1]);
    const age = (new Date() - d) / 86400000;
    return age > 90 ? r : null;
  }).filter(Boolean) : [];
  const agingBuckets = Array(12).fill(0);
  agingData.forEach(r => agingBuckets[fyMonthIndex(new Date(r[1]))]++);

  forecastChartInst = new Chart(canvas.getContext('2d'), {
    type:'bar',
    data:{
      labels,
      datasets:[
        {
          label:'ปริมาณงานจริง',
          data: actual,
          backgroundColor: labels.map((_,i)=> i<currentFYMonth ? 'rgba(0,200,255,0.35)' : 'rgba(0,200,255,0.6)'),
          borderColor: 'rgba(0,200,255,0.8)',
          borderWidth:1, borderRadius:5, order:2
        },
        {
          label:'คาดการณ์ (Projection)',
          data: forecast,
          type:'line',
          borderColor:'rgba(168,85,247,0.8)',
          borderWidth:2, borderDash:[6,4],
          backgroundColor:'rgba(168,85,247,0.08)',
          fill:true, tension:0.4, pointRadius:4,
          pointBackgroundColor:'rgba(168,85,247,0.9)',
          order:1
        },
        {
          label:'เป้าหมาย/เดือน',
          data: target,
          type:'line',
          borderColor:'rgba(0,229,160,0.7)',
          borderWidth:2, borderDash:[4,4],
          backgroundColor:'transparent',
          pointRadius:0, order:0
        },
        {
          label:'งานค้าง >90 วัน',
          data: agingBuckets,
          backgroundColor:'rgba(255,71,87,0.3)',
          borderColor:'rgba(255,71,87,0.7)',
          borderWidth:1, borderRadius:3, order:3
        }
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:true,
      interaction:{ mode:'index', intersect:false },
      plugins:{
        legend:{ display:false },
        tooltip:{
          backgroundColor:'rgba(4,13,26,0.95)',
          borderColor:'rgba(0,200,255,0.3)',
          borderWidth:1,
          titleColor:'#e8f4ff',
          bodyColor:'#7aa8cc',
          callbacks:{
            label(c){ return `  ${c.dataset.label}: ${c.raw ?? '—'} รายการ`; }
          }
        },
        annotation:{} // optional
      },
      scales:{
        x:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#7aa8cc',font:{size:11}} },
        y:{ grid:{color:'rgba(255,255,255,0.06)'}, ticks:{color:'#7aa8cc',font:{size:10}}, beginAtZero:true }
      }
    }
  });
}


// ════════════════════════════════════════════════════════════════
//  PER-TEAM CHARTS
// ════════════════════════════════════════════════════════════════

function buildTeamCharts(fyData) {
  const { teams, result } = bucketByFYMonthAndTeam(fyData);
  const prog = fyProgress();
  const curMonth = fyMonthIndex(prog.now);

  // 1. Team × Month (Line chart)
  const c1 = document.getElementById('teamMonthChart');
  if (c1) {
    if (teamMonthChartInst) { teamMonthChartInst.destroy(); teamMonthChartInst=null; }
    teamMonthChartInst = new Chart(c1.getContext('2d'), {
      type:'line',
      data:{
        labels: FY_MONTHS_TH,
        datasets: teams.map((t,i)=>({
          label: t,
          data: result[t].map((v,mi)=> mi<=curMonth ? v : null),
          borderColor: teamColor(i).solid,
          backgroundColor: teamColor(i).bg,
          borderWidth:2, fill:false, tension:0.4,
          pointRadius:3, pointBackgroundColor:teamColor(i).solid
        }))
      },
      options:{
        responsive:true, maintainAspectRatio:true,
        plugins:{
          legend:{ labels:{ color:'#7aa8cc', font:{size:9}, boxWidth:12, padding:10 } },
          tooltip:{ backgroundColor:'rgba(4,13,26,.95)', borderColor:'rgba(0,200,255,.3)', borderWidth:1, titleColor:'#e8f4ff', bodyColor:'#7aa8cc' }
        },
        scales:{
          x:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#7aa8cc',font:{size:10}} },
          y:{ grid:{color:'rgba(255,255,255,0.06)'}, ticks:{color:'#7aa8cc',font:{size:9}}, beginAtZero:true }
        }
      }
    });
  }

  // 2. Team vs Target (Horizontal Bar)
  const fyTotal = fyData.length;
  const numMonthsLeft = 12 - curMonth;
  const c2 = document.getElementById('teamTargetChart');
  if (c2) {
    if (teamTargetChartInst) { teamTargetChartInst.destroy(); teamTargetChartInst=null; }
    const tActual  = teams.map(t => result[t].reduce((a,b)=>a+b,0));
    const tForecast = teams.map((t,i)=>{
      const done = tActual[i];
      const pastMs = result[t].slice(0, curMonth+1).filter(v=>v>0);
      const avg = pastMs.length ? pastMs.reduce((a,b)=>a+b,0)/pastMs.length : 0;
      return Math.round(done + avg * numMonthsLeft);
    });
    const tTarget = tForecast.map(f=>Math.round(f * 1.1)); // target = 10% above forecast

    teamTargetChartInst = new Chart(c2.getContext('2d'), {
      type:'bar',
      data:{
        labels: teams.map(t=> t.length>12 ? t.slice(0,12)+'…' : t),
        datasets:[
          {
            label:'งานจริง (FY)',
            data: tActual,
            backgroundColor: teams.map((_,i)=>teamColor(i).bg),
            borderColor: teams.map((_,i)=>teamColor(i).border),
            borderWidth:1, borderRadius:6
          },
          {
            label:'คาดการณ์ EOY',
            data: tForecast,
            backgroundColor: 'rgba(168,85,247,0.2)',
            borderColor: 'rgba(168,85,247,0.7)',
            borderWidth:1, borderRadius:6, borderDash:[4,4]
          }
        ]
      },
      options:{
        responsive:true, maintainAspectRatio:true,
        indexAxis:'y',
        plugins:{
          legend:{ labels:{ color:'#7aa8cc', font:{size:9}, boxWidth:12, padding:10 } },
          tooltip:{ backgroundColor:'rgba(4,13,26,.95)', borderColor:'rgba(0,200,255,.3)', borderWidth:1, titleColor:'#e8f4ff', bodyColor:'#7aa8cc' }
        },
        scales:{
          x:{ grid:{color:'rgba(255,255,255,0.06)'}, ticks:{color:'#7aa8cc',font:{size:9}}, beginAtZero:true },
          y:{ grid:{color:'rgba(255,255,255,0.03)'}, ticks:{color:'#7aa8cc',font:{size:9}} }
        }
      }
    });
  }
}


// ════════════════════════════════════════════════════════════════
//  TEAM CARDS
// ════════════════════════════════════════════════════════════════
function buildTeamCards(fyData) {
  const grid = document.getElementById('teamGrid');
  if (!grid) return;

  const prog        = fyProgress();
  const curMoIdx    = fyMonthIndex(prog.now);
  const monthsLeft  = 11 - curMoIdx;
  const now         = prog.now;

  // วันที่เหลือในเดือนนี้
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeftMo = endOfMonth.getDate() - now.getDate() + 1;
  const daysInMo   = endOfMonth.getDate();
  const dayOfMonth = now.getDate();

  // Group by team
  const teamMap = {};
  fyData.forEach(r => {
    if (!teamMap[r[2]]) teamMap[r[2]] = [];
    teamMap[r[2]].push(r);
  });

  const teams   = Object.keys(teamMap).sort((a,b) => teamMap[b].length - teamMap[a].length);
  const fyTotal = fyData.length;

  grid.innerHTML = '';

  if (!teams.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--text3);font-family:var(--mono)">
      <div style="font-size:30px;margin-bottom:10px;opacity:.35">👷</div>
      <div style="font-size:12px;color:var(--text2)">ยังไม่มีข้อมูลทีมในปีงบประมาณนี้</div>
      <div style="font-size:10px;margin-top:6px;opacity:.7">ข้อมูลจะแสดงเมื่อนำเข้าไฟล์ที่มีวันที่ในปีงบฯ ปัจจุบัน (1 ต.ค. – 30 ก.ย.)</div>
    </div>`;
    return;
  }

  teams.forEach((team, idx) => {
    const rows = teamMap[team];
    const cnt  = rows.length;
    const share = fyTotal > 0 ? (cnt / fyTotal * 100).toFixed(1) : 0;

    // ── อัตราเฉลี่ยรายเดือน (เดือนที่ผ่านมา ไม่รวมเดือนนี้) ──
    const allBuckets  = bucketByFYMonth(rows);
    const pastBuckets = allBuckets.slice(0, curMoIdx).filter(v => v > 0);
    const avgPerMonth = pastBuckets.length
      ? pastBuckets.reduce((a,b) => a+b, 0) / pastBuckets.length
      : allBuckets[curMoIdx] || 0;

    const thisMo     = allBuckets[curMoIdx] || 0;
    const moTarget   = Math.round(avgPerMonth || Math.max(1, cnt / Math.max(1, curMoIdx + 1)));

    // ── ต้องทำอีกเดือนนี้ ──
    const needThisMo = Math.max(0, moTarget - thisMo);

    // ── คาดการณ์ EOY ──
    const forecastEOY = cnt + Math.round(moTarget * monthsLeft);

    // ── เป้าสะสม vs ทำได้จริง ──
    const targetSoFar = moTarget * (curMoIdx + 1);       // ควรทำสะสมถึงเดือนนี้
    const achievedPct = targetSoFar > 0
      ? Math.min(100, Math.round(cnt / targetSoFar * 100)) : 100;

    // ── ตรวจสอบว่าเดือนนี้ทันหรือไม่ ──
    const expectedSoFar = Math.round(moTarget * (dayOfMonth / daysInMo));
    const behindThisMo  = thisMo < expectedSoFar * 0.75;  // ช้ากว่า 25%+

    // ── Aging ──
    const aging30 = rows.filter(r => (now - new Date(r[1])) / 86400000 > 30).length;
    const aging90 = rows.filter(r => (now - new Date(r[1])) / 86400000 > 90).length;

    // ── Status ──
    const cl = teamColor(idx);
    let badgeClass = 'tb-ok', badgeTxt = '✅ ทันแผน';
    if (behindThisMo || achievedPct < 80)             { badgeClass='tb-warn'; badgeTxt='⚠️ ล่าช้า'; }
    if ((behindThisMo && monthsLeft <= 2) || achievedPct < 60) { badgeClass='tb-bad'; badgeTxt='🔴 เร่งด่วน'; }

    const progColor = achievedPct >= 90 ? '#00e5a0' : achievedPct >= 70 ? '#ffab00' : '#ff4757';
    const urgColor  = needThisMo === 0  ? '#00e5a0' : needThisMo <= moTarget * 0.3 ? '#ffab00' : '#ff4757';

    grid.innerHTML += `
    <div class="team-card" style="border-color:${cl.border.replace('0.6','0.3')}">
      <div class="team-head">
        <div class="team-name">
          <span style="font-size:18px">${['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'][idx]||'👷'}</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${team}</span>
        </div>
        <span class="team-badge ${badgeClass}">${badgeTxt}</span>
      </div>

      <!-- 4 ช่องตัวเลขหลัก -->
      <div class="team-nums" style="grid-template-columns:1fr 1fr 1fr 1fr">
        <div class="tn-box">
          <div class="tn-v" style="color:${cl.solid}">${cnt}</div>
          <div class="tn-l">สะสม FY</div>
        </div>
        <div class="tn-box" style="border:1px solid ${urgColor}44">
          <div class="tn-v" style="color:${urgColor}">${needThisMo}</div>
          <div class="tn-l">ต้องทำ/${daysLeftMo}วัน</div>
        </div>
        <div class="tn-box">
          <div class="tn-v" style="color:#a855f7">${forecastEOY}</div>
          <div class="tn-l">คาด EOY</div>
        </div>
        <div class="tn-box" style="${aging30>0?'border:1px solid rgba(255,71,87,.3)':''}">
          <div class="tn-v" style="color:${aging30>0?'#ff4757':'#7aa8cc'}">${aging30}</div>
          <div class="tn-l">ค้าง>30วัน</div>
        </div>
      </div>

      <!-- Progress เทียบเป้าสะสม -->
      <div class="team-progress">
        <div class="tp-label">
          <span>เป้าสะสม ${targetSoFar} รายการ (${curMoIdx+1} เดือน)</span>
          <span style="color:${progColor};font-weight:700">${achievedPct}%</span>
        </div>
        <div class="tp-track">
          <div class="tp-fill" style="width:${achievedPct}%;background:${progColor}"></div>
          <div class="tp-target" style="left:${Math.min(99,Math.round(prog.pct*100))}%"></div>
        </div>
      </div>

      <!-- Progress เดือนนี้ -->
      <div class="team-progress" style="margin-top:6px">
        <div class="tp-label">
          <span>เดือนนี้ ${thisMo}/${moTarget} รายการ</span>
          <span style="color:${urgColor};font-weight:700">${Math.round(thisMo/Math.max(1,moTarget)*100)}%</span>
        </div>
        <div class="tp-track">
          <div class="tp-fill" style="width:${Math.min(100,Math.round(thisMo/Math.max(1,moTarget)*100))}%;background:${urgColor}"></div>
          <div class="tp-target" style="left:${Math.min(99,Math.round(dayOfMonth/daysInMo*100))}%"></div>
        </div>
      </div>

      <div class="team-ai" style="${needThisMo>0?'border-color:rgba(255,'+( needThisMo>moTarget*0.5?'71,87':'171,0')+',0.3)':''}">
        📊 สัดส่วน <strong style="color:${cl.solid}">${share}%</strong> ·
        เฉลี่ย <strong>${avgPerMonth.toFixed(1)}</strong>/เดือน ·
        ${needThisMo > 0
          ? `⚡ ต้องปิดอีก <strong style="color:${urgColor}">${needThisMo}</strong> รายการ ใน ${daysLeftMo} วัน`
          : `<strong style="color:#00e5a0">✅ ทันเป้าเดือนนี้แล้ว</strong>`}
        ${aging90 > 0 ? ` · <span style="color:#ff4757">⚠️ ค้าง>90วัน: ${aging90}</span>` : ''}
      </div>
    </div>`;
  });
}


// ════════════════════════════════════════════════════════════════
//  FY BANNER + KPI CARDS
// ════════════════════════════════════════════════════════════════
function buildFYBanner(prog, fyData) {
  const el = id => document.getElementById(id);
  const { fy, daysElapsed, daysTotal, start, end } = prog;
  const thY = fy + 543;
  const now = prog.now;

  // ── เดือนปัจจุบัน (FY index 0=ต.ค.) ──
  const curMoIdx   = fyMonthIndex(now);
  const monthsLeft = 11 - curMoIdx;          // เดือนที่เหลือ (ไม่รวมเดือนนี้)
  const mosPassed  = curMoIdx + 1;           // เดือนที่ผ่านมาแล้ว

  // ── วันที่เหลือในเดือนนี้ ──
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysLeftMo   = endOfMonth.getDate() - now.getDate() + 1;

  // ── ปริมาณงาน ──
  const fyTotal    = fyData.length;
  const monthly    = bucketByFYMonth(fyData);
  const thisMo     = monthly[curMoIdx] || 0;
  const pastMonths = monthly.slice(0, curMoIdx).filter(v => v > 0);
  const avgPerMo   = pastMonths.length
    ? pastMonths.reduce((a,b) => a+b, 0) / pastMonths.length
    : thisMo || 0;

  // ── เป้าหมายรายเดือน: ต้องทำเท่าไหร่/เดือนที่เหลือ ──
  // ใช้ค่าเฉลี่ยเดือนก่อนเป็น baseline target
  const monthlyTarget = Math.round(avgPerMo || Math.max(1, fyTotal / Math.max(1, mosPassed)));
  const forecastEOY   = fyTotal + Math.round(monthlyTarget * monthsLeft);

  // ── ตรวจว่าเดือนนี้ทันหรือไม่ ──
  const rateToday  = daysElapsed > 0 ? fyTotal / daysElapsed : 0;
  const dayOfMonth = now.getDate();
  const daysInMo   = endOfMonth.getDate();
  const expectedSoFarThisMo = Math.round(monthlyTarget * (dayOfMonth / daysInMo));
  const thisMoBehind        = thisMo < expectedSoFarThisMo * 0.8;  // ช้ากว่าควร 20%+
  const needThisMo          = Math.max(0, monthlyTarget - thisMo);  // ต้องทำอีกภายในเดือนนี้

  // ── Verdict รายเดือน ──
  let vClass = 'v-ok', vTxt = '🟢 ทันเป้ารายเดือน';
  if (thisMoBehind && monthsLeft > 2)        { vClass='v-warn';   vTxt='🟡 ช้ากว่าแผนเดือนนี้'; }
  if (thisMoBehind && monthsLeft <= 2)       { vClass='v-danger'; vTxt='🔴 เสี่ยงข้ามปีงบฯ'; }
  if (thisMoBehind && monthsLeft === 0)      { vClass='v-danger'; vTxt='🚨 เดือนสุดท้าย!'; }
  if (!thisMoBehind && monthsLeft === 0)     { vClass='v-ok';     vTxt='✅ เดือนสุดท้าย OK'; }

  // ── อัพเดท DOM ──
  if (el('fyTitle')) el('fyTitle').textContent = `ปีงบประมาณ พ.ศ.${thY}`;
  if (el('fySub'))   el('fySub').textContent =
    `${start.toLocaleDateString('th-TH')} – ${end.toLocaleDateString('th-TH')} · ผ่าน ${mosPassed} เดือน · เหลือ ${monthsLeft} เดือน ${daysLeftMo} วัน`;

  const fyPct = daysElapsed / Math.max(1, daysTotal);
  if (el('fyProgPct'))    el('fyProgPct').textContent    = `${(fyPct*100).toFixed(1)}%`;
  if (el('fyProgFill'))   el('fyProgFill').style.width   = `${(fyPct*100).toFixed(1)}%`;
  if (el('fyProgMarker')) el('fyProgMarker').style.left  = `${(fyPct*100).toFixed(1)}%`;

  if (el('fyVerdict')) {
    el('fyVerdict').className   = `fy-verdict ${vClass}`;
    el('fyVerdict').textContent = vTxt;
  }

  return {
    avgPerDay: rateToday, forecastTotal: forecastEOY,
    monthlyTarget, mosPassed, monthsLeft,
    thisMo, needThisMo, daysLeftMo, thisMoBehind,
    fyPct, monthly
  };
}

function buildKPICards(prog, fyData, kpiMeta) {
  const { monthlyTarget, mosPassed, monthsLeft, thisMo,
          needThisMo, daysLeftMo, thisMoBehind, avgPerDay, forecastTotal } = kpiMeta;

  const fyTotal  = fyData.length;
  // ── งานค้างคำนวณแบบใหม่: ค้างข้ามเดือน (สร้าง >30 วัน ยัง open) ──
  const now = new Date();
  const aging30  = fyData.filter(r => (now - new Date(r[1])) / 86400000 > 30).length;
  const aging60  = fyData.filter(r => (now - new Date(r[1])) / 86400000 > 60).length;
  const aging90  = fyData.filter(r => (now - new Date(r[1])) / 86400000 > 90).length;

  // ── % ที่ทำได้เทียบเป้าสะสม ──
  // เป้าสะสม = monthlyTarget × จำนวนเดือนที่ผ่านมา
  const targetSoFar  = monthlyTarget * mosPassed;
  const achievedPct  = targetSoFar > 0 ? Math.min(100, Math.round(fyTotal / targetSoFar * 100)) : 100;

  // ── เดือนนี้ต้องทำ: needThisMo ภายใน daysLeftMo วัน ──
  const urgencyPct = monthlyTarget > 0 ? Math.min(100, Math.round(thisMo / monthlyTarget * 100)) : 100;

  // ── ความเสี่ยงข้ามปี: งานค้าง + เดือนที่เหลือน้อย ──
  // ถ้าเดือนที่เหลือน้อย + ยังค้างเยอะ = อันตราย
  const crossYearRisk = aging30 > 0 && monthsLeft <= 3
    ? Math.min(100, Math.round(aging30 / Math.max(1, fyTotal) * 100 * (4 - monthsLeft) / 3))
    : Math.min(40, Math.round(aging30 / Math.max(1, fyTotal) * 40));

  const set = (id, val, sub, pct, color) => {
    const e = document.getElementById(id);
    const s = document.getElementById(id + 'Sub');
    const b = document.getElementById(id + 'Bar');
    if (e) { e.textContent = val; if(color) e.style.color = color; }
    if (s) s.textContent = sub;
    if (b) b.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  };

  // KPI 1: งานสะสม FY vs เป้าสะสม
  const k1Color = achievedPct >= 90 ? '#00e5a0' : achievedPct >= 70 ? '#ffab00' : '#ff4757';
  set('kpiTotal', fyTotal,
    `เป้าสะสม ${targetSoFar} รายการ (${mosPassed} เดือน × ${monthlyTarget})`,
    achievedPct, k1Color);

  // KPI 2: ต้องทำอีกเดือนนี้ (URGENT)
  const k2Color = needThisMo === 0 ? '#00e5a0' : needThisMo <= monthlyTarget * 0.3 ? '#ffab00' : '#ff4757';
  set('kpiRate', needThisMo,
    `รายการ ต้องปิดภายใน ${daysLeftMo} วัน (เป้าเดือนนี้ ${monthlyTarget})`,
    urgencyPct, k2Color);

  // KPI 3: คาดการณ์ EOY
  const prevFYTotal = Object.values(allFYData(allData))[Object.keys(allFYData(allData)).length - 2]?.length ?? null;
  const k3Color = forecastTotal >= monthlyTarget * 12 ? '#00e5a0' : '#ffab00';
  set('kpiForecast', forecastTotal,
    `EOY Projection · ${prevFYTotal !== null ? 'ปีก่อน ' + prevFYTotal + ' รายการ' : 'ปีแรก'}`,
    Math.min(100, forecastTotal / Math.max(1, monthlyTarget * 12) * 100), k3Color);

  // KPI 4: ความเสี่ยงงบข้ามปี
  const k4Color = crossYearRisk < 15 ? '#00e5a0' : crossYearRisk < 40 ? '#ffab00' : '#ff4757';
  set('kpiCarryover', aging30,
    `ค้าง >30 วัน · ค้าง >60 วัน: ${aging60} · ค้าง >90 วัน: ${aging90}`,
    crossYearRisk, k4Color);

  // KPI 5: % สำเร็จเทียบเป้าสะสม
  const k5Color = achievedPct >= 90 ? '#00e5a0' : achievedPct >= 70 ? '#ffab00' : '#ff4757';
  set('kpiSuccess', achievedPct + '%',
    `เทียบเป้าสะสม · เหลือ ${monthsLeft} เดือน ${daysLeftMo} วัน`,
    achievedPct, k5Color);

  return { aging30, aging60, aging90 };
}


// ════════════════════════════════════════════════════════════════
//  MASTER UPDATE — called from updateAll()
// ════════════════════════════════════════════════════════════════
function updateFYDashboard(data) {
  if (!data || !data.length) return;

  const prog    = fyProgress();
  const fyData  = fyFilterData(data);
  const monthly = bucketByFYMonth(fyData);

  prog.fyPct = prog.pct;

  const kpiMeta = buildFYBanner(prog, fyData);
  const { aging30, aging60, aging90 }            = buildKPICards(prog, fyData, kpiMeta);
  const { avgPerDay, forecastTotal, monthlyTarget, monthsLeft } = kpiMeta;

  buildTeamCards(fyData);
  buildForecastChart(fyData, monthly, prog.pct);
  buildTeamCharts(fyData);

  // Team forecast for AI
  const { teams, result } = bucketByFYMonthAndTeam(fyData);
  const curMonthIdx = fyMonthIndex(prog.now);
  const teamStats    = {};
  const teamForecast = {};
  teams.forEach(t => {
    const cnt = result[t].reduce((a,b)=>a+b,0);
    const past = result[t].slice(0,curMonthIdx+1).filter(v=>v>0);
    const avg  = past.length ? past.reduce((a,b)=>a+b,0)/past.length : 0;
    const eoy  = Math.round(cnt + avg*(11-curMonthIdx));
    teamStats[t]    = cnt;
    teamForecast[t] = { eoy, onTrack: avg >= eoy/12*0.85 };
  });

  // Trigger AI (add button first so it exists)
  const aiBody = document.getElementById('aiBody');
  if (aiBody && aiBody.querySelector('.ai-thinking')) {
    runAIAnalysis({
      fy: prog.fy, fyPct: prog.pct, fyTotal: fyData.length,
      daysElapsed: prog.daysElapsed, daysTotal: prog.daysTotal,
      avgPerDay: kpiMeta.avgPerDay, forecastTotal: kpiMeta.forecastTotal,
      monthlyTarget, monthsLeft,
      aging30, aging90,
      monthlyBuckets: monthly, teamStats, teamForecast
    });
  }
}


// ════════════════════════════════════════════════════════════════
//  YEAR-OVER-YEAR COMPARISON ENGINE
//  ปีงบประมาณไทย: ต.ค.(9) → ก.ย.(8) ทุกปี
//  FY69 = ต.ค.2568 – ก.ย.2569 (Oct 2025 – Sep 2026)
//  FY70 = ต.ค.2569 – ...
// ════════════════════════════════════════════════════════════════

/* ── Color palette per FY (oldest = faded, newest = vivid) ── */

/* current selected FY in the UI */

/* ── HEATMAP colour scale: count → rgba ── */
function hmColor(val, maxVal) {
  if (!val) return 'rgba(255,255,255,0.03)';
  const t = Math.min(1, val / Math.max(1, maxVal));
  if (t < 0.25) return `rgba(0,144,224,${0.15 + t*0.6})`;
  if (t < 0.5)  return `rgba(0,200,255,${0.3  + t*0.5})`;
  if (t < 0.75) return `rgba(0,229,160,${0.4  + t*0.4})`;
  return             `rgba(255,171,0,${0.45 + t*0.4})`;
}

/* ── Collect all FY buckets from data ── */
function buildYoyData(data) {
  const fyMap = allFYData(data);   // { fy: rows[] }
  const fys   = Object.keys(fyMap).map(Number).sort();
  const result = {};
  fys.forEach(fy => {
    result[fy] = bucketByFYMonth(fyMap[fy]);   // [12] counts ต.ค.→ก.ย.
  });
  return { fys, result, fyMap };
}

/* ── Determine which FY months have passed (for current FY) ── */
function currentFYMonthIndex() {
  const prog = fyProgress();
  return fyMonthIndex(prog.now);
}

/* ── Build FY tab bar ── */
function buildYoyTabs(fys) {
  const container = document.getElementById('yoyTabs');
  if (!container) return;
  const curFY = getFiscalYear();

  container.innerHTML = '';

  // "All" tab
  const all = document.createElement('button');
  all.className = 'yoy-tab' + (yoyActiveFY === null ? ' active' : '');
  all.textContent = '📊 ทั้งหมด';
  all.onclick = () => { yoyActiveFY = null; renderYoy(_yoyAllData); };
  container.appendChild(all);

  fys.forEach(fy => {
    const thY = fy + 543;
    const btn = document.createElement('button');
    const isCur = fy === curFY;
    btn.className = 'yoy-tab' +
      (isCur ? ' fy-current' : '') +
      (yoyActiveFY === fy ? ' active' : '');
    btn.textContent = `FY ${thY}${isCur ? ' ★' : ''}`;
    btn.title = `ปีงบประมาณ ${thY} (${fy})`;
    btn.onclick = () => { yoyActiveFY = fy; renderYoy(_yoyAllData); };
    container.appendChild(btn);
  });

  // View toggle
  const vt = document.createElement('div');
  vt.className = 'yoy-view-toggle';
  container.appendChild(vt);
}

/* ── Summary pills ── */
function buildYoySummary(fys, result, fyMap) {
  const el = document.getElementById('yoySummary');
  if (!el) return;
  const curFY  = getFiscalYear();
  const curIdx = currentFYMonthIndex();

  el.innerHTML = fys.map((fy, i) => {
    const total = (fyMap[fy]||[]).length;
    const thY   = fy + 543;
    const isCur = fy === curFY;
    const col   = FY_COLORS[Math.max(0, FY_COLORS.length - fys.length + i)];
    return `<div class="yoy-pill">
      <div class="pill-dot" style="background:${col.solid}"></div>
      <span>FY${thY}</span>
      <span class="pill-val" style="color:${col.solid}">${total}</span>
      ${isCur ? '<span style="color:var(--green);font-size:8px">★ปัจจุบัน</span>' : ''}
    </div>`;
  }).join('');
}

/* ── Stats strip (total, avg/month, peak month, growth) ── */
function buildYoyStats(fys, result, fyMap) {
  const el = document.getElementById('yoyStats');
  if (!el) return;
  const curFY = getFiscalYear();
  const prevFY = curFY - 1;

  const curTotal  = (fyMap[curFY]||[]).length;
  const prevTotal = (fyMap[prevFY]||[]).length;
  const growth    = prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal * 100).toFixed(1) : null;

  const curBuckets = result[curFY] || Array(12).fill(0);
  const curMonths  = curBuckets.filter(v=>v>0);
  const avgMonth   = curMonths.length ? (curMonths.reduce((a,b)=>a+b,0)/curMonths.length).toFixed(1) : '—';
  const peakVal    = Math.max(...curBuckets);
  const peakMo     = FY_MONTHS_TH[curBuckets.indexOf(peakVal)];

  // All-time total
  const grandTotal = Object.values(fyMap).reduce((s,rows)=>s+rows.length, 0);

  el.innerHTML = `
    <div class="yoy-stat">
      <div class="yoy-stat-val" style="color:var(--cyan)">${curTotal}</div>
      <div class="yoy-stat-lbl">FY${curFY+543} (ปัจจุบัน)</div>
      ${growth !== null ? `<div class="yoy-stat-chg ${+growth>=0?'chg-up':'chg-down'}">${+growth>=0?'▲':'▼'}${Math.abs(growth)}% เทียบปีก่อน</div>` : '<div class="yoy-stat-chg chg-neu">ปีแรก</div>'}
    </div>
    <div class="yoy-stat">
      <div class="yoy-stat-val" style="color:var(--green)">${avgMonth}</div>
      <div class="yoy-stat-lbl">เฉลี่ย/เดือน (ปีนี้)</div>
      <div class="yoy-stat-chg chg-neu">จากเดือนที่มีข้อมูล</div>
    </div>
    <div class="yoy-stat">
      <div class="yoy-stat-val" style="color:var(--amber)">${peakMo}</div>
      <div class="yoy-stat-lbl">เดือน peak FY${curFY+543}</div>
      <div class="yoy-stat-chg chg-neu">${peakVal} รายการ</div>
    </div>
    <div class="yoy-stat">
      <div class="yoy-stat-val" style="color:var(--purple)">${grandTotal}</div>
      <div class="yoy-stat-lbl">รวมทุกปีงบฯ</div>
      <div class="yoy-stat-chg chg-neu">${fys.length} ปีงบประมาณ</div>
    </div>`;
}

/* ── Main Chart ── */
function buildYoyChart(fys, result, fyMap) {
  const canvas = document.getElementById('yoyChart');
  if (!canvas) return;
  if (yoyChartInst) { yoyChartInst.destroy(); yoyChartInst = null; }

  const curFY    = getFiscalYear();
  const curMoIdx = currentFYMonthIndex();
  const labels   = FY_MONTHS_TH;

  // Which FYs to show
  const showFys = yoyActiveFY !== null ? [yoyActiveFY] : fys;

  const datasets = showFys.map((fy, i) => {
    const colIdx = yoyActiveFY !== null ? FY_COLORS.length - 1
                 : Math.max(0, FY_COLORS.length - fys.length + fys.indexOf(fy));
    const col    = FY_COLORS[colIdx];
    const isCur  = fy === curFY;
    const bk     = result[fy] || Array(12).fill(0);

    // For current FY: null out future months
    const data = bk.map((v,mi) => {
      if (isCur && mi > curMoIdx) return null;
      return v;
    });

    // Forecast for current FY future months
    const pastVals = bk.slice(0, curMoIdx+1).filter(v=>v>0);
    const avg      = pastVals.length ? pastVals.reduce((a,b)=>a+b,0)/pastVals.length : 0;

    const fcData = yoyViewMode !== 'heat' && isCur ? bk.map((v,mi) => {
      if (mi < curMoIdx) return null;
      if (mi === curMoIdx) return v;
      return Math.round(avg);
    }) : null;

    const thY = fy + 543;
    const base = {
      label:  `FY${thY}${isCur?' ★':''}`,
      data,
      borderColor:     col.border,
      backgroundColor: yoyViewMode === 'line' ? 'transparent' : col.alpha,
      borderWidth:  isCur ? 2 : 1.5,
      borderRadius: 5,
      tension: 0.35,
      pointRadius:     yoyViewMode === 'line' ? (isCur ? 4 : 3) : 0,
      pointBackgroundColor: col.solid,
      fill: yoyViewMode === 'line' && isCur ? { target:'origin', above: col.alpha } : false,
    };
    if (yoyViewMode === 'stack') base.stack = 'fy';

    const out = [base];

    // Forecast dataset
    if (fcData && yoyViewMode !== 'stack') {
      out.push({
        label: `FY${thY} (คาดการณ์)`,
        data: fcData,
        type: 'line',
        borderColor: 'rgba(168,85,247,0.7)',
        borderWidth: 2,
        borderDash: [6,4],
        backgroundColor: 'rgba(168,85,247,0.06)',
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#a855f7',
        pointStyle: 'triangle',
      });
    }
    return out;
  }).flat();

  const chartType = yoyViewMode === 'line' ? 'line' : 'bar';

  yoyChartInst = new Chart(canvas.getContext('2d'), {
    type: chartType,
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: true,
      interaction: { mode:'index', intersect:false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor:'rgba(4,13,26,.96)',
          borderColor:'rgba(0,200,255,.3)',
          borderWidth:1,
          titleColor:'#e8f4ff',
          bodyColor:'#7aa8cc',
          callbacks: {
            title(items) {
              return `${FY_MONTHS_FULL[items[0].dataIndex]}`;
            },
            label(c) {
              if (c.raw === null) return null;
              return `  ${c.dataset.label}: ${c.raw} รายการ`;
            },
            afterBody(items) {
              // Show YoY diff for the hovered month
              if (showFys.length < 2) return [];
              const moIdx = items[0]?.dataIndex;
              const lines = [];
              for (let i = 1; i < showFys.length; i++) {
                const prev = (result[showFys[i-1]]||[])[moIdx] || 0;
                const cur  = (result[showFys[i]]  ||[])[moIdx] || 0;
                const diff = cur - prev;
                if (prev > 0) {
                  const pct = ((diff/prev)*100).toFixed(1);
                  lines.push(`  Δ FY${showFys[i-1]+543}→${showFys[i]+543}: ${diff>=0?'+':''}${diff} (${pct}%)`);
                }
              }
              return lines;
            }
          }
        }
      },
      scales: {
        x: {
          grid:  { color:'rgba(255,255,255,0.04)' },
          ticks: { color:'#7aa8cc', font:{size:11} }
        },
        y: {
          stacked: yoyViewMode === 'stack',
          grid:  { color:'rgba(255,255,255,0.06)' },
          ticks: { color:'#7aa8cc', font:{size:10} },
          beginAtZero: true
        }
      }
    }
  });
}

/* ── Legend ── */
function buildYoyLegend(fys, result) {
  const el = document.getElementById('yoyLegend');
  if (!el) return;
  const showFys = yoyActiveFY !== null ? [yoyActiveFY] : fys;
  el.innerHTML = showFys.map((fy, i) => {
    const colIdx = yoyActiveFY !== null ? FY_COLORS.length - 1
                 : Math.max(0, FY_COLORS.length - fys.length + fys.indexOf(fy));
    const col = FY_COLORS[colIdx];
    const tot = Object.values(allFYData(_yoyAllData))[fys.indexOf(fy)]?.length || 0;
    return `<div class="yyl-item" onclick="yoyActiveFY=${fy};renderYoy(_yoyAllData)">
      <div class="yyl-swatch" style="background:${col.solid}"></div>
      <span style="color:${col.solid}">FY${fy+543}</span>
      <span style="color:var(--text3)">${result[fy]?.reduce((a,b)=>a+b,0)||0} รายการ</span>
    </div>`;
  }).join('') + (yoyActiveFY !== null ? '' :
    `<div class="yyl-item">
      <div class="yyl-swatch dashed" style="border-color:rgba(168,85,247,.7)"></div>
      <span style="color:#a855f7">คาดการณ์</span>
    </div>`);
}

/* ── Month Detail Cells ── */
function buildYoyMonthCells(fys, result) {
  const cellEl = document.getElementById('yoyMonthCells');
  if (!cellEl) return;
  const showFys  = yoyActiveFY !== null ? [yoyActiveFY] : fys;
  const curFY    = getFiscalYear();
  const curMoIdx = currentFYMonthIndex();

  // Max value across all shown FYs for bar scaling
  let maxVal = 0;
  showFys.forEach(fy => (result[fy]||[]).forEach(v=>{ if(v>maxVal) maxVal=v; }));

  cellEl.innerHTML = FY_MONTHS_TH.map((mo, mi) => {
    const isCurMo = mi === curMoIdx;
    const rows = showFys.map(fy => {
      const v = (result[fy]||Array(12).fill(0))[mi];
      return { fy, v };
    });
    // Primary val = last (most recent) FY
    const primary  = rows[rows.length-1]?.v || 0;
    const prev     = rows[rows.length-2]?.v || null;
    const diff     = prev !== null ? primary - prev : null;
    const diffCls  = diff === null ? 'chg-neu' : diff > 0 ? 'chg-up' : diff < 0 ? 'chg-down' : 'chg-neu';
    const diffTxt  = diff === null ? '' : `${diff>=0?'▲':'▼'}${Math.abs(diff)}`;
    const barW     = maxVal > 0 ? Math.round(primary/maxVal*100) : 0;
    const barColor = isCurMo ? '#00e5a0' : '#00c8ff';

    return `<div class="yoy-month-cell${isCurMo?' current-month':''}"
      onmouseenter="showYoyTip(event,${mi},${JSON.stringify(rows)})"
      onmouseleave="hideYoyTip()">
      <div class="ymc-name">${mo}</div>
      <div class="ymc-val" style="color:${barColor}">${primary||'—'}</div>
      <div class="ymc-bar" style="width:${barW}%;background:${barColor}"></div>
      ${diffTxt ? `<div class="ymc-chg ${diffCls}">${diffTxt}</div>` : ''}
    </div>`;
  }).join('');

  document.getElementById('yoyMonthGrid').style.display = 'block';
}

/* ── Heatmap ── */
function buildYoyHeatmap(fys, result) {
  const hmEl  = document.getElementById('hmBody');
  const hdrEl = document.getElementById('hmHeader');
  if (!hmEl || !hdrEl) return;

  // Header row
  hdrEl.innerHTML = '<div class="hm-hdr-lbl" style="text-align:right">ปีงบฯ</div>' +
    FY_MONTHS_TH.map(m => `<div class="hm-hdr-lbl">${m}</div>`).join('');

  // Max value
  let maxVal = 0;
  fys.forEach(fy => (result[fy]||[]).forEach(v=>{ if(v>maxVal) maxVal=v; }));

  const curFY    = getFiscalYear();
  const curMoIdx = currentFYMonthIndex();

  hmEl.innerHTML = fys.map(fy => {
    const thY    = fy + 543;
    const bk     = result[fy] || Array(12).fill(0);
    const isCur  = fy === curFY;
    return `<div class="hm-row">
      <div class="hm-label" style="color:${isCur?'var(--green)':'var(--text2)'}">${thY}${isCur?' ★':''}</div>
      ${bk.map((v,mi) => {
        const future = isCur && mi > curMoIdx;
        const bg     = future ? 'rgba(255,255,255,0.02)' : hmColor(v, maxVal);
        const tc     = v > maxVal*0.6 ? '#02060e' : '#e8f4ff';
        return `<div class="hm-cell" style="background:${bg};color:${tc};${future?'opacity:.3':''}"
          onmouseenter="showYoyTip(event,${mi},[{fy:${fy},v:${v}}])"
          onmouseleave="hideYoyTip()">${v||''}</div>`;
      }).join('')}
    </div>`;
  }).join('');

  document.getElementById('yoyHeatmap').style.display = 'block';
}

/* ── Tooltip ── */
function showYoyTip(e, moIdx, rows) {
  const tip = document.getElementById('yoyTooltip');
  if (!tip) return;
  const mo = FY_MONTHS_FULL[moIdx];
  tip.innerHTML = `<div class="yoy-tooltip-title">📅 ${mo}</div>` +
    rows.map(r => `<div class="yoy-tooltip-row"><span>FY${r.fy+543}</span><span style="color:#00c8ff">${r.v} รายการ</span></div>`).join('');
  tip.style.left = Math.min(e.clientX+14, window.innerWidth-190) + 'px';
  tip.style.top  = (e.clientY-10) + 'px';
  tip.classList.add('show');
}
function hideYoyTip() {
  const tip = document.getElementById('yoyTooltip');
  if (tip) tip.classList.remove('show');
}

/* ── View Toggle ── */
function setYoyView(mode) {
  yoyViewMode = mode;
  ['Bar','Line','Heat','Stack'].forEach(v => {
    const btn = document.getElementById('v'+v);
    if (btn) btn.classList.toggle('active', v.toLowerCase() === mode);
  });
  renderYoy(_yoyAllData);
}

/* ── MASTER RENDER ── */
function renderYoy(data) {
  if (!data || !data.length) return;
  _yoyAllData = data;

  const { fys, result, fyMap } = buildYoyData(data);
  if (!fys.length) return;

  // Reset active if invalid
  if (yoyActiveFY !== null && !fys.includes(yoyActiveFY)) yoyActiveFY = null;

  buildYoyTabs(fys);
  buildYoySummary(fys, result, fyMap);
  buildYoyStats(fys, result, fyMap);
  buildYoyLegend(fys, result);

  // Hide/show sections
  document.getElementById('yoyMonthGrid').style.display = 'none';
  document.getElementById('yoyHeatmap').style.display   = 'none';
  document.getElementById('yoyChart').style.display     = '';

  if (yoyViewMode === 'heat') {
    document.getElementById('yoyChart').style.display = 'none';
    buildYoyHeatmap(fys, result);
  } else {
    buildYoyChart(fys, result, fyMap);
    buildYoyMonthCells(fys, result);
  }
}



// ════════════════════════════════════════════════════════════════
//  GRAND TOTAL COUNTER — นับสะสมทุกปีงบประมาณ
//  ตัดยอดใหม่ทุก 1 ต.ค. แต่แสดงยอดรวมสะสมทั้งหมด
// ════════════════════════════════════════════════════════════════

/* animate number counting up */
function animateCount(el, from, to, duration) {
  if (!el) return;
  const startTime = performance.now();
  const diff = to - from;
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutExpo
    const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    el.textContent = Math.round(from + diff * ease).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}


function buildGrandTotal(data) {
  if (!data || !data.length) return;

  const grandTotal = data.length;
  const fyMap      = allFYData(data);
  const fys        = Object.keys(fyMap).map(Number).sort();
  const curFY      = getFiscalYear();
  const maxFYCount = Math.max(...fys.map(fy => fyMap[fy].length));

  // Animate grand total counter
  const counterEl = document.getElementById('gtCounter');
  animateCount(counterEl, _prevGrandTotal, grandTotal, 1400);
  _prevGrandTotal = grandTotal;

  // Build per-FY blocks
  const blocksEl = document.getElementById('gtFyBlocks');
  if (!blocksEl) return;

  const FY_BLOCK_COLORS = [
    '#3d6080', '#0090e0', '#00c8ff', '#00e5a0', '#a855f7',
    '#fb923c', '#f472b6', '#67e8f9', '#84cc16'
  ];

  blocksEl.innerHTML = fys.map((fy, i) => {
    const cnt    = fyMap[fy].length;
    const thY    = fy + 543;
    const isCur  = fy === curFY;
    const col    = isCur ? '#00e5a0' : FY_BLOCK_COLORS[i % FY_BLOCK_COLORS.length];
    const barPct = maxFYCount > 0 ? Math.round(cnt / maxFYCount * 100) : 0;

    return `<div class="gt-fy-block${isCur ? ' is-current' : ''}">
      <div class="gt-fy-val" style="${isCur ? '' : 'color:' + col}">${cnt.toLocaleString()}</div>
      <div class="gt-fy-year">FY ${thY}</div>
      <div class="gt-fy-bar-wrap">
        <div class="gt-fy-bar" style="width:${barPct}%;background:${col}"></div>
      </div>
    </div>`;
  }).join('');
}


// ════════════════════════════════════════════════════════════════
//  FIX: Future months → styled placeholder (not blank)
// ════════════════════════════════════════════════════════════════
function buildYoyMonthCellsFixed(fys, result) {
  const cellEl = document.getElementById('yoyMonthCells');
  if (!cellEl) return;

  const showFys  = yoyActiveFY !== null ? [yoyActiveFY] : fys;
  const curFY    = getFiscalYear();
  const curMoIdx = currentFYMonthIndex();
  const now      = new Date();

  let maxVal = 0;
  showFys.forEach(fy => (result[fy] || []).forEach(v => { if (v > maxVal) maxVal = v; }));

  cellEl.innerHTML = FY_MONTHS_TH.map((mo, mi) => {
    // Is this month in the future (for current FY)?
    const hasCurFY   = showFys.includes(curFY);
    const isFuture   = hasCurFY && mi > curMoIdx;
    const isCurMonth = hasCurFY && mi === curMoIdx;

    if (isFuture) {
      // Future month — elegant placeholder button
      const endOfMo = new Date(now.getFullYear(), now.getMonth() + (mi - curMoIdx) + 1, 0);
      const moDate  = new Date(curFY - 1, 9 + mi, 1); // approximate month date
      return `<div class="yoy-month-cell ymc-future">
        <div class="ymc-name">${mo}</div>
        <div class="ymc-val">—</div>
        <div class="ymc-future-btn">⏳ รอข้อมูล</div>
      </div>`;
    }

    const rows = showFys.map(fy => ({
      fy, v: (result[fy] || Array(12).fill(0))[mi]
    }));
    const primary = rows[rows.length - 1]?.v || 0;
    const prev    = rows[rows.length - 2]?.v ?? null;
    const diff    = prev !== null ? primary - prev : null;
    const diffCls = diff === null ? 'chg-neu' : diff > 0 ? 'chg-up' : diff < 0 ? 'chg-down' : 'chg-neu';
    const diffTxt = diff === null ? '' : `${diff >= 0 ? '▲' : '▼'}${Math.abs(diff)}`;
    const barW    = maxVal > 0 ? Math.round(primary / maxVal * 100) : 0;
    const barColor = isCurMonth ? '#00e5a0' : '#00c8ff';

    return `<div class="yoy-month-cell${isCurMonth ? ' current-month' : ''}"
      onmouseenter="showYoyTip(event,${mi},${JSON.stringify(rows)})"
      onmouseleave="hideYoyTip()">
      <div class="ymc-name">${mo}</div>
      <div class="ymc-val" style="color:${barColor}">${primary || (isCurMonth ? '0' : '—')}</div>
      <div class="ymc-bar" style="width:${barW}%;background:${barColor}"></div>
      ${diffTxt ? `<div class="ymc-chg ${diffCls}">${diffTxt}</div>` : ''}
    </div>`;
  }).join('');

  document.getElementById('yoyMonthGrid').style.display = 'block';
}

// Override the original buildYoyMonthCells
const _origBuildYoyMonthCells = buildYoyMonthCells;
buildYoyMonthCells = buildYoyMonthCellsFixed;


// ════════════════════════════════════════════════════════════════
//  FIX: Heatmap future cells
// ════════════════════════════════════════════════════════════════
function buildYoyHeatmapFixed(fys, result) {
  const hmEl  = document.getElementById('hmBody');
  const hdrEl = document.getElementById('hmHeader');
  if (!hmEl || !hdrEl) return;

  hdrEl.innerHTML = '<div class="hm-hdr-lbl" style="text-align:right">ปีงบฯ</div>' +
    FY_MONTHS_TH.map(m => `<div class="hm-hdr-lbl">${m}</div>`).join('');

  let maxVal = 0;
  fys.forEach(fy => (result[fy] || []).forEach(v => { if (v > maxVal) maxVal = v; }));

  const curFY    = getFiscalYear();
  const curMoIdx = currentFYMonthIndex();

  hmEl.innerHTML = fys.map(fy => {
    const thY   = fy + 543;
    const bk    = result[fy] || Array(12).fill(0);
    const isCur = fy === curFY;
    return `<div class="hm-row">
      <div class="hm-label" style="color:${isCur ? 'var(--green)' : 'var(--text2)'}">${thY}${isCur ? ' ★' : ''}</div>
      ${bk.map((v, mi) => {
        const isFuture = isCur && mi > curMoIdx;
        if (isFuture) {
          return `<div class="hm-cell hm-future" title="${FY_MONTHS_TH[mi]} — ยังไม่ถึง">⏳</div>`;
        }
        const bg = hmColor(v, maxVal);
        const tc = v > maxVal * 0.6 ? '#02060e' : '#e8f4ff';
        return `<div class="hm-cell" style="background:${bg};color:${tc}"
          onmouseenter="showYoyTip(event,${mi},[{fy:${fy},v:${v}}])"
          onmouseleave="hideYoyTip()">${v || ''}</div>`;
      }).join('')}
    </div>`;
  }).join('');

  document.getElementById('yoyHeatmap').style.display = 'block';
}

// Override original heatmap
buildYoyHeatmap = buildYoyHeatmapFixed;



