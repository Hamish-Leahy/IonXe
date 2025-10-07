// Core functionality and state management
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

// Global state
const NUM_FADERS = 24; // faders visible per page
const consoleEl = document.getElementById('console');
const faderValues = new Uint8Array(512);
let page = 0; // 0-based; 0..21 for 512/24
const maxPage = Math.ceil(512 / NUM_FADERS) - 1;
let flushPending = false;
let polling = false;

// Fader bank system
let currentBank = 0;
const BANKS_PER_PAGE = 4; // 4 banks of 6 faders each
const FADERS_PER_BANK = 6;
const TOTAL_BANKS = Math.ceil(512 / FADERS_PER_BANK);

// Button state management
const buttonStates = {
  selectedChannels: new Set(),
  lastSelectedChannel: null,
  macroMode: false,
  recordMode: false,
  blindMode: false,
  liveMode: true
};

// Level management
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

document.getElementById('blackout').onclick = () => { 
  gmEl.value = '0'; 
  gmEl.dispatchEvent(new Event('input')); 
};

// Health check
document.getElementById('btn-health').onclick = async () => {
  try {
    const [rs, c] = await Promise.all([
      fetch(base + '/health').then(r => r.json()).catch(()=>({ok:false})),
      fetch(base + '/api/v1/dimmers/health').then(r => r.json()).catch(()=>({ok:false})),
    ]);
    document.getElementById('health-out').textContent = 'rs:' + (rs.ok?'ok':'down') + ' c:' + (c.ok?'ok':'down');
  } catch { document.getElementById('health-out').textContent = 'error'; }
};
