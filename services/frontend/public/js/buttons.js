// Button controls and virtual desk functionality
class IonXeButtons {
  constructor(core) {
    this.core = core;
    this.state = core.state;
    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.setupChannelSelection();
  }

  setupEventListeners() {
    // Number keypad
    const keypadButtons = document.querySelectorAll('.num-keypad button');
    keypadButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.textContent;
        this.handleKeypadInput(value);
      });
    });

    // Intensity controls
    const intensityFullBtn = document.getElementById('intensity-full');
    const intensityOutBtn = document.getElementById('intensity-out');
    const intensityAtBtn = document.getElementById('intensity-at');

    if (intensityFullBtn) {
      intensityFullBtn.addEventListener('click', () => {
        this.setSelectedChannelsIntensity(255);
      });
    }

    if (intensityOutBtn) {
      intensityOutBtn.addEventListener('click', () => {
        this.setSelectedChannelsIntensity(0);
      });
    }

    if (intensityAtBtn) {
      intensityAtBtn.addEventListener('click', () => {
        this.promptIntensityValue();
      });
    }

    // Softkeys
    this.setupSoftkeys();
  }

  setupSoftkeys() {
    const softkeyMacro = document.getElementById('softkey-macro');
    const softkeyRecord = document.getElementById('softkey-record');
    const softkeyUpdate = document.getElementById('softkey-update');
    const softkeyClear = document.getElementById('softkey-clear');
    const softkeyBlind = document.getElementById('softkey-blind');
    const softkeyLive = document.getElementById('softkey-live');

    if (softkeyMacro) {
      softkeyMacro.addEventListener('click', () => {
        this.toggleMacroMode();
      });
    }

    if (softkeyRecord) {
      softkeyRecord.addEventListener('click', () => {
        this.toggleRecordMode();
      });
    }

    if (softkeyUpdate) {
      softkeyUpdate.addEventListener('click', () => {
        this.updateSelectedChannels();
      });
    }

    if (softkeyClear) {
      softkeyClear.addEventListener('click', () => {
        this.setSelectedChannelsIntensity(0);
      });
    }

    if (softkeyBlind) {
      softkeyBlind.addEventListener('click', () => {
        this.toggleBlindMode();
      });
    }

    if (softkeyLive) {
      softkeyLive.addEventListener('click', () => {
        this.toggleLiveMode();
      });
    }
  }

  handleKeypadInput(value) {
    if (value === '+') {
      // Channel up
      if (this.state.buttonStates.lastSelectedChannel !== null) {
        this.state.buttonStates.lastSelectedChannel = Math.min(511, this.state.buttonStates.lastSelectedChannel + 1);
        this.updateSelectedChannelDisplay();
      }
    } else if (value === '-') {
      // Channel down
      if (this.state.buttonStates.lastSelectedChannel !== null) {
        this.state.buttonStates.lastSelectedChannel = Math.max(0, this.state.buttonStates.lastSelectedChannel - 1);
        this.updateSelectedChannelDisplay();
      }
    } else {
      // Number input
      const num = parseInt(value);
      if (!isNaN(num)) {
        if (this.state.buttonStates.lastSelectedChannel === null) {
          this.state.buttonStates.lastSelectedChannel = num - 1;
        } else {
          this.state.buttonStates.lastSelectedChannel = this.state.buttonStates.lastSelectedChannel * 10 + num;
          if (this.state.buttonStates.lastSelectedChannel > 511) {
            this.state.buttonStates.lastSelectedChannel = num - 1;
          }
        }
        this.updateSelectedChannelDisplay();
      }
    }
  }

  setSelectedChannelsIntensity(value) {
    if (this.state.buttonStates.selectedChannels.size > 0) {
      const channels = Array.from(this.state.buttonStates.selectedChannels);
      this.setChannelsIntensity(channels, value);
    }
  }

  setChannelsIntensity(channels, value) {
    for (const ch of channels) {
      if (ch >= 0 && ch < 512) {
        const gmValue = this.state.applyGrandMaster(value);
        this.state.updateFaderValue(ch, gmValue);
      }
    }
    this.scheduleFlush();
  }

  promptIntensityValue() {
    const value = prompt('Enter intensity value (0-255):');
    const intValue = parseInt(value);
    if (!isNaN(intValue) && intValue >= 0 && intValue <= 255) {
      this.setSelectedChannelsIntensity(intValue);
    }
  }

  toggleMacroMode() {
    this.state.buttonStates.macroMode = !this.state.buttonStates.macroMode;
    this.updateButtonStates();
    
    // Emit event for macro system
    this.core.emit('macroModeToggled', { enabled: this.state.buttonStates.macroMode });
  }

  toggleRecordMode() {
    this.state.buttonStates.recordMode = !this.state.buttonStates.recordMode;
    this.updateButtonStates();
    
    // Emit event for macro system
    this.core.emit('recordModeToggled', { enabled: this.state.buttonStates.recordMode });
  }

  updateSelectedChannels() {
    if (this.state.buttonStates.selectedChannels.size > 0) {
      const channels = Array.from(this.state.buttonStates.selectedChannels);
      for (const ch of channels) {
        const currentValue = this.state.getFaderValue(ch);
        const gmValue = this.state.applyGrandMaster(currentValue);
        this.state.updateFaderValue(ch, gmValue);
      }
      this.scheduleFlush();
    }
  }

  toggleBlindMode() {
    this.state.buttonStates.blindMode = !this.state.buttonStates.blindMode;
    this.state.buttonStates.liveMode = !this.state.buttonStates.blindMode;
    this.updateButtonStates();
    
    this.core.emit('modeChanged', { 
      blind: this.state.buttonStates.blindMode, 
      live: this.state.buttonStates.liveMode 
    });
  }

  toggleLiveMode() {
    this.state.buttonStates.liveMode = !this.state.buttonStates.liveMode;
    this.state.buttonStates.blindMode = !this.state.buttonStates.liveMode;
    this.updateButtonStates();
    
    this.core.emit('modeChanged', { 
      blind: this.state.buttonStates.blindMode, 
      live: this.state.buttonStates.liveMode 
    });
  }

  updateSelectedChannelDisplay() {
    const display = document.getElementById('selected-channel');
    if (display) {
      display.textContent = this.state.buttonStates.lastSelectedChannel !== null ? 
        `Ch ${this.state.buttonStates.lastSelectedChannel + 1}` : 'No Selection';
    }
  }

  updateButtonStates() {
    // Update button visual states
    const softkeyMacro = document.getElementById('softkey-macro');
    const softkeyRecord = document.getElementById('softkey-record');
    const softkeyBlind = document.getElementById('softkey-blind');
    const softkeyLive = document.getElementById('softkey-live');

    if (softkeyMacro) {
      softkeyMacro.classList.toggle('active', this.state.buttonStates.macroMode);
    }
    if (softkeyRecord) {
      softkeyRecord.classList.toggle('active', this.state.buttonStates.recordMode);
    }
    if (softkeyBlind) {
      softkeyBlind.classList.toggle('active', this.state.buttonStates.blindMode);
    }
    if (softkeyLive) {
      softkeyLive.classList.toggle('active', this.state.buttonStates.liveMode);
    }
  }

  setupChannelSelection() {
    // Add click handlers to fader labels for channel selection
    document.addEventListener('click', (e) => {
      if (e.target.tagName === 'LABEL' && e.target.parentElement.classList.contains('fader')) {
        const labelText = e.target.textContent;
        const channelNum = parseInt(labelText) - 1;
        if (!isNaN(channelNum) && channelNum >= 0 && channelNum < 512) {
          const multiSelect = e.ctrlKey || e.metaKey;
          this.state.selectChannel(channelNum, multiSelect);
          this.updateSelectedChannelDisplay();
          this.updateChannelSelectionUI();
        }
      }
    });
  }

  updateChannelSelectionUI() {
    // Update visual indication of selected channels
    document.querySelectorAll('.fader').forEach(fader => {
      const label = fader.querySelector('label');
      if (label) {
        const channelNum = parseInt(label.textContent) - 1;
        fader.classList.toggle('selected', this.state.buttonStates.selectedChannels.has(channelNum));
      }
    });
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
}

