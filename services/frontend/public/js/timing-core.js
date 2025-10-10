// Timing Core - Advanced timing and synchronization system
// Professional timing engine for lighting control

class TimingCore {
  constructor() {
    this.timers = new Map();
    this.sequences = new Map();
    this.syncSources = new Map();
    this.timingPresets = new Map();
    this.isMasterClock = false;
    this.masterBPM = 120;
    this.masterTime = 0;
    this.lastUpdate = 0;
    
    this.initializeTimingSystem();
    this.startTimingEngine();
  }

  initializeTimingSystem() {
    // Initialize default timing presets
    this.addTimingPreset('quarter-note', {
      name: 'Quarter Note',
      duration: 60000 / this.masterBPM, // ms
      subdivisions: 1,
      type: 'musical'
    });

    this.addTimingPreset('half-note', {
      name: 'Half Note',
      duration: 120000 / this.masterBPM, // ms
      subdivisions: 1,
      type: 'musical'
    });

    this.addTimingPreset('whole-note', {
      name: 'Whole Note',
      duration: 240000 / this.masterBPM, // ms
      subdivisions: 1,
      type: 'musical'
    });

    this.addTimingPreset('eighth-note', {
      name: 'Eighth Note',
      duration: 30000 / this.masterBPM, // ms
      subdivisions: 1,
      type: 'musical'
    });

    this.addTimingPreset('sixteenth-note', {
      name: 'Sixteenth Note',
      duration: 15000 / this.masterBPM, // ms
      subdivisions: 1,
      type: 'musical'
    });

    this.addTimingPreset('1-second', {
      name: '1 Second',
      duration: 1000,
      subdivisions: 1,
      type: 'absolute'
    });

    this.addTimingPreset('2-second', {
      name: '2 Seconds',
      duration: 2000,
      subdivisions: 1,
      type: 'absolute'
    });

    this.addTimingPreset('5-second', {
      name: '5 Seconds',
      duration: 5000,
      subdivisions: 1,
      type: 'absolute'
    });

    this.addTimingPreset('10-second', {
      name: '10 Seconds',
      duration: 10000,
      subdivisions: 1,
      type: 'absolute'
    });

    // Load timing presets from storage
    this.loadTimingPresets();
  }

  addTimingPreset(id, preset) {
    this.timingPresets.set(id, {
      ...preset,
      id,
      created: new Date().toISOString()
    });
  }

  getTimingPreset(id) {
    return this.timingPresets.get(id);
  }

  getAllTimingPresets() {
    return Array.from(this.timingPresets.values());
  }

  // Master clock control
  setMasterBPM(bpm) {
    this.masterBPM = Math.max(30, Math.min(300, bpm));
    this.updateMusicalTimings();
    this.notifyBPMChanged();
  }

  getMasterBPM() {
    return this.masterBPM;
  }

  setMasterClock(enabled) {
    this.isMasterClock = enabled;
    if (enabled) {
      this.masterTime = 0;
      this.lastUpdate = Date.now();
    }
    this.notifyMasterClockChanged();
  }

  isMasterClockActive() {
    return this.isMasterClock;
  }

  getMasterTime() {
    if (this.isMasterClock) {
      const now = Date.now();
      this.masterTime += now - this.lastUpdate;
      this.lastUpdate = now;
    }
    return this.masterTime;
  }

  // Timer management
  createTimer(id, duration, callback, options = {}) {
    const timer = {
      id,
      duration,
      callback,
      startTime: Date.now(),
      elapsed: 0,
      paused: false,
      loop: options.loop || false,
      delay: options.delay || 0,
      easing: options.easing || 'linear',
      onComplete: options.onComplete || null,
      onUpdate: options.onUpdate || null
    };

    this.timers.set(id, timer);
    return timer;
  }

  startTimer(id) {
    const timer = this.timers.get(id);
    if (timer) {
      timer.paused = false;
      timer.startTime = Date.now() - timer.elapsed;
      return true;
    }
    return false;
  }

  pauseTimer(id) {
    const timer = this.timers.get(id);
    if (timer) {
      timer.paused = true;
      timer.elapsed = Date.now() - timer.startTime;
      return true;
    }
    return false;
  }

  stopTimer(id) {
    const timer = this.timers.get(id);
    if (timer) {
      this.timers.delete(id);
      return true;
    }
    return false;
  }

  resetTimer(id) {
    const timer = this.timers.get(id);
    if (timer) {
      timer.elapsed = 0;
      timer.startTime = Date.now();
      return true;
    }
    return false;
  }

  getTimerProgress(id) {
    const timer = this.timers.get(id);
    if (timer) {
      const elapsed = timer.paused ? timer.elapsed : Date.now() - timer.startTime;
      return Math.min(elapsed / timer.duration, 1);
    }
    return 0;
  }

