// Audio Core - Audio-reactive lighting system
// Real-time audio analysis and beat detection for lighting control

class AudioCore {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.isListening = false;
    this.audioLevel = 0;
    this.beatThreshold = 0.3;
    this.lastBeat = 0;
    this.beatHistory = [];
    this.bpm = 120;
    this.spectrum = [];
    this.frequencyBands = [];
    
    this.initializeAudioSystem();
  }

  async initializeAudioSystem() {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      
      // Configure analyser
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      
      // Connect audio source to analyser
      this.microphone.connect(this.analyser);
      
      // Create data array for frequency data
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      // Initialize frequency bands
      this.initializeFrequencyBands();
      
      console.log('Audio system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio system:', error);
    }
  }

  initializeFrequencyBands() {
    // Divide frequency spectrum into bands for different lighting effects
    const sampleRate = this.audioContext ? this.audioContext.sampleRate : 44100;
    const nyquist = sampleRate / 2;
    const binSize = nyquist / this.analyser.frequencyBinCount;
    
    this.frequencyBands = [
      { name: 'sub', min: 20, max: 60, startBin: Math.floor(20 / binSize), endBin: Math.floor(60 / binSize) },
      { name: 'bass', min: 60, max: 250, startBin: Math.floor(60 / binSize), endBin: Math.floor(250 / binSize) },
      { name: 'low-mid', min: 250, max: 500, startBin: Math.floor(250 / binSize), endBin: Math.floor(500 / binSize) },
      { name: 'mid', min: 500, max: 2000, startBin: Math.floor(500 / binSize), endBin: Math.floor(2000 / binSize) },
      { name: 'high-mid', min: 2000, max: 4000, startBin: Math.floor(2000 / binSize), endBin: Math.floor(4000 / binSize) },
      { name: 'high', min: 4000, max: 8000, startBin: Math.floor(4000 / binSize), endBin: Math.floor(8000 / binSize) },
      { name: 'presence', min: 8000, max: 16000, startBin: Math.floor(8000 / binSize), endBin: Math.floor(16000 / binSize) }
    ];
  }

  startListening() {
    if (!this.audioContext || !this.analyser) {
      console.error('Audio system not initialized');
      return false;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.isListening = true;
    this.analyzeAudio();
    return true;
  }

  stopListening() {
    this.isListening = false;
  }

  analyzeAudio() {
    if (!this.isListening || !this.analyser) return;

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate overall audio level
    this.audioLevel = this.calculateAudioLevel();
    
    // Detect beat
    const beatDetected = this.detectBeat();
    
    // Analyze frequency bands
    this.analyzeFrequencyBands();
    
    // Calculate BPM
    this.calculateBPM();
    
    // Notify listeners
    this.notifyAudioUpdate();
    
    // Continue analysis
    requestAnimationFrame(() => this.analyzeAudio());
  }

  calculateAudioLevel() {
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    return sum / this.dataArray.length / 255; // Normalize to 0-1
  }

  detectBeat() {
    const now = Date.now();
    const currentLevel = this.audioLevel;
    
    // Simple beat detection based on audio level threshold
    if (currentLevel > this.beatThreshold && now - this.lastBeat > 200) {
      this.lastBeat = now;
      this.beatHistory.push(now);
      
      // Keep only recent beats (last 10 seconds)
      this.beatHistory = this.beatHistory.filter(time => now - time < 10000);
      
      this.notifyBeatDetected();
      return true;
    }
    
    return false;
  }

  analyzeFrequencyBands() {
    this.frequencyBands.forEach(band => {
      let sum = 0;
      let count = 0;
      
      for (let i = band.startBin; i <= band.endBin && i < this.dataArray.length; i++) {
        sum += this.dataArray[i];
        count++;
      }
      
      band.level = count > 0 ? sum / count / 255 : 0;
    });
  }

  calculateBPM() {
    if (this.beatHistory.length < 4) return;
    
    // Calculate intervals between beats
    const intervals = [];
    for (let i = 1; i < this.beatHistory.length; i++) {
      intervals.push(this.beatHistory[i] - this.beatHistory[i - 1]);
    }
    
    // Calculate average interval
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    
    // Convert to BPM
    this.bpm = Math.round(60000 / avgInterval);
    
    // Clamp to reasonable range
    this.bpm = Math.max(60, Math.min(200, this.bpm));
  }

  getFrequencyBandLevel(bandName) {
    const band = this.frequencyBands.find(b => b.name === bandName);
    return band ? band.level : 0;
  }

  getAllFrequencyBands() {
    return this.frequencyBands.map(band => ({
      name: band.name,
      level: band.level,
      min: band.min,
      max: band.max
    }));
  }

  getAudioLevel() {
    return this.audioLevel;
  }

  getBPM() {
    return this.bpm;
  }

  setBeatThreshold(threshold) {
    this.beatThreshold = Math.max(0, Math.min(1, threshold));
  }

  getBeatThreshold() {
    return this.beatThreshold;
  }

  // Audio-reactive effects
  createAudioReactiveEffect(fixtures, effectType, parameters = {}) {
    switch (effectType) {
      case 'level-intensity':
        return this.createLevelIntensityEffect(fixtures, parameters);
      case 'beat-strobe':
        return this.createBeatStrobeEffect(fixtures, parameters);
      case 'frequency-color':
        return this.createFrequencyColorEffect(fixtures, parameters);
      case 'bass-intensity':
        return this.createBassIntensityEffect(fixtures, parameters);
      case 'spectrum-rainbow':
        return this.createSpectrumRainbowEffect(fixtures, parameters);
      default:
        return null;
    }
  }

  createLevelIntensityEffect(fixtures, parameters) {
    const { minIntensity = 0, maxIntensity = 255, sensitivity = 1 } = parameters;
    
    return () => {
      const level = this.getAudioLevel() * sensitivity;
      const intensity = Math.round(minIntensity + (maxIntensity - minIntensity) * level);
      
      fixtures.forEach(fixtureId => {
        if (typeof fixtureCore !== 'undefined') {
          fixtureCore.setFixtureValue(fixtureId, 'intensity', intensity);
        }
      });
    };
  }

  createBeatStrobeEffect(fixtures, parameters) {
    const { intensity = 255, duration = 100 } = parameters;
    let strobeActive = false;
    
    return () => {
      if (this.detectBeat() && !strobeActive) {
        strobeActive = true;
        
        fixtures.forEach(fixtureId => {
          if (typeof fixtureCore !== 'undefined') {
            fixtureCore.setFixtureValue(fixtureId, 'intensity', intensity);
          }
        });
        
        setTimeout(() => {
          fixtures.forEach(fixtureId => {
            if (typeof fixtureCore !== 'undefined') {
              fixtureCore.setFixtureValue(fixtureId, 'intensity', 0);
            }
          });
          strobeActive = false;
        }, duration);
      }
    };
  }

  createFrequencyColorEffect(fixtures, parameters) {
    const { 
      bassColor = { r: 255, g: 0, b: 0 },
      midColor = { r: 0, g: 255, b: 0 },
      highColor = { r: 0, g: 0, b: 255 },
      sensitivity = 1 
    } = parameters;
    
    return () => {
      const bassLevel = this.getFrequencyBandLevel('bass') * sensitivity;
      const midLevel = this.getFrequencyBandLevel('mid') * sensitivity;
      const highLevel = this.getFrequencyBandLevel('high') * sensitivity;
      
      // Mix colors based on frequency levels
      const color = {
        r: Math.round(bassLevel * bassColor.r + midLevel * midColor.r + highLevel * highColor.r),
        g: Math.round(bassLevel * bassColor.g + midLevel * midColor.g + highLevel * highColor.g),
        b: Math.round(bassLevel * bassColor.b + midLevel * midColor.b + highLevel * highColor.b)
      };
      
      fixtures.forEach(fixtureId => {
        if (typeof fixtureCore !== 'undefined') {
          fixtureCore.setFixtureColor(fixtureId, color);
        }
      });
    };
  }

  createBassIntensityEffect(fixtures, parameters) {
    const { minIntensity = 0, maxIntensity = 255, sensitivity = 1 } = parameters;
    
    return () => {
      const bassLevel = this.getFrequencyBandLevel('bass') * sensitivity;
      const intensity = Math.round(minIntensity + (maxIntensity - minIntensity) * bassLevel);
      
      fixtures.forEach(fixtureId => {
        if (typeof fixtureCore !== 'undefined') {
          fixtureCore.setFixtureValue(fixtureId, 'intensity', intensity);
        }
      });
    };
  }

  createSpectrumRainbowEffect(fixtures, parameters) {
    const { speed = 1, sensitivity = 1 } = parameters;
    let hue = 0;
    
    return () => {
      const audioLevel = this.getAudioLevel() * sensitivity;
      const hueStep = speed * (0.5 + audioLevel);
      
      hue = (hue + hueStep) % 360;
      const color = this.hslToRgb(hue, 100, 50);
      
      fixtures.forEach(fixtureId => {
        if (typeof fixtureCore !== 'undefined') {
          fixtureCore.setFixtureColor(fixtureId, color);
        }
      });
    };
  }

  // Utility functions
  hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  // Event notifications
  notifyAudioUpdate() {
    if (this.onAudioUpdate) {
      this.onAudioUpdate({
        level: this.audioLevel,
        bpm: this.bpm,
        frequencyBands: this.getAllFrequencyBands()
      });
    }
  }

  notifyBeatDetected() {
    if (this.onBeatDetected) {
      this.onBeatDetected({
        level: this.audioLevel,
        bpm: this.bpm,
        timestamp: Date.now()
      });
    }
  }

  // Cleanup
  cleanup() {
    this.stopListening();
    
    if (this.microphone) {
      this.microphone.disconnect();
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// Initialize audio core
const audioCore = new AudioCore();