// Legacy compatibility functions for existing code
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

// Color and Intensity controls (legacy compatibility)
document.addEventListener('DOMContentLoaded', () => {
  const colorApplyBtn = document.getElementById('color-apply');
  const intensApplyBtn = document.getElementById('intens-apply');
  
  if (colorApplyBtn) {
    colorApplyBtn.addEventListener('click', async () => {
      const hex = document.getElementById('color-picker').value || '#ffffff';
      const r = parseInt(hex.slice(1,3), 16) & 0xff;
      const g = parseInt(hex.slice(3,5), 16) & 0xff;
      const b = parseInt(hex.slice(5,7), 16) & 0xff;
      const bases = parseList(document.getElementById('color-bases').value).map(x=>Math.max(0, x-1));
      const payload = { model: 'rgb', rgb: [r,g,b], bases };
      
      try {
        await window.ionxe.core.apiFetch('/api/v1/color', { 
          method: 'POST', 
          headers: { 'content-type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
        window.ionxe.core.showSuccess('Color applied successfully');
      } catch (error) {
        window.ionxe.core.showError('Failed to apply color');
      }
    });
  }
  
  if (intensApplyBtn) {
    intensApplyBtn.addEventListener('click', async () => {
      const chans = parseList(document.getElementById('intens-chans').value).map(x=>Math.max(0, x-1));
      const value = Math.max(0, Math.min(255, parseInt(document.getElementById('intens-value').value||'0',10)));
      const payload = { channels: chans, value };
      
      try {
        await window.ionxe.core.apiFetch('/api/v1/intensity', { 
          method: 'POST', 
          headers: { 'content-type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });
        window.ionxe.core.showSuccess('Intensity applied successfully');
      } catch (error) {
        window.ionxe.core.showError('Failed to apply intensity');
      }
    });
  }
});

// Auth UI (legacy compatibility)
document.addEventListener('DOMContentLoaded', () => {
  const authLoginBtn = document.getElementById('auth-login');
  
  if (authLoginBtn) {
    authLoginBtn.addEventListener('click', async () => {
      const username = document.getElementById('auth-username').value;
      const password = document.getElementById('auth-password').value;
      
      try {
        const response = await fetch(window.ionxe.core.base + '/api/v1/auth/login', { 
          method: 'POST', 
          headers: { 'content-type': 'application/json' }, 
          body: JSON.stringify({ username, password }) 
        });
        
        const out = document.getElementById('auth-status');
        if (response.ok) { 
          const data = await response.json(); 
          window.ionxe.core.authToken = data.token; 
          localStorage.setItem('ionxe_token', data.token); 
          out.textContent = 'Logged in';
          window.ionxe.core.showSuccess('Login successful');
        } else { 
          out.textContent = 'Login failed';
          window.ionxe.core.showError('Login failed');
        }
      } catch (error) {
        const out = document.getElementById('auth-status');
        out.textContent = 'Login error';
        window.ionxe.core.showError('Login error');
      }
    });
  }
});

// Register the module
window.IonXeButtons = IonXeButtons;