  // Sequence management
  createSequence(id, steps, options = {}) {
    const sequence = {
      id,
      steps,
      currentStep: 0,
      startTime: 0,
      paused: false,
      loop: options.loop || false,
      autoAdvance: options.autoAdvance !== false,
      onStepChange: options.onStepChange || null,
      onComplete: options.onComplete || null,
      onUpdate: options.onUpdate || null
    };

    this.sequences.set(id, sequence);
    return sequence;
  }

  startSequence(id) {
    const sequence = this.sequences.get(id);
    if (sequence) {
      sequence.startTime = Date.now();
      sequence.paused = false;
      sequence.currentStep = 0;
      this.executeSequenceStep(sequence);
      return true;
    }
    return false;
  }

  pauseSequence(id) {
    const sequence = this.sequences.get(id);
    if (sequence) {
      sequence.paused = true;
      return true;
    }
    return false;
  }

  stopSequence(id) {
    const sequence = this.sequences.get(id);
    if (sequence) {
      this.sequences.delete(id);
      return true;
    }
    return false;
  }

  nextSequenceStep(id) {
    const sequence = this.sequences.get(id);
    if (sequence) {
      sequence.currentStep = (sequence.currentStep + 1) % sequence.steps.length;
      this.executeSequenceStep(sequence);
      return true;
    }
    return false;
  }

  previousSequenceStep(id) {
    const sequence = this.sequences.get(id);
    if (sequence) {
      sequence.currentStep = (sequence.currentStep - 1 + sequence.steps.length) % sequence.steps.length;
      this.executeSequenceStep(sequence);
      return true;
    }
    return false;
  }

  executeSequenceStep(sequence) {
    if (sequence.currentStep < sequence.steps.length) {
      const step = sequence.steps[sequence.currentStep];
      
      // Execute step action
      if (step.action && typeof step.action === 'function') {
        step.action();
      }
      
      // Notify step change
      if (sequence.onStepChange) {
        sequence.onStepChange(sequence.currentStep, step);
      }
      
      // Auto advance to next step
      if (sequence.autoAdvance && step.duration) {
        setTimeout(() => {
          if (!sequence.paused) {
            this.nextSequenceStep(sequence.id);
          }
        }, step.duration);
      }
    } else if (sequence.loop) {
      sequence.currentStep = 0;
      this.executeSequenceStep(sequence);
    } else if (sequence.onComplete) {
      sequence.onComplete();
    }
  }

  // Synchronization
  addSyncSource(id, source) {
    this.syncSources.set(id, {
      id,
      source,
      lastSync: 0,
      offset: 0,
      active: true
    });
  }

  removeSyncSource(id) {
    this.syncSources.delete(id);
  }

  syncToSource(sourceId) {
    const syncSource = this.syncSources.get(sourceId);
    if (syncSource && syncSource.active) {
      const now = Date.now();
      const sourceTime = syncSource.source.getTime ? syncSource.source.getTime() : now;
      syncSource.offset = now - sourceTime;
      syncSource.lastSync = now;
      return true;
    }
    return false;
  }

  getSyncedTime() {
    if (this.syncSources.size === 0) {
      return this.getMasterTime();
    }

    // Use the most recent sync source
    let latestSync = null;
    let latestTime = 0;

    this.syncSources.forEach(syncSource => {
      if (syncSource.active && syncSource.lastSync > latestTime) {
        latestSync = syncSource;
        latestTime = syncSource.lastSync;
      }
    });

    if (latestSync) {
      const now = Date.now();
      const sourceTime = latestSync.source.getTime ? latestSync.source.getTime() : now;
      return sourceTime + latestSync.offset;
    }

    return this.getMasterTime();
  }

  // Easing functions
  getEasingValue(progress, easing = 'linear') {
    switch (easing) {
      case 'linear':
        return progress;
      case 'ease-in':
        return progress * progress;
      case 'ease-out':
        return 1 - Math.pow(1 - progress, 2);
      case 'ease-in-out':
        return progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      case 'ease-in-cubic':
        return progress * progress * progress;
      case 'ease-out-cubic':
        return 1 - Math.pow(1 - progress, 3);
      case 'ease-in-out-cubic':
        return progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      case 'bounce':
        return this.bounceEasing(progress);
      case 'elastic':
        return this.elasticEasing(progress);
      default:
        return progress;
    }
  }

  bounceEasing(progress) {
    if (progress < 1 / 2.75) {
      return 7.5625 * progress * progress;
    } else if (progress < 2 / 2.75) {
      return 7.5625 * (progress -= 1.5 / 2.75) * progress + 0.75;
    } else if (progress < 2.5 / 2.75) {
      return 7.5625 * (progress -= 2.25 / 2.75) * progress + 0.9375;
    } else {
      return 7.5625 * (progress -= 2.625 / 2.75) * progress + 0.984375;
    }
  }

  elasticEasing(progress) {
    if (progress === 0) return 0;
    if (progress === 1) return 1;
    return Math.pow(2, -10 * progress) * Math.sin((progress - 0.1) * 5 * Math.PI) + 1;
  }

