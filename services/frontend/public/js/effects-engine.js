// Advanced Effects Engine
// Comprehensive effects system for lighting control

class EffectsEngine {
  constructor(qListManager, dmxOutput) {
    this.qListManager = qListManager;
    this.dmxOutput = dmxOutput;
    this.activeEffects = new Map();
    this.effectPresets = new Map();
    this.effectQueue = [];
    this.effectProcessor = null;
    this.isProcessing = false;
    this.frameRate = 60; // 60 FPS
    this.lastFrameTime = 0;
    
    this.initializeEffectPresets();
    this.startEffectProcessor();
  }

  // Effect Management
  createEffect(id, config) {
    const effect = {
      id,
      name: config.name || 'Untitled Effect',
      type: config.type || 'static',
      parameters: config.parameters || {},
      channels: config.channels || [],
      duration: config.duration || 0, // 0 = infinite
      priority: config.priority || 0,
      isActive: false,
      startTime: 0,
      currentTime: 0,
      progress: 0,
      iterations: 0,
      maxIterations: config.maxIterations || -1,
      createdAt: new Date().toISOString()
    };

    this.effectPresets.set(id, effect);
    return effect;
  }

  startEffect(effectId, channels = null, parameters = null) {
    const preset = this.effectPresets.get(effectId);
    if (!preset) return false;

    const effect = {
      ...preset,
      id: this.generateEffectInstanceId(),
      presetId: effectId,
      channels: channels || preset.channels,
      parameters: { ...preset.parameters, ...parameters },
      isActive: true,
      startTime: Date.now(),
      currentTime: 0,
      progress: 0,
      iterations: 0
    };

    this.activeEffects.set(effect.id, effect);
    this.notifyEffectEvent('effect_started', effect);
    return effect.id;
  }

  stopEffect(effectId) {
    const effect = this.activeEffects.get(effectId);
    if (!effect) return false;

    effect.isActive = false;
    this.activeEffects.delete(effectId);
    
    // Reset affected channels
    this.resetEffectChannels(effect.channels);
    
    this.notifyEffectEvent('effect_stopped', effect);
    return true;
  }

  // Effect Types
  initializeEffectPresets() {
    // Static Effects
    this.createEffect('static_color', {
      name: 'Static Color',
      type: 'static',
      parameters: {
        red: 255,
        green: 255,
        blue: 255,
        intensity: 255
      },
      description: 'Solid color output'
    });

    this.createEffect('static_intensity', {
      name: 'Static Intensity',
      type: 'static',
      parameters: {
        intensity: 255
      },
      description: 'Fixed intensity level'
    });

    // Dynamic Effects
    this.createEffect('fade_in_out', {
      name: 'Fade In/Out',
      type: 'dynamic',
      parameters: {
        fadeInTime: 2000,
        fadeOutTime: 2000,
        holdTime: 1000,
        intensity: 255,
        loop: true
      },
      description: 'Smooth fade in and out'
    });

    this.createEffect('pulse', {
      name: 'Pulse',
      type: 'dynamic',
      parameters: {
        speed: 1.0,
        intensity: 255,
        minIntensity: 0,
        waveform: 'sine' // sine, square, triangle, sawtooth
      },
      description: 'Rhythmic pulsing effect'
    });

    this.createEffect('chase', {
      name: 'Chase',
      type: 'dynamic',
      parameters: {
        speed: 1.0,
        direction: 'forward', // forward, backward, pingpong
        intensity: 255,
        trailLength: 3,
        spacing: 1
      },
      description: 'Moving light chase pattern'
    });

    this.createEffect('rainbow', {
      name: 'Rainbow',
      type: 'dynamic',
      parameters: {
        speed: 1.0,
        saturation: 1.0,
        brightness: 1.0,
        direction: 'forward'
      },
      description: 'Rainbow color cycling'
    });

    this.createEffect('strobe', {
      name: 'Strobe',
      type: 'dynamic',
      parameters: {
        frequency: 10, // Hz
        intensity: 255,
        dutyCycle: 0.5 // 0-1
      },
      description: 'Stroboscopic flashing'
    });

    // Advanced Effects
    this.createEffect('wave', {
      name: 'Wave',
      type: 'advanced',
      parameters: {
        amplitude: 127,
        frequency: 0.5,
        phase: 0,
        speed: 1.0,
        waveform: 'sine'
      },
      description: 'Wave pattern across channels'
    });

    this.createEffect('spiral', {
      name: 'Spiral',
      type: 'advanced',
      parameters: {
        radius: 50,
        speed: 1.0,
        intensity: 255,
        direction: 'clockwise'
      },
      description: 'Spiral pattern effect'
    });

    this.createEffect('fire', {
      name: 'Fire',
      type: 'advanced',
      parameters: {
        intensity: 255,
        speed: 1.0,
        flicker: 0.3,
        colorTemperature: 3200 // Kelvin
      },
      description: 'Fire simulation effect'
    });

    this.createEffect('water', {
      name: 'Water',
      type: 'advanced',
      parameters: {
        intensity: 200,
        speed: 0.8,
        turbulence: 0.5,
        color: '#0066CC'
      },
      description: 'Water ripple effect'
    });
  }

