const base = '';
let authToken = localStorage.getItem('ionxe_token') || '';
async function apiFetch(path, init={}) {
  const headers = init.headers || {};
  if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
  init.headers = headers;
  return fetch(base + path, init);
}

// Simple hash router for tabs
function setActive(hash) {
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  const id = (hash || '#console').replace('#','');
  const tab = document.getElementById('tab-' + id);
  const view = document.getElementById('view-' + id);
  if (tab) tab.classList.add('active');
  if (view) view.classList.add('active');
}
window.addEventListener('hashchange', () => setActive(location.hash));
setActive(location.hash);
const NUM_FADERS = 24; // faders visible per page
const consoleEl = document.getElementById('console');
const faderValues = new Uint8Array(512);
let page = 0; // 0-based; 0..21 for 512/24
const maxPage = Math.ceil(512 / NUM_FADERS) - 1;
let flushPending = false;
let polling = false;

function scheduleFlush() {
  if (flushPending) return;
  flushPending = true;
  setTimeout(async () => {
    try {
      const r = await apiFetch('/api/v1/dimmers/levels', { method: 'PUT', body: faderValues });
      if (!r.ok) console.warn('levels status', r.status);
    } catch (e) { console.warn('levels error', e); }
    flushPending = false;
  }, 50); // throttle 20 Hz
}

const faderRanges = [];
function renderFaders() {
  consoleEl.innerHTML = '';
  faderRanges.length = 0;
  const start = page * NUM_FADERS;
  for (let i = 0; i < NUM_FADERS; i++) {
    const channelIndex = start + i;
    const f = document.createElement('div');
    f.className = 'fader';
    const range = document.createElement('input');
    range.type = 'range'; range.min = '0'; range.max = '255'; range.value = String(faderValues[channelIndex] || 0);
    range.addEventListener('input', () => {
      const v = (range.value|0) & 0xff;
      faderValues[channelIndex] = applyGrandMaster(v);
      scheduleFlush();
    });
    const label = document.createElement('label');
    label.textContent = String(channelIndex + 1);
    f.appendChild(range); f.appendChild(label);
    consoleEl.appendChild(f);
    faderRanges.push(range);
  }
  document.getElementById('page-num').textContent = String(page + 1);
}
renderFaders();

document.getElementById('btn-health').onclick = async () => {
  try {
    const [rs, c] = await Promise.all([
      fetch(base + '/health').then(r => r.json()).catch(()=>({ok:false})),
      fetch(base + '/api/v1/dimmers/health').then(r => r.json()).catch(()=>({ok:false})),
    ]);
    document.getElementById('health-out').textContent = 'rs:' + (rs.ok?'ok':'down') + ' c:' + (c.ok?'ok':'down');
  } catch { document.getElementById('health-out').textContent = 'error'; }
};

document.getElementById('get-frame').onclick = async () => {
  const r = await apiFetch('/api/v1/dimmers/frame');
  const b = new Uint8Array(await r.arrayBuffer());
  document.getElementById('frame-len').textContent = '' + b.length + ' bytes';
};
document.getElementById('random-lut').onclick = async () => {
  const lut = new Uint8Array(256);
  crypto.getRandomValues(lut);
  const r = await apiFetch('/api/v1/dimmers/lut', { method: 'PUT', body: lut });
  alert('lut status: ' + r.status);
};

// Magic sheet pan/zoom skeleton
(function(){
  const canvas = document.getElementById('magic-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let scale = 1, offsetX = 0, offsetY = 0, panning = false, lastX = 0, lastY = 0;
  function draw() {
    ctx.save();
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    // demo grid
    ctx.strokeStyle = '#223244'; ctx.lineWidth = 1/scale;
    for (let x=-1000; x<2000; x+=50) { ctx.beginPath(); ctx.moveTo(x,-1000); ctx.lineTo(x,2000); ctx.stroke(); }
    for (let y=-1000; y<2000; y+=50) { ctx.beginPath(); ctx.moveTo(-1000,y); ctx.lineTo(2000,y); ctx.stroke(); }
    ctx.restore();
  }
  draw();
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    scale = Math.max(0.2, Math.min(5, scale * delta));
    draw();
  }, { passive: false });
  canvas.addEventListener('mousedown', (e) => { panning = true; lastX = e.clientX; lastY = e.clientY; });
  window.addEventListener('mouseup', ()=>{ panning = false; });
  window.addEventListener('mousemove', (e)=>{
    if (!panning) return;
    offsetX += (e.clientX - lastX);
    offsetY += (e.clientY - lastY);
    lastX = e.clientX; lastY = e.clientY; draw();
  });
})();

