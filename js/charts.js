/* ────────────────────────────────────────────────────────────
   กปภ.พิษณุโลก Dashboard — js/charts.js
   Chart instances · updateAll · Helpers
   ──────────────────────────────────────────────────────────── */

// ════════════════════════════════
//  CHART INSTANCES
// ════════════════════════════════
let trendChart, pieChart, dailyChart, agingChart, stackedChart, _barDummy;

function mkGrad(ctx, y0, y1, c0, c1) {
  const {chart:{ctx:c, chartArea:a}} = ctx;
  if (!a) return c0;
  const g = c.createLinearGradient(0, y0 ?? a.top, 0, y1 ?? a.bottom);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  return g;
}

function initCharts() {

  // ══════════════════════════════
  //  1. TREND — Neon line + glow fill + dots
  // ══════════════════════════════
  trendChart = new Chart(document.getElementById('trendChart'), {
    type:'line',
    data:{ labels:[], datasets:[
      {
        label:'งาน', data:[],
        borderColor:'#00f0ff',
        borderWidth:3,
        pointBackgroundColor:'#00f0ff',
        pointBorderColor:'#020814',
        pointBorderWidth:2.5,
        pointRadius:5,
        pointHoverRadius:9,
        pointHoverBackgroundColor:'#fff',
        pointHoverBorderColor:'#00f0ff',
        pointHoverBorderWidth:3,
        fill:true,
        backgroundColor: ctx => mkGrad(ctx, null, null,
          'rgba(0,240,255,0.28)', 'rgba(0,100,200,0)'),
        tension:0.42,
        _glowColor:'rgba(0,240,255,0.9)',
      },
      // ── งานก่อนปิด: infer จาก running number ใน job ID ──
      {
        label:'งานก่อนปิด', data:[],
        borderColor:'#ffab00',
        borderWidth:2.5,
        borderDash:[6,4],
        pointBackgroundColor:'#ffab00',
        pointBorderColor:'#020814',
        pointBorderWidth:2,
        pointRadius:4,
        pointHoverRadius:8,
        pointHoverBackgroundColor:'#fff',
        pointHoverBorderColor:'#ffab00',
        fill: false,
        tension:0.42,
        _glowColor:'rgba(255,171,0,0.8)',
      }
    ]},
    options:{
      responsive:true, maintainAspectRatio:true,
      interaction:{mode:'index', intersect:false},
      plugins:{
        legend:{display:false},
        tooltip:{
          ...TIP,
          filter: item => item.datasetIndex === 0 || item.datasetIndex === 1,
          callbacks:{
            title: items => items[0].label,
            label: c => {
              if (c.datasetIndex === 0) return `  📦 ปิดงาน: ${c.parsed.y.toLocaleString()} รายการ`;
              if (c.datasetIndex === 1) return `  📋 เปิดงาน: ${c.parsed.y.toLocaleString()} รายการ`;
            },
            afterBody: items => {
              const closed = items.find(i=>i.datasetIndex===0);
              const opened = items.find(i=>i.datasetIndex===1);
              if (closed && opened && opened.parsed.y > 0) {
                const diff = closed.parsed.y - opened.parsed.y;
                const sign = diff >= 0 ? '+' : '';
                return [`  ─────────────────`, `  ผลต่าง: ${sign}${diff} รายการ`];
              }
              return [];
            },
          }
        },
      },
      scales:{
        x:{ grid:GRID_X, ticks:{...TICK, maxRotation:40}, border:BORDER },
        y:{
          grid:GRID_Y, beginAtZero:true, border:BORDER,
          ticks:{...TICK, callback:v=>v>0?v:''},
        },
      },
      animation:{duration:1000, easing:'easeOutExpo'},
      elements:{ line:{ cubicInterpolationMode:'monotone' } },
    }
  });

  // ══════════════════════════════
  //  2. CONTRACTOR BARS — Cyber neon border style
  // ══════════════════════════════
  pieChart = new Chart(document.getElementById('pieChart'), {
    type:'bar',
    data:{ labels:[], datasets:[{
      data:[],
      backgroundColor:[],
      borderColor:[],
      borderWidth:2.5,
      borderRadius:6,
      borderSkipped:false,
      hoverBackgroundColor:[],
      hoverBorderWidth:3,
      barPercentage:0.55,
    }]},
    options:{
      responsive:true, maintainAspectRatio:true,
      plugins:{
        legend:{display:false},
        tooltip:{
          ...TIP,
          callbacks:{
            title: items => items[0].label,
            label: c => {
              const total = c.dataset.data.reduce((a,b)=>a+b,0);
              const pct = ((c.parsed.y/total)*100).toFixed(1);
              return `  งาน: ${c.parsed.y.toLocaleString()} รายการ (${pct}%)`;
            }
          }
        },
      },
      scales:{
        x:{
          grid:{ display:false },
          ticks:{ color:'rgba(200,230,255,0.65)', font:{size:11,family:'Kanit',weight:'500'} },
          border:{ display:false },
        },
        y:{
          grid:{ color:'rgba(255,255,255,0.05)', drawBorder:false },
          beginAtZero:true,
          ticks:{ color:'rgba(120,170,210,0.5)', font:{size:10,family:'JetBrains Mono'} },
          border:{ display:false },
        },
      },
      animation:{
        duration:900,
        easing:'easeOutExpo',
        delay: ctx => ctx.dataIndex * 80,
      },
    }
  });

  // ══════════════════════════════
  //  3. DAILY — Cyber neon bars (same style as contractor chart)
  // ══════════════════════════════
  dailyChart = new Chart(document.getElementById('dailyChart'), {
    type:'bar',
    data:{ labels:[], datasets:[{
      data:[],
      backgroundColor:[],
      borderColor:[],
      borderWidth:2,
      borderRadius:{ topLeft:5, topRight:5 },
      borderSkipped:false,
      hoverBorderWidth:3,
      barPercentage:0.72,
    }]},
    options:{
      responsive:true, maintainAspectRatio:true,
      plugins:{
        legend:{display:false},
        tooltip:{...TIP, callbacks:{label:c=>`  งาน: ${c.parsed.y} รายการ`}},
      },
      scales:{
        x:{ grid:GRID_X, ticks:{...TICK, maxRotation:50, font:{size:9,family:'JetBrains Mono'}}, border:BORDER },
        y:{ grid:GRID_Y, beginAtZero:true, ticks:TICK, border:BORDER },
      },
      animation:{
        duration:700,
        easing:'easeOutBack',
        delay: ctx => ctx.dataIndex * 18,
      },
    }
  });

  // ══════════════════════════════
  //  4. AGING — Horizontal bars, color-coded urgency with glow
  // ══════════════════════════════
  agingChart = new Chart(document.getElementById('agingChart'), {
    type:'bar',
    data:{ labels:[], datasets:[{
      data:[], backgroundColor:[], borderColor:[],
      borderWidth:0,
      borderRadius:{ topLeft:0, topRight:6, bottomLeft:0, bottomRight:6 },
      borderSkipped:false,
      barThickness:20,
    }]},
    options:{
      indexAxis:'y',
      responsive:true, maintainAspectRatio:true,
      plugins:{
        legend:{display:false},
        tooltip:{
          ...TIP,
          callbacks:{
            label: c => `  ค้างนาน ${c.parsed.x.toLocaleString()} วัน`,
            afterLabel: c => {
              const d = agingChart._dates||[];
              return d[c.dataIndex] ? `  ตั้งแต่ ${d[c.dataIndex]}` : '';
            },
          },
        },
      },
      scales:{
        x:{
          grid:{ color:'rgba(255,255,255,0.04)', drawBorder:false },
          beginAtZero:true,
          ticks:{ ...TICK, callback:v=>v+' วัน' },
          border:BORDER,
        },
        y:{
          grid:{ display:false },
          ticks:{ color:'rgba(200,230,255,0.75)', font:{size:11,family:'Kanit',weight:'500'} },
          border:BORDER,
        },
      },
      animation:{ duration:1000, easing:'easeOutExpo', delay:ctx=>ctx.dataIndex*60 },
    }
  });

  // ── DUMMY ──
  _barDummy = new Chart(document.createElement('canvas'),{type:'bar',data:{labels:[],datasets:[{data:[]}]},options:{}});

  // ══════════════════════════════
  //  5. STACKED — Solid flat fills, vivid palette, legend top-center
  // ══════════════════════════════
  stackedChart = new Chart(document.getElementById('stackedChart'), {
    type:'bar',
    data:{labels:[], datasets:[]},
    options:{
      responsive:true, maintainAspectRatio:true,
      plugins:{
        legend:{
          display:true, position:'top', align:'center',
          labels:{
            font:{size:11,family:'Kanit',weight:'500'},
            color:'rgba(220,240,255,0.85)',
            boxWidth:13, boxHeight:13, padding:20,
            usePointStyle:true, pointStyle:'rectRounded',
          }
        },
        tooltip:{
          ...TIP, mode:'index', intersect:false,
          callbacks:{
            title: items => items[0].label,
            label: c => {
              if (!c.parsed.y) return null;
              return `  ${c.dataset.label}: ${c.parsed.y} งาน`;
            },
            footer: items => {
              const sum = items.reduce((s,i)=>s+i.parsed.y,0);
              return `  รวม: ${sum} งาน`;
            }
          },
        },
      },
      scales:{
        x:{
          stacked:true,
          grid:{ display:false },
          ticks:{ color:'rgba(180,210,240,0.7)', font:{size:11,family:'Kanit'} },
          border:{ display:false },
        },
        y:{
          stacked:true,
          grid:{ color:'rgba(255,255,255,0.05)', drawBorder:false },
          beginAtZero:true,
          ticks:{ color:'rgba(120,170,210,0.5)', font:{size:10,family:'JetBrains Mono'}, stepSize:50 },
          border:{ display:false },
        },
      },
      animation:{duration:900, easing:'easeOutQuart'},
    }
  });
}


