/* ────────────────────────────────────────────────────────────
   กปภ.พิษณุโลก Dashboard — js/ai.js
   AI analysis — Anthropic API
   ──────────────────────────────────────────────────────────── */

// ════════════════════════════════════════════════════════════════
//  AI ANALYSIS via Anthropic API
// ════════════════════════════════════════════════════════════════

// ── AI Key Management ──────────────────────────────────────────
function aiGetKey()   { return localStorage.getItem(AI_KEY_LS) || ''; }
function aiSaveKey(k) { if (k) localStorage.setItem(AI_KEY_LS, k.trim()); else localStorage.removeItem(AI_KEY_LS); }
function aiClearKey() { localStorage.removeItem(AI_KEY_LS); }

function aiShowKeyPrompt(aiBody) {
  const saved = aiGetKey();
  aiBody.innerHTML = `
    <div style="padding:4px 0 10px">
      <div style="font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.8">
        🔑 ต้องใช้ <strong style="color:var(--purple)">Anthropic API Key</strong> เพื่อเรียกใช้ AI วิเคราะห์<br>
        <span style="font-size:10px;color:var(--text3)">รับฟรีที่
          <a href="https://console.anthropic.com" target="_blank"
             style="color:var(--cyan);text-decoration:none">console.anthropic.com</a>
          · บันทึกใน localStorage ของเบราว์เซอร์นี้เท่านั้น
        </span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <input id="aiKeyInput" type="password" placeholder="sk-ant-api03-..."
          value="${saved}"
          style="flex:1;min-width:200px;background:rgba(0,0,0,.3);border:1px solid rgba(168,85,247,.4);
                 border-radius:8px;padding:8px 12px;font-size:11px;font-family:var(--mono);
                 color:var(--text1);outline:none"
          onkeydown="if(event.key==='Enter') document.getElementById('aiKeySave').click()">
        <button id="aiKeySave" class="ai-btn" style="margin:0;padding:8px 16px"
          onclick="aiKeySaveAndRun()">▶ วิเคราะห์</button>
      </div>
      ${saved ? '<div style="margin-top:8px;font-size:10px;color:#00e5a0">✅ มี key บันทึกไว้แล้ว — กด ▶ วิเคราะห์</div><button onclick="aiClearKey();triggerAI()" style="background:none;border:none;color:var(--text3);font-size:10px;cursor:pointer;padding:2px 0">🗑 ลบ key ที่บันทึกไว้</button>' : ''}
    </div>`;
}

function aiKeySaveAndRun() {
  const inp = document.getElementById('aiKeyInput');
  if (!inp) return;
  const key = inp.value.trim();
  if (!key || !key.startsWith('sk-')) {
    inp.style.borderColor = '#ff4757';
    inp.placeholder = '⚠️ Key ต้องขึ้นต้นด้วย sk-ant-...';
    return;
  }
  aiSaveKey(key);
  _aiRunning = false;
  updateFYDashboard(allData || []);
}

