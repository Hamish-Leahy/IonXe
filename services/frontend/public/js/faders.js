// Fader management and rendering
const faderRanges = [];
const faderBanks = [];

function renderFaders() {
  consoleEl.innerHTML = '';
  faderRanges.length = 0;
  faderBanks.length = 0;
  
  // Render bank view if in bank mode
  if (document.getElementById('bank-mode').checked) {
    renderBankView();
    return;
  }
  
  // Original page view
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

function renderBankView() {
  const bankContainer = document.createElement('div');
  bankContainer.className = 'bank-container';
  
  for (let bank = 0; bank < BANKS_PER_PAGE; bank++) {
    const bankEl = document.createElement('div');
    bankEl.className = 'fader-bank';
    bankEl.innerHTML = `<div class="bank-header">Bank ${currentBank * BANKS_PER_PAGE + bank + 1}</div>`;
    
    const faderContainer = document.createElement('div');
    faderContainer.className = 'fader-container';
    
    for (let i = 0; i < FADERS_PER_BANK; i++) {
      const channelIndex = (currentBank * BANKS_PER_PAGE + bank) * FADERS_PER_BANK + i;
      if (channelIndex >= 512) break;
      
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
      faderContainer.appendChild(f);
      faderRanges.push(range);
    }
    
    bankEl.appendChild(faderContainer);
    bankContainer.appendChild(bankEl);
    faderBanks.push(bankEl);
  }
  
  consoleEl.appendChild(bankContainer);
  document.getElementById('page-num').textContent = `Bank ${currentBank + 1}`;
}

// Paging and Bank Navigation
document.getElementById('prev-page').onclick = () => { 
  if (document.getElementById('bank-mode').checked) {
    currentBank = Math.max(0, currentBank - 1);
  } else {
    page = Math.max(0, page - 1);
  }
  renderFaders(); 
};

document.getElementById('next-page').onclick = () => { 
  if (document.getElementById('bank-mode').checked) {
    currentBank = Math.min(Math.ceil(TOTAL_BANKS / BANKS_PER_PAGE) - 1, currentBank + 1);
  } else {
    page = Math.min(maxPage, page + 1);
  }
  renderFaders(); 
};

// Bank mode toggle
document.getElementById('bank-mode').addEventListener('change', () => {
  renderFaders();
});

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

// Initialize faders
renderFaders();
