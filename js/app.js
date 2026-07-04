/* ────────────────────────────────────────────────────────────
   กปภ.พิษณุโลก Dashboard — js/app.js
   Events · Boot · Weather widget · Auto-refresh
   ──────────────────────────────────────────────────────────── */

// ════════════════════════════════
//  EVENTS
// ════════════════════════════════

// คลิกที่ drop-zone → ถาม password ก่อน
document.getElementById('dropZone').addEventListener('click', () => {
  // สร้าง temp input เพื่อเลือกไฟล์
  const tmp = document.createElement('input');
  tmp.type = 'file';
  tmp.accept = '.xlsx,.xls,.csv,.txt,.tsv';
  tmp.multiple = true;
  tmp.onchange = e => { if(e.target.files.length) pwShowModal(e.target.files); };
  tmp.click();
});

// ลากไฟล์มาวาง → ถาม password ก่อน
const dz = document.getElementById('dropZone');
dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
dz.addEventListener('dragleave', ()  => dz.classList.remove('drag-over'));
dz.addEventListener('drop', e => {
  e.preventDefault();
  dz.classList.remove('drag-over');
  if (e.dataTransfer.files.length) pwShowModal(e.dataTransfer.files);
});

document.getElementById('searchInput').addEventListener('input', filterAndRender);
document.getElementById('filterContractor2').addEventListener('change', filterAndRender);
document.getElementById('filterMonth').addEventListener('change', filterAndRender);
document.getElementById('filterType').addEventListener('change', filterAndRender);

// clock
setInterval(()=>{
  const now=new Date(); const p=n=>String(n).padStart(2,'0');
  const M=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const ds=`${p(now.getDate())} ${M[now.getMonth()]} ${now.getFullYear()+543}`;
  const ts=`${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`;
  document.getElementById('lastUpdate').textContent=`${ds}  ${ts}`;
  document.getElementById('uibTime').textContent=ts;
},1000);


// ════════════════════════════════
//  BOOT — เริ่มต้นระบบ
// ════════════════════════════════
initCharts();

// ── โหลดข้อมูลจาก LocalStorage เมื่อเปิดหน้า ──
initGreeting();
lsBootData();


