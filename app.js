// ─────────────────────────────────────────────────────────────
// NC/NV PARTNER OUTREACH DASHBOARD — app.js
// Replace API_URL with your deployed Google Apps Script URL
// ─────────────────────────────────────────────────────────────

const API_URL    = 'https://script.google.com/macros/s/AKfycbzDjY55v3t3tSg11EuBHOu05PU3D58ZXKlsTC5DEL6kc64ebIqrjaA6K9BcwwwzksRnsw/exec'; // ← Replace after Step 3
const ADMIN_KEY  = 'NCNV_MASTER_2026';          // ← Same as in Code.gs

// ── STATE ────────────────────────────────────────────────────
let session   = null;   // { rm_id, rm_name, zone, role }
let allParts  = [];     // full partner list
let filtered  = [];     // after filter
let noteTarget = null;  // gcd being noted

// ── SCREEN HELPERS ───────────────────────────────────────────
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function showMain()   { show('main-screen');   }
function showMaster() { loadMaster(); show('master-screen'); }

// ── UTILS ────────────────────────────────────────────────────
function fmt(n) {
  if (!n && n !== 0) return '—';
  if (n >= 10000000)  return '₹' + (n/10000000).toFixed(2) + ' Cr';
  if (n >= 100000)    return '₹' + (n/100000).toFixed(1) + ' L';
  if (n >= 1000)      return '₹' + (n/1000).toFixed(1) + 'K';
  return '₹' + n.toLocaleString('en-IN');
}
function fmtFull(n) {
  return n ? '₹' + Number(n).toLocaleString('en-IN') : '—';
}
function pct(a,b) { return b ? Math.round(a/b*100) : 0; }
async function api(params) {
  const url  = API_URL + '?' + new URLSearchParams(params).toString();
  const resp = await fetch(url);
  return await resp.json();
}

// ── LOGIN ────────────────────────────────────────────────────
async function doLogin() {
  const rmId = document.getElementById('inp-rmid').value.trim();
  const pass = document.getElementById('inp-pass').value.trim();
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('btn-login');

  errEl.classList.add('hidden');
  if (!rmId || !pass) { errEl.textContent = 'Enter RM ID and password.'; errEl.classList.remove('hidden'); return; }

  btn.disabled = true; btn.textContent = 'Signing in…';
  try {
    const res = await api({ action: 'login', rm_id: rmId, password: pass });
    if (res.success) {
      session = res;
      document.getElementById('hdr-user').textContent = `👤 ${res.rm_name} · ${res.zone}`;
      document.getElementById('hdr-sub').textContent  = `Zone: ${res.zone} · ${res.role}`;
      if (res.role === 'admin') document.getElementById('btn-master').style.display = '';
      show('main-screen');
      loadPartners();
    } else {
      errEl.textContent = res.error || 'Login failed. Check your RM ID and password.';
      errEl.classList.remove('hidden');
    }
  } catch(e) {
    errEl.textContent = 'Cannot reach server. Check your internet connection.';
    errEl.classList.remove('hidden');
  }
  btn.disabled = false; btn.textContent = 'Sign In →';
}

document.getElementById('inp-pass').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
document.getElementById('inp-rmid').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('inp-pass').focus(); });

function doLogout() {
  session = null; allParts = []; filtered = [];
  document.getElementById('inp-rmid').value = '';
  document.getElementById('inp-pass').value = '';
  show('login-screen');
}

// ── LOAD PARTNERS ────────────────────────────────────────────
async function loadPartners() {
  const tbody  = document.getElementById('partner-tbody');
  const loader = document.getElementById('loading-state');
  const empty  = document.getElementById('empty-state');
  tbody.innerHTML = ''; loader.classList.remove('hidden'); empty.classList.add('hidden');

  try {
    const res = await api({ action: 'partners', rm_id: session.rm_id, role: session.role });
    if (!res.success) throw new Error(res.error);
    allParts = res.data;
    updateStats(allParts);
    applyFilters();
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;color:#dc2626;padding:30px">Error: ${e.message}</td></tr>`;
  }
  loader.classList.add('hidden');
}

