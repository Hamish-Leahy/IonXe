// Advanced Timing Engine
// Sophisticated timing system with precision control

class AdvancedTimingEngine {
  constructor(qListManager, effectsEngine) {
    this.qListManager = qListManager;
    this.effectsEngine = effectsEngine;
    this.timingPresets = new Map();
    this.activeTimings = new Map();
    this.timingQueue = [];
    this.isProcessing = false;
    this.frameRate = 120; // High precision timing
    this.lastFrameTime = 0;
    this.timingOffset = 0;
    this.syncSource = null;
    this.beatDetector = null;
    this.tempoTracker = null;
    
    this.initializeTimingEngine();
  }

  // Engine Initialization
  initializeTimingEngine() {
    this.setupTimingPresets();
    this.setupBeatDetection();
    this.setupTempoTracking();
    this.startTimingProcessor();
    this.setupSyncSources();
  }

  setupTimingPresets() {
    // Basic timing presets
    this.createTimingPreset('instant', {
      name: 'Instant',
      fadeIn: 0,
      fadeOut: 0,
      delay: 0,
      follow: 0,
      curve: 'linear',
      easing: 'none',
      description: 'No timing, immediate execution'
    });

    this.createTimingPreset('quick', {
      name: 'Quick',
      fadeIn: 500,
      fadeOut: 500,
      delay: 0,
      follow: 0,
      curve: 'ease-out',
      easing: 'quadratic',
      description: 'Quick 0.5s fade'
    });

    this.createTimingPreset('normal', {
      name: 'Normal',
      fadeIn: 2000,
      fadeOut: 2000,
      delay: 0,
      follow: 0,
      curve: 'ease-in-out',
      easing: 'cubic',
      description: 'Standard 2s fade'
    });

    this.createTimingPreset('slow', {
      name: 'Slow',
      fadeIn: 5000,
      fadeOut: 5000,
      delay: 0,
      follow: 0,
      curve: 'ease-in-out',
      easing: 'quartic',
      description: 'Slow 5s fade'
    });

    // Advanced timing presets
    this.createTimingPreset('theatrical', {
      name: 'Theatrical',
      fadeIn: 3000,
      fadeOut: 2000,
      delay: 500,
      follow: 1000,
      curve: 'ease-in-out',
      easing: 'cubic',
      description: 'Theatrical timing with delay and follow'
    });

    this.createTimingPreset('concert', {
      name: 'Concert',
      fadeIn: 1000,
      fadeOut: 1500,
      delay: 0,
      follow: 0,
      curve: 'ease-out',
      easing: 'quadratic',
      description: 'Concert-style timing'
    });

    this.createTimingPreset('dramatic', {
      name: 'Dramatic',
      fadeIn: 8000,
      fadeOut: 3000,
      delay: 2000,
      follow: 500,
      curve: 'ease-in',
      easing: 'quintic',
      description: 'Dramatic slow build'
    });
  }

  setupBeatDetection() {
    this.beatDetector = {
      isActive: false,
      tempo: 120,
      beatCount: 0,
      lastBeat: 0,
      beatInterval: 0,
      threshold: 0.3,
      history: [],
      onBeat: null
    };
  }

  setupTempoTracking() {
    this.tempoTracker = {
      isActive: false,
      currentTempo: 120,
      tempoHistory: [],
      tempoChanges: [],
      averageTempo: 120,
      tempoVariance: 0,
      onTempoChange: null
    };
  }

  setupSyncSources() {
    this.syncSources = new Map();
    
    // MIDI Clock sync
    this.syncSources.set('midi_clock', {
      name: 'MIDI Clock',
      isActive: false,
      tempo: 120,
      beatCount: 0,
      lastBeat: 0,
      onBeat: (beat) => this.handleSyncBeat('midi_clock', beat)
    });

    // Audio sync
    this.syncSources.set('audio', {
      name: 'Audio Sync',
      isActive: false,
      tempo: 120,
      beatCount: 0,
      lastBeat: 0,
      onBeat: (beat) => this.handleSyncBeat('audio', beat)
    });

    // Network sync
    this.syncSources.set('network', {
      name: 'Network Sync',
      isActive: false,
      tempo: 120,
      beatCount: 0,
      lastBeat: 0,
      onBeat: (beat) => this.handleSyncBeat('network', beat)
    });
  }

  // Timing Preset Management
  createTimingPreset(id, config) {
    const preset = {
      id,
      name: config.name,
      fadeIn: config.fadeIn || 0,
      fadeOut: config.fadeOut || 0,
      delay: config.delay || 0,
      follow: config.follow || 0,
      curve: config.curve || 'linear',
      easing: config.easing || 'none',
      description: config.description || '',
      parameters: config.parameters || {},
      createdAt: new Date().toISOString()
    };

    this.timingPresets.set(id, preset);
    return preset;
  }

