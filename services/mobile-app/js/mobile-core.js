// IonXe Mobile Core - Connection and state management
class MobileCore {
  constructor() {
    this.consoleIP = 'localhost';
    this.consolePort = 8082;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.heartbeatInterval = null;
    this.offlineQueue = [];
    
    // WebSocket connection
    this.ws = null;
    
    // Event system
    this.listeners = new Map();
    
    // Initialize
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadSettings();
    this.connectToConsole();
  }

  setupEventListeners() {
    // Connection status updates
    window.addEventListener('online', () => {
      this.showToast('Connection restored', 'success');
      this.connectToConsole();
    });

    window.addEventListener('offline', () => {
      this.showToast('Connection lost', 'error');
      this.handleDisconnection();
    });

    // Visibility change (app backgrounded/foregrounded)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseHeartbeat();
      } else {
        this.resumeHeartbeat();
      }
    });

    // Before unload (save state)
    window.addEventListener('beforeunload', () => {
      this.saveSettings();
    });
  }

  // Connection Management
  async connectToConsole() {
    try {
      this.updateConnectionStatus('Connecting...', false);
      
      // Try WebSocket first
      if (this.tryWebSocketConnection()) {
        return;
      }
      
      // Fallback to HTTP polling
      this.startHttpPolling();
      
    } catch (error) {
      console.error('Connection failed:', error);
      this.handleConnectionError(error);
    }
  }

  tryWebSocketConnection() {
    try {
      const wsUrl = `ws://${this.consoleIP}:${this.consolePort}/ws`;
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.handleConnectionSuccess();
      };
      
      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.handleDisconnection();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.handleConnectionError(error);
      };
      
      return true;
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      return false;
    }
  }

  startHttpPolling() {
    console.log('Starting HTTP polling fallback');
    this.pollingInterval = setInterval(() => {
      this.pollConsoleStatus();
    }, 1000);
  }

  async pollConsoleStatus() {
    try {
      const response = await fetch(`http://${this.consoleIP}:${this.consolePort}/api/status`);
      if (response.ok) {
        this.handleConnectionSuccess();
        const data = await response.json();
        this.emit('statusUpdate', data);
      }
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  handleConnectionSuccess() {
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.updateConnectionStatus('Connected', true);
    this.startHeartbeat();
    this.processOfflineQueue();
    this.emit('connected');
  }

  handleDisconnection() {
    this.isConnected = false;
    this.updateConnectionStatus('Disconnected', false);
    this.stopHeartbeat();
    this.emit('disconnected');
    
    // Auto-reconnect if enabled
    if (this.settings.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connectToConsole();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  handleConnectionError(error) {
    console.error('Connection error:', error);
    this.updateConnectionStatus('Error', false);
    this.emit('connectionError', error);
  }

  // WebSocket Message Handling
  handleWebSocketMessage(event) {
    try {
      const data = JSON.parse(event.data);
      this.emit('message', data);
      
      // Handle specific message types
      switch (data.type) {
        case 'faderUpdate':
          this.emit('faderUpdate', data.payload);
          break;
        case 'sceneUpdate':
          this.emit('sceneUpdate', data.payload);
          break;
        case 'systemStatus':
          this.emit('systemStatus', data.payload);
          break;
        case 'error':
          this.showToast(data.message, 'error');
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  // Heartbeat Management
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000); // 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  pauseHeartbeat() {
    this.stopHeartbeat();
  }

  resumeHeartbeat() {
    if (this.isConnected) {
      this.startHeartbeat();
    }
  }

  sendHeartbeat() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }

  // API Communication
  async apiRequest(endpoint, options = {}) {
    const url = `http://${this.consoleIP}:${this.consolePort}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      
      // Queue for offline processing
      this.queueOfflineRequest(endpoint, options);
      throw error;
    }
  }

  // Offline Queue Management
  queueOfflineRequest(endpoint, options) {
    this.offlineQueue.push({
      endpoint,
      options,
      timestamp: Date.now()
    });
    
    // Limit queue size
    if (this.offlineQueue.length > 100) {
      this.offlineQueue.shift();
    }
  }

  async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    
    console.log(`Processing ${this.offlineQueue.length} queued requests`);
    
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    
    for (const request of queue) {
      try {
        await this.apiRequest(request.endpoint, request.options);
      } catch (error) {
        console.error('Failed to process queued request:', error);
        // Re-queue if still failing
        this.offlineQueue.push(request);
      }
    }
  }

  // Settings Management
  loadSettings() {
    try {
      const saved = localStorage.getItem('ionxe-mobile-settings');
      if (saved) {
        this.settings = { ...this.getDefaultSettings(), ...JSON.parse(saved) };
      } else {
        this.settings = this.getDefaultSettings();
      }
      
      this.consoleIP = this.settings.consoleIP;
      this.consolePort = this.settings.consolePort;
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('ionxe-mobile-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  getDefaultSettings() {
    return {
      consoleIP: 'localhost',
      consolePort: 8082,
      autoReconnect: true,
      hapticFeedback: true,
      brightness: 100,
      theme: 'dark'
    };
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
    
    // Apply setting changes
    switch (key) {
      case 'consoleIP':
        this.consoleIP = value;
        break;
      case 'consolePort':
        this.consolePort = value;
        break;
      case 'brightness':
        this.applyBrightness(value);
        break;
    }
  }

  applyBrightness(value) {
    document.body.style.filter = `brightness(${value}%)`;
  }

  // UI Updates
  updateConnectionStatus(text, connected) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      const dot = statusElement.querySelector('.status-dot');
      const textElement = statusElement.querySelector('.status-text');
      
      if (dot) {
        dot.classList.toggle('connected', connected);
      }
      
      if (textElement) {
        textElement.textContent = text;
      }
    }
  }

  // Toast Notifications
  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, duration);

    // Haptic feedback
    if (this.settings.hapticFeedback && navigator.vibrate) {
      navigator.vibrate(50);
    }
  }

  // Event System
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Event callback error:', error);
        }
      });
    }
  }

  // Utility Methods
  formatValue(value, max = 255) {
    return Math.round((value / max) * 100);
  }

  formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }

  // Cleanup
  destroy() {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
    }
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    this.saveSettings();
  }
}

// Initialize mobile core
window.mobileCore = new MobileCore();

