// IonXe Mobile Faders - Touch-optimized fader control
class MobileFaders {
  constructor(core) {
    this.core = core;
    this.currentBank = 0;
    this.fadersPerBank = 24;
    this.totalChannels = 512;
    this.faderValues = new Uint8Array(this.totalChannels);
    this.isDragging = false;
    this.dragStartValue = 0;
    this.dragStartY = 0;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.renderFaders();
    this.updateBankInfo();
  }

  setupEventListeners() {
    // Bank navigation
    document.getElementById('bank-prev')?.addEventListener('click', () => {
      this.previousBank();
    });

    document.getElementById('bank-next')?.addEventListener('click', () => {
      this.nextBank();
    });

    // Grand master
    const grandMaster = document.getElementById('grand-master');
    if (grandMaster) {
      grandMaster.addEventListener('input', (e) => {
        this.updateGrandMaster(parseInt(e.target.value));
      });
    }

    // Core events
    this.core.on('faderUpdate', (data) => {
      this.updateFaderValue(data.channel, data.value);
    });

    this.core.on('connected', () => {
      this.loadFaderValues();
    });
  }

  renderFaders() {
    const container = document.getElementById('faders-container');
    if (!container) return;

    container.innerHTML = '';

    const startChannel = this.currentBank * this.fadersPerBank;
    const endChannel = Math.min(startChannel + this.fadersPerBank, this.totalChannels);

    for (let i = startChannel; i < endChannel; i++) {
      const faderElement = this.createFaderElement(i);
      container.appendChild(faderElement);
    }
  }

  createFaderElement(channel) {
    const faderDiv = document.createElement('div');
    faderDiv.className = 'fader-item';
    faderDiv.dataset.channel = channel;

    const value = this.faderValues[channel] || 0;
    const percentage = this.core.formatValue(value);

    faderDiv.innerHTML = `
      <div class="fader-label">Ch ${channel + 1}</div>
      <input type="range" 
             class="fader-slider" 
             min="0" 
             max="255" 
             value="${value}"
             data-channel="${channel}"
             orient="vertical">
      <div class="fader-value">${percentage}%</div>
    `;

    // Add touch/mouse event listeners
    const slider = faderDiv.querySelector('.fader-slider');
    this.setupFaderEvents(slider, channel);

    return faderDiv;
  }

