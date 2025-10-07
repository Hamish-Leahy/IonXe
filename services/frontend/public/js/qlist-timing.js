// Q List Timing System
// Handles fade in/out, delays, follow times, and timing calculations

class QListTimingManager {
  constructor(qListManager) {
    this.qListManager = qListManager;
    this.activeFades = new Map();
    this.timingPresets = new Map();
    this.timingQueue = [];
    this.isProcessingQueue = false;
    
    this.initializeTimingPresets();
    this.startTimingProcessor();
  }

  // Timing Presets
  initializeTimingPresets() {
    this.timingPresets.set('instant', {
      name: 'Instant',
      fadeIn: 0,
      fadeOut: 0,
      delay: 0,
      follow: 0,
      description: 'No timing, immediate execution'
    });

    this.timingPresets.set('quick', {
      name: 'Quick',
      fadeIn: 500,
      fadeOut: 500,
      delay: 0,
      follow: 0,
      description: 'Quick 0.5s fade'
    });

    this.timingPresets.set('normal', {
      name: 'Normal',
      fadeIn: 2000,
      fadeOut: 2000,
      delay: 0,
      follow: 0,
      description: 'Standard 2s fade'
    });

    this.timingPresets.set('slow', {
      name: 'Slow',
      fadeIn: 5000,
      fadeOut: 5000,
      delay: 0,
      follow: 0,
      description: 'Slow 5s fade'
    });

    this.timingPresets.set('blackout', {
      name: 'Blackout',
      fadeIn: 0,
      fadeOut: 1000,
      delay: 0,
      follow: 0,
      description: 'Quick blackout'
    });

    this.timingPresets.set('crossfade', {
      name: 'Crossfade',
      fadeIn: 3000,
      fadeOut: 3000,
      delay: 0,
      follow: 0,
      description: 'Smooth crossfade'
    });
  }

  // Timing Processing
  startTimingProcessor() {
    const processTiming = () => {
      this.processTimingQueue();
      requestAnimationFrame(processTiming);
    };
    processTiming();
  }

  processTimingQueue() {
    if (this.isProcessingQueue || this.timingQueue.length === 0) return;

    this.isProcessingQueue = true;
    const now = Date.now();

    // Process queued timing events
    for (let i = this.timingQueue.length - 1; i >= 0; i--) {
      const event = this.timingQueue[i];
      
      if (now >= event.executeTime) {
        this.executeTimingEvent(event);
        this.timingQueue.splice(i, 1);
      }
    }

    // Update active fades
    this.updateActiveFades(now);

    this.isProcessingQueue = false;
  }

  // Fade Management
  startFade(cueId, targetLevels, fadeTime, fadeType = 'fadeIn') {
    const fadeId = `${cueId}_${fadeType}_${Date.now()}`;
    
    // Cancel any existing fade for this cue
    this.cancelFade(cueId, fadeType);

    // Get current levels
    this.getCurrentLevels().then(currentLevels => {
      const fade = {
        id: fadeId,
        cueId,
        fadeType,
        startLevels: new Uint8Array(currentLevels),
        targetLevels: new Uint8Array(targetLevels),
        startTime: Date.now(),
        duration: fadeTime,
        isComplete: false,
        progress: 0
      };

      this.activeFades.set(fadeId, fade);
      this.updateCueProgress(cueId, 0);
    });

    return fadeId;
  }

  updateActiveFades(now) {
    for (const [fadeId, fade] of this.activeFades) {
      if (fade.isComplete) continue;

      const elapsed = now - fade.startTime;
      const progress = Math.min(elapsed / fade.duration, 1);

      // Calculate current levels
      const currentLevels = new Uint8Array(512);
      for (let i = 0; i < 512; i++) {
        const start = fade.startLevels[i];
        const target = fade.targetLevels[i];
        currentLevels[i] = Math.round(start + (target - start) * progress);
      }

      // Apply levels
      this.qListManager.setLevels(currentLevels);

      // Update progress
      fade.progress = progress;
      this.updateCueProgress(fade.cueId, progress * 100);

      // Check if fade is complete
      if (progress >= 1) {
        fade.isComplete = true;
        this.completeFade(fadeId);
      }
    }
  }

  completeFade(fadeId) {
    const fade = this.activeFades.get(fadeId);
    if (!fade) return;

    // Ensure final levels are set
    this.qListManager.setLevels(fade.targetLevels);
    this.updateCueProgress(fade.cueId, 100);

    // Remove from active fades
    this.activeFades.delete(fadeId);

    // Notify completion
    this.notifyFadeComplete(fade);
  }

  cancelFade(cueId, fadeType = null) {
    for (const [fadeId, fade] of this.activeFades) {
      if (fade.cueId === cueId && (!fadeType || fade.fadeType === fadeType)) {
        this.activeFades.delete(fadeId);
      }
    }
  }

  // Timing Events
  scheduleTimingEvent(event) {
    const timingEvent = {
      id: this.generateTimingId(),
      ...event,
      executeTime: Date.now() + (event.delay || 0),
      scheduledAt: Date.now()
    };

    this.timingQueue.push(timingEvent);
    this.timingQueue.sort((a, b) => a.executeTime - b.executeTime);

    return timingEvent.id;
  }

