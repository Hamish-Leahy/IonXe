// Plugin Architecture System
// Extensible plugin system for custom functionality

class PluginArchitectureSystem {
  constructor(qListManager, effectsEngine, showAutomation) {
    this.qListManager = qListManager;
    this.effectsEngine = effectsEngine;
    this.showAutomation = showAutomation;
    this.plugins = new Map();
    this.pluginRegistry = new Map();
    this.pluginHooks = new Map();
    this.pluginAPI = null;
    this.isInitialized = false;
    this.pluginSandbox = null;
    
    this.initializePluginSystem();
  }

  // System Initialization
  initializePluginSystem() {
    this.setupPluginAPI();
    this.setupPluginHooks();
    this.setupPluginSandbox();
    this.loadBuiltInPlugins();
    this.isInitialized = true;
  }

  setupPluginAPI() {
    this.pluginAPI = {
      // Q List API
      qList: {
        addCue: (data) => this.qListManager.addCue(data),
        updateCue: (id, updates) => this.qListManager.updateCue(id, updates),
        deleteCue: (id) => this.qListManager.deleteCue(id),
        goToCue: (number) => this.qListManager.goToCue(number),
        nextCue: () => this.qListManager.nextCue(),
        previousCue: () => this.qListManager.previousCue(),
        play: () => this.qListManager.play(),
        pause: () => this.qListManager.pause(),
        stop: () => this.qListManager.stop(),
        getCurrentCue: () => this.qListManager.getCurrentCue(),
        getAllCues: () => this.qListManager.cues,
        exportCueList: () => this.qListManager.exportCueList(),
        importCueList: (data) => this.qListManager.importCueList(data)
      },
      
      // Effects API
      effects: {
        createEffect: (id, config) => this.effectsEngine.createEffect(id, config),
        startEffect: (id, channels, params) => this.effectsEngine.startEffect(id, channels, params),
        stopEffect: (id) => this.effectsEngine.stopEffect(id),
        getAllEffects: () => this.effectsEngine.getAllEffects(),
        getActiveEffects: () => this.effectsEngine.getActiveEffects()
      },
      
      // Automation API
      automation: {
        createAutomation: (id, config) => this.showAutomation.createAutomation(id, config),
        startAutomation: (id) => this.showAutomation.startAutomation(id),
        stopAutomation: (id) => this.showAutomation.stopAutomation(id),
        getAllAutomations: () => this.showAutomation.getAllAutomations()
      },
      
      // Utility API
      utils: {
        generateId: () => this.generateId(),
        formatTime: (ms) => this.formatTime(ms),
        colorToHex: (color) => this.colorToHex(color),
        hexToRgb: (hex) => this.hexToRgb(hex),
        rgbToHsl: (r, g, b) => this.rgbToHsl(r, g, b),
        hslToRgb: (h, s, l) => this.hslToRgb(h, s, l)
      },
      
      // Event API
      events: {
        on: (event, callback) => this.addEventListener(event, callback),
        off: (event, callback) => this.removeEventListener(event, callback),
        emit: (event, data) => this.emitEvent(event, data)
      },
      
      // Storage API
      storage: {
        set: (key, value) => this.setStorage(key, value),
        get: (key) => this.getStorage(key),
        remove: (key) => this.removeStorage(key),
        clear: () => this.clearStorage()
      },
      
      // Network API
      network: {
        fetch: (url, options) => this.networkFetch(url, options),
        post: (url, data) => this.networkPost(url, data),
        get: (url) => this.networkGet(url)
      }
    };
  }

  setupPluginHooks() {
    this.pluginHooks.set('cue_added', []);
    this.pluginHooks.set('cue_updated', []);
    this.pluginHooks.set('cue_deleted', []);
    this.pluginHooks.set('cue_executed', []);
    this.pluginHooks.set('effect_started', []);
    this.pluginHooks.set('effect_stopped', []);
    this.pluginHooks.set('automation_triggered', []);
    this.pluginHooks.set('show_saved', []);
    this.pluginHooks.set('show_loaded', []);
    this.pluginHooks.set('plugin_loaded', []);
    this.pluginHooks.set('plugin_unloaded', []);
  }