  setupFaderEvents(slider, channel) {
    // Input event for immediate updates
    slider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      this.updateFaderValue(channel, value);
      this.updateFaderDisplay(channel, value);
    });

    // Touch events for better mobile experience
    slider.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.isDragging = true;
      this.dragStartValue = parseInt(slider.value);
      this.dragStartY = e.touches[0].clientY;
      
      // Haptic feedback
      if (this.core.settings.hapticFeedback && navigator.vibrate) {
        navigator.vibrate(10);
      }
    });

    slider.addEventListener('touchmove', (e) => {
      if (!this.isDragging) return;
      
      e.preventDefault();
      const deltaY = this.dragStartY - e.touches[0].clientY;
      const sensitivity = 2; // Adjust for touch sensitivity
      const deltaValue = Math.round(deltaY / sensitivity);
      const newValue = Math.max(0, Math.min(255, this.dragStartValue + deltaValue));
      
      slider.value = newValue;
      this.updateFaderValue(channel, newValue);
      this.updateFaderDisplay(channel, newValue);
    });

    slider.addEventListener('touchend', (e) => {
      this.isDragging = false;
    });

    // Mouse events for desktop compatibility
    slider.addEventListener('mousedown', (e) => {
      this.isDragging = true;
    });

    slider.addEventListener('mouseup', (e) => {
      this.isDragging = false;
    });
  }

  updateFaderValue(channel, value) {
    this.faderValues[channel] = value;
    
    // Send to console
    this.sendFaderUpdate(channel, value);
  }

  updateFaderDisplay(channel, value) {
    const faderElement = document.querySelector(`[data-channel="${channel}"]`);
    if (faderElement) {
      const valueDisplay = faderElement.querySelector('.fader-value');
      if (valueDisplay) {
        const percentage = this.core.formatValue(value);
        valueDisplay.textContent = `${percentage}%`;
      }
    }
  }

  async sendFaderUpdate(channel, value) {
    try {
      await this.core.apiRequest('/api/faders/update', {
        method: 'POST',
        body: JSON.stringify({
          channel: channel,
          value: value
        })
      });
    } catch (error) {
      console.error('Failed to send fader update:', error);
      this.core.showToast('Failed to update fader', 'error');
    }
  }

  updateGrandMaster(value) {
    const masterValue = document.getElementById('master-value');
    if (masterValue) {
      const percentage = this.core.formatValue(value);
      masterValue.textContent = `${percentage}%`;
    }

    // Send grand master update
    this.sendGrandMasterUpdate(value);
  }

  async sendGrandMasterUpdate(value) {
    try {
      await this.core.apiRequest('/api/faders/grand-master', {
        method: 'POST',
        body: JSON.stringify({ value: value })
      });
    } catch (error) {
      console.error('Failed to update grand master:', error);
      this.core.showToast('Failed to update grand master', 'error');
    }
  }

  // Bank Navigation
  nextBank() {
    const maxBank = Math.ceil(this.totalChannels / this.fadersPerBank) - 1;
    if (this.currentBank < maxBank) {
      this.currentBank++;
      this.updateBankInfo();
      this.renderFaders();
    }
  }

  previousBank() {
    if (this.currentBank > 0) {
      this.currentBank--;
      this.updateBankInfo();
      this.renderFaders();
    }
  }

  updateBankInfo() {
    const bankInfo = document.getElementById('bank-info');
    if (bankInfo) {
      const startChannel = this.currentBank * this.fadersPerBank + 1;
      const endChannel = Math.min(startChannel + this.fadersPerBank - 1, this.totalChannels);
      bankInfo.textContent = `Bank ${this.currentBank + 1} (${startChannel}-${endChannel})`;
    }
  }

  // Data Loading
  async loadFaderValues() {
    try {
      const data = await this.core.apiRequest('/api/faders/values');
      if (data && data.faderValues) {
        this.faderValues = new Uint8Array(data.faderValues);
        this.updateAllFaderDisplays();
      }
    } catch (error) {
      console.error('Failed to load fader values:', error);
    }
  }

  updateAllFaderDisplays() {
    const startChannel = this.currentBank * this.fadersPerBank;
    const endChannel = Math.min(startChannel + this.fadersPerBank, this.totalChannels);

    for (let i = startChannel; i < endChannel; i++) {
      const faderElement = document.querySelector(`[data-channel="${i}"]`);
      if (faderElement) {
        const slider = faderElement.querySelector('.fader-slider');
        const value = this.faderValues[i] || 0;
        
        if (slider) {
          slider.value = value;
        }
        
        this.updateFaderDisplay(i, value);
      }
    }
  }

  // Utility Methods
  setFaderValue(channel, value) {
    if (channel >= 0 && channel < this.totalChannels) {
      this.faderValues[channel] = Math.max(0, Math.min(255, value));
      this.updateFaderDisplay(channel, this.faderValues[channel]);
    }
  }

  getFaderValue(channel) {
    return this.faderValues[channel] || 0;
  }

  clearAllFaders() {
    for (let i = 0; i < this.totalChannels; i++) {
      this.faderValues[i] = 0;
    }
    this.updateAllFaderDisplays();
    this.sendClearAll();
  }

  async sendClearAll() {
    try {
      await this.core.apiRequest('/api/faders/clear', {
        method: 'POST'
      });
      this.core.showToast('All faders cleared', 'success');
    } catch (error) {
      console.error('Failed to clear faders:', error);
      this.core.showToast('Failed to clear faders', 'error');
    }
  }

  // Scene Integration
  loadSceneValues(sceneData) {
    if (sceneData && sceneData.faderValues) {
      for (let i = 0; i < Math.min(sceneData.faderValues.length, this.totalChannels); i++) {
        this.faderValues[i] = sceneData.faderValues[i];
      }
      this.updateAllFaderDisplays();
    }
  }

  getCurrentValues() {
    return Array.from(this.faderValues);
  }

  // Touch Gestures
  setupTouchGestures() {
    let startY = 0;
    let startTime = 0;

    document.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      startTime = Date.now();
    });

    document.addEventListener('touchend', (e) => {
      const endY = e.changedTouches[0].clientY;
      const endTime = Date.now();
      const deltaY = startY - endY;
      const deltaTime = endTime - startTime;

      // Swipe detection
      if (Math.abs(deltaY) > 50 && deltaTime < 300) {
        if (deltaY > 0) {
          this.nextBank(); // Swipe up
        } else {
          this.previousBank(); // Swipe down
        }
      }
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.mobileCore) {
    window.mobileFaders = new MobileFaders(window.mobileCore);
  }
});