// ════════════════════════════════
//  UPDATE ALL CHARTS + STATS
// ════════════════════════════════
const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

function moLabel(k) {
  const [y,m] = k.split('-');
  return `${MONTHS_TH[parseInt(m)-1]} ${parseInt(y)+543}`;
}
function moLabelShort(k) {
  const [y,m] = k.split('-');
  return `${MONTHS_TH[parseInt(m)-1]}.${String(parseInt(y)+543).slice(-2)}`;
}

function updateAll() {
  const total = allData.length;

  let targetFile = window.lastImportedFile;
  if (!targetFile || targetFile === 'MySQL DB' || targetFile === 'ฐานข้อมูลว่าง') {
    const files = allData.map(d => d[5]).filter(f => f && f !== 'BUILTIN_DATA' && f !== 'admin_sync');
    if (files.length) {
      targetFile = files[files.length - 1];
    }
  }

  // Calculate: Total rows in latest file (including duplicates!)
  let latestFileTotal = window.lastFileTotal || 0;
  if (!latestFileTotal && targetFile) {
    latestFileTotal = allData.filter(d => d[5] === targetFile).length;
  }

  // Calculate: Pending rows in latest file
  let countEstimate = 0;
  const isPendingDoc = d => (d[3] || '').includes('รอประมาณราคา') || (d[3] || '').startsWith('1)') ||
                             (d[4] || '').includes('รอประมาณราคา') || (d[4] || '').startsWith('1)');
  if (targetFile) {
    countEstimate = allData.filter(d => d[5] === targetFile && isPendingDoc(d)).length;
  }

  const pendingCountEl = document.getElementById('uibPendingCount');
  if (pendingCountEl) {
    pendingCountEl.textContent = countEstimate.toLocaleString();
  }

  if (!total) return;
  const now = new Date();

  // ── Stats ──
  const ctSet = [...new Set(allData.map(d=>d[2]).filter(Boolean))];
  const ctCounts = {};
  allData.forEach(d=>{ if(d[2]) ctCounts[d[2]]=(ctCounts[d[2]]||0)+1; });
  const topCt = Object.entries(ctCounts).sort((a,b)=>b[1]-a[1])[0];
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const thisMonthCnt = allData.filter(d=>d[1]&&d[1].startsWith(thisMonth)).length;
  const uniqDates = [...new Set(allData.map(d=>d[1]?.split(' ')[0]).filter(Boolean))];
  const avg = uniqDates.length ? (total/uniqDates.length).toFixed(1) : 0;

  // Card 2: เอกสารนำเข้าล่าสุด = จำนวนรายการทั้งหมดในไฟล์นำเข้าล่าสุดเท่านั้น
  document.getElementById('statTotal').textContent = latestFileTotal.toLocaleString();
  document.getElementById('statTotalSub').textContent = targetFile ? `ไฟล์: ${targetFile}` : 'ไฟล์นำเข้าล่าสุด';

  // Card c4: จำนวนงานสะสมปีงบประมาณ = จำนวนงานทั้งหมดที่นำเข้ามา ตัดยอดเป็น ปีงบประมาณทางรายการ
  const currentFYVal = getFiscalYear();
  const _fyTotalNow = (allFYData(allData)[currentFYVal] || []).length;

  const elPendingEst = document.getElementById('statPendingEstimate');
  const elPendingEstSub = document.getElementById('statPendingEstimateSub');
  if (elPendingEst) elPendingEst.textContent = _fyTotalNow.toLocaleString();
  if (elPendingEstSub) {
    elPendingEstSub.textContent = `ปีงบประมาณ: ${currentFYVal + 543}`;
  }

  // Card 1: งานที่ประมาณการวันนี้ = จำนวนงานก่อนไฟล์ล่าสุด - จำนวนงานไฟล์ล่าสุด (ยอดรวมนำเข้าทั้งหมด ไม่หักเลขซ้ำ)
  const filesList = [...new Set(allData.map(d => d[5]).filter(f => f && f !== 'BUILTIN_DATA' && f !== 'admin_sync'))];
  const estTodayCnt = (window.lastFileTotal || 0) - (window.prevFileTotal || 0);

  const elEstToday = document.getElementById('statEstimatedToday');
  const elEstTodaySub = document.getElementById('statEstimatedTodaySub');
  if (elEstToday) elEstToday.textContent = estTodayCnt.toLocaleString();
  if (elEstTodaySub) {
    const prevName = filesList.length >= 2 ? filesList[filesList.length - 2].slice(-15) : 'ไม่มี';
    const latName = filesList.length >= 1 ? filesList[filesList.length - 1].slice(-15) : 'ไม่มี';
    elEstTodaySub.textContent = `เทียบไฟล์: ${prevName} vs ${latName}`;
  }

  document.getElementById('statContractors').textContent = ctSet.length;
  document.getElementById('statTopContractor').textContent = topCt ? `มากสุด: ${shortName(topCt[0])}` : '—';
  document.getElementById('statThisMonth').textContent = thisMonthCnt;
  document.getElementById('statMonthSub').textContent = moLabel(thisMonth);
  document.getElementById('statAvgDay').textContent = avg;
  document.getElementById('statAvgSub').textContent = `จาก ${uniqDates.length} วัน`;

  // ── Trend: ปิดงาน (จริง) + งานก่อนปิด (infer จาก running number) ──
  const monthly = {};
  allData.forEach(d=>{ if(d[1]){ const k=d[1].substring(0,7); monthly[k]=(monthly[k]||0)+1; } });
  const mKeys = Object.keys(monthly).sort();
  trendChart.data.labels = mKeys.map(moLabel);
  trendChart.data.datasets[0].data = mKeys.map(k=>monthly[k]);


  // ── คำนวณ "งานก่อนปิด" จาก running number ──
  // Job ID format: CC-XXXX-NUM/FY  → NUM เป็น running counter ในปีงบ
  // แต่ละปีงบ: NUM ต่ำสุด ≈ ต.ค. (เดือนแรก), NUM สูงสุด ≈ ก.ย. (เดือนสุดท้าย)
  const monthlyOpen = {};
  // จัดกลุ่มข้อมูลตามปีงบ เพื่อ interpolate แยกกัน
  const byFY = {};
  allData.forEach(d => {
    const m = (d[0]||'').match(/CC-\d+-(\d+)\/(\d+)/);
    if (!m) return;
    const num = parseInt(m[1]), fy = parseInt(m[2]);
    if (!byFY[fy]) byFY[fy] = [];
    byFY[fy].push(num);
  });
  // แปลง num → เดือนเปิดงาน ด้วย linear interpolation ต่อปีงบ
  Object.entries(byFY).forEach(([fy, nums]) => {
    fy = parseInt(fy);
    const fyStartYear = fy - 1;           // FY2569 เริ่ม ต.ค. 2568
    const fyStart = new Date(fyStartYear - 543, 9, 1);  // ต.ค. (พ.ศ.→ค.ศ.: -543)
    const fyEnd   = new Date(fyStartYear - 543 + 1, 8, 30); // ก.ย. ปีถัดไป
    const numMin  = Math.min(...nums);
    const numMax  = Math.max(...nums);
    const span    = numMax - numMin || 1;
    const msSpan  = fyEnd - fyStart;

    allData.forEach(d => {
      const m2 = (d[0]||'').match(/CC-\d+-(\d+)\/(\d+)/);
      if (!m2 || parseInt(m2[2]) !== fy) return;
      const num = parseInt(m2[1]);
      const t   = (num - numMin) / span;
      const openDate = new Date(fyStart.getTime() + t * msSpan);
      const k   = openDate.getFullYear() + '-' + String(openDate.getMonth()+1).padStart(2,'0');
      monthlyOpen[k] = (monthlyOpen[k]||0) + 1;
    });
  });
  // ใส่ข้อมูลลง dataset[2] ตาม labels เดิม
  trendChart.data.datasets[1].data = mKeys.map(k => monthlyOpen[k] || null);

  trendChart.update();

  // ── Contractor Bars: cyber neon border + transparent fill ──
  const sortedCt = Object.entries(ctCounts).sort((a,b)=>b[1]-a[1]);
  const vibeColors = sortedCt.map((_,i) => VIBE[i % VIBE.length]);

  pieChart.data.labels = sortedCt.map(([k])=>shortName(k));
  pieChart.data.datasets[0].data = sortedCt.map(([,v])=>v);

  // Neon fill: very transparent, border full neon color
  pieChart.data.datasets[0].backgroundColor = vibeColors.map(v => v.dark);
  pieChart.data.datasets[0].borderColor      = vibeColors.map(v => v.main);
  pieChart.data.datasets[0].hoverBackgroundColor = vibeColors.map(v => v.mid.replace('0.7','0.22'));

  // Inject per-bar glow via custom draw (shadow on border)
  pieChart._vibeColors = vibeColors;
  pieChart.update();

  // ── Daily: cyber neon per-bar colors cycling through VIBE ──
  const daily = {};
  allData.forEach(d=>{ if(d[1]){ const dt=d[1].split(' ')[0]; daily[dt]=(daily[dt]||0)+1; } });
  const dKeys = Object.keys(daily).sort().slice(-30);
  dailyChart.data.labels = dKeys.map(k=>k.substring(5));
  dailyChart.data.datasets[0].data = dKeys.map(k=>daily[k]);
  // Assign per-bar: transparent fill + vivid border cycling VIBE
  dailyChart.data.datasets[0].backgroundColor = dKeys.map((_,i) => VIBE[i % VIBE.length].dark);
  dailyChart.data.datasets[0].borderColor      = dKeys.map((_,i) => VIBE[i % VIBE.length].main);
  dailyChart.data.datasets[0].hoverBackgroundColor = dKeys.map((_,i) => VIBE[i % VIBE.length].mid.replace('0.7','0.25'));
  dailyChart.update();

  // ── Aging: per-bar gradient colors with urgency ──
  const ctOldest = {};
  const today = new Date(); today.setHours(0,0,0,0);
  allData.forEach(d=>{
    if(!d[1]||!d[2]) return;
    const dt=new Date(d[1]); dt.setHours(0,0,0,0);
    if(!ctOldest[d[2]]||dt<ctOldest[d[2]]) ctOldest[d[2]]=dt;
  });
  const aging = Object.entries(ctOldest)
    .map(([ct,dt])=>({ ct, dt, days:Math.round((today-dt)/86400000) }))
    .sort((a,b)=>b.days-a.days);

  // Build per-bar gradients using canvas (will be resolved at draw time)
  const agBg = aging.map(e => {
    if (e.days>180) return { c0:'#ff6b6b', c1:'#ff2040', glow:'rgba(255,60,80,0.8)' };
    if (e.days>90)  return { c0:'#ffd166', c1:'#ff8c00', glow:'rgba(255,150,30,0.8)' };
    if (e.days>30)  return { c0:'#ffe566', c1:'#ffbe0b', glow:'rgba(255,210,30,0.8)' };
    return              { c0:'#67e8f9', c1:'#00c8ff', glow:'rgba(0,240,255,0.8)' };
  });

  // Use solid colors (canvas gradient in horizontal bar needs special handling)
  agingChart.data.datasets[0].backgroundColor = aging.map((e,i) => {
    const {c0} = agBg[i];
    return c0 + 'cc';
  });
  agingChart.data.datasets[0].borderColor = aging.map((e,i) => agBg[i].c0 + '88');
  agingChart.data.datasets[0].borderWidth = 1;
  agingChart.data.datasets[0].hoverBackgroundColor = aging.map((e,i) => agBg[i].c0);

  const fmtD = d=>`${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear()+543}`;
  agingChart.data.labels = aging.map(e=>shortName(e.ct));
  agingChart.data.datasets[0].data = aging.map(e=>e.days);
  agingChart._dates = aging.map(e=>fmtD(e.dt));
  agingChart.update();

  // ── Stacked: cyber neon border + transparent fill (same style as contractor bars) ──
  const STACK_NEON = [
    { border:'#1de9b6', fill:'rgba(29,233,182,0.12)',  hover:'rgba(29,233,182,0.22)'  },  // teal
    { border:'#ff4d6d', fill:'rgba(255,77,109,0.10)',   hover:'rgba(255,77,109,0.22)'  },  // red/pink
    { border:'#448aff', fill:'rgba(68,138,255,0.10)',   hover:'rgba(68,138,255,0.22)'  },  // blue
    { border:'#ffca28', fill:'rgba(255,202,40,0.10)',   hover:'rgba(255,202,40,0.22)'  },  // amber
    { border:'#ce93d8', fill:'rgba(206,147,216,0.10)',  hover:'rgba(206,147,216,0.22)' },  // purple
    { border:'#ff7043', fill:'rgba(255,112,67,0.10)',   hover:'rgba(255,112,67,0.22)'  },  // orange
    { border:'#69f0ae', fill:'rgba(105,240,174,0.10)',  hover:'rgba(105,240,174,0.22)' },  // green
    { border:'#40c4ff', fill:'rgba(64,196,255,0.10)',   hover:'rgba(64,196,255,0.22)'  },  // sky
    { border:'#ea80fc', fill:'rgba(234,128,252,0.10)',  hover:'rgba(234,128,252,0.22)' },  // pink
  ];

  const stackMo={}, stackCtS=new Set();
  allData.forEach(d=>{
    if(!d[1]||!d[2]) return;
    const k=d[1].substring(0,7); stackCtS.add(d[2]);
    if(!stackMo[k]) stackMo[k]={};
    stackMo[k][d[2]]=(stackMo[k][d[2]]||0)+1;
  });
  const sKeys=Object.keys(stackMo).sort();
  const sCtList=[...stackCtS].sort((a,b)=>{
    const ta=sKeys.reduce((s,k)=>s+(stackMo[k][a]||0),0);
    const tb=sKeys.reduce((s,k)=>s+(stackMo[k][b]||0),0);
    return tb-ta;
  });

  const MONTHS_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                       'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  function moLabelFull(k) {
    const [y,m] = k.split('-');
    return `${MONTHS_FULL[parseInt(m)-1]}.${String(parseInt(y)+543).slice(-2)}`;
  }

  stackedChart.data.labels = sKeys.map(moLabelFull);
  stackedChart.data.datasets = sCtList.map((ct,i)=>{
    const c = STACK_NEON[i % STACK_NEON.length];
    const isTop = i === sCtList.length - 1;
    return {
      label: shortName(ct),
      data: sKeys.map(k=>stackMo[k][ct]||0),
      backgroundColor: c.fill,
      hoverBackgroundColor: c.hover,
      borderColor: c.border,
      borderWidth: 1.5,
      borderRadius: isTop ? { topLeft:4, topRight:4, bottomLeft:0, bottomRight:0 } : 0,
      borderSkipped: false,
      barPercentage: 0.65,
      categoryPercentage: 0.75,
    };
  });
  stackedChart.update();

  // ── Clock ──
  document.getElementById('lastUpdate').textContent = fmtDT(new Date());

  // ── Dropdowns ──
  const selCt = document.getElementById('filterContractor2');
  const prevCt = selCt.value;
  selCt.innerHTML='<option value="">ช่างทั้งหมด</option>';
  ctSet.sort().forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=shortName(c); selCt.appendChild(o); });
  selCt.value=prevCt;

  const selMo = document.getElementById('filterMonth');
  const prevMo = selMo.value;
  selMo.innerHTML='<option value="">เดือนทั้งหมด</option>';
  sKeys.forEach(k=>{ const o=document.createElement('option'); o.value=k; o.textContent=moLabelShort(k); selMo.appendChild(o); });
  selMo.value=prevMo;

  filterAndRender();

  // ── อัพเดท Leaderboard + Ticker ──
  renderLeaderboard(allData);

  // ── อัพเดท KPI + AI (FY Dashboard) ──
  if (typeof updateFYDashboard === 'function') updateFYDashboard(allData);

  // ── Year-over-Year Comparison ──
  if (typeof renderYoy      === 'function') renderYoy(allData);
  // ── Grand Total Counter ──
  if (typeof buildGrandTotal === 'function') buildGrandTotal(allData);
  // ── Update expand button sub-texts ──
  if (typeof updateExpandBtnSubs === 'function' &&
      typeof fyFilterData === 'function' && typeof buildFYBanner === 'function') {
    const _fyData2   = fyFilterData(allData);
    const _prog2     = typeof fyProgress === 'function' ? fyProgress() : {};
    const _kpiMeta2  = buildFYBanner(_prog2, _fyData2);
    updateExpandBtnSubs(_fyData2, _kpiMeta2);
  }
}


