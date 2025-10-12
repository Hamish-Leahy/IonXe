// Advanced Q List Timing System
// Enhanced timing with curves, easing functions, and professional features

class AdvancedQListTiming {
  constructor(qListTimingManager) {
    this.timingManager = qListTimingManager;
    this.easingFunctions = new Map();
    this.timingCurves = new Map();
    this.autoFollowEnabled = false;
    this.cueLinking = new Map();
    this.hangTimes = new Map();
    
    this.initializeEasingFunctions();
    this.initializeTimingCurves();
  }

  // Easing Functions
  initializeEasingFunctions() {
    // Linear
    this.easingFunctions.set('linear', (t) => t);
    
    // Ease In
    this.easingFunctions.set('ease-in', (t) => t * t);
    this.easingFunctions.set('ease-in-quad', (t) => t * t);
    this.easingFunctions.set('ease-in-cubic', (t) => t * t * t);
    this.easingFunctions.set('ease-in-quart', (t) => t * t * t * t);
    this.easingFunctions.set('ease-in-expo', (t) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)));
    this.easingFunctions.set('ease-in-circ', (t) => 1 - Math.sqrt(1 - t * t));
    
    // Ease Out
    this.easingFunctions.set('ease-out', (t) => 1 - Math.pow(1 - t, 2));
    this.easingFunctions.set('ease-out-quad', (t) => 1 - Math.pow(1 - t, 2));
    this.easingFunctions.set('ease-out-cubic', (t) => 1 - Math.pow(1 - t, 3));
    this.easingFunctions.set('ease-out-quart', (t) => 1 - Math.pow(1 - t, 4));
    this.easingFunctions.set('ease-out-expo', (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
    this.easingFunctions.set('ease-out-circ', (t) => Math.sqrt(1 - Math.pow(t - 1, 2)));
    
    // Ease In-Out
    this.easingFunctions.set('ease-in-out', (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    this.easingFunctions.set('ease-in-out-quad', (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    this.easingFunctions.set('ease-in-out-cubic', (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    this.easingFunctions.set('ease-in-out-quart', (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);
    this.easingFunctions.set('ease-in-out-expo', (t) => {
      if (t === 0) return 0;
      if (t === 1) return 1;
      return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
    });
    this.easingFunctions.set('ease-in-out-circ', (t) => {
      return t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
    });
    
    // Specialized Lighting Curves
    this.easingFunctions.set('lighting-smooth', (t) => {
      // Smooth curve optimized for lighting transitions
      return t * t * (3 - 2 * t);
    });
    
    this.easingFunctions.set('lighting-snap', (t) => {
      // Quick snap for fast changes
      return t < 0.8 ? t * t * 1.25 : 1;
    });
    
    this.easingFunctions.set('lighting-fade', (t) => {
      // Gentle fade for subtle changes
      return Math.sin(t * Math.PI / 2);
    });
    
    this.easingFunctions.set('lighting-bounce', (t) => {
      // Bounce effect for dramatic changes
      if (t < 1 / 2.75) {
        return 7.5625 * t * t;
      } else if (t < 2 / 2.75) {
        return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
      } else if (t < 2.5 / 2.75) {
        return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
      } else {
        return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
      }
    });
  }

  // Timing Curves
  initializeTimingCurves() {
    this.timingCurves.set('instant', {
      name: 'Instant',
      fadeIn: 0,
      fadeOut: 0,
      delay: 0,
      follow: 0,
      fadeInEasing: 'linear',
      fadeOutEasing: 'linear',
      description: 'No timing, immediate execution'
    });

    this.timingCurves.set('quick-snap', {
      name: 'Quick Snap',
      fadeIn: 200,
      fadeOut: 200,
      delay: 0,
      follow: 0,
      fadeInEasing: 'lighting-snap',
      fadeOutEasing: 'lighting-snap',
      description: 'Quick 0.2s snap transition'
    });

    this.timingCurves.set('smooth', {
      name: 'Smooth',
      fadeIn: 1000,
      fadeOut: 1000,
      delay: 0,
      follow: 0,
      fadeInEasing: 'lighting-smooth',
      fadeOutEasing: 'lighting-smooth',
      description: 'Smooth 1s transition'
    });

    this.timingCurves.set('gentle', {
      name: 'Gentle',
      fadeIn: 2000,
      fadeOut: 2000,
      delay: 0,
      follow: 0,
      fadeInEasing: 'lighting-fade',
      fadeOutEasing: 'lighting-fade',
      description: 'Gentle 2s fade'
    });

    this.timingCurves.set('dramatic', {
      name: 'Dramatic',
      fadeIn: 3000,
      fadeOut: 3000,
      delay: 500,
      follow: 0,
      fadeInEasing: 'lighting-bounce',
      fadeOutEasing: 'ease-out-expo',
      description: 'Dramatic 3s transition with bounce'
    });

    this.timingCurves.set('crossfade', {
      name: 'Crossfade',
      fadeIn: 2500,
      fadeOut: 2500,
      delay: 0,
      follow: 0,
      fadeInEasing: 'ease-in-out',
      fadeOutEasing: 'ease-in-out',
      description: 'Smooth crossfade transition'
    });

    this.timingCurves.set('blackout', {
      name: 'Blackout',
      fadeIn: 0,
      fadeOut: 800,
      delay: 0,
      follow: 0,
      fadeInEasing: 'linear',
      fadeOutEasing: 'ease-out-expo',
      description: 'Quick blackout with exponential fade'
    });

    this.timingCurves.set('fade-up', {
      name: 'Fade Up',
      fadeIn: 1500,
      fadeOut: 0,
      delay: 0,
      follow: 0,
      fadeInEasing: 'ease-out',
      fadeOutEasing: 'linear',
      description: 'Fade up only, no fade out'
    });

    this.timingCurves.set('fade-down', {
      name: 'Fade Down',
      fadeIn: 0,
      fadeOut: 1500,
      delay: 0,
      follow: 0,
      fadeInEasing: 'linear',
      fadeOutEasing: 'ease-in',
      description: 'Fade down only, no fade in'
    });
  }

  // Enhanced Fade Calculation with Easing
  calculateFadeLevel(startLevel, targetLevel, progress, easingFunction = 'linear') {
    const ease = this.easingFunctions.get(easingFunction) || this.easingFunctions.get('linear');
    const easedProgress = ease(progress);
    return Math.round(startLevel + (targetLevel - startLevel) * easedProgress);
  }

  // Enhanced Fade Management
  startEnhancedFade(cueId, targetLevels, fadeTime, fadeType = 'fadeIn', easingFunction = 'linear') {
    const fadeId = `${cueId}_${fadeType}_${Date.now()}`;
    
    // Cancel any existing fade for this cue
    this.timingManager.cancelFade(cueId, fadeType);

    // Get current levels
    this.timingManager.getCurrentLevels().then(currentLevels => {
      const fade = {
        id: fadeId,
        cueId,
        fadeType,
        startLevels: new Uint8Array(currentLevels),
        targetLevels: new Uint8Array(targetLevels),
        startTime: Date.now(),
        duration: fadeTime,
        isComplete: false,
        progress: 0,
        easingFunction: easingFunction
      };

      this.timingManager.activeFades.set(fadeId, fade);
      this.timingManager.updateCueProgress(cueId, 0);
    });

    return fadeId;
  }

  // Enhanced Fade Update with Easing
  updateEnhancedFade(fade, now) {
    if (fade.isComplete) return;

    const elapsed = now - fade.startTime;
    const progress = Math.min(elapsed / fade.duration, 1);

    // Calculate current levels with easing
    const currentLevels = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      const start = fade.startLevels[i];
      const target = fade.targetLevels[i];
      currentLevels[i] = this.calculateFadeLevel(start, target, progress, fade.easingFunction);
    }

    // Apply levels
    this.timingManager.qListManager.setLevels(currentLevels);

    // Update progress
    fade.progress = progress;
    this.timingManager.updateCueProgress(fade.cueId, progress * 100);

    // Check if fade is complete
    if (progress >= 1) {
      fade.isComplete = true;
      this.timingManager.completeFade(fade.id);
    }
  }

  // Cue Linking System
  linkCues(fromCueId, toCueId, linkType = 'follow') {
    this.cueLinking.set(fromCueId, {
      toCueId,
      linkType,
      createdAt: Date.now()
    });
  }

  unlinkCue(cueId) {
    this.cueLinking.delete(cueId);
  }

  getLinkedCue(cueId) {
    return this.cueLinking.get(cueId);
  }

  // Auto-Follow System
  enableAutoFollow() {
    this.autoFollowEnabled = true;
  }

  disableAutoFollow() {
    this.autoFollowEnabled = false;
  }

  isAutoFollowEnabled() {
    return this.autoFollowEnabled;
  }

  // Hang Time Management
  setHangTime(cueId, hangTime) {
    this.hangTimes.set(cueId, hangTime);
  }

  getHangTime(cueId) {
    return this.hangTimes.get(cueId) || 0;
  }

  clearHangTime(cueId) {
    this.hangTimes.delete(cueId);
  }

  // Enhanced Cue Execution
  executeCueWithAdvancedTiming(cue) {
    const timing = cue.timing;
    const curve = this.timingCurves.get(timing.curve || 'smooth');
    
    if (curve) {
      // Apply curve settings
      timing.fadeIn = timing.fadeIn || curve.fadeIn;
      timing.fadeOut = timing.fadeOut || curve.fadeOut;
      timing.delay = timing.delay || curve.delay;
      timing.follow = timing.follow || curve.follow;
      timing.fadeInEasing = timing.fadeInEasing || curve.fadeInEasing;
      timing.fadeOutEasing = timing.fadeOutEasing || curve.fadeOutEasing;
    }

    // Schedule fade out if needed
    if (timing.fadeOut > 0) {
      this.timingManager.scheduleTimingEvent({
        type: 'fade_out',
        cueId: cue.id,
        targetLevels: new Uint8Array(512), // All zeros
        fadeTime: timing.fadeOut,
        delay: 0,
        easingFunction: timing.fadeOutEasing || 'linear'
      });
    }

    // Schedule fade in
    if (timing.fadeIn > 0) {
      this.timingManager.scheduleTimingEvent({
        type: 'fade_in',
        cueId: cue.id,
        targetLevels: cue.levels,
        fadeTime: timing.fadeIn,
        delay: timing.delay,
        easingFunction: timing.fadeInEasing || 'linear'
      });
    } else {
      // Immediate execution
      this.timingManager.scheduleTimingEvent({
        type: 'set_levels',
        levels: cue.levels,
        delay: timing.delay
      });
    }

    // Schedule follow action
    if (timing.follow > 0) {
      this.timingManager.scheduleTimingEvent({
        type: 'next_cue',
        delay: timing.follow
      });
    }

    // Handle auto-follow
    if (this.autoFollowEnabled && !timing.follow) {
      const hangTime = this.getHangTime(cue.id);
      const totalTime = timing.fadeIn + timing.delay + hangTime;
      
      if (totalTime > 0) {
        this.timingManager.scheduleTimingEvent({
          type: 'next_cue',
          delay: totalTime
        });
      }
    }

    // Handle cue linking
    const linkedCue = this.getLinkedCue(cue.id);
    if (linkedCue) {
      this.timingManager.scheduleTimingEvent({
        type: 'go_to_cue',
        cueNumber: linkedCue.toCueId,
        delay: timing.fadeIn + timing.delay + this.getHangTime(cue.id)
      });
    }
  }

  // Timing Curve Management
  applyTimingCurve(cueId, curveId) {
    const curve = this.timingCurves.get(curveId);
    if (!curve) return false;

    const cue = this.timingManager.qListManager.cues.find(c => c.id === cueId);
    if (!cue) return false;

    cue.timing = {
      ...cue.timing,
      curve: curveId,
      fadeIn: curve.fadeIn,
      fadeOut: curve.fadeOut,
      delay: curve.delay,
      follow: curve.follow,
      fadeInEasing: curve.fadeInEasing,
      fadeOutEasing: curve.fadeOutEasing
    };

    cue.updatedAt = new Date().toISOString();
    this.timingManager.qListManager.notifyCueListUpdated();
    return true;
  }

  createTimingCurve(id, curve) {
    this.timingCurves.set(id, {
      name: curve.name,
      fadeIn: curve.fadeIn || 0,
      fadeOut: curve.fadeOut || 0,
      delay: curve.delay || 0,
      follow: curve.follow || 0,
      fadeInEasing: curve.fadeInEasing || 'linear',
      fadeOutEasing: curve.fadeOutEasing || 'linear',
      description: curve.description || ''
    });
  }

  getTimingCurve(id) {
    return this.timingCurves.get(id);
  }

  getAllTimingCurves() {
    return Array.from(this.timingCurves.entries()).map(([id, curve]) => ({
      id,
      ...curve
    }));
  }

  // Easing Function Management
  getEasingFunction(id) {
    return this.easingFunctions.get(id);
  }

  getAllEasingFunctions() {
    return Array.from(this.easingFunctions.entries()).map(([id, func]) => ({
      id,
      name: this.getEasingFunctionName(id)
    }));
  }

  getEasingFunctionName(id) {
    const names = {
      'linear': 'Linear',
      'ease-in': 'Ease In',
      'ease-in-quad': 'Ease In (Quad)',
      'ease-in-cubic': 'Ease In (Cubic)',
      'ease-in-quart': 'Ease In (Quart)',
      'ease-in-expo': 'Ease In (Expo)',
      'ease-in-circ': 'Ease In (Circ)',
      'ease-out': 'Ease Out',
      'ease-out-quad': 'Ease Out (Quad)',
      'ease-out-cubic': 'Ease Out (Cubic)',
      'ease-out-quart': 'Ease Out (Quart)',
      'ease-out-expo': 'Ease Out (Expo)',
      'ease-out-circ': 'Ease Out (Circ)',
      'ease-in-out': 'Ease In-Out',
      'ease-in-out-quad': 'Ease In-Out (Quad)',
      'ease-in-out-cubic': 'Ease In-Out (Cubic)',
      'ease-in-out-quart': 'Ease In-Out (Quart)',
      'ease-in-out-expo': 'Ease In-Out (Expo)',
      'ease-in-out-circ': 'Ease In-Out (Circ)',
      'lighting-smooth': 'Lighting Smooth',
      'lighting-snap': 'Lighting Snap',
      'lighting-fade': 'Lighting Fade',
      'lighting-bounce': 'Lighting Bounce'
    };
    return names[id] || id;
  }

  // Cue Effects
  addCueEffect(cueId, effectType, parameters = {}) {
    const cue = this.timingManager.qListManager.cues.find(c => c.id === cueId);
    if (!cue) return false;

    if (!cue.effects) {
      cue.effects = [];
    }

    const effect = {
      id: this.generateEffectId(),
      type: effectType,
      parameters,
      createdAt: Date.now()
    };

    cue.effects.push(effect);
    cue.updatedAt = new Date().toISOString();
    this.timingManager.qListManager.notifyCueListUpdated();
    return effect.id;
  }

  removeCueEffect(cueId, effectId) {
    const cue = this.timingManager.qListManager.cues.find(c => c.id === cueId);
    if (!cue || !cue.effects) return false;

    const index = cue.effects.findIndex(e => e.id === effectId);
    if (index === -1) return false;

    cue.effects.splice(index, 1);
    cue.updatedAt = new Date().toISOString();
    this.timingManager.qListManager.notifyCueListUpdated();
    return true;
  }

  // Built-in Effects
  addFadeEffect(cueId, channels, startValue = 0, endValue = 255, duration = 1000) {
    return this.addCueEffect(cueId, 'fade', {
      channels,
      startValue,
      endValue,
      duration
    });
  }

  addChaseEffect(cueId, channels, speed = 500, direction = 'forward') {
    return this.addCueEffect(cueId, 'chase', {
      channels,
      speed,
      direction
    });
  }

  addPulseEffect(cueId, channels, speed = 1000, intensity = 0.5) {
    return this.addCueEffect(cueId, 'pulse', {
      channels,
      speed,
      intensity
    });
  }

  addStrobeEffect(cueId, channels, speed = 200, intensity = 1.0) {
    return this.addCueEffect(cueId, 'strobe', {
      channels,
      speed,
      intensity
    });
  }

  // Utility Functions
  generateEffectId() {
    return 'effect_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Cleanup
  clearAllLinking() {
    this.cueLinking.clear();
  }

  clearAllHangTimes() {
    this.hangTimes.clear();
  }

  destroy() {
    this.clearAllLinking();
    this.clearAllHangTimes();
  }
}

// Global Advanced Timing Instance
const advancedQListTiming = new AdvancedQListTiming(qListTimingManager);
