// DMX Output Control Module
class IonXeDmxOutput {
  constructor(core) {
    this.core = core;
    this.isRunning = false;
    this.outputInterval = null;
    this.stats = {
      packetsSent: 0,
      bytesSent: 0,
      currentFps: 0,
      lastPacket: null,
      startTime: null
    };
    this.config = {
      protocol: 'artnet',
      host: '127.0.0.1',
      port: 5568,
      universe: 1,
      rate: 100, // FPS
      grandMaster: 255
    };
    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.setupChannelPreview();
    this.loadConfiguration();
    this.updateUI();
  }

  setupEventListeners() {
    // Control buttons
    document.getElementById('dmx-start')?.addEventListener('click', () => this.startOutput());
    document.getElementById('dmx-stop')?.addEventListener('click', () => this.stopOutput());
    document.getElementById('dmx-test')?.addEventListener('click', () => this.testOutput());

    // Configuration inputs
    document.getElementById('dmx-protocol')?.addEventListener('change', (e) => {
      this.config.protocol = e.target.value;
      this.updatePortDefault();
      this.saveConfiguration();
    });

    document.getElementById('dmx-host')?.addEventListener('input', (e) => {
      this.config.host = e.target.value;
      this.saveConfiguration();
    });

    document.getElementById('dmx-port')?.addEventListener('input', (e) => {
      this.config.port = parseInt(e.target.value) || 5568;
      this.saveConfiguration();
    });

    document.getElementById('dmx-universe')?.addEventListener('input', (e) => {
      this.config.universe = parseInt(e.target.value) || 1;
      this.saveConfiguration();
    });

    document.getElementById('dmx-rate')?.addEventListener('change', (e) => {
      this.config.rate = parseInt(e.target.value);
      this.saveConfiguration();
      if (this.isRunning) {
        this.restartOutput();
      }
    });

    document.getElementById('dmx-gm')?.addEventListener('input', (e) => {
      this.config.grandMaster = parseInt(e.target.value);
      document.getElementById('dmx-gm-value').textContent = this.config.grandMaster;
      this.saveConfiguration();
      this.updateGrandMaster();
    });

    // Network diagnostics
    document.getElementById('dmx-ping')?.addEventListener('click', () => this.pingTarget());
    document.getElementById('dmx-discover')?.addEventListener('click', () => this.discoverDevices());

    // Tab switching
    document.getElementById('tab-dmx-output')?.addEventListener('click', () => {
      this.updateChannelPreview();
    });
  }

  setupChannelPreview() {
    const preview = document.getElementById('dmx-preview');
    if (!preview) return;

    // Create a grid of channel indicators (16x32 = 512 channels)
    preview.innerHTML = '';
    for (let i = 0; i < 32; i++) {
      const row = document.createElement('div');
      row.className = 'dmx-preview-row';
      for (let j = 0; j < 16; j++) {
        const channel = i * 16 + j + 1;
        const indicator = document.createElement('div');
        indicator.className = 'dmx-channel-indicator';
        indicator.dataset.channel = channel;
        indicator.innerHTML = `<span class="channel-number">${channel}</span><span class="channel-value">0</span>`;
        row.appendChild(indicator);
      }
      preview.appendChild(row);
    }
  }

  updateChannelPreview() {
    if (!window.ionxe || !window.ionxe.state) return;

    const faderValues = window.ionxe.state.faderValues;
    for (let i = 0; i < 512; i++) {
      const indicator = document.querySelector(`[data-channel="${i + 1}"]`);
      if (indicator) {
        const value = faderValues[i] || 0;
        const scaledValue = Math.floor((value * this.config.grandMaster) / 255);
        indicator.querySelector('.channel-value').textContent = scaledValue;
        
        // Update visual intensity
        const intensity = scaledValue / 255;
        indicator.style.backgroundColor = `rgba(255, 255, 0, ${intensity * 0.8})`;
        indicator.style.borderColor = intensity > 0.1 ? '#ffff00' : '#333';
      }
    }
  }

  updatePortDefault() {
    const portInput = document.getElementById('dmx-port');
    if (portInput) {
      portInput.value = this.config.protocol === 'artnet' ? '6454' : '5568';
      this.config.port = parseInt(portInput.value);
    }
  }

  async startOutput() {
    if (this.isRunning) return;

    try {
      // Update routing configuration
      await this.updateRoutingConfig();
      
      this.isRunning = true;
      this.stats.startTime = Date.now();
      this.stats.packetsSent = 0;
      this.stats.bytesSent = 0;

      // Start the output loop
      const intervalMs = 1000 / this.config.rate;
      this.outputInterval = setInterval(() => {
        this.sendDmxData();
      }, intervalMs);

      this.updateUI();
      this.core.showSuccess('DMX output started');
    } catch (error) {
      this.core.showError('Failed to start DMX output: ' + error.message);
    }
  }

