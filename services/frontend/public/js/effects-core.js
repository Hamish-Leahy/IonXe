// Effects Core - Professional lighting effects engine
// Advanced effects system for lighting control

class EffectsCore {
  constructor(fixtureCore) {
    this.fixtureCore = fixtureCore;
    this.activeEffects = new Map();
    this.effectPresets = new Map();
    this.effectQueue = [];
    
    this.initializeDefaultEffects();
    this.startEffectEngine();
  }

  initializeDefaultEffects() {
    // Strobe effect
    this.addEffectPreset('strobe', {
      name: 'Strobe',
      description: 'Fast on/off strobe effect',
      parameters: {
        speed: { min: 1, max: 20, default: 10, unit: 'Hz' },
        intensity: { min: 0, max: 255, default: 255 },
        duration: { min: 0, max: 60000, default: 5000, unit: 'ms' }
      },
      execute: (fixtures, params) => this.executeStrobe(fixtures, params)
    });

    // Rainbow effect
    this.addEffectPreset('rainbow', {
      name: 'Rainbow',
      description: 'Continuous color cycling',
      parameters: {
        speed: { min: 1, max: 10, default: 2, unit: 'cycles/sec' },
        saturation: { min: 0, max: 100, default: 100, unit: '%' },
        lightness: { min: 0, max: 100, default: 50, unit: '%' }
      },
      execute: (fixtures, params) => this.executeRainbow(fixtures, params)
    });

    // Fade effect
    this.addEffectPreset('fade', {
      name: 'Fade',
      description: 'Smooth intensity fade',
      parameters: {
        direction: { type: 'select', options: ['in', 'out', 'in-out'], default: 'in' },
        duration: { min: 100, max: 10000, default: 2000, unit: 'ms' },
        intensity: { min: 0, max: 255, default: 255 }
      },
      execute: (fixtures, params) => this.executeFade(fixtures, params)
    });

    // Wave effect
    this.addEffectPreset('wave', {
      name: 'Wave',
      description: 'Sine wave intensity modulation',
      parameters: {
        frequency: { min: 0.1, max: 5, default: 1, unit: 'Hz' },
        amplitude: { min: 0, max: 255, default: 128 },
        offset: { min: 0, max: 255, default: 127 },
        phase: { min: 0, max: 360, default: 0, unit: 'degrees' }
      },
      execute: (fixtures, params) => this.executeWave(fixtures, params)
    });

    // Chase effect
    this.addEffectPreset('chase', {
      name: 'Chase',
      description: 'Sequential fixture activation',
      parameters: {
        speed: { min: 50, max: 2000, default: 500, unit: 'ms' },
        pattern: { type: 'select', options: ['forward', 'backward', 'ping-pong'], default: 'forward' },
        intensity: { min: 0, max: 255, default: 255 },
        width: { min: 1, max: 10, default: 1 }
      },
      execute: (fixtures, params) => this.executeChase(fixtures, params)
    });

    // Color cycle effect
    this.addEffectPreset('color-cycle', {
      name: 'Color Cycle',
      description: 'Cycle through predefined colors',
      parameters: {
        speed: { min: 100, max: 5000, default: 1000, unit: 'ms' },
        colors: { type: 'color-list', default: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'] }
      },
      execute: (fixtures, params) => this.executeColorCycle(fixtures, params)
    });

    // Random effect
    this.addEffectPreset('random', {
      name: 'Random',
      description: 'Random intensity and color changes',
      parameters: {
        speed: { min: 50, max: 1000, default: 200, unit: 'ms' },
        intensityRange: { min: 0, max: 255, default: 255 },
        colorChange: { type: 'boolean', default: true }
      },
      execute: (fixtures, params) => this.executeRandom(fixtures, params)
    });

    // Fire effect
    this.addEffectPreset('fire', {
      name: 'Fire',
      description: 'Flickering fire-like effect',
      parameters: {
        intensity: { min: 0, max: 255, default: 200 },
        flickerSpeed: { min: 1, max: 20, default: 8, unit: 'Hz' },
        colorTemperature: { min: 2000, max: 6000, default: 3200, unit: 'K' }
      },
      execute: (fixtures, params) => this.executeFire(fixtures, params)
    });

    // Thunder effect
    this.addEffectPreset('thunder', {
      name: 'Thunder',
      description: 'Lightning/thunder effect',
      parameters: {
        intensity: { min: 0, max: 255, default: 255 },
        flashDuration: { min: 50, max: 500, default: 100, unit: 'ms' },
        flashInterval: { min: 1000, max: 10000, default: 3000, unit: 'ms' },
        colorTemperature: { min: 5000, max: 10000, default: 6500, unit: 'K' }
      },
      execute: (fixtures, params) => this.executeThunder(fixtures, params)
    });
  }

  addEffectPreset(id, preset) {
    this.effectPresets.set(id, {
      ...preset,
      id,
      created: new Date().toISOString()
    });
  }

  getEffectPreset(id) {
    return this.effectPresets.get(id);
  }

  getAllEffectPresets() {
    return Array.from(this.effectPresets.values());
  }

  // Start effect on fixtures
  startEffect(effectId, fixtureIds, parameters = {}) {
    const preset = this.getEffectPreset(effectId);
    if (!preset) return false;

    const effectId = this.generateId();
    const effect = {
      id: effectId,
      presetId: effectId,
      fixtures: fixtureIds,
      parameters: { ...preset.parameters, ...parameters },
      startTime: Date.now(),
      active: true
    };

    this.activeEffects.set(effectId, effect);
    this.executeEffect(effect);
    return effectId;
  }

  // Stop effect
  stopEffect(effectId) {
    const effect = this.activeEffects.get(effectId);
    if (effect) {
      effect.active = false;
      this.activeEffects.delete(effectId);
      return true;
    }
    return false;
  }

  // Stop all effects
  stopAllEffects() {
    this.activeEffects.forEach((effect, id) => {
      effect.active = false;
    });
    this.activeEffects.clear();
  }

  // Get active effects
  getActiveEffects() {
    return Array.from(this.activeEffects.values());
  }

  // Execute effect
  executeEffect(effect) {
    const preset = this.getEffectPreset(effect.presetId);
    if (preset && effect.active) {
      preset.execute(effect.fixtures, effect.parameters);
    }
  }

  // Effect implementations
  executeStrobe(fixtures, params) {
    const speed = params.speed || 10; // Hz
    const intensity = params.intensity || 255;
    const duration = params.duration || 5000;
    
    let strobeState = true;
    const startTime = Date.now();
    
    const strobe = () => {
      if (Date.now() - startTime > duration) {
        // Stop strobe
        fixtures.forEach(id => {
          this.fixtureCore.setFixtureValue(id, 'intensity', 0);
        });
        return;
      }
      
      fixtures.forEach(id => {
        this.fixtureCore.setFixtureValue(id, 'intensity', strobeState ? intensity : 0);
      });
      
      strobeState = !strobeState;
      setTimeout(strobe, 1000 / (speed * 2));
    };
    
    strobe();
  }

  executeRainbow(fixtures, params) {
    const speed = params.speed || 2; // cycles/sec
    const saturation = params.saturation || 100;
    const lightness = params.lightness || 50;
    
    let hue = 0;
    
    const rainbow = () => {
      const color = this.hslToRgb(hue, saturation, lightness);
      fixtures.forEach(id => {
        this.fixtureCore.setFixtureColor(id, color);
      });
      
      hue = (hue + speed * 2) % 360;
      setTimeout(rainbow, 50);
    };
    
    rainbow();
  }

  executeFade(fixtures, params) {
    const direction = params.direction || 'in';
    const duration = params.duration || 2000;
    const intensity = params.intensity || 255;
    
    const startTime = Date.now();
    const startValue = direction === 'in' ? 0 : intensity;
    const endValue = direction === 'in' ? intensity : 0;
    
    const fade = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      let value;
      if (direction === 'in-out') {
        value = Math.sin(progress * Math.PI) * intensity;
      } else {
        value = startValue + (endValue - startValue) * progress;
      }
      
      fixtures.forEach(id => {
        this.fixtureCore.setFixtureValue(id, 'intensity', Math.round(value));
      });
      
      if (progress < 1) {
        requestAnimationFrame(fade);
      }
    };
    
    fade();
  }