// ── STATS ─────────────────────────────────────────────────────
function updateStats(data) {
  const called   = data.filter(p => p.call).length;
  const visited  = data.filter(p => p.visit).length;
  const totPrem  = data.reduce((s,p) => s + (p.total_prem||0), 0);
  const mayPrem  = data.reduce((s,p) => s + (p.may_prem||0), 0);
  const t4       = data.filter(p => p.cohort && p.cohort.includes('TIER 4')).length;

  document.getElementById('sc-total').querySelector('.stat-val').textContent  = data.length.toLocaleString();
  document.getElementById('sc-called').querySelector('.stat-val').textContent = called + ' / ' + data.length;
  document.getElementById('sc-visited').querySelector('.stat-val').textContent= visited + ' / ' + data.length;
  document.getElementById('sc-prem').querySelector('.stat-val').textContent   = fmt(totPrem);
  document.getElementById('sc-may').querySelector('.stat-val').textContent    = fmt(mayPrem);
  document.getElementById('sc-t4').querySelector('.stat-val').textContent     = t4;
}

// ── FILTERS ───────────────────────────────────────────────────
function applyFilters() {
  const q      = document.getElementById('search').value.toLowerCase();
  const cohort = document.getElementById('f-cohort').value;
  const status = document.getElementById('f-status').value;
  const zone   = document.getElementById('f-zone').value;

  filtered = allParts.filter(p => {
    if (q && !p.name.toLowerCase().includes(q) && !p.gcd.toLowerCase().includes(q)) return false;
    if (cohort && !(p.cohort||'').includes(cohort)) return false;
    if (zone   && p.zone !== zone) return false;
    if (status === 'called'     && !p.call)   return false;
    if (status === 'not-called' && p.call)    return false;
    if (status === 'visited'     && !p.visit) return false;
    if (status === 'not-visited' && p.visit)  return false;
    return true;
  });

  document.getElementById('result-count').textContent = `${filtered.length.toLocaleString()} of ${allParts.length.toLocaleString()} partners`;
  document.getElementById('empty-state').classList.toggle('hidden', filtered.length > 0);
  renderTable();
}

// ── RENDER TABLE ──────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('partner-tbody');
  tbody.innerHTML = '';

  // Render in chunks for performance
  const chunk = 100;
  let i = 0;
  function renderChunk() {
    const end = Math.min(i + chunk, filtered.length);
    for (; i < end; i++) renderRow(filtered[i], tbody);
    if (i < filtered.length) requestAnimationFrame(renderChunk);
  }
  renderChunk();
}

function badgeHtml(cohort) {
  if (!cohort) return '';
  if (cohort.includes('TIER 4')) return `<span class="badge badge-t4">🟢 T4 High</span>`;
  if (cohort.includes('TIER 3')) return `<span class="badge badge-t3">🔵 T3 Mid</span>`;
  if (cohort.includes('TIER 2')) return `<span class="badge badge-t2">🟣 T2 Low</span>`;
  return `<span class="badge badge-t1">🔴 T1 Micro</span>`;
}