// Grand master and blackout
const gmEl = document.getElementById('grand-master');
const gmValueEl = document.getElementById('gm-value');
function applyGrandMaster(v) {
  const gm = gmEl.value|0;
  return Math.round((v * gm) / 255) & 0xff;
}
function flushWithGM() {
  const gm = gmEl.value|0;
  // create a temp view to send scaled values
  const scaled = new Uint8Array(512);
  for (let i = 0; i < 512; i++) scaled[i] = Math.round((faderValues[i] * gm) / 255) & 0xff;
  apiFetch('/api/v1/dimmers/levels', { method: 'PUT', body: scaled }).catch(()=>{});
}
gmEl.addEventListener('input', () => {
  gmValueEl.textContent = 'GM ' + gmEl.value;
  // Notify backend-c GM (best-effort text payload)
  fetch(base + '/api/v1/dimmers/gm', { method: 'PUT', headers: { 'content-type': 'text/plain' }, body: gmEl.value }).catch(()=>{});
  flushWithGM();
});
document.getElementById('blackout').onclick = () => { gmEl.value = '0'; gmEl.dispatchEvent(new Event('input')); };

// Paging
document.getElementById('prev-page').onclick = () => { page = Math.max(0, page - 1); renderFaders(); };
document.getElementById('next-page').onclick = () => { page = Math.min(maxPage, page + 1); renderFaders(); };

// Poll frame periodically and update visible fader positions
async function pollFrame() {
  if (polling) return; polling = true;
  try {
    const r = await apiFetch('/api/v1/dimmers/frame');
    if (r.ok) {
      const b = new Uint8Array(await r.arrayBuffer());
      const start = page * NUM_FADERS;
      for (let i = 0; i < NUM_FADERS; i++) {
        const channelIndex = start + i;
        const v = b[channelIndex] || 0;
        faderRanges[i].value = String(v);
      }
    }
  } catch {}
  polling = false;
}
setInterval(pollFrame, 500);