  executeTimingEvent(event) {
    switch (event.type) {
      case 'fade_in':
        this.startFade(event.cueId, event.targetLevels, event.fadeTime, 'fadeIn');
        break;
      case 'fade_out':
        this.startFade(event.cueId, event.targetLevels, event.fadeTime, 'fadeOut');
        break;
      case 'set_levels':
        this.qListManager.setLevels(event.levels);
        break;
      case 'next_cue':
        this.qListManager.nextCue();
        break;
      case 'previous_cue':
        this.qListManager.previousCue();
        break;
      case 'go_to_cue':
        this.qListManager.goToCue(event.cueNumber);
        break;
      case 'custom':
        if (event.callback) {
          event.callback(event.data);
        }
        break;
    }
  }

  // Cue Timing
  executeCueWithTiming(cue) {
    const timing = cue.timing;
    
    // Schedule fade out if needed
    if (timing.fadeOut > 0) {
      this.scheduleTimingEvent({
        type: 'fade_out',
        cueId: cue.id,
        targetLevels: new Uint8Array(512), // All zeros
        fadeTime: timing.fadeOut,
        delay: 0
      });
    }

    // Schedule fade in
    if (timing.fadeIn > 0) {
      this.scheduleTimingEvent({
        type: 'fade_in',
        cueId: cue.id,
        targetLevels: cue.levels,
        fadeTime: timing.fadeIn,
        delay: timing.delay
      });
    } else {
      // Immediate execution
      this.scheduleTimingEvent({
        type: 'set_levels',
        levels: cue.levels,
        delay: timing.delay
      });
    }

    // Schedule follow action
    if (timing.follow > 0) {
      this.scheduleTimingEvent({
        type: 'next_cue',
        delay: timing.follow
      });
    }
  }

  // Timing Calculations
  calculateFadeTime(startLevels, targetLevels, maxFadeTime = 10000) {
    let maxDifference = 0;
    
    for (let i = 0; i < 512; i++) {
      const difference = Math.abs(targetLevels[i] - startLevels[i]);
      maxDifference = Math.max(maxDifference, difference);
    }

    // Calculate fade time based on maximum difference
    // Scale from 0-255 difference to 0-maxFadeTime
    const fadeTime = Math.round((maxDifference / 255) * maxFadeTime);
    return Math.max(100, Math.min(fadeTime, maxFadeTime)); // Min 100ms, max maxFadeTime
  }

  calculateOptimalTiming(cue, previousCue = null) {
    if (!previousCue) {
      return cue.timing;
    }

    const startLevels = previousCue.levels;
    const targetLevels = cue.levels;
    const fadeTime = this.calculateFadeTime(startLevels, targetLevels);

    return {
      fadeIn: fadeTime,
      fadeOut: 0,
      delay: 0,
      follow: 0
    };
  }

  // Timing Presets
  applyTimingPreset(cueId, presetId) {
    const preset = this.timingPresets.get(presetId);
    if (!preset) return false;

    const cue = this.qListManager.cues.find(c => c.id === cueId);
    if (!cue) return false;

    cue.timing = {
      fadeIn: preset.fadeIn,
      fadeOut: preset.fadeOut,
      delay: preset.delay,
      follow: preset.follow
    };

    cue.updatedAt = new Date().toISOString();
    this.qListManager.notifyCueListUpdated();
    return true;
  }

  createTimingPreset(id, preset) {
    this.timingPresets.set(id, {
      name: preset.name,
      fadeIn: preset.fadeIn || 0,
      fadeOut: preset.fadeOut || 0,
      delay: preset.delay || 0,
      follow: preset.follow || 0,
      description: preset.description || ''
    });
  }

  getTimingPreset(id) {
    return this.timingPresets.get(id);
  }

  getAllTimingPresets() {
    return Array.from(this.timingPresets.entries()).map(([id, preset]) => ({
      id,
      ...preset
    }));
  }

  // Progress Tracking
  updateCueProgress(cueId, progress) {
    const cue = this.qListManager.cues.find(c => c.id === cueId);
    if (cue) {
      cue.state.progress = Math.round(progress);
      this.qListManager.notifyCueChanged(cue);
    }
  }

  // Utility Functions
  generateTimingId() {
    return 'timing_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async getCurrentLevels() {
    try {
      const response = await apiFetch('/api/v1/dimmers/frame');
      return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      console.error('Failed to get current levels:', error);
      return new Uint8Array(512);
    }
  }

  notifyFadeComplete(fade) {
    // Override this method to handle fade completion
    console.log('Fade completed:', fade);
  }

  // Cleanup
  clearAllFades() {
    this.activeFades.clear();
  }

  clearTimingQueue() {
    this.timingQueue = [];
  }

  destroy() {
    this.clearAllFades();
    this.clearTimingQueue();
  }
}

// Global Timing Manager Instance
const qListTimingManager = new QListTimingManager(qListManager);