function renderRow(p, tbody) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><div style="font-weight:600">${p.name}</div>
        <div style="font-size:11px;color:#64748b">${p.city||''}, ${p.state||''}</div></td>
    <td style="font-family:monospace;font-size:12px">${p.gcd}</td>
    <td><div>${p.zone}</div><div style="font-size:11px;color:#64748b">${p.state||''}</div></td>
    <td><span style="font-size:12px;color:#475569">${p.tenure_band||''}</span></td>
    <td>${badgeHtml(p.cohort)}</td>
    <td class="num-col" style="color:${p.total_prem>=1000000?'#065f46':p.total_prem>=100000?'#1d4ed8':'#374151'}">${fmtFull(p.total_prem)}</td>
    <td class="num-col" style="color:${p.may_prem>0?'#065f46':'#9ca3af'}">${p.may_prem>0?fmtFull(p.may_prem):'—'}</td>
    <td class="num-col">${p.active_months||0}/15</td>
    <td>
      <button class="status-btn ${p.call?'checked':'unchecked'}" id="call-${p.gcd}"
        onclick="toggleStatus('${p.gcd}','call',${p.call?0:1})">
        ${p.call?'✓ Called':'☎ Call'}
      </button>
      ${p.last_called?`<div style="font-size:10px;color:#94a3b8;margin-top:3px">${p.last_called.slice(0,10)}</div>`:''}
    </td>
    <td>
      <button class="status-btn ${p.visit?'checked':'unchecked'}" id="visit-${p.gcd}"
        onclick="toggleStatus('${p.gcd}','visit',${p.visit?0:1})">
        ${p.visit?'✓ Visited':'🚗 Visit'}
      </button>
      ${p.last_visited?`<div style="font-size:10px;color:#94a3b8;margin-top:3px">${p.last_visited.slice(0,10)}</div>`:''}
    </td>
    <td>
      <button class="notes-btn ${p.notes?'has-notes':''}" title="${p.notes||'Add notes'}"
        onclick="openNotes('${p.gcd}','${p.name.replace(/'/g,"\\'")}')">
        ${p.notes?'📝':'📝'}
      </button>
      ${p.notes?`<div style="font-size:11px;color:#64748b;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.notes}</div>`:''}
    </td>
  `;
  tbody.appendChild(tr);
}

// ── TOGGLE CALL / VISIT ───────────────────────────────────────
async function toggleStatus(gcd, type, value) {
  const btn = document.getElementById(`${type}-${gcd}`);
  const orig = btn.innerHTML;
  btn.disabled = true; btn.textContent = '…';

  try {
    const res = await api({ action: 'update', gcd, type, value, rm_id: session.rm_id });
    if (res.success) {
      // Update local data
      const p = allParts.find(x => x.gcd === gcd);
      if (p) {
        p[type === 'call' ? 'call' : 'visit'] = value;
        p[type === 'call' ? 'last_called' : 'last_visited'] = new Date().toISOString();
      }
      // Re-render button
      btn.className = `status-btn ${value ? 'checked' : 'unchecked'}`;
      btn.innerHTML = value
        ? (type === 'call' ? '✓ Called' : '✓ Visited')
        : (type === 'call' ? '☎ Call'   : '🚗 Visit');
      btn.onclick = () => toggleStatus(gcd, type, value ? 0 : 1);
      updateStats(allParts);
    } else {
      btn.innerHTML = orig;
    }
  } catch(e) { btn.innerHTML = orig; }
  btn.disabled = false;
}

// ── NOTES ─────────────────────────────────────────────────────
function openNotes(gcd, name) {
  noteTarget = gcd;
  const p = allParts.find(x => x.gcd === gcd);
  document.getElementById('modal-partner-name').textContent = name;
  document.getElementById('notes-input').value = p ? (p.notes || '') : '';
  document.getElementById('notes-modal').classList.remove('hidden');
  document.getElementById('notes-input').focus();
}
function closeNotes(e) {
  if (!e || e.target === document.getElementById('notes-modal'))
    document.getElementById('notes-modal').classList.add('hidden');
}
async function saveNotes() {
  const notes = document.getElementById('notes-input').value.trim();
  if (!noteTarget) return;
  await api({ action: 'update', gcd: noteTarget, type: 'call', value: allParts.find(x=>x.gcd===noteTarget)?.call||0,
               rm_id: session.rm_id, notes });
  const p = allParts.find(x => x.gcd === noteTarget);
  if (p) p.notes = notes;
  renderTable();
  document.getElementById('notes-modal').classList.add('hidden');
}

// ── MASTER DASHBOARD ──────────────────────────────────────────
async function loadMaster() {
  document.getElementById('master-stats').innerHTML = '<div class="loading-state"><div class="spinner"></div>Loading master data…</div>';
  document.getElementById('zone-grid').innerHTML    = '';
  document.getElementById('rm-tbody').innerHTML     = '';

  try {
    const res = await api({ action: 'master', key: ADMIN_KEY });
    if (!res.success) throw new Error(res.error || 'Unauthorized');

    // Global stats
    const rms   = res.rm_stats || [];
    const zones = res.zone_stats || [];
    const total = res.total_partners;
    const called  = rms.reduce((s,r)=>s+r.called,0);
    const visited = rms.reduce((s,r)=>s+r.visited,0);
    const totPrem = rms.reduce((s,r)=>s+r.total_prem,0);
    const mayPrem = rms.reduce((s,r)=>s+r.may_prem,0);

    document.getElementById('master-stats').innerHTML = `
      <div class="stat-card"><div class="stat-val">${total.toLocaleString()}</div><div class="stat-lbl">Total Partners</div></div>
      <div class="stat-card green"><div class="stat-val">${called.toLocaleString()}</div><div class="stat-lbl">Called (${pct(called,total)}%)</div></div>
      <div class="stat-card blue"><div class="stat-val">${visited.toLocaleString()}</div><div class="stat-lbl">Visited (${pct(visited,total)}%)</div></div>
      <div class="stat-card gold"><div class="stat-val">${fmt(totPrem)}</div><div class="stat-lbl">Total Premium At Risk</div></div>
      <div class="stat-card teal"><div class="stat-val">${fmt(mayPrem)}</div><div class="stat-lbl">May-26 Premium</div></div>
      <div class="stat-card red"><div class="stat-val">${rms.length.toLocaleString()}</div><div class="stat-lbl">Total RMs</div></div>
    `;

    // Zone cards
    const zoneColors = {North:'#1e40af',South:'#065f46',West:'#7c2d12',RON:'#6b21a8','East & Central':'#1f2937'};
    const zg = document.getElementById('zone-grid');
    zones.forEach(z => {
      const calledPct = pct(z.called, z.total);
      const card = document.createElement('div');
      card.className = 'zone-card';
      card.style.borderLeftColor = zoneColors[z.zone] || '#1e3a5f';
      card.innerHTML = `
        <h4>${z.zone}</h4>
        <div class="zone-row"><span>Total Partners</span><span>${z.total.toLocaleString()}</span></div>
        <div class="zone-row"><span>Called</span><span>${z.called} (${calledPct}%)</span></div>
        <div class="zone-row"><span>Visited</span><span>${z.visited} (${pct(z.visited,z.total)}%)</span></div>
        <div class="zone-row"><span>Total Premium</span><span>${fmt(z.total_prem)}</span></div>
        <div class="zone-row"><span>May-26 Premium</span><span>${fmt(z.may_prem)}</span></div>
        <div class="zone-row"><span>T4 High / T3 Mid</span><span>${z.t4} / ${z.t3}</span></div>
        <div style="margin-top:10px">
          <div class="prog-wrap">
            <div class="prog-bar"><div class="prog-fill ${calledPct<30?'low':calledPct<60?'mid':''}" style="width:${calledPct}%"></div></div>
            <span class="prog-pct">${calledPct}% reached</span>
          </div>
        </div>
      `;
      zg.appendChild(card);
    });

    // RM table
    const tbody = document.getElementById('rm-tbody');
    rms.forEach((r, idx) => {
      const calledPct2 = pct(r.called, r.total);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color:#94a3b8;font-size:12px">${idx+1}</td>
        <td><div style="font-weight:600">${r.rm_name}</div><div style="font-size:11px;color:#64748b">${r.rm_id}</div></td>
        <td>${r.zone}</td>
        <td style="font-size:12px;color:#475569">${r.am_name||'—'}</td>
        <td class="num-col">${r.total}</td>
        <td class="num-col"><span style="color:#10b981;font-weight:700">${r.called}</span></td>
        <td class="num-col"><span style="color:#2563eb;font-weight:700">${r.visited}</span></td>
        <td class="num-col">
          <div class="prog-wrap" style="min-width:80px">
            <div class="prog-bar"><div class="prog-fill ${calledPct2<30?'low':calledPct2<60?'mid':''}" style="width:${calledPct2}%"></div></div>
            <span class="prog-pct">${calledPct2}%</span>
          </div>
        </td>
        <td class="num-col" style="color:${r.total_prem>=1000000?'#065f46':'#374151'}">${fmt(r.total_prem)}</td>
        <td class="num-col" style="color:${r.may_prem>0?'#065f46':'#9ca3af'}">${r.may_prem>0?fmt(r.may_prem):'—'}</td>
        <td class="num-col"><span class="badge badge-t4">${r.t4}</span></td>
        <td class="num-col"><span class="badge badge-t3">${r.t3}</span></td>
      `;
      tbody.appendChild(tr);
    });

  } catch(e) {
    document.getElementById('master-stats').innerHTML = `<div style="color:#dc2626;padding:20px">Error: ${e.message}</div>`;
  }
}