  applyTimingPreset(cueId, presetId, parameters = {}) {
    const preset = this.timingPresets.get(presetId);
    if (!preset) return false;

    const cue = this.qListManager.cues.find(c => c.id === cueId);
    if (!cue) return false;

    cue.timing = {
      fadeIn: preset.fadeIn,
      fadeOut: preset.fadeOut,
      delay: preset.delay,
      follow: preset.follow,
      curve: preset.curve,
      easing: preset.easing,
      ...parameters
    };

    cue.updatedAt = new Date().toISOString();
    this.qListManager.notifyCueListUpdated();
    return true;
  }

  // Advanced Timing Calculations
  calculateEasingProgress(progress, easingType) {
    switch (easingType) {
      case 'linear':
        return progress;
      case 'ease-in':
        return progress * progress;
      case 'ease-out':
        return 1 - Math.pow(1 - progress, 2);
      case 'ease-in-out':
        return progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      case 'quadratic':
        return progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      case 'cubic':
        return progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      case 'quartic':
        return progress < 0.5 
          ? 8 * progress * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 4) / 2;
      case 'quintic':
        return progress < 0.5 
          ? 16 * progress * progress * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 5) / 2;
      case 'sine':
        return -(Math.cos(Math.PI * progress) - 1) / 2;
      case 'exponential':
        return progress === 0 ? 0 : Math.pow(2, 10 * progress - 10);
      case 'circular':
        return 1 - Math.sqrt(1 - Math.pow(progress, 2));
      case 'back':
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return c3 * progress * progress * progress - c1 * progress * progress;
      case 'elastic':
        const c4 = (2 * Math.PI) / 3;
        return progress === 0 ? 0 
          : progress === 1 ? 1 
          : Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * c4) + 1;
      case 'bounce':
        const n1 = 7.5625;
        const d1 = 2.75;
        if (progress < 1 / d1) {
          return n1 * progress * progress;
        } else if (progress < 2 / d1) {
          return n1 * (progress -= 1.5 / d1) * progress + 0.75;
        } else if (progress < 2.5 / d1) {
          return n1 * (progress -= 2.25 / d1) * progress + 0.9375;
        } else {
          return n1 * (progress -= 2.625 / d1) * progress + 0.984375;
        }
      default:
        return progress;
    }
  }

  calculateCurveProgress(progress, curveType) {
    switch (curveType) {
      case 'linear':
        return progress;
      case 'ease-in':
        return progress * progress;
      case 'ease-out':
        return 1 - Math.pow(1 - progress, 2);
      case 'ease-in-out':
        return progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      case 'smooth':
        return progress * progress * (3 - 2 * progress);
      case 'sharp':
        return progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      case 'bounce':
        return this.calculateEasingProgress(progress, 'bounce');
      case 'elastic':
        return this.calculateEasingProgress(progress, 'elastic');
      default:
        return progress;
    }
  }

  // Beat Detection
  enableBeatDetection(source = 'audio') {
    this.beatDetector.isActive = true;
    this.beatDetector.source = source;
    
    if (source === 'audio') {
      this.setupAudioBeatDetection();
    } else if (source === 'midi') {
      this.setupMIDIBeatDetection();
    }
  }

  disableBeatDetection() {
    this.beatDetector.isActive = false;
    this.beatDetector.source = null;
  }

  setupAudioBeatDetection() {
    // This would integrate with Web Audio API for real-time beat detection
    console.log('Audio beat detection setup');
  }

  setupMIDIBeatDetection() {
    // This would integrate with MIDI clock for beat detection
    console.log('MIDI beat detection setup');
  }

  detectBeat(audioData) {
    if (!this.beatDetector.isActive) return false;

    // Simple beat detection algorithm
    const energy = this.calculateEnergy(audioData);
    this.beatDetector.history.push(energy);
    
    if (this.beatDetector.history.length > 43) {
      this.beatDetector.history.shift();
    }

    if (this.beatDetector.history.length < 43) return false;

    const average = this.beatDetector.history.reduce((sum, val) => sum + val, 0) / this.beatDetector.history.length;
    const variance = this.calculateVariance(this.beatDetector.history, average);
    const threshold = average + variance * this.beatDetector.threshold;

    if (energy > threshold && Date.now() - this.beatDetector.lastBeat > 200) {
      this.beatDetector.beatCount++;
      this.beatDetector.lastBeat = Date.now();
      this.beatDetector.beatInterval = this.beatDetector.lastBeat - this.beatDetector.previousBeat;
      this.beatDetector.previousBeat = this.beatDetector.lastBeat;
      
      this.updateTempo();
      
      if (this.beatDetector.onBeat) {
        this.beatDetector.onBeat(this.beatDetector.beatCount);
      }
      
      return true;
    }

    return false;
  }

  calculateEnergy(audioData) {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return sum / audioData.length;
  }

  calculateVariance(data, mean) {
    const squaredDiffs = data.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / data.length;
  }

  updateTempo() {
    if (this.beatDetector.beatInterval > 0) {
      const tempo = 60000 / this.beatDetector.beatInterval;
      this.beatDetector.tempo = tempo;
      
      this.tempoTracker.tempoHistory.push(tempo);
      if (this.tempoTracker.tempoHistory.length > 10) {
        this.tempoTracker.tempoHistory.shift();
      }
      
      this.tempoTracker.averageTempo = this.tempoTracker.tempoHistory.reduce((sum, t) => sum + t, 0) / this.tempoTracker.tempoHistory.length;
      
      if (Math.abs(tempo - this.tempoTracker.currentTempo) > 5) {
        this.tempoTracker.currentTempo = tempo;
        this.tempoTracker.tempoChanges.push({
          tempo,
          timestamp: Date.now()
        });
        
        if (this.tempoTracker.onTempoChange) {
          this.tempoTracker.onTempoChange(tempo);
        }
      }
    }
  }

  // Sync Management
  enableSync(sourceId) {
    const syncSource = this.syncSources.get(sourceId);
    if (syncSource) {
      syncSource.isActive = true;
      this.syncSource = syncSource;
    }
  }

  disableSync() {
    if (this.syncSource) {
      this.syncSource.isActive = false;
      this.syncSource = null;
    }
  }

  handleSyncBeat(sourceId, beat) {
    const syncSource = this.syncSources.get(sourceId);
    if (!syncSource || !syncSource.isActive) return;

    syncSource.beatCount = beat;
    syncSource.lastBeat = Date.now();
    
    // Adjust timing offset based on sync
    this.adjustTimingOffset(syncSource);
  }

  adjustTimingOffset(syncSource) {
    const expectedBeatTime = syncSource.beatCount * (60000 / syncSource.tempo);
    const actualBeatTime = syncSource.lastBeat;
    const offset = actualBeatTime - expectedBeatTime;
    
    this.timingOffset = offset;
  }

  // Timing Processing
  startTimingProcessor() {
    const processTiming = (currentTime) => {
      if (!this.isProcessing) {
        this.isProcessing = true;
        this.processActiveTimings(currentTime);
        this.isProcessing = false;
      }
      
      this.lastFrameTime = currentTime;
      requestAnimationFrame(processTiming);
    };
    
    requestAnimationFrame(processTiming);
  }

  processActiveTimings(currentTime) {
    const deltaTime = currentTime - this.lastFrameTime;
    
    for (const [timingId, timing] of this.activeTimings) {
      if (!timing.isActive) continue;

      timing.currentTime = currentTime - timing.startTime;
      timing.progress = timing.duration > 0 ? (timing.currentTime / timing.duration) : 0;

      // Apply easing
      const easedProgress = this.calculateEasingProgress(timing.progress, timing.easing);
      
      // Apply curve
      const curvedProgress = this.calculateCurveProgress(easedProgress, timing.curve);
      
      // Update timing
      this.updateTimingProgress(timing, curvedProgress);

      // Check for completion
      if (timing.progress >= 1) {
        this.completeTiming(timingId);
      }
    }
  }

  updateTimingProgress(timing, progress) {
    // Update timing based on type
    switch (timing.type) {
      case 'fade_in':
        this.updateFadeInProgress(timing, progress);
        break;
      case 'fade_out':
        this.updateFadeOutProgress(timing, progress);
        break;
      case 'delay':
        this.updateDelayProgress(timing, progress);
        break;
      case 'follow':
        this.updateFollowProgress(timing, progress);
        break;
    }
  }

  updateFadeInProgress(timing, progress) {
    const levels = new Uint8Array(512);
    const intensity = Math.round(timing.targetIntensity * progress);
    
    for (const channel of timing.channels) {
      levels[channel - 1] = intensity;
    }
    
    this.qListManager.setLevels(levels);
  }

  updateFadeOutProgress(timing, progress) {
    const levels = new Uint8Array(512);
    const intensity = Math.round(timing.startIntensity * (1 - progress));
    
    for (const channel of timing.channels) {
      levels[channel - 1] = intensity;
    }
    
    this.qListManager.setLevels(levels);
  }

  updateDelayProgress(timing, progress) {
    // Delay is handled by scheduling
  }

  updateFollowProgress(timing, progress) {
    // Follow is handled by scheduling
  }

  completeTiming(timingId) {
    const timing = this.activeTimings.get(timingId);
    if (!timing) return;

    timing.isActive = false;
    timing.isComplete = true;
    
    // Execute completion callback
    if (timing.onComplete) {
      timing.onComplete(timing);
    }
    
    this.activeTimings.delete(timingId);
  }

  // Utility Functions
  getAllTimingPresets() {
    return Array.from(this.timingPresets.values());
  }

  getTimingPreset(id) {
    return this.timingPresets.get(id);
  }

  getCurrentTempo() {
    return this.beatDetector.tempo;
  }

  getAverageTempo() {
    return this.tempoTracker.averageTempo;
  }

  getTimingOffset() {
    return this.timingOffset;
  }

  // Event Notifications
  notifyTimingEvent(eventType, data) {
    const event = new CustomEvent('timing-event', {
      detail: { eventType, data }
    });
    document.dispatchEvent(event);
  }

  // Cleanup
  destroy() {
    this.activeTimings.clear();
    this.timingQueue = [];
    this.timingPresets.clear();
    this.syncSources.clear();
    this.isProcessing = false;
  }
}

// Global Advanced Timing Engine Instance
const advancedTimingEngine = new AdvancedTimingEngine(qListManager, effectsEngine);