  setupPluginSandbox() {
    this.pluginSandbox = {
      // Create isolated context for plugins
      createContext: (pluginId) => {
        return {
          pluginId,
          api: this.pluginAPI,
          hooks: this.getPluginHooks(pluginId),
          storage: this.getPluginStorage(pluginId),
          permissions: this.getPluginPermissions(pluginId)
        };
      }
    };
  }

  // Plugin Management
  async loadPlugin(pluginConfig) {
    const plugin = {
      id: pluginConfig.id,
      name: pluginConfig.name,
      version: pluginConfig.version,
      description: pluginConfig.description,
      author: pluginConfig.author,
      permissions: pluginConfig.permissions || [],
      dependencies: pluginConfig.dependencies || [],
      hooks: pluginConfig.hooks || {},
      isLoaded: false,
      isEnabled: false,
      loadTime: null,
      context: null,
      instance: null,
      config: pluginConfig
    };

    try {
      // Check dependencies
      await this.checkDependencies(plugin);
      
      // Create plugin context
      plugin.context = this.pluginSandbox.createContext(plugin.id);
      
      // Load plugin code
      plugin.instance = await this.loadPluginCode(plugin);
      
      // Initialize plugin
      if (plugin.instance.init) {
        await plugin.instance.init(plugin.context);
      }
      
      // Register hooks
      this.registerPluginHooks(plugin);
      
      plugin.isLoaded = true;
      plugin.loadTime = Date.now();
      
      this.plugins.set(plugin.id, plugin);
      this.notifyPluginEvent('plugin_loaded', plugin);
      
      return plugin;
    } catch (error) {
      console.error(`Failed to load plugin ${plugin.id}:`, error);
      throw error;
    }
  }