  // Effect Processing
  startEffectProcessor() {
    const processEffects = (currentTime) => {
      if (!this.isProcessing) {
        this.isProcessing = true;
        this.processActiveEffects(currentTime);
        this.isProcessing = false;
      }
      
      this.lastFrameTime = currentTime;
      requestAnimationFrame(processEffects);
    };
    
    requestAnimationFrame(processEffects);
  }

  processActiveEffects(currentTime) {
    const deltaTime = currentTime - this.lastFrameTime;
    
    for (const [effectId, effect] of this.activeEffects) {
      if (!effect.isActive) continue;

      effect.currentTime = currentTime - effect.startTime;
      effect.progress = effect.duration > 0 ? (effect.currentTime / effect.duration) : 0;

      // Process effect based on type
      switch (effect.type) {
        case 'static':
          this.processStaticEffect(effect);
          break;
        case 'dynamic':
          this.processDynamicEffect(effect, deltaTime);
          break;
        case 'advanced':
          this.processAdvancedEffect(effect, deltaTime);
          break;
      }

      // Check for completion
      if (effect.duration > 0 && effect.progress >= 1) {
        this.handleEffectCompletion(effect);
      }
    }
  }

  processStaticEffect(effect) {
    const levels = new Uint8Array(512);
    
    for (const channel of effect.channels) {
      if (effect.parameters.intensity !== undefined) {
        levels[channel.address - 1] = effect.parameters.intensity;
      }
      
      if (effect.parameters.red !== undefined) {
        levels[channel.redAddress - 1] = effect.parameters.red;
      }
      
      if (effect.parameters.green !== undefined) {
        levels[channel.greenAddress - 1] = effect.parameters.green;
      }
      
      if (effect.parameters.blue !== undefined) {
        levels[channel.blueAddress - 1] = effect.parameters.blue;
      }
    }
    
    this.applyEffectLevels(effect.id, levels);
  }

  processDynamicEffect(effect, deltaTime) {
    const levels = new Uint8Array(512);
    const time = effect.currentTime / 1000; // Convert to seconds
    
    for (const channel of effect.channels) {
      let value = 0;
      
      switch (effect.presetId) {
        case 'fade_in_out':
          value = this.calculateFadeInOut(effect, time);
          break;
        case 'pulse':
          value = this.calculatePulse(effect, time);
          break;
        case 'chase':
          value = this.calculateChase(effect, time, channel);
          break;
        case 'rainbow':
          value = this.calculateRainbow(effect, time, channel);
          break;
        case 'strobe':
          value = this.calculateStrobe(effect, time);
          break;
      }
      
      levels[channel.address - 1] = Math.round(value);
    }
    
    this.applyEffectLevels(effect.id, levels);
  }

  processAdvancedEffect(effect, deltaTime) {
    const levels = new Uint8Array(512);
    const time = effect.currentTime / 1000;
    
    for (const channel of effect.channels) {
      let value = 0;
      
      switch (effect.presetId) {
        case 'wave':
          value = this.calculateWave(effect, time, channel);
          break;
        case 'spiral':
          value = this.calculateSpiral(effect, time, channel);
          break;
        case 'fire':
          value = this.calculateFire(effect, time, channel);
          break;
        case 'water':
          value = this.calculateWater(effect, time, channel);
          break;
      }
      
      levels[channel.address - 1] = Math.round(value);
    }
    
    this.applyEffectLevels(effect.id, levels);
  }

  // Effect Calculations
  calculateFadeInOut(effect, time) {
    const params = effect.parameters;
    const cycleTime = params.fadeInTime + params.holdTime + params.fadeOutTime;
    const cyclePosition = (time * 1000) % cycleTime;
    
    if (cyclePosition < params.fadeInTime) {
      return (cyclePosition / params.fadeInTime) * params.intensity;
    } else if (cyclePosition < params.fadeInTime + params.holdTime) {
      return params.intensity;
    } else {
      const fadeOutProgress = (cyclePosition - params.fadeInTime - params.holdTime) / params.fadeOutTime;
      return params.intensity * (1 - fadeOutProgress);
    }
  }