// ════════════════════════════════════════════════
//  WEATHER WIDGET — Open-Meteo (ฟรี ไม่ต้อง API Key)
// ════════════════════════════════════════════════
(function(){
  const WMO={0:{th:'แจ่มใส',i:'☀️'},1:{th:'แจ่มใสเป็นส่วนมาก',i:'🌤️'},2:{th:'มีเมฆบางส่วน',i:'⛅'},
    3:{th:'มีเมฆมาก',i:'☁️'},45:{th:'หมอก',i:'🌫️'},48:{th:'หมอกเยือกแข็ง',i:'🌫️'},
    51:{th:'ฝนปรอยเบา',i:'🌦️'},53:{th:'ฝนปรอย',i:'🌦️'},55:{th:'ฝนปรอยหนัก',i:'🌧️'},
    61:{th:'ฝนเบา',i:'🌧️'},63:{th:'ฝนปานกลาง',i:'🌧️'},65:{th:'ฝนหนัก',i:'🌧️'},
    80:{th:'ฝนเป็นระยะ',i:'🌦️'},81:{th:'ฝนพายุ',i:'⛈️'},82:{th:'พายุหนัก',i:'⛈️'},
    95:{th:'ฟ้าคะนอง',i:'⛈️'},99:{th:'พายุลูกเห็บ',i:'🌩️'}};
  function wmo(c){return WMO[c]||{th:'—',i:'🌡️'};}
  function wdir(d){return ['N','NE','E','SE','S','SW','W','NW'][Math.round((d||0)/45)%8];}
  function tc(t){return t>=38?'#ff2040':t>=35?'#ff4757':t>=32?'ff7043':t>=28?'#ffa040':t>=24?'#ffd700':'#67e8f9';}
  async function fetchWx(lat,lon){
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation&timezone=Asia%2FBangkok&wind_speed_unit=kmh`);
    return (await r.json()).current;
  }
  async function fetchCity(lat,lon){
    try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=th`);
      const j=await r.json();return j.address?.city||j.address?.town||j.address?.county||'';}catch{return '';}
  }
  function render(d,city){
    const el=document.getElementById('wxWidget');if(!el)return;
    const w=wmo(d.weather_code),t=Math.round(d.temperature_2m),f=Math.round(d.apparent_temperature),
          h=d.relative_humidity_2m,ws=Math.round(d.wind_speed_10m),wd=wdir(d.wind_direction_10m),
          rn=d.precipitation||0,col=tc(t);
    el.innerHTML=`<span class="wx-ico">${w.i}</span><span class="wx-temp" style="color:${col}">${t}<span class="wx-deg">°C</span></span><span class="wx-bar"></span><span class="wx-info"><span class="wx-cond">${w.th}</span><span class="wx-sub">💧${h}% 🌬️${ws}km/h${wd}${rn>0?` 🌧️${rn}mm`:''}</span>${city?`<span class="wx-loc">📍${city}</span>`:''}</span><span class="wx-feel">รู้สึก<br><strong style="color:${col}">${f}°</strong></span>`;
    el.title=`${w.th} · ${t}°C (รู้สึก ${f}°C) · ความชื้น ${h}% · ลม ${ws}km/h${wd}`;
  }
  async function go(lat,lon,cityFallback){
    try{
      const[d,city]=await Promise.all([fetchWx(lat,lon),cityFallback?Promise.resolve(cityFallback):fetchCity(lat,lon)]);
      render(d,city);
      setInterval(async()=>{try{render(await fetchWx(lat,lon),city);}catch{}},600000);
    }catch{const el=document.getElementById('wxWidget');if(el)el.innerHTML='<span class="wx-ico">🌡️</span><span class="wx-sub" style="color:var(--text3)">ไม่สามารถโหลดได้</span>';}
  }
  if(!navigator.geolocation){go(16.8198,100.2654,'พิษณุโลก');return;}
  navigator.geolocation.getCurrentPosition(
    p=>go(p.coords.latitude,p.coords.longitude),
    ()=>go(16.8198,100.2654,'พิษณุโลก (ค่าเริ่มต้น)'),
    {timeout:6000,maximumAge:300000}
  );
})();


// ════════════════════════════════════════════════
//  AUTO-REFRESH ทุก 5 นาที — โหลดข้อมูลใหม่จาก localStorage
// ════════════════════════════════════════════════
(function(){
  const INTERVAL = 5 * 60; // วินาที
  let remaining = INTERVAL;
  const progress = document.getElementById('refreshProgress');
  const countdown = document.getElementById('refreshCountdown');
  const toast = document.getElementById('refreshToast');

  function fmt(s){ const m=Math.floor(s/60),ss=s%60; return m+':'+String(ss).padStart(2,'0'); }

  // ตั้งค่า progress bar เริ่มต้น (เต็ม = scale 1)
  if(progress) progress.style.transform = 'scaleX(1)';

  // แสดง toast หลัง 3 วินาที
  setTimeout(()=>{ if(toast) toast.classList.add('show'); }, 3000);

  // tick ทุก 1 วินาที
  setInterval(()=>{
    remaining--;
    if(remaining < 0) remaining = INTERVAL;

    // อัพเดท progress bar
    const pct = remaining / INTERVAL;
    if(progress) progress.style.transform = `scaleX(${pct})`;

    // อัพเดท countdown text
    if(countdown) countdown.textContent = fmt(remaining);

    // รีเฟรชเมื่อครบ 5 นาที
    if(remaining === 0){
      // บันทึก scroll position
      const scrollY = window.scrollY;
      // โหลดข้อมูลใหม่จาก localStorage (ไม่ reload หน้า)
      lsBootData();
      // เลื่อนกลับไปตำแหน่งเดิม
      requestAnimationFrame(()=>{ window.scrollTo(0, scrollY); });
      // แจ้งเตือนในทิกเกอร์
      console.log('[AUTO-REFRESH] โหลดข้อมูลใหม่เรียบร้อย', new Date().toLocaleTimeString());
    }
  }, 1000);
})();