  stopOutput() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.outputInterval) {
      clearInterval(this.outputInterval);
      this.outputInterval = null;
    }

    this.updateUI();
    this.core.showSuccess('DMX output stopped');
  }

  async testOutput() {
    try {
      // Send a test pattern
      const testData = new Uint8Array(512);
      for (let i = 0; i < 512; i++) {
        testData[i] = (i % 256);
      }

      await this.sendDmxLevels(testData);
      this.core.showSuccess('Test pattern sent');
    } catch (error) {
      this.core.showError('Test failed: ' + error.message);
    }
  }

  async sendDmxData() {
    if (!window.ionxe || !window.ionxe.state) return;

    try {
      // Get current fader values
      const faderValues = window.ionxe.state.faderValues;
      const dmxData = new Uint8Array(512);

      // Apply grand master scaling
      for (let i = 0; i < 512; i++) {
        const value = faderValues[i] || 0;
        dmxData[i] = Math.floor((value * this.config.grandMaster) / 255);
      }

      await this.sendDmxLevels(dmxData);
      this.updateStats();
      this.updateChannelPreview();
    } catch (error) {
      console.error('DMX send error:', error);
    }
  }

  async sendDmxLevels(data) {
    const response = await fetch('/api/v1/levels', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      body: data
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  async updateRoutingConfig() {
    const outputTarget = {
      id: crypto.randomUUID(),
      kind: this.config.protocol === 'artnet' ? 'artnet' : 'sacn',
      label: `DMX Output ${this.config.protocol.toUpperCase()}`,
      universe: this.config.universe,
      ...(this.config.protocol === 'artnet' 
        ? { host: this.config.host, port: this.config.port }
        : { host: this.config.host, port: this.config.port }
      )
    };

    const routingConfig = {
      outputs: [outputTarget]
    };

    const response = await fetch('/api/v1/routing', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(routingConfig)
    });

    if (!response.ok) {
      throw new Error(`Failed to update routing: ${response.statusText}`);
    }
  }

  updateStats() {
    this.stats.packetsSent++;
    this.stats.bytesSent += 512; // 512 bytes per DMX packet
    this.stats.lastPacket = new Date().toLocaleTimeString();

    // Calculate current FPS
    if (this.stats.startTime) {
      const elapsed = (Date.now() - this.stats.startTime) / 1000;
      this.stats.currentFps = Math.round(this.stats.packetsSent / elapsed);
    }

    // Update UI
    document.getElementById('dmx-packets-sent').textContent = this.stats.packetsSent.toLocaleString();
    document.getElementById('dmx-bytes-sent').textContent = this.stats.bytesSent.toLocaleString();
    document.getElementById('dmx-current-fps').textContent = this.stats.currentFps;
    document.getElementById('dmx-last-packet').textContent = this.stats.lastPacket;
  }

  updateUI() {
    const status = document.getElementById('dmx-status');
    const startBtn = document.getElementById('dmx-start');
    const stopBtn = document.getElementById('dmx-stop');

    if (status) {
      status.textContent = this.isRunning ? 'Running' : 'Stopped';
      status.className = this.isRunning ? 'status running' : 'status stopped';
    }

    if (startBtn) startBtn.disabled = this.isRunning;
    if (stopBtn) stopBtn.disabled = !this.isRunning;
  }

  async updateGrandMaster() {
    if (!window.ionxe || !window.ionxe.state) return;

    // Update the global grand master
    window.ionxe.state.setGrandMaster(this.config.grandMaster);
    
    // Update the grand master slider in console view
    const gmSlider = document.getElementById('grand-master');
    if (gmSlider) {
      gmSlider.value = this.config.grandMaster;
      gmSlider.dispatchEvent(new Event('input'));
    }
  }

  async pingTarget() {
    try {
      const start = Date.now();
      const response = await fetch(`/api/v1/health`);
      const end = Date.now();
      
      if (response.ok) {
        const latency = end - start;
        this.core.showSuccess(`Ping successful: ${latency}ms`);
      } else {
        this.core.showError('Ping failed: Server not responding');
      }
    } catch (error) {
      this.core.showError('Ping failed: ' + error.message);
    }
  }

  async discoverDevices() {
    try {
      // This would typically use a discovery protocol like Art-Net discovery
      // For now, we'll show a placeholder
      const discovered = document.getElementById('dmx-discovered');
      if (discovered) {
        discovered.innerHTML = '<p>Device discovery not yet implemented. This would scan for Art-Net and sACN devices on the network.</p>';
      }
      this.core.showInfo('Device discovery not yet implemented');
    } catch (error) {
      this.core.showError('Discovery failed: ' + error.message);
    }
  }

  restartOutput() {
    if (this.isRunning) {
      this.stopOutput();
      setTimeout(() => this.startOutput(), 100);
    }
  }

  loadConfiguration() {
    const saved = localStorage.getItem('ionxe-dmx-config');
    if (saved) {
      try {
        this.config = { ...this.config, ...JSON.parse(saved) };
      } catch (error) {
        console.warn('Failed to load DMX configuration:', error);
      }
    }

    // Update UI with loaded config
    document.getElementById('dmx-protocol').value = this.config.protocol;
    document.getElementById('dmx-host').value = this.config.host;
    document.getElementById('dmx-port').value = this.config.port;
    document.getElementById('dmx-universe').value = this.config.universe;
    document.getElementById('dmx-rate').value = this.config.rate;
    document.getElementById('dmx-gm').value = this.config.grandMaster;
    document.getElementById('dmx-gm-value').textContent = this.config.grandMaster;
  }

  saveConfiguration() {
    localStorage.setItem('ionxe-dmx-config', JSON.stringify(this.config));
  }

  // Public API for other modules
  getConfig() {
    return { ...this.config };
  }

  isOutputRunning() {
    return this.isRunning;
  }

  getStats() {
    return { ...this.stats };
  }
}

// Register the module
window.IonXeDmxOutput = IonXeDmxOutput;