// Scenes API
async function refreshScenes() {
  try {
    const r = await apiFetch('/api/v1/scenes');
    const scenes = await r.json();
    const sel = document.getElementById('scenes-list');
    sel.innerHTML = '';
    for (const s of scenes) {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.label || s.id;
      sel.appendChild(opt);
    }
  } catch {}
}
document.getElementById('refresh-scenes').onclick = refreshScenes;
document.getElementById('save-scene').onclick = async () => {
  const label = document.getElementById('scene-label').value || '';
  const payload = { id: '00000000-0000-0000-0000-000000000000', label, levels: Array.from(faderValues) };
  const r = await apiFetch('/api/v1/scenes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (r.ok) refreshScenes();
};
document.getElementById('recall-scene').onclick = async () => {
  const sel = document.getElementById('scenes-list');
  const id = sel.value; if (!id) return;
  const fade = Math.max(0, parseInt(document.getElementById('fade-ms').value||'0',10));
  const payload = { id, fade_ms: isNaN(fade) ? 0 : fade };
  const r = await apiFetch('/api/v1/recall_scene', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!r.ok) alert('recall failed: ' + r.status);
};
document.getElementById('delete-scene').onclick = async () => {
  const sel = document.getElementById('scenes-list');
  const id = sel.value; if (!id) return;
  await apiFetch('/api/v1/scenes/' + id, { method: 'DELETE' });
  refreshScenes();
};
refreshScenes();

// Export/Import scenes
document.getElementById('export-scenes').onclick = async () => {
  const r = await apiFetch('/api/v1/scenes');
  const scenes = await r.json();
  const blob = new Blob([JSON.stringify(scenes, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ionxe-scenes.json'; a.click();
  URL.revokeObjectURL(url);
};
document.getElementById('import-scenes').onclick = () => document.getElementById('import-file').click();
document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const text = await file.text();
    const scenes = JSON.parse(text);
    if (!Array.isArray(scenes)) throw new Error('invalid');
    for (const s of scenes) {
      if (!s.levels || !Array.isArray(s.levels)) continue;
      const payload = { id: s.id || '00000000-0000-0000-0000-000000000000', label: s.label || '', levels: s.levels.slice(0,512) };
      await apiFetch('/api/v1/scenes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    }
    refreshScenes();
  } catch (e) { alert('Import failed'); }
});

// Command Center
document.getElementById('cmd-send').onclick = async () => {
  const input = document.getElementById('cmd-input');
  const out = document.getElementById('cmd-output');
  const bytes = new TextEncoder().encode(input.value);
  const r = await fetch(base + '/api/v1/shell', { method: 'POST', body: bytes });
  out.textContent += `\n>> ${input.value}\nstatus ${r.status}`;
  input.value = '';
};

// File Manager
async function listFiles() {
  const p = document.getElementById('files-path').value || '';
  const r = await apiFetch('/api/v1/fs/list?path=' + encodeURIComponent(p));
  const rows = await r.json();
  const tbody = document.querySelector('#files-table tbody');
  tbody.innerHTML = '';
  for (const row of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.name}</td><td>${row.kind}</td><td>${row.size}</td><td></td>`;
    const actions = tr.children[3];
    const btnOpen = document.createElement('button'); btnOpen.textContent = 'Open'; btnOpen.onclick = async () => {
      if (row.kind === 'dir') { document.getElementById('files-path').value = (p ? p + '/' : '') + row.name; listFiles(); return; }
      const rp = (p ? p + '/' : '') + row.name;
      const rr = await apiFetch('/api/v1/fs/read?path=' + encodeURIComponent(rp));
      const buf = new Uint8Array(await rr.arrayBuffer());
      document.getElementById('files-newname').value = row.name;
      document.getElementById('files-content').value = new TextDecoder().decode(buf);
    };
    const btnDel = document.createElement('button'); btnDel.textContent = 'Delete'; btnDel.onclick = async () => {
      const rp = (p ? p + '/' : '') + row.name;
      await apiFetch('/api/v1/fs/delete?path=' + encodeURIComponent(rp), { method: 'DELETE' });
      listFiles();
    };
    actions.appendChild(btnOpen); actions.appendChild(btnDel);
    tbody.appendChild(tr);
  }
}
document.getElementById('files-list').onclick = listFiles;
document.getElementById('files-mkdir').onclick = async () => {
  const p = document.getElementById('files-path').value || '';
  const name = prompt('Folder name'); if (!name) return;
  const rp = (p ? p + '/' : '') + name;
  await apiFetch('/api/v1/fs/mkdir?path=' + encodeURIComponent(rp), { method: 'POST' });
  listFiles();
};
document.getElementById('files-save').onclick = async () => {
  const p = document.getElementById('files-path').value || '';
  const name = document.getElementById('files-newname').value || 'new.txt';
  const content = document.getElementById('files-content').value || '';
  const rp = (p ? p + '/' : '') + name;
  await apiFetch('/api/v1/fs/write?path=' + encodeURIComponent(rp), { method: 'PUT', body: new TextEncoder().encode(content) });
  listFiles();
};

// Color and Intensity controls
function parseList(input) {
  const s = (input||'').trim();
  if (!s) return [];
  const parts = s.split(',');
  const out = [];
  for (const p of parts) {
    if (p.includes('-')) {
      const [a,b] = p.split('-').map(x=>parseInt(x,10));
      if (!isNaN(a) && !isNaN(b)) { for (let i=a;i<=b;i++) out.push(i); }
    } else {
      const n = parseInt(p,10); if (!isNaN(n)) out.push(n);
    }
  }
  return out;
}
document.getElementById('color-apply').onclick = async () => {
  const hex = document.getElementById('color-picker').value || '#ffffff';
  const r = parseInt(hex.slice(1,3), 16) & 0xff;
  const g = parseInt(hex.slice(3,5), 16) & 0xff;
  const b = parseInt(hex.slice(5,7), 16) & 0xff;
  const bases = parseList(document.getElementById('color-bases').value).map(x=>Math.max(0, x-1));
  const payload = { model: 'rgb', rgb: [r,g,b], bases };
  await apiFetch('/api/v1/color', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
};
document.getElementById('intens-apply').onclick = async () => {
  const chans = parseList(document.getElementById('intens-chans').value).map(x=>Math.max(0, x-1));
  const value = Math.max(0, Math.min(255, parseInt(document.getElementById('intens-value').value||'0',10)));
  const payload = { channels: chans, value };
  await apiFetch('/api/v1/intensity', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
};

// Auth UI
document.getElementById('auth-login').onclick = async () => {
  const username = document.getElementById('auth-username').value;
  const password = document.getElementById('auth-password').value;
  const r = await fetch(base + '/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) });
  const out = document.getElementById('auth-status');
  if (r.ok) { const j = await r.json(); authToken = j.token; localStorage.setItem('ionxe_token', authToken); out.textContent = 'Logged in'; }
  else { out.textContent = 'Login failed'; }
};


