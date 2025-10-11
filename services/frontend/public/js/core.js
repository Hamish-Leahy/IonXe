// Core functionality and state management
class IonXeCore {
  constructor() {
    this.base = '';
    this.authToken = localStorage.getItem('ionxe_token') || '';
    this.currentView = 'console';
    this.eventListeners = new Map();
    this.modules = new Map();
    
    this.initialize();
  }

  async apiFetch(path, init = {}) {
    const headers = init.headers || {};
    if (this.authToken) headers['Authorization'] = 'Bearer ' + this.authToken;
    init.headers = headers;
    
    try {
      const response = await fetch(this.base + path, init);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      return response;
    } catch (error) {
      console.error('API Fetch Error:', error);
      this.showError(`API Error: ${error.message}`);
      throw error;
    }
  }

  setActiveView(hash) {
    const viewId = (hash || '#console').replace('#', '');
    this.currentView = viewId;
    
    // Update UI
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    
    const tab = document.getElementById('tab-' + viewId);
    const view = document.getElementById('view-' + viewId);
    
    if (tab) tab.classList.add('active');
    if (view) view.classList.add('active');
    
    // Notify modules of view change
    this.emit('viewChanged', { viewId, previousView: this.currentView });
  }

  initialize() {
    this.setupRouter();
    this.setupErrorHandling();
    this.setupKeyboardShortcuts();
    this.loadModules();
  }

  setupRouter() {
    window.addEventListener('hashchange', () => {
      this.setActiveView(location.hash);
    });
    this.setActiveView(location.hash);
  }

  setupErrorHandling() {
    window.addEventListener('error', (event) => {
      console.error('Global Error:', event.error);
      this.showError('An unexpected error occurred');
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      this.showError('An unexpected error occurred');
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Global keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            this.emit('saveRequested');
            break;
          case 'z':
            event.preventDefault();
            this.emit('undoRequested');
            break;
          case 'y':
            event.preventDefault();
            this.emit('redoRequested');
            break;
        }
      }
      
      // Tab navigation
      if (event.key === 'Tab' && event.shiftKey) {
        event.preventDefault();
        this.navigateToPreviousTab();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        this.navigateToNextTab();
      }
    });
  }

  navigateToNextTab() {
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const currentIndex = tabs.findIndex(tab => tab.classList.contains('active'));
    const nextIndex = (currentIndex + 1) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (nextTab) {
      nextTab.click();
    }
  }

  navigateToPreviousTab() {
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const currentIndex = tabs.findIndex(tab => tab.classList.contains('active'));
    const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
    const prevTab = tabs[prevIndex];
    if (prevTab) {
      prevTab.click();
    }
  }

  loadModules() {
    // Load modules in dependency order
    const moduleOrder = [
      'state',
      'keyboardShortcuts',
      'faders',
      'buttons',
      'scenes',
      'macros',
      'color',
      'fixtures',
      'qlist',
      'files',
      'auth',
      'ai-lighting'
    ];

    moduleOrder.forEach(moduleName => {
      try {
        let className;
        if (moduleName === 'ai-lighting') {
          className = 'AiLighting';
        } else {
          className = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
        }
        
        if (window[`IonXe${className}`]) {
          this.modules.set(moduleName, new window[`IonXe${className}`](this));
        }
      } catch (error) {
        console.warn(`Failed to load module ${moduleName}:`, error);
      }
    });
  }

  // Event system
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  showError(message) {
    // Create or update error notification
    let errorEl = document.getElementById('error-notification');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.id = 'error-notification';
      errorEl.className = 'error-notification';
      document.body.appendChild(errorEl);
    }
    
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }

  showSuccess(message) {
    // Create or update success notification
    let successEl = document.getElementById('success-notification');
    if (!successEl) {
      successEl = document.createElement('div');
      successEl.id = 'success-notification';
      successEl.className = 'success-notification';
      document.body.appendChild(successEl);
    }
    
    successEl.textContent = message;
    successEl.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      successEl.style.display = 'none';
    }, 3000);
  }

  // Module management
  getModule(name) {
    return this.modules.get(name);
  }

  registerModule(name, module) {
    this.modules.set(name, module);
  }
}

// Global state management
class IonXeState {
  constructor() {
    this.faderValues = new Uint8Array(512);
    this.page = 0;
    this.currentBank = 0;
    this.flushPending = false;
    this.polling = false;
    
    // Constants
    this.NUM_FADERS = 24;
    this.maxPage = Math.ceil(512 / this.NUM_FADERS) - 1;
    this.BANKS_PER_PAGE = 4;
    this.FADERS_PER_BANK = 6;
    this.TOTAL_BANKS = Math.ceil(512 / this.FADERS_PER_BANK);
    
    // Button states
    this.buttonStates = {
      selectedChannels: new Set(),
      lastSelectedChannel: null,
      macroMode: false,
      recordMode: false,
      blindMode: false,
      liveMode: true
    };
    
    // Grand master
    this.grandMaster = 255;
  }

  updateFaderValue(channel, value) {
    if (channel >= 0 && channel < 512) {
      this.faderValues[channel] = value;
      this.emit('faderChanged', { channel, value });
    }
  }

  getFaderValue(channel) {
    return this.faderValues[channel] || 0;
  }

  applyGrandMaster(value) {
    return Math.round((value * this.grandMaster) / 255) & 0xff;
  }

  setGrandMaster(value) {
    this.grandMaster = Math.max(0, Math.min(255, value));
    this.emit('grandMasterChanged', { value: this.grandMaster });
  }

  selectChannel(channel, multiSelect = false) {
    if (!multiSelect) {
      this.buttonStates.selectedChannels.clear();
    }
    
    if (this.buttonStates.selectedChannels.has(channel)) {
      this.buttonStates.selectedChannels.delete(channel);
    } else {
      this.buttonStates.selectedChannels.add(channel);
    }
    
    this.buttonStates.lastSelectedChannel = channel;
    this.emit('channelSelectionChanged', { 
      selectedChannels: Array.from(this.buttonStates.selectedChannels),
      lastSelected: channel 
    });
  }

  clearSelection() {
    this.buttonStates.selectedChannels.clear();
    this.buttonStates.lastSelectedChannel = null;
    this.emit('channelSelectionChanged', { 
      selectedChannels: [],
      lastSelected: null 
    });
  }
}

// Initialize core system
window.IonXeCore = IonXeCore;
window.IonXeState = IonXeState;

// Global instance
let ionxeCore;
let ionxeState;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  ionxeCore = new IonXeCore();
  ionxeState = new IonXeState();
  
  // Make globally available
  window.ionxe = {
    core: ionxeCore,
    state: ionxeState
  };
});
