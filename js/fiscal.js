/* ────────────────────────────────────────────────────────────
   กปภ.พิษณุโลก Dashboard — js/fiscal.js
   Thai Fiscal Year engine · Month bucket helpers
   ──────────────────────────────────────────────────────────── */

// ════════════════════════════════════════════════════════════════
//  FISCAL YEAR ENGINE
// ════════════════════════════════════════════════════════════════
function getFiscalYear(date) {
  const d = date || new Date();
  const m = d.getMonth(); // 0=Jan
  const y = d.getFullYear();
  // Thai FY: Oct(9) - Sep(8)
  return m >= 9 ? y + 1 : y; // FY starts Oct
}

function getFYBounds(fy) {
  return {
    start: new Date(fy - 1, 9, 1),  // Oct 1 of prev year
    end:   new Date(fy,     8, 30),  // Sep 30 of FY year
  };
}

function fyProgress() {
  const now = new Date();
  const fy  = getFiscalYear(now);
  const {start, end} = getFYBounds(fy);
  const total = end - start;
  const elapsed = Math.max(0, Math.min(now - start, total));
  return { pct: elapsed / total, fy, start, end, now, daysElapsed: Math.floor(elapsed/86400000), daysTotal: Math.floor(total/86400000) };
}

function fyFilterData(data) {
  const fy = getFiscalYear();
  const {start, end} = getFYBounds(fy);
  return data.filter(r => {
    const d = new Date(r[1]);
    return d >= start && d <= end;
  });
}

function allFYData(data) {
  // Group by FY
  const map = {};
  (data||[]).forEach(r => {
    const fy = getFiscalYear(new Date(r[1]));
    if (!map[fy]) map[fy] = [];
    map[fy].push(r);
  });
  return map;
}


// ════════════════════════════════════════════════════════════════
//  MONTH BUCKETS (Thai FY months Oct→Sep = index 0→11)
// ════════════════════════════════════════════════════════════════

function fyMonthIndex(date) {
  const m = date.getMonth(); // 0=Jan
  return m >= 9 ? m - 9 : m + 3; // Oct=0, Nov=1, ... Sep=11
}

function bucketByFYMonth(data) {
  const buckets = Array(12).fill(0);
  data.forEach(r => {
    const d = new Date(r[1]);
    buckets[fyMonthIndex(d)]++;
  });
  return buckets;
}

function bucketByFYMonthAndTeam(data) {
  const teams = [...new Set(data.map(r=>r[2]))].sort();
  const result = {};
  teams.forEach(t => result[t] = Array(12).fill(0));
  data.forEach(r => {
    result[r[2]][fyMonthIndex(new Date(r[1]))]++;
  });
  return { teams, result };
}