  async unloadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    try {
      // Call plugin cleanup
      if (plugin.instance && plugin.instance.destroy) {
        await plugin.instance.destroy();
      }
      
      // Unregister hooks
      this.unregisterPluginHooks(plugin);
      
      // Clear plugin storage
      this.clearPluginStorage(pluginId);
      
      plugin.isLoaded = false;
      plugin.isEnabled = false;
      plugin.instance = null;
      
      this.plugins.delete(pluginId);
      this.notifyPluginEvent('plugin_unloaded', plugin);
      
      return true;
    } catch (error) {
      console.error(`Failed to unload plugin ${pluginId}:`, error);
      return false;
    }
  }

  async enablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.isLoaded) return false;

    try {
      if (plugin.instance && plugin.instance.enable) {
        await plugin.instance.enable();
      }
      
      plugin.isEnabled = true;
      this.notifyPluginEvent('plugin_enabled', plugin);
      
      return true;
    } catch (error) {
      console.error(`Failed to enable plugin ${pluginId}:`, error);
      return false;
    }
  }

  async disablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.isLoaded) return false;

    try {
      if (plugin.instance && plugin.instance.disable) {
        await plugin.instance.disable();
      }
      
      plugin.isEnabled = false;
      this.notifyPluginEvent('plugin_disabled', plugin);
      
      return true;
    } catch (error) {
      console.error(`Failed to disable plugin ${pluginId}:`, error);
      return false;
    }
  }

  // Plugin Code Loading
  async loadPluginCode(plugin) {
    if (plugin.config.code) {
      // Inline code
      return this.executePluginCode(plugin.config.code, plugin.context);
    } else if (plugin.config.url) {
      // External URL
      const response = await fetch(plugin.config.url);
      const code = await response.text();
      return this.executePluginCode(code, plugin.context);
    } else if (plugin.config.module) {
      // ES6 module
      return await import(plugin.config.module);
    }
    
    throw new Error('No plugin code specified');
  }

  executePluginCode(code, context) {
    // Create safe execution environment
    const sandbox = {
      console: console,
      setTimeout: setTimeout,
      setInterval: setInterval,
      clearTimeout: clearTimeout,
      clearInterval: clearInterval,
      Math: Math,
      Date: Date,
      JSON: JSON,
      Array: Array,
      Object: Object,
      String: String,
      Number: Number,
      Boolean: Boolean,
      RegExp: RegExp,
      Error: Error,
      Promise: Promise,
      ...context
    };

    // Execute plugin code in sandbox
    const func = new Function(...Object.keys(sandbox), `
      "use strict";
      ${code}
      return typeof module !== 'undefined' ? module.exports : {};
    `);

    return func(...Object.values(sandbox));
  }

  // Hook System
  registerPluginHooks(plugin) {
    for (const [hookName, callback] of Object.entries(plugin.hooks)) {
      if (this.pluginHooks.has(hookName)) {
        this.pluginHooks.get(hookName).push({
          pluginId: plugin.id,
          callback: callback.bind(plugin.instance)
        });
      }
    }
  }

  unregisterPluginHooks(plugin) {
    for (const [hookName, hooks] of this.pluginHooks) {
      const filteredHooks = hooks.filter(hook => hook.pluginId !== plugin.id);
      this.pluginHooks.set(hookName, filteredHooks);
    }
  }

  async triggerHook(hookName, data) {
    const hooks = this.pluginHooks.get(hookName) || [];
    
    for (const hook of hooks) {
      try {
        const plugin = this.plugins.get(hook.pluginId);
        if (plugin && plugin.isEnabled) {
          await hook.callback(data);
        }
      } catch (error) {
        console.error(`Hook ${hookName} failed in plugin ${hook.pluginId}:`, error);
      }
    }
  }

  // Built-in Plugins
  loadBuiltInPlugins() {
    // Cue List Statistics Plugin
    this.loadPlugin({
      id: 'cue_stats',
      name: 'Cue List Statistics',
      version: '1.0.0',
      description: 'Provides statistics about cue list usage',
      author: 'IonXe Team',
      permissions: ['read_cues'],
      hooks: {
        cue_executed: (cue) => {
          this.updateCueStatistics(cue);
        }
      }
    });

    // Auto-save Plugin
    this.loadPlugin({
      id: 'auto_save',
      name: 'Auto Save',
      version: '1.0.0',
      description: 'Automatically saves show data',
      author: 'IonXe Team',
      permissions: ['write_shows'],
      hooks: {
        cue_added: () => this.scheduleAutoSave(),
        cue_updated: () => this.scheduleAutoSave(),
        cue_deleted: () => this.scheduleAutoSave()
      }
    });

    // Performance Monitor Plugin
    this.loadPlugin({
      id: 'performance_monitor',
      name: 'Performance Monitor',
      version: '1.0.0',
      description: 'Monitors system performance',
      author: 'IonXe Team',
      permissions: ['read_system'],
      hooks: {
        plugin_loaded: () => this.startPerformanceMonitoring()
      }
    });
  }

  // Plugin Registry
  registerPlugin(pluginConfig) {
    this.pluginRegistry.set(pluginConfig.id, pluginConfig);
  }

  getRegisteredPlugins() {
    return Array.from(this.pluginRegistry.values());
  }

  async installPlugin(pluginId) {
    const pluginConfig = this.pluginRegistry.get(pluginId);
    if (!pluginConfig) {
      throw new Error('Plugin not found in registry');
    }

    return await this.loadPlugin(pluginConfig);
  }

  // Utility Functions
  generateId() {
    return 'plugin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
  }

  colorToHex(color) {
    if (typeof color === 'string') {
      return color.replace('#', '');
    }
    return color.toString(16).padStart(6, '0');
  }

  hexToRgb(hex) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b };
  }

  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

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

  // Event Notifications
  notifyPluginEvent(eventType, data) {
    const event = new CustomEvent('plugin-event', {
      detail: { eventType, data }
    });
    document.dispatchEvent(event);
  }

  // Cleanup
  destroy() {
    // Unload all plugins
    for (const pluginId of this.plugins.keys()) {
      this.unloadPlugin(pluginId);
    }
    
    this.plugins.clear();
    this.pluginRegistry.clear();
    this.pluginHooks.clear();
    this.isInitialized = false;
  }
}

// Global Plugin Architecture System Instance
const pluginArchitectureSystem = new PluginArchitectureSystem(qListManager, effectsEngine, showAutomationFramework);