  calculatePulse(effect, time) {
    const params = effect.parameters;
    const frequency = params.speed;
    const phase = time * frequency * 2 * Math.PI;
    
    let waveform;
    switch (params.waveform) {
      case 'sine':
        waveform = Math.sin(phase);
        break;
      case 'square':
        waveform = Math.sin(phase) > 0 ? 1 : -1;
        break;
      case 'triangle':
        waveform = 2 * Math.abs(phase / Math.PI - Math.floor(phase / Math.PI + 0.5)) - 1;
        break;
      case 'sawtooth':
        waveform = 2 * (phase / (2 * Math.PI) - Math.floor(phase / (2 * Math.PI) + 0.5));
        break;
      default:
        waveform = Math.sin(phase);
    }
    
    const normalizedWaveform = (waveform + 1) / 2; // Convert to 0-1 range
    return params.minIntensity + (params.intensity - params.minIntensity) * normalizedWaveform;
  }

  calculateChase(effect, time, channel) {
    const params = effect.parameters;
    const speed = params.speed;
    const channelIndex = effect.channels.indexOf(channel);
    const totalChannels = effect.channels.length;
    
    const position = (time * speed) % totalChannels;
    const distance = Math.abs(channelIndex - position);
    const trailDistance = Math.min(distance, totalChannels - distance);
    
    if (trailDistance <= params.trailLength) {
      const intensity = params.intensity * (1 - trailDistance / params.trailLength);
      return intensity;
    }
    
    return 0;
  }

  calculateRainbow(effect, time, channel) {
    const params = effect.parameters;
    const channelIndex = effect.channels.indexOf(channel);
    const totalChannels = effect.channels.length;
    
    const hue = ((time * params.speed + channelIndex / totalChannels) * 360) % 360;
    const rgb = this.hslToRgb(hue / 360, params.saturation, params.brightness);
    
    return rgb.reduce((sum, val) => sum + val, 0) / 3; // Average RGB for intensity
  }

  calculateStrobe(effect, time) {
    const params = effect.parameters;
    const cycleTime = 1 / params.frequency;
    const cyclePosition = time % cycleTime;
    const onTime = cycleTime * params.dutyCycle;
    
    return cyclePosition < onTime ? params.intensity : 0;
  }

  calculateWave(effect, time, channel) {
    const params = effect.parameters;
    const channelIndex = effect.channels.indexOf(channel);
    const phase = time * params.speed * 2 * Math.PI + params.phase;
    const position = channelIndex / effect.channels.length * 2 * Math.PI;
    
    const waveform = Math.sin(phase + position * params.frequency);
    return params.amplitude + params.amplitude * waveform;
  }

  calculateSpiral(effect, time, channel) {
    const params = effect.parameters;
    const channelIndex = effect.channels.indexOf(channel);
    const totalChannels = effect.channels.length;
    
    const angle = (time * params.speed + channelIndex / totalChannels) * 2 * Math.PI;
    const radius = params.radius * (1 + Math.sin(angle * 2));
    
    return Math.min(params.intensity, radius);
  }

  calculateFire(effect, time, channel) {
    const params = effect.parameters;
    const channelIndex = effect.channels.indexOf(channel);
    
    // Simulate fire with noise and flicker
    const noise = Math.random() * params.flicker;
    const baseIntensity = params.intensity * (0.7 + 0.3 * Math.sin(time * params.speed));
    const flickerIntensity = baseIntensity * (1 + noise);
    
    return Math.min(255, flickerIntensity);
  }

  calculateWater(effect, time, channel) {
    const params = effect.parameters;
    const channelIndex = effect.channels.indexOf(channel);
    
    // Simulate water ripples
    const ripple = Math.sin(time * params.speed + channelIndex * params.turbulence);
    const intensity = params.intensity * (0.5 + 0.5 * ripple);
    
    return intensity;
  }

  // Utility Functions
  hslToRgb(h, s, l) {
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  applyEffectLevels(effectId, levels) {
    // Apply effect levels to DMX output
    this.dmxOutput.applyEffectLevels(effectId, levels);
  }

  resetEffectChannels(channels) {
    const levels = new Uint8Array(512);
    for (const channel of channels) {
      levels[channel.address - 1] = 0;
    }
    this.dmxOutput.applyEffectLevels('reset', levels);
  }

  handleEffectCompletion(effect) {
    effect.iterations++;
    
    if (effect.maxIterations > 0 && effect.iterations >= effect.maxIterations) {
      this.stopEffect(effect.id);
    } else {
      // Restart effect
      effect.startTime = Date.now();
      effect.currentTime = 0;
      effect.progress = 0;
    }
  }

  generateEffectInstanceId() {
    return 'effect_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Event Notifications
  notifyEffectEvent(eventType, effectData) {
    const event = new CustomEvent('effect-event', {
      detail: { eventType, effectData }
    });
    document.dispatchEvent(event);
  }

  // Cleanup
  stopAllEffects() {
    for (const effectId of this.activeEffects.keys()) {
      this.stopEffect(effectId);
    }
  }

  destroy() {
    this.stopAllEffects();
    this.activeEffects.clear();
    this.effectPresets.clear();
    this.effectQueue = [];
  }
}

// Global Effects Engine Instance
const effectsEngine = new EffectsEngine(qListManager, dmxOutput);
