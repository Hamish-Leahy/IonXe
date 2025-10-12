// Live Audio Analysis & Real-time Music Sync
// Provides real-time audio analysis, beat detection, and live lighting sync

class IonXeLiveAudio {
  constructor(core) {
    this.core = core;
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.isRecording = false;
    this.isAnalyzing = false;
    this.currentBPM = 0;
    this.beatHistory = [];
    this.spectrumData = null;
    this.audioLevel = 0;
    this.animationId = null;
    this.syncPoints = [];
    this.lightingSync = {
      enabled: false,
      sensitivity: 0.5,
      frequencyBands: {
        bass: { min: 20, max: 250, color: '#ff0000' },
        mid: { min: 250, max: 4000, color: '#00ff00' },
        treble: { min: 4000, max: 20000, color: '#0000ff' }
      }
    };
    this.djMode = {
      enabled: false,
      beatQuantize: 2,
      activeEffects: new Set(),
      effectHistory: []
    };
    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.createLiveAudioTab();
    this.initializeAudioContext();
  }

  setupEventListeners() {
    // Tab activation
    document.getElementById('tab-live-audio')?.addEventListener('click', () => this.activateTab());
    
    // Audio controls
    document.getElementById('live-audio-start')?.addEventListener('click', () => this.startLiveAudio());
    document.getElementById('live-audio-stop')?.addEventListener('click', () => this.stopLiveAudio());
    document.getElementById('live-audio-calibrate')?.addEventListener('click', () => this.calibrateAudio());
    
    // Sync controls
    document.getElementById('live-sync-enable')?.addEventListener('change', (e) => this.toggleLightingSync(e.target.checked));
    document.getElementById('live-sync-sensitivity')?.addEventListener('input', (e) => this.updateSyncSensitivity(parseFloat(e.target.value)));
    
    // Frequency band controls
    document.getElementById('live-bass-sensitivity')?.addEventListener('input', (e) => this.updateFrequencyBand('bass', parseFloat(e.target.value)));
    document.getElementById('live-mid-sensitivity')?.addEventListener('input', (e) => this.updateFrequencyBand('mid', parseFloat(e.target.value)));
    document.getElementById('live-treble-sensitivity')?.addEventListener('input', (e) => this.updateFrequencyBand('treble', parseFloat(e.target.value)));
    
    // Sync point management
    document.getElementById('live-add-sync-point')?.addEventListener('click', () => this.addSyncPoint());
    document.getElementById('live-clear-sync-points')?.addEventListener('click', () => this.clearSyncPoints());
    
    // DJ mode controls
    document.getElementById('dj-mode-enable')?.addEventListener('change', (e) => this.toggleDJMode(e.target.checked));
    
    // DJ effect buttons
    document.querySelectorAll('.dj-effect-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const effect = btn.dataset.effect;
        this.triggerDJEffect(effect);
        btn.classList.toggle('active');
      });
    });
    
    // Beat quantize control
    document.getElementById('beat-quantize')?.addEventListener('change', (e) => {
      this.beatQuantize = parseInt(e.target.value);
      this.core.showInfo(`Beat quantize set to 1/${e.target.value}`);
    });
  }

  createLiveAudioTab() {
    const tab = document.createElement('a');
    tab.href = '#live-audio';
    tab.id = 'tab-live-audio';
    tab.className = 'tab';
    tab.textContent = 'Live Audio';
    document.querySelector('.tabs').appendChild(tab);

    const view = document.createElement('div');
    view.id = 'view-live-audio';
    view.className = 'view';
    view.innerHTML = this.createLiveAudioHTML();
    document.querySelector('.main-content').appendChild(view);
  }

  createLiveAudioHTML() {
    return `
      <div class="live-audio-container">
        <div class="live-audio-header">
          <h2>🎵 Live Audio Analysis & Sync</h2>
          <div class="live-audio-status">
            <span id="live-audio-status" class="status stopped">Stopped</span>
            <span id="live-audio-bpm" class="bpm-display">0 BPM</span>
          </div>
        </div>

        <div class="live-audio-controls">
          <div class="control-section">
            <h3>Audio Input</h3>
            <div class="audio-controls">
              <button id="live-audio-start" class="btn-primary">
                <span class="btn-icon">🎤</span>
                Start Live Audio
              </button>
              <button id="live-audio-stop" class="btn-secondary" disabled>
                <span class="btn-icon">⏹️</span>
                Stop Audio
              </button>
              <button id="live-audio-calibrate" class="btn-info">
                <span class="btn-icon">🔧</span>
                Calibrate
              </button>
            </div>
            <div class="audio-level-indicator">
              <label>Audio Level:</label>
              <div class="level-bar">
                <div id="live-audio-level" class="level-fill"></div>
              </div>
              <span id="live-audio-level-value">0%</span>
            </div>
          </div>

          <div class="control-section">
            <h3>Real-time Analysis</h3>
            <div class="analysis-display">
              <div class="bpm-display-large">
                <span class="bpm-label">BPM</span>
                <span id="live-bpm-large" class="bpm-value">0</span>
                <div class="bpm-trend" id="bpm-trend"></div>
              </div>
              <div class="frequency-bands">
                <div class="band-display">
                  <label>Bass (20-250Hz)</label>
                  <div class="band-bar">
                    <div id="bass-level" class="band-fill bass"></div>
                  </div>
                  <input type="range" id="live-bass-sensitivity" min="0" max="2" step="0.1" value="1.0">
                </div>
                <div class="band-display">
                  <label>Mid (250-4kHz)</label>
                  <div class="band-bar">
                    <div id="mid-level" class="band-fill mid"></div>
                  </div>
                  <input type="range" id="live-mid-sensitivity" min="0" max="2" step="0.1" value="1.0">
                </div>
                <div class="band-display">
                  <label>Treble (4-20kHz)</label>
                  <div class="band-bar">
                    <div id="treble-level" class="band-fill treble"></div>
                  </div>
                  <input type="range" id="live-treble-sensitivity" min="0" max="2" step="0.1" value="1.0">
                </div>
              </div>
            </div>
          </div>

          <div class="control-section">
            <h3>Lighting Sync</h3>
            <div class="sync-controls">
              <label class="checkbox-label">
                <input type="checkbox" id="live-sync-enable">
                <span class="checkmark"></span>
                Enable Lighting Sync
              </label>
              <div class="sync-settings">
                <label>Sensitivity:</label>
                <input type="range" id="live-sync-sensitivity" min="0" max="1" step="0.1" value="0.5">
                <span id="sync-sensitivity-value">50%</span>
              </div>
              <div class="sync-effects">
                <button class="effect-btn" data-effect="beat-sync">Beat Sync</button>
                <button class="effect-btn" data-effect="frequency-sync">Frequency Sync</button>
                <button class="effect-btn" data-effect="energy-sync">Energy Sync</button>
                <button class="effect-btn" data-effect="strobe-sync">Strobe Sync</button>
              </div>
            </div>
          </div>

          <div class="control-section">
            <h3>Sync Points</h3>
            <div class="sync-points">
              <div class="sync-point-controls">
                <button id="live-add-sync-point" class="btn-success">
                  <span class="btn-icon">📍</span>
                  Add Sync Point
                </button>
                <button id="live-clear-sync-points" class="btn-warning">
                  <span class="btn-icon">🗑️</span>
                  Clear All
                </button>
              </div>
              <div id="sync-points-list" class="sync-points-list"></div>
            </div>
          </div>

          <div class="control-section">
            <h3>DJ Mode</h3>
            <div class="dj-controls">
              <div class="dj-mode-toggle">
                <label class="checkbox-label">
                  <input type="checkbox" id="dj-mode-enable">
                  <span class="checkmark"></span>
                  Enable DJ Mode
                </label>
              </div>
              <div class="dj-effects">
                <h4>DJ Effects</h4>
                <div class="effect-grid">
                  <button class="dj-effect-btn" data-effect="beat-match">
                    <span class="effect-icon">🎵</span>
                    <span class="effect-name">Beat Match</span>
                  </button>
                  <button class="dj-effect-btn" data-effect="bass-drop">
                    <span class="effect-icon">💥</span>
                    <span class="effect-name">Bass Drop</span>
                  </button>
                  <button class="dj-effect-btn" data-effect="build-up">
                    <span class="effect-icon">⬆️</span>
                    <span class="effect-name">Build Up</span>
                  </button>
                  <button class="dj-effect-btn" data-effect="break-down">
                    <span class="effect-icon">⬇️</span>
                    <span class="effect-name">Break Down</span>
                  </button>
                  <button class="dj-effect-btn" data-effect="strobe-burst">
                    <span class="effect-icon">⚡</span>
                    <span class="effect-name">Strobe Burst</span>
                  </button>
                  <button class="dj-effect-btn" data-effect="rainbow-wave">
                    <span class="effect-icon">🌈</span>
                    <span class="effect-name">Rainbow Wave</span>
                  </button>
                </div>
              </div>
              <div class="dj-timing">
                <h4>Timing Controls</h4>
                <div class="timing-controls">
                  <label>Auto BPM:</label>
                  <input type="checkbox" id="auto-bpm" checked>
                  <label>Beat Quantize:</label>
                  <select id="beat-quantize">
                    <option value="1">1/1</option>
                    <option value="2" selected>1/2</option>
                    <option value="4">1/4</option>
                    <option value="8">1/8</option>
                    <option value="16">1/16</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="control-section">
            <h3>Audio Visualization</h3>
            <div class="visualization-container">
              <canvas id="live-audio-canvas" width="800" height="200"></canvas>
              <div class="visualization-controls">
                <label>
                  <input type="radio" name="viz-mode" value="waveform" checked>
                  Waveform
                </label>
                <label>
                  <input type="radio" name="viz-mode" value="spectrum">
                  Spectrum
                </label>
                <label>
                  <input type="radio" name="viz-mode" value="circular">
                  Circular
                </label>
                <label>
                  <input type="radio" name="viz-mode" value="dj-mode">
                  DJ Mode
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      this.core.showSuccess('Audio context initialized');
    } catch (error) {
      this.core.showError('Failed to initialize audio context: ' + error.message);
    }
  }

  async startLiveAudio() {
    try {
      if (!this.audioContext) {
        await this.initializeAudioContext();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });

      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      this.isRecording = true;
      this.isAnalyzing = true;
      
      document.getElementById('live-audio-start').disabled = true;
      document.getElementById('live-audio-stop').disabled = false;
      document.getElementById('live-audio-status').textContent = 'Recording';
      document.getElementById('live-audio-status').className = 'status recording';

      this.startAnalysis();
      this.core.showSuccess('Live audio started');
    } catch (error) {
      this.core.showError('Failed to start live audio: ' + error.message);
    }
  }

  stopLiveAudio() {
    this.isRecording = false;
    this.isAnalyzing = false;
    
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    document.getElementById('live-audio-start').disabled = false;
    document.getElementById('live-audio-stop').disabled = true;
    document.getElementById('live-audio-status').textContent = 'Stopped';
    document.getElementById('live-audio-status').className = 'status stopped';

    this.core.showSuccess('Live audio stopped');
  }

  startAnalysis() {
    if (!this.isAnalyzing) return;

    this.analyser.getByteFrequencyData(this.dataArray);
    this.analyser.getByteTimeDomainData(this.dataArray);

    // Calculate audio level
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    this.audioLevel = (sum / this.dataArray.length) / 255;

    // Update UI
    this.updateAudioLevel();
    this.updateFrequencyBands();
    this.updateBPM();
    this.updateVisualization();

    // Continue analysis
    this.animationId = requestAnimationFrame(() => this.startAnalysis());
  }

  updateAudioLevel() {
    const levelElement = document.getElementById('live-audio-level');
    const levelValue = document.getElementById('live-audio-level-value');
    
    if (levelElement && levelValue) {
      const percentage = Math.round(this.audioLevel * 100);
      levelElement.style.width = percentage + '%';
      levelValue.textContent = percentage + '%';
    }
  }

  updateFrequencyBands() {
    const bassRange = this.getFrequencyRange(20, 250);
    const midRange = this.getFrequencyRange(250, 4000);
    const trebleRange = this.getFrequencyRange(4000, 20000);

    this.updateBandDisplay('bass', bassRange);
    this.updateBandDisplay('mid', midRange);
    this.updateBandDisplay('treble', trebleRange);

    // Trigger lighting sync if enabled
    if (this.lightingSync.enabled) {
      this.triggerLightingSync(bassRange, midRange, trebleRange);
    }
  }

  getFrequencyRange(minFreq, maxFreq) {
    const nyquist = this.audioContext.sampleRate / 2;
    const binSize = nyquist / this.dataArray.length;
    
    const startBin = Math.floor(minFreq / binSize);
    const endBin = Math.floor(maxFreq / binSize);
    
    let sum = 0;
    let count = 0;
    
    for (let i = startBin; i <= endBin && i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
      count++;
    }
    
    return count > 0 ? sum / count / 255 : 0;
  }

  updateBandDisplay(band, value) {
    const bandElement = document.getElementById(`${band}-level`);
    if (bandElement) {
      const sensitivity = this.lightingSync.frequencyBands[band]?.sensitivity || 1.0;
      const adjustedValue = Math.min(value * sensitivity, 1.0);
      bandElement.style.width = (adjustedValue * 100) + '%';
    }
  }

  updateBPM() {
    // Simple beat detection based on bass frequency
    const bassLevel = this.getFrequencyRange(20, 250);
    const threshold = 0.3;
    
    if (bassLevel > threshold) {
      const now = Date.now();
      this.beatHistory.push(now);
      
      // Keep only recent beats (last 10 seconds)
      this.beatHistory = this.beatHistory.filter(time => now - time < 10000);
      
      if (this.beatHistory.length > 1) {
        const intervals = [];
        for (let i = 1; i < this.beatHistory.length; i++) {
          intervals.push(this.beatHistory[i] - this.beatHistory[i-1]);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        this.currentBPM = Math.round(60000 / avgInterval);
      }
    }

    // Update BPM display
    const bpmElement = document.getElementById('live-bpm-large');
    const bpmStatus = document.getElementById('live-audio-bpm');
    
    if (bpmElement) bpmElement.textContent = this.currentBPM;
    if (bpmStatus) bpmStatus.textContent = this.currentBPM + ' BPM';
  }

  updateVisualization() {
    const canvas = document.getElementById('live-audio-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    const selectedMode = document.querySelector('input[name="viz-mode"]:checked')?.value || 'waveform';
    
    switch (selectedMode) {
      case 'waveform':
        this.drawWaveform(ctx, width, height);
        break;
      case 'spectrum':
        this.drawSpectrum(ctx, width, height);
        break;
      case 'circular':
        this.drawCircular(ctx, width, height);
        break;
    }
  }

  drawWaveform(ctx, width, height) {
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const sliceWidth = width / this.dataArray.length;
    let x = 0;
    
    for (let i = 0; i < this.dataArray.length; i++) {
      const v = this.dataArray[i] / 255.0;
      const y = (v * height) / 2;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.stroke();
  }

  drawSpectrum(ctx, width, height) {
    const barWidth = width / this.dataArray.length;
    
    for (let i = 0; i < this.dataArray.length; i++) {
      const barHeight = (this.dataArray[i] / 255) * height;
      
      // Color based on frequency
      const hue = (i / this.dataArray.length) * 360;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      
      ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
    }
  }

  drawCircular(ctx, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;
    
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < this.dataArray.length; i++) {
      const angle = (i / this.dataArray.length) * Math.PI * 2;
      const value = this.dataArray[i] / 255;
      const r = radius + (value * radius * 0.5);
      
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.closePath();
    ctx.stroke();
  }

  toggleLightingSync(enabled) {
    this.lightingSync.enabled = enabled;
    this.core.showInfo(`Lighting sync ${enabled ? 'enabled' : 'disabled'}`);
  }

  updateSyncSensitivity(value) {
    this.lightingSync.sensitivity = value;
    document.getElementById('sync-sensitivity-value').textContent = Math.round(value * 100) + '%';
  }

  updateFrequencyBand(band, sensitivity) {
    if (this.lightingSync.frequencyBands[band]) {
      this.lightingSync.frequencyBands[band].sensitivity = sensitivity;
    }
  }

  async triggerLightingSync(bassLevel, midLevel, trebleLevel) {
    // Send audio analysis to backend
    try {
      const analysisData = {
        bpm: this.currentBPM,
        bass_level: bassLevel,
        mid_level: midLevel,
        treble_level: trebleLevel,
        overall_level: this.audioLevel,
        beat_detected: this.detectBeat(bassLevel),
        energy: this.calculateEnergy(bassLevel, midLevel, trebleLevel),
        spectral_centroid: this.calculateSpectralCentroid()
      };

      const response = await fetch('http://localhost:8085/api/v1/audio/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisData)
      });

      if (response.ok) {
        const result = await response.json();
        this.updateSyncDisplay(result);
      }
    } catch (error) {
      console.error('Failed to send audio analysis:', error);
    }

    // Emit event for other modules to handle
    const syncData = {
      bpm: this.currentBPM,
      bass: bassLevel,
      mid: midLevel,
      treble: trebleLevel,
      overall: this.audioLevel,
      timestamp: Date.now()
    };
    this.core.emit('liveAudioSync', syncData);
  }

  detectBeat(bassLevel) {
    const threshold = 0.3;
    return bassLevel > threshold;
  }

  calculateEnergy(bass, mid, treble) {
    return (bass + mid + treble) / 3;
  }

  calculateSpectralCentroid() {
    // Simple spectral centroid calculation
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < this.dataArray.length; i++) {
      const magnitude = this.dataArray[i] / 255.0;
      weightedSum += i * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  updateSyncDisplay(analysis) {
    // Update BPM display with backend data
    if (analysis.bpm !== this.currentBPM) {
      this.currentBPM = analysis.bpm;
      const bpmElement = document.getElementById('live-bpm-large');
      const bpmStatus = document.getElementById('live-audio-bpm');
      
      if (bpmElement) bpmElement.textContent = Math.round(this.currentBPM);
      if (bpmStatus) bpmStatus.textContent = Math.round(this.currentBPM) + ' BPM';
    }
  }

  async addSyncPoint() {
    try {
      const response = await fetch('http://localhost:8085/api/v1/sync/points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: `Sync Point ${this.syncPoints.length + 1}`,
          cue_id: null,
          transition_type: 'fade'
        })
      });

      if (response.ok) {
        const syncPoint = await response.json();
        this.syncPoints.push(syncPoint);
        this.updateSyncPointsList();
        this.core.showSuccess('Sync point added');
      } else {
        this.core.showError('Failed to add sync point');
      }
    } catch (error) {
      this.core.showError('Error adding sync point: ' + error.message);
    }
  }

  async clearSyncPoints() {
    try {
      // Remove all sync points one by one
      for (const point of this.syncPoints) {
        await fetch(`http://localhost:8085/api/v1/sync/points/${point.id}`, {
          method: 'DELETE'
        });
      }
      
      this.syncPoints = [];
      this.updateSyncPointsList();
      this.core.showSuccess('Sync points cleared');
    } catch (error) {
      this.core.showError('Error clearing sync points: ' + error.message);
    }
  }

  updateSyncPointsList() {
    const listElement = document.getElementById('sync-points-list');
    if (!listElement) return;

    listElement.innerHTML = this.syncPoints.map(point => `
      <div class="sync-point-item">
        <span class="sync-point-time">${new Date(point.timestamp).toLocaleTimeString()}</span>
        <span class="sync-point-bpm">${point.bpm} BPM</span>
        <span class="sync-point-level">${Math.round(point.audioLevel * 100)}%</span>
        <button class="btn-danger btn-sm" onclick="liveAudio.removeSyncPoint('${point.id}')">Remove</button>
      </div>
    `).join('');
  }

  async removeSyncPoint(id) {
    try {
      const response = await fetch(`http://localhost:8085/api/v1/sync/points/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        this.syncPoints = this.syncPoints.filter(point => point.id !== id);
        this.updateSyncPointsList();
        this.core.showSuccess('Sync point removed');
      } else {
        this.core.showError('Failed to remove sync point');
      }
    } catch (error) {
      this.core.showError('Error removing sync point: ' + error.message);
    }
  }

  calibrateAudio() {
    this.core.showInfo('Audio calibration started...');
    
    // Simple calibration - adjust sensitivity based on current audio level
    const currentLevel = this.audioLevel;
    if (currentLevel > 0) {
      const adjustment = 0.5 / currentLevel;
      this.lightingSync.sensitivity = Math.min(adjustment, 1.0);
      document.getElementById('live-sync-sensitivity').value = this.lightingSync.sensitivity;
      document.getElementById('sync-sensitivity-value').textContent = Math.round(this.lightingSync.sensitivity * 100) + '%';
      this.core.showSuccess('Audio calibrated');
    } else {
      this.core.showError('No audio detected for calibration');
    }
  }

  activateTab() {
    // Update any necessary UI elements when tab is activated
    if (this.isAnalyzing) {
      this.updateVisualization();
    }
  }

  // DJ Mode Functions
  toggleDJMode(enabled) {
    this.djMode.enabled = enabled;
    this.core.showInfo(`DJ Mode ${enabled ? 'enabled' : 'disabled'}`);
    
    if (enabled) {
      this.initializeDJMode();
    } else {
      this.deactivateDJMode();
    }
  }

  initializeDJMode() {
    // Set up DJ mode specific configurations
    this.djMode.beatQuantize = parseInt(document.getElementById('beat-quantize')?.value || '2');
    this.core.showInfo('DJ Mode initialized - Ready for live performance!');
  }

  deactivateDJMode() {
    // Clear all active effects
    this.djMode.activeEffects.clear();
    this.djMode.effectHistory = [];
    
    // Reset all DJ effect buttons
    document.querySelectorAll('.dj-effect-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    this.core.showInfo('DJ Mode deactivated');
  }

  triggerDJEffect(effectType) {
    if (!this.djMode.enabled) {
      this.core.showError('DJ Mode must be enabled to use effects');
      return;
    }

    const effect = {
      type: effectType,
      timestamp: Date.now(),
      bpm: this.currentBPM,
      audioLevel: this.audioLevel
    };

    this.djMode.effectHistory.push(effect);
    
    // Keep only last 50 effects
    if (this.djMode.effectHistory.length > 50) {
      this.djMode.effectHistory.shift();
    }

    switch (effectType) {
      case 'beat-match':
        this.executeBeatMatchEffect();
        break;
      case 'bass-drop':
        this.executeBassDropEffect();
        break;
      case 'build-up':
        this.executeBuildUpEffect();
        break;
      case 'break-down':
        this.executeBreakDownEffect();
        break;
      case 'strobe-burst':
        this.executeStrobeBurstEffect();
        break;
      case 'rainbow-wave':
        this.executeRainbowWaveEffect();
        break;
    }

    this.core.showSuccess(`DJ Effect: ${effectType} triggered`);
  }

  executeBeatMatchEffect() {
    // Flash all channels on beat
    const command = {
      command_type: 'beat_flash',
      channels: Array.from({length: 24}, (_, i) => i + 1),
      values: Array(24).fill(255),
      duration: 100,
      effect_params: {
        bpm: this.currentBPM,
        quantize: this.djMode.beatQuantize
      }
    };
    this.sendLightingCommand(command);
  }

  executeBassDropEffect() {
    // Dramatic bass drop effect
    const command = {
      command_type: 'bass_drop',
      channels: Array.from({length: 8}, (_, i) => i + 1), // Bass channels
      values: Array(8).fill(255),
      duration: 500,
      effect_params: {
        intensity: this.audioLevel,
        fade_out: 2000
      }
    };
    this.sendLightingCommand(command);
  }

  executeBuildUpEffect() {
    // Gradual intensity build-up
    const command = {
      command_type: 'build_up',
      channels: Array.from({length: 24}, (_, i) => i + 1),
      values: Array(24).fill(128),
      duration: 2000,
      effect_params: {
        start_intensity: 0,
        end_intensity: 255,
        steps: 20
      }
    };
    this.sendLightingCommand(command);
  }

  executeBreakDownEffect() {
    // Quick intensity break-down
    const command = {
      command_type: 'break_down',
      channels: Array.from({length: 24}, (_, i) => i + 1),
      values: Array(24).fill(0),
      duration: 500,
      effect_params: {
        start_intensity: 255,
        end_intensity: 0,
        steps: 10
      }
    };
    this.sendLightingCommand(command);
  }

  executeStrobeBurstEffect() {
    // High-speed strobe effect
    const command = {
      command_type: 'strobe_burst',
      channels: Array.from({length: 24}, (_, i) => i + 1),
      values: Array(24).fill(255),
      duration: 1000,
      effect_params: {
        strobe_rate: 20, // 20Hz
        intensity: this.audioLevel
      }
    };
    this.sendLightingCommand(command);
  }

  executeRainbowWaveEffect() {
    // Rainbow wave across all channels
    const command = {
      command_type: 'rainbow_wave',
      channels: Array.from({length: 24}, (_, i) => i + 1),
      values: Array(24).fill(255),
      duration: 3000,
      effect_params: {
        wave_speed: this.currentBPM / 60,
        hue_offset: 0,
        saturation: 1.0
      }
    };
    this.sendLightingCommand(command);
  }

  async sendLightingCommand(command) {
    try {
      const response = await fetch('http://localhost:8085/api/v1/lighting/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command)
      });

      if (!response.ok) {
        console.error('Failed to send lighting command:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending lighting command:', error);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.IonXeCore) {
    window.liveAudio = new IonXeLiveAudio(window.IonXeCore);
  }
});

window.IonXeLiveAudio = IonXeLiveAudio;