async function runAIAnalysis(stats) {
  if (_aiRunning) return;
  _aiRunning = true;

  const aiBody = document.getElementById('aiBody');
  const btn    = document.getElementById('aiRerunBtn');
  if (btn) { btn.innerHTML = '<span class="spin">\u2699\uFE0F</span> กำลังวิเคราะห์...'; btn.disabled = true; }

  // ── ตรวจ API Key ──
  const apiKey = aiGetKey();
  if (!apiKey || !apiKey.startsWith('sk-')) {
    _aiRunning = false;
    if (aiBody) aiShowKeyPrompt(aiBody);
    return;
  }

  // ── Spinner ──
  if (aiBody) aiBody.innerHTML = `
    <div class="ai-thinking">
      <div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div>
    </div>
    <div style="font-size:10px;color:var(--text3);margin-top:6px">Claude Sonnet กำลังวิเคราะห์…</div>`;

  // ── Prompt ──
  const prompt = `คุณเป็น AI วิเคราะห์ข้อมูลระบบติดตามเอกสารรอเบิกงานซ่อมท่อ ของ กปภ.สาขาพิษณุโลก

ข้อมูลปีงบประมาณ ${stats.fy} (ต.ค.${stats.fy-1} – ก.ย.${stats.fy}):
- เอกสารทั้งหมดในปีงบฯ: ${stats.fyTotal} รายการ
- ผ่านมาแล้ว: ${stats.daysElapsed} วัน จากทั้งหมด ${stats.daysTotal} วัน (${(stats.fyPct*100).toFixed(1)}% ของปี)
- อัตราเฉลี่ย: ${stats.avgPerDay ? stats.avgPerDay.toFixed(2) : '0.00'} รายการ/วัน
- คาดการณ์ครบปี: ${stats.forecastTotal} รายการ
- เอกสารค้างนาน > 90 วัน: ${stats.aging90 || 0} รายการ
- รายเดือน FY (0=ต.ค.): ${JSON.stringify(stats.monthlyBuckets || [])}
- ทีมงาน: ${JSON.stringify(stats.teamStats || {})}
- คาดการณ์ทีม: ${JSON.stringify(stats.teamForecast || {})}

ตอบภาษาไทย HTML (ใช้ <strong>, <span class="hi-g">, <span class="hi-a">, <span class="hi-r">, <span class="hi-c">, <br>, <ul><li>) ดังนี้:
1. ภาพรวมปีงบฯ: ดี/เฝ้าระวัง/วิกฤต
2. โอกาสปิดงานทันปีงบฯ
3. ทีมเร่งรัด top 3 พร้อมตัวเลข
4. ข้อเสนอแนะ 3 ข้อ ป้องกันงบข้ามปี
กระชับ ไม่เกิน 220 คำ ใช้ตัวเลขอ้างอิงตลอด`;

  const controller = new AbortController();
  const aiTimeout  = setTimeout(() => controller.abort(), 30000);

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'x-api-key':        apiKey,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages:   [{ role:'user', content:prompt }],
      }),
    });
    clearTimeout(aiTimeout);
    const data = await resp.json();

    // ── จัดการ API Errors ──
    if (!resp.ok) {
      const errMsg  = data?.error?.message || 'HTTP ' + resp.status;
      const errType = data?.error?.type || '';
      if (resp.status === 401 || errType === 'authentication_error') {
        aiClearKey();
        if (aiBody) {
          aiBody.innerHTML = '<div style="padding:4px 0 8px"><span class="hi-r">🔑 API Key ไม่ถูกต้อง — กรุณากรอกใหม่</span></div>';
          setTimeout(() => { _aiRunning = false; if(aiBody) aiShowKeyPrompt(aiBody); }, 1200);
        } else { _aiRunning = false; }
        return;
      }
      if (resp.status === 429) {
        if (aiBody) aiBody.innerHTML = `<div class="ai-text"><span class="hi-a">⏳ Rate Limit — รอสักครู่แล้วลองใหม่</span><br>
          <span style="font-size:10px;color:var(--text3)">${errMsg}</span></div>
          <button class="ai-btn" onclick="triggerAI()">🔄 ลองใหม่</button>`;
        _aiRunning = false; return;
      }
      if (aiBody) aiBody.innerHTML = `<div class="ai-text"><span class="hi-r">❌ ${errMsg}</span></div>
        <button class="ai-btn" onclick="triggerAI()">🔄 ลองใหม่</button>`;
      _aiRunning = false; return;
    }

    const txt = (data.content || []).map(b => b.text || '').join('');
    if (aiBody) {
      const now = new Date();
      const ts  = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
      aiBody.innerHTML = `
        <div class="ai-text">${txt}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;flex-wrap:wrap;gap:6px">
          <span style="font-size:9px;color:var(--text3)">วิเคราะห์เมื่อ ${ts} น. · claude-sonnet-4</span>
          <button class="ai-btn" style="margin:0" onclick="triggerAI()">🔄 วิเคราะห์ใหม่</button>
        </div>`;
    }
  } catch(e) {
    clearTimeout(aiTimeout);
    const isTimeout = e.name === 'AbortError';
    if (aiBody) aiBody.innerHTML = `<div class="ai-text">
      <span class="hi-r">${isTimeout ? '⏱️ หมดเวลา 30 วินาที' : '⚠️ เชื่อมต่อไม่ได้'}</span><br>
      <span style="font-size:10px;color:var(--text3)">${isTimeout ? 'ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่' : e.message}</span></div>
      <button class="ai-btn" onclick="triggerAI()">🔄 ลองใหม่</button>`;
  }
  _aiRunning = false;
}
function triggerAI() {
  _aiRunning = false;
  updateFYDashboard(allData || []);
}