  // Timing engine
  startTimingEngine() {
    const engine = () => {
      this.updateTimers();
      this.updateSequences();
      this.updateMusicalTimings();
      requestAnimationFrame(engine);
    };
    engine();
  }

  updateTimers() {
    this.timers.forEach((timer, id) => {
      if (!timer.paused) {
        const elapsed = Date.now() - timer.startTime;
        const progress = Math.min(elapsed / timer.duration, 1);
        const easedProgress = this.getEasingValue(progress, timer.easing);
        
        // Update callback
        if (timer.callback) {
          timer.callback(easedProgress, progress);
        }
        
        // Update callback
        if (timer.onUpdate) {
          timer.onUpdate(easedProgress, progress);
        }
        
        // Check for completion
        if (progress >= 1) {
          if (timer.onComplete) {
            timer.onComplete();
          }
          
          if (timer.loop) {
            timer.startTime = Date.now();
          } else {
            this.timers.delete(id);
          }
        }
      }
    });
  }

  updateSequences() {
    this.sequences.forEach((sequence, id) => {
      if (!sequence.paused && sequence.onUpdate) {
        const elapsed = Date.now() - sequence.startTime;
        sequence.onUpdate(sequence.currentStep, elapsed);
      }
    });
  }

  updateMusicalTimings() {
    // Update musical timing presets based on current BPM
    this.timingPresets.forEach(preset => {
      if (preset.type === 'musical') {
        switch (preset.id) {
          case 'quarter-note':
            preset.duration = 60000 / this.masterBPM;
            break;
          case 'half-note':
            preset.duration = 120000 / this.masterBPM;
            break;
          case 'whole-note':
            preset.duration = 240000 / this.masterBPM;
            break;
          case 'eighth-note':
            preset.duration = 30000 / this.masterBPM;
            break;
          case 'sixteenth-note':
            preset.duration = 15000 / this.masterBPM;
            break;
        }
      }
    });
  }

  // Beat detection and audio sync
  detectBeat(audioData) {
    // Simple beat detection algorithm
    const threshold = 0.3;
    const minInterval = 200; // ms
    
    let beatDetected = false;
    let maxAmplitude = 0;
    
    for (let i = 0; i < audioData.length; i++) {
      maxAmplitude = Math.max(maxAmplitude, Math.abs(audioData[i]));
    }
    
    if (maxAmplitude > threshold) {
      const now = Date.now();
      if (now - this.lastBeat > minInterval) {
        this.lastBeat = now;
        beatDetected = true;
        this.notifyBeatDetected();
      }
    }
    
    return beatDetected;
  }

  // MIDI clock sync
  handleMIDIClock(message) {
    switch (message.type) {
      case 'start':
        this.setMasterClock(true);
        this.masterTime = 0;
        break;
      case 'stop':
        this.setMasterClock(false);
        break;
      case 'clock':
        this.masterTime += 60000 / (24 * this.masterBPM); // 24 PPQN
        break;
      case 'songposition':
        this.masterTime = message.position * 60000 / (24 * this.masterBPM);
        break;
    }
  }

  // Timecode sync
  handleTimecode(timecode) {
    // Parse SMPTE timecode (HH:MM:SS:FF)
    const parts = timecode.split(':');
    if (parts.length === 4) {
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      const seconds = parseInt(parts[2]);
      const frames = parseInt(parts[3]);
      
      const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000 + (frames * 1000 / 30);
      this.masterTime = totalMs;
      this.lastUpdate = Date.now();
    }
  }

  // Storage management
  saveTimingPresets() {
    const data = {
      presets: Array.from(this.timingPresets.entries()),
      masterBPM: this.masterBPM,
      version: '1.0'
    };
    localStorage.setItem('ionxe-timing-presets', JSON.stringify(data));
  }

  loadTimingPresets() {
    try {
      const data = JSON.parse(localStorage.getItem('ionxe-timing-presets'));
      if (data) {
        if (data.presets) {
          data.presets.forEach(([id, preset]) => {
            this.timingPresets.set(id, preset);
          });
        }
        if (data.masterBPM) {
          this.masterBPM = data.masterBPM;
        }
      }
    } catch (error) {
      console.warn('Failed to load timing presets:', error);
    }
  }

  // Event notifications
  notifyBPMChanged() {
    if (this.onBPMChanged) {
      this.onBPMChanged(this.masterBPM);
    }
  }

  notifyMasterClockChanged() {
    if (this.onMasterClockChanged) {
      this.onMasterClockChanged(this.isMasterClock);
    }
  }

  notifyBeatDetected() {
    if (this.onBeatDetected) {
      this.onBeatDetected();
    }
  }

  // Utility functions
  formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor(milliseconds % 1000);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
  }

  formatBPM(bpm) {
    return `${bpm.toFixed(1)} BPM`;
  }

  // Cleanup
  cleanup() {
    this.timers.clear();
    this.sequences.clear();
    this.syncSources.clear();
  }
}

// Initialize timing core
const timingCore = new TimingCore();