// ════════════════════════════════
//  HELPERS
// ════════════════════════════════
function fmtDT(d) {
  if (!(d instanceof Date)||isNaN(d)) return '—';
  const p = n => String(n).padStart(2,'0');
  const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const day  = p(d.getDate());
  const mon  = MONTHS[d.getMonth()];
  const year = d.getFullYear() + 543;
  const hh   = p(d.getHours());
  const mm   = p(d.getMinutes());
  const ss   = p(d.getSeconds());
  return `${day} ${mon} ${year}  ${hh}:${mm}:${ss}`;
}
function exportChart(id, name) {
  const canvas=document.getElementById(id); if(!canvas) return;
  const off=document.createElement('canvas'); off.width=canvas.width; off.height=canvas.height;
  const ctx=off.getContext('2d');
  ctx.fillStyle='#0b1a2e'; ctx.fillRect(0,0,off.width,off.height);
  ctx.drawImage(canvas,0,0);
  const a=document.createElement('a');
  const now=new Date(), p=n=>String(n).padStart(2,'0');
  a.download=`${name}_${now.getFullYear()}${p(now.getMonth()+1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}.png`;
  a.href=off.toDataURL('image/png'); a.click();
}


// ════════════════════════════════════════════════════════════════
//  SHARED HELPERS
// ════════════════════════════════════════════════════════════════
function dbFmtDate(isoStr) {
  const d = new Date(isoStr);
  const p = n => String(n).padStart(2,'0');
  const M = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${p(d.getDate())} ${M[d.getMonth()]} ${d.getFullYear()+543} เวลา ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} น.`;
}

function dbRenderStatus(meta, state, extraMsg) {
  const el = document.getElementById('dbStatusBar');
  if (!el) return;
  const MAP = {
    db     :{ ico:'🗄️', label:'โหลดจาก MySQL Server',          color:'var(--green)' },
    saved  :{ ico:'💾', label:'บันทึกลง MySQL Server แล้ว',    color:'var(--green)' },
    synced :{ ico:'🔄', label:'ซิงค์ Real-time',              color:'var(--cyan)' },
    loaded :{ ico:'✅', label:'โหลดจากฐานข้อมูล local',        color:'var(--cyan)' },
    saving :{ ico:'⏳', label:'กำลังบันทึก...',                color:'var(--purple)' },
    offline:{ ico:'📴', label:'Offline (localStorage)',         color:'var(--amber)' },
    builtin:{ ico:'📦', label:'ข้อมูลเริ่มต้น (Built-in)',       color:'var(--amber)' },
    cleared:{ ico:'🗑️', label:'ล้างข้อมูลแล้ว',              color:'var(--text3)' },
    offline:{ ico:'📡', label:'Offline Mode (Local)',         color:'var(--amber)' },
    error  :{ ico:'⚠️', label:'เกิดข้อผิดพลาด',              color:'var(--red)' },
  };
  const s = MAP[state] || { ico:'❓', label:state, color:'var(--text2)' };
  let html = `<span class="dbs-icon">${s.ico}</span>
    <span class="dbs-state" style="color:${s.color}">${s.label}</span>`;

  if (meta) {
    html += `<span class="dbs-sep">|</span>
      <span class="dbs-file">📄 ${meta.fileName}</span>
      <span class="dbs-sep">·</span>
      <span class="dbs-rows" style="color:${s.color}">${(meta.rowCount||0).toLocaleString()} รายการ</span>
      <span class="dbs-sep">·</span>
      <span class="dbs-dt">${dbFmtDate(meta.savedAt)}</span>`;
  }
  if (extraMsg) html += `<span class="dbs-err"> — ${extraMsg}</span>`;
  // Settings + Clear buttons
  html += `<span style="margin-left:auto">
    <button class="dbs-clear-btn" onclick="pwClearData()">🗑️ ล้างข้อมูล</button>
  </span>`;
  el.innerHTML = html;
  el.className = `db-status-bar db-${state}`;
}

