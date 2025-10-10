// Fader management and rendering
class IonXeFaders {
  constructor(core) {
    this.core = core;
    this.state = core.state;
    this.faderRanges = [];
    this.faderBanks = [];
    this.consoleEl = document.getElementById('console');
    
    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.renderFaders();
    this.startPolling();
    
    // Listen for state changes
    this.core.on('grandMasterChanged', () => this.updateAllFaders());
    this.core.on('viewChanged', (data) => {
      if (data.viewId === 'console') {
        this.renderFaders();
      }
    });
  }

  setupEventListeners() {
    // Grand master controls
    const gmEl = document.getElementById('grand-master');
    const gmValueEl = document.getElementById('gm-value');
    
    if (gmEl && gmValueEl) {
      gmEl.addEventListener('input', () => {
        const value = parseInt(gmEl.value);
        this.state.setGrandMaster(value);
        gmValueEl.textContent = 'GM ' + value;
        
        // Notify backend
        this.core.apiFetch('/api/v1/dimmers/gm', { 
          method: 'PUT', 
          headers: { 'content-type': 'text/plain' }, 
          body: value 
        }).catch(() => {});
        
        this.flushWithGM();
      });
    }

    // Blackout button
    const blackoutBtn = document.getElementById('blackout');
    if (blackoutBtn) {
      blackoutBtn.addEventListener('click', () => {
        this.state.setGrandMaster(0);
        if (gmEl) {
          gmEl.value = '0';
          gmEl.dispatchEvent(new Event('input'));
        }
      });
    }

    // Paging controls
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.previousPage());
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextPage());
    }

    // Bank mode toggle
    const bankModeToggle = document.getElementById('bank-mode');
    if (bankModeToggle) {
      bankModeToggle.addEventListener('change', () => this.renderFaders());
    }

    // Health check
    const healthBtn = document.getElementById('btn-health');
    if (healthBtn) {
      healthBtn.addEventListener('click', () => this.checkHealth());
    }
  }

  renderFaders() {
    if (!this.consoleEl) return;
    
    this.consoleEl.innerHTML = '';
    this.faderRanges.length = 0;
    this.faderBanks.length = 0;
    
    // Check if bank mode is enabled
    const bankModeEl = document.getElementById('bank-mode');
    const isBankMode = bankModeEl && bankModeEl.checked;
    
    if (isBankMode) {
      this.renderBankView();
    } else {
      this.renderPageView();
    }
  }

  renderPageView() {
    const start = this.state.page * this.state.NUM_FADERS;
    
    for (let i = 0; i < this.state.NUM_FADERS; i++) {
      const channelIndex = start + i;
      const fader = this.createFaderElement(channelIndex);
      this.consoleEl.appendChild(fader);
    }
    
    this.updatePageDisplay();
  }

  renderBankView() {
    const bankContainer = document.createElement('div');
    bankContainer.className = 'bank-container';
    
    for (let bank = 0; bank < this.state.BANKS_PER_PAGE; bank++) {
      const bankEl = this.createBankElement(bank);
      bankContainer.appendChild(bankEl);
    }
    
    this.consoleEl.appendChild(bankContainer);
    this.updatePageDisplay();
  }

  createFaderElement(channelIndex) {
    const fader = document.createElement('div');
    fader.className = 'fader';
    
    const range = document.createElement('input');
    range.type = 'range';
    range.min = '0';
    range.max = '255';
    range.value = String(this.state.getFaderValue(channelIndex));
    
    range.addEventListener('input', () => {
      const value = parseInt(range.value) & 0xff;
      const gmValue = this.state.applyGrandMaster(value);
      this.state.updateFaderValue(channelIndex, gmValue);
      this.scheduleFlush();
    });
    
    const label = document.createElement('label');
    label.textContent = String(channelIndex + 1);
    label.addEventListener('click', (e) => {
      const multiSelect = e.ctrlKey || e.metaKey;
      this.state.selectChannel(channelIndex, multiSelect);
      this.updateChannelSelectionUI();
    });
    
    fader.appendChild(range);
    fader.appendChild(label);
    
    this.faderRanges.push(range);
    return fader;
  }

  createBankElement(bank) {
    const bankEl = document.createElement('div');
    bankEl.className = 'fader-bank';
    
    const bankNumber = this.state.currentBank * this.state.BANKS_PER_PAGE + bank + 1;
    bankEl.innerHTML = `<div class="bank-header">Bank ${bankNumber}</div>`;
    
    const faderContainer = document.createElement('div');
    faderContainer.className = 'fader-container';
    
    for (let i = 0; i < this.state.FADERS_PER_BANK; i++) {
      const channelIndex = (this.state.currentBank * this.state.BANKS_PER_PAGE + bank) * this.state.FADERS_PER_BANK + i;
      if (channelIndex >= 512) break;
      
      const fader = this.createFaderElement(channelIndex);
      faderContainer.appendChild(fader);
    }
    
    bankEl.appendChild(faderContainer);
    this.faderBanks.push(bankEl);
    
    return bankEl;
  }

  updatePageDisplay() {
    const pageNumEl = document.getElementById('page-num');
    if (!pageNumEl) return;
    
    const bankModeEl = document.getElementById('bank-mode');
    const isBankMode = bankModeEl && bankModeEl.checked;
    
    if (isBankMode) {
      pageNumEl.textContent = `Bank ${this.state.currentBank + 1}`;
    } else {
      pageNumEl.textContent = String(this.state.page + 1);
    }
  }

  previousPage() {
    const bankModeEl = document.getElementById('bank-mode');
    const isBankMode = bankModeEl && bankModeEl.checked;
    
    if (isBankMode) {
      this.state.currentBank = Math.max(0, this.state.currentBank - 1);
    } else {
      this.state.page = Math.max(0, this.state.page - 1);
    }
    
    this.renderFaders();
  }

  nextPage() {
    const bankModeEl = document.getElementById('bank-mode');
    const isBankMode = bankModeEl && bankModeEl.checked;
    
    if (isBankMode) {
      const maxBank = Math.ceil(this.state.TOTAL_BANKS / this.state.BANKS_PER_PAGE) - 1;
      this.state.currentBank = Math.min(maxBank, this.state.currentBank + 1);
    } else {
      this.state.page = Math.min(this.state.maxPage, this.state.page + 1);
    }
    
    this.renderFaders();
  }

  scheduleFlush() {
    if (this.state.flushPending) return;
    
    this.state.flushPending = true;
    setTimeout(async () => {
      try {
        await this.core.apiFetch('/api/v1/dimmers/levels', { 
          method: 'PUT', 
          body: this.state.faderValues 
        });
      } catch (error) {
        console.warn('Levels flush error:', error);
      }
      this.state.flushPending = false;
    }, 50); // throttle 20 Hz
  }

  flushWithGM() {
    const scaled = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      scaled[i] = this.state.applyGrandMaster(this.state.faderValues[i]);
    }
    
    this.core.apiFetch('/api/v1/dimmers/levels', { 
      method: 'PUT', 
      body: scaled 
    }).catch(() => {});
  }

  updateAllFaders() {
    this.faderRanges.forEach((range, index) => {
      const channelIndex = this.state.page * this.state.NUM_FADERS + index;
      const currentValue = this.state.getFaderValue(channelIndex);
      range.value = String(currentValue);
    });
  }

  updateChannelSelectionUI() {
    document.querySelectorAll('.fader').forEach(fader => {
      const label = fader.querySelector('label');
      if (label) {
        const channelNum = parseInt(label.textContent) - 1;
        fader.classList.toggle('selected', this.state.buttonStates.selectedChannels.has(channelNum));
      }
    });
  }

  async checkHealth() {
    try {
      const [rs, c] = await Promise.all([
        fetch(this.core.base + '/health').then(r => r.json()).catch(() => ({ ok: false })),
        fetch(this.core.base + '/api/v1/dimmers/health').then(r => r.json()).catch(() => ({ ok: false }))
      ]);
      
      const healthOut = document.getElementById('health-out');
      if (healthOut) {
        healthOut.textContent = `rs:${rs.ok ? 'ok' : 'down'} c:${c.ok ? 'ok' : 'down'}`;
      }
    } catch (error) {
      const healthOut = document.getElementById('health-out');
      if (healthOut) {
        healthOut.textContent = 'error';
      }
    }
  }

  startPolling() {
    setInterval(() => this.pollFrame(), 500);
  }

  async pollFrame() {
    if (this.state.polling) return;
    
    this.state.polling = true;
    try {
      const response = await this.core.apiFetch('/api/v1/dimmers/frame');
      if (response.ok) {
        const frameData = new Uint8Array(await response.arrayBuffer());
        const start = this.state.page * this.state.NUM_FADERS;
        
        for (let i = 0; i < this.state.NUM_FADERS; i++) {
          const channelIndex = start + i;
          const value = frameData[channelIndex] || 0;
          
          if (this.faderRanges[i]) {
            this.faderRanges[i].value = String(value);
          }
        }
      }
    } catch (error) {
      console.warn('Frame polling error:', error);
    }
    this.state.polling = false;
  }
}

// Register the module
window.IonXeFaders = IonXeFaders;