  executeWave(fixtures, params) {
    const frequency = params.frequency || 1; // Hz
    const amplitude = params.amplitude || 128;
    const offset = params.offset || 127;
    const phase = params.phase || 0;
    
    const startTime = Date.now();
    
    const wave = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const value = offset + amplitude * Math.sin(2 * Math.PI * frequency * elapsed + (phase * Math.PI / 180));
      
      fixtures.forEach(id => {
        this.fixtureCore.setFixtureValue(id, 'intensity', Math.round(Math.max(0, Math.min(255, value))));
      });
      
      requestAnimationFrame(wave);
    };
    
    wave();
  }

  executeChase(fixtures, params) {
    const speed = params.speed || 500; // ms
    const pattern = params.pattern || 'forward';
    const intensity = params.intensity || 255;
    const width = params.width || 1;
    
    let currentIndex = 0;
    let direction = 1;
    
    const chase = () => {
      // Turn off all fixtures
      fixtures.forEach(id => {
        this.fixtureCore.setFixtureValue(id, 'intensity', 0);
      });
      
      // Turn on current fixtures
      for (let i = 0; i < width; i++) {
        const index = (currentIndex + i) % fixtures.length;
        this.fixtureCore.setFixtureValue(fixtures[index], 'intensity', intensity);
      }
      
      // Update index based on pattern
      switch (pattern) {
        case 'forward':
          currentIndex = (currentIndex + 1) % fixtures.length;
          break;
        case 'backward':
          currentIndex = (currentIndex - 1 + fixtures.length) % fixtures.length;
          break;
        case 'ping-pong':
          currentIndex += direction;
          if (currentIndex >= fixtures.length - width) {
            direction = -1;
            currentIndex = fixtures.length - width;
          } else if (currentIndex <= 0) {
            direction = 1;
            currentIndex = 0;
          }
          break;
      }
      
      setTimeout(chase, speed);
    };
    
    chase();
  }

  executeColorCycle(fixtures, params) {
    const speed = params.speed || 1000; // ms
    const colors = params.colors || ['#FF0000', '#00FF00', '#0000FF'];
    
    let currentColorIndex = 0;
    
    const cycle = () => {
      const color = this.hexToRgb(colors[currentColorIndex]);
      fixtures.forEach(id => {
        this.fixtureCore.setFixtureColor(id, color);
      });
      
      currentColorIndex = (currentColorIndex + 1) % colors.length;
      setTimeout(cycle, speed);
    };
    
    cycle();
  }

  executeRandom(fixtures, params) {
    const speed = params.speed || 200; // ms
    const intensityRange = params.intensityRange || 255;
    const colorChange = params.colorChange !== false;
    
    const random = () => {
      fixtures.forEach(id => {
        // Random intensity
        const intensity = Math.floor(Math.random() * intensityRange);
        this.fixtureCore.setFixtureValue(id, 'intensity', intensity);
        
        // Random color
        if (colorChange) {
          const hue = Math.floor(Math.random() * 360);
          const saturation = 50 + Math.floor(Math.random() * 50);
          const lightness = 30 + Math.floor(Math.random() * 40);
          const color = this.hslToRgb(hue, saturation, lightness);
          this.fixtureCore.setFixtureColor(id, color);
        }
      });
      
      setTimeout(random, speed);
    };
    
    random();
  }

  executeFire(fixtures, params) {
    const intensity = params.intensity || 200;
    const flickerSpeed = params.flickerSpeed || 8; // Hz
    const colorTemp = params.colorTemperature || 3200; // K
    
    const fire = () => {
      fixtures.forEach(id => {
        // Flickering intensity
        const flicker = Math.random() * 0.3 + 0.7; // 0.7 to 1.0
        const value = Math.round(intensity * flicker);
        this.fixtureCore.setFixtureValue(id, 'intensity', value);
        
        // Fire color temperature
        const color = this.temperatureToRgb(colorTemp);
        this.fixtureCore.setFixtureColor(id, color);
      });
      
      setTimeout(fire, 1000 / flickerSpeed);
    };
    
    fire();
  }

  executeThunder(fixtures, params) {
    const intensity = params.intensity || 255;
    const flashDuration = params.flashDuration || 100; // ms
    const flashInterval = params.flashInterval || 3000; // ms
    const colorTemp = params.colorTemperature || 6500; // K
    
    const thunder = () => {
      // Flash
      const color = this.temperatureToRgb(colorTemp);
      fixtures.forEach(id => {
        this.fixtureCore.setFixtureValue(id, 'intensity', intensity);
        this.fixtureCore.setFixtureColor(id, color);
      });
      
      // Turn off after flash duration
      setTimeout(() => {
        fixtures.forEach(id => {
          this.fixtureCore.setFixtureValue(id, 'intensity', 0);
        });
      }, flashDuration);
      
      // Next flash
      setTimeout(thunder, flashInterval + Math.random() * 2000);
    };
    
    thunder();
  }

  // Effect engine
  startEffectEngine() {
    const engine = () => {
      this.activeEffects.forEach((effect, id) => {
        if (effect.active) {
          this.executeEffect(effect);
        }
      });
      requestAnimationFrame(engine);
    };
    engine();
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

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  temperatureToRgb(temp) {
    temp = Math.max(1000, Math.min(40000, temp));
    
    let r, g, b;
    
    if (temp <= 6600) {
      r = 255;
      g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
      b = temp <= 1900 ? 0 : Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 60) - 305.0447927307));
    } else {
      r = Math.max(0, Math.min(255, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
      g = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
      b = 255;
    }
    
    return {
      r: Math.round(r),
      g: Math.round(g),
      b: Math.round(b)
    };
  }

  generateId() {
    return 'effect_' + Math.random().toString(36).substr(2, 9);
  }

  // Save/load effects
  saveEffectPresets() {
    const data = {
      presets: Array.from(this.effectPresets.entries()),
      version: '1.0'
    };
    localStorage.setItem('ionxe-effect-presets', JSON.stringify(data));
  }

  loadEffectPresets() {
    try {
      const data = JSON.parse(localStorage.getItem('ionxe-effect-presets'));
      if (data && data.presets) {
        data.presets.forEach(([id, preset]) => {
          this.effectPresets.set(id, preset);
        });
      }
    } catch (error) {
      console.warn('Failed to load effect presets:', error);
    }
  }
}

// Initialize effects core
const effectsCore = new EffectsCore(fixtureCore);
