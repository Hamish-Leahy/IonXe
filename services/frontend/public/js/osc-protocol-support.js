// OSC Protocol Support
// Open Sound Control integration for lighting control

class OSCProtocolSupport {
  constructor(qListManager, effectsEngine, midiSystem) {
    this.qListManager = qListManager;
    this.effectsEngine = effectsEngine;
    this.midiSystem = midiSystem;
    this.oscServer = null;
    this.oscClient = null;
    this.isServerRunning = false;
    this.isClientConnected = false;
    this.serverPort = 8000;
    this.clientPort = 8001;
    this.clientHost = '127.0.0.1';
    this.messageHandlers = new Map();
    this.messageQueue = [];
    this.connectionTimeout = 5000;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    
    this.initializeOSCSystem();
  }

  // System Initialization
  initializeOSCSystem() {
    this.setupDefaultMessageHandlers();
    this.setupOSCEventListeners();
  }

  setupDefaultMessageHandlers() {
    // Q List handlers
    this.registerMessageHandler('/qlist/go', (message) => {
      const cueNumber = message.args[0];
      this.qListManager.goToCue(cueNumber);
    });

    this.registerMessageHandler('/qlist/next', () => {
      this.qListManager.nextCue();
    });

    this.registerMessageHandler('/qlist/previous', () => {
      this.qListManager.previousCue();
    });

    this.registerMessageHandler('/qlist/play', () => {
      this.qListManager.play();
    });

    this.registerMessageHandler('/qlist/pause', () => {
      this.qListManager.pause();
    });

    this.registerMessageHandler('/qlist/stop', () => {
      this.qListManager.stop();
    });

    // Level handlers
    this.registerMessageHandler('/levels/set', (message) => {
      const channel = message.args[0];
      const value = message.args[1];
      this.setChannelLevel(channel, value);
    });

    this.registerMessageHandler('/levels/fade', (message) => {
      const channel = message.args[0];
      const value = message.args[1];
      const time = message.args[2];
      this.fadeChannelLevel(channel, value, time);
    });

    // Effect handlers
    this.registerMessageHandler('/effects/start', (message) => {
      const effectId = message.args[0];
      const channels = message.args.slice(1);
      this.effectsEngine.startEffect(effectId, channels);
    });

    this.registerMessageHandler('/effects/stop', (message) => {
      const effectId = message.args[0];
      this.effectsEngine.stopEffect(effectId);
    });

    // Grand Master handler
    this.registerMessageHandler('/grandmaster', (message) => {
      const value = message.args[0];
      this.setGrandMaster(value);
    });

    // Blackout handler
    this.registerMessageHandler('/blackout', (message) => {
      const value = message.args[0];
      if (value > 0) {
        this.qListManager.setLevels(new Uint8Array(512));
      }
    });
  }

  setupOSCEventListeners() {
    // Listen for system events to send OSC messages
    this.qListManager.onCueChanged = (cue) => {
      this.sendOSCMessage('/qlist/cue_changed', [cue.number, cue.label]);
    };

    this.qListManager.onPlaybackStateChanged = (state) => {
      this.sendOSCMessage('/qlist/playback_state', [
        state.isPlaying ? 1 : 0,
        state.isPaused ? 1 : 0,
        state.currentCueIndex
      ]);
    };
  }

  // OSC Server Management
  async startOSCServer(port = 8000) {
    try {
      this.serverPort = port;
      
      // Create WebSocket server for OSC over WebSocket
      this.oscServer = new WebSocket(`ws://localhost:${port}`);
      
      this.oscServer.onopen = () => {
        this.isServerRunning = true;
        this.notifyOSCEvent('server_started', { port });
      };

      this.oscServer.onmessage = (event) => {
        this.handleOSCMessage(event.data);
      };

      this.oscServer.onclose = () => {
        this.isServerRunning = false;
        this.notifyOSCEvent('server_stopped', { port });
      };

      this.oscServer.onerror = (error) => {
        console.error('OSC Server error:', error);
        this.notifyOSCEvent('server_error', { error });
      };

      return true;
    } catch (error) {
      console.error('Failed to start OSC server:', error);
      return false;
    }
  }

  stopOSCServer() {
    if (this.oscServer) {
      this.oscServer.close();
      this.oscServer = null;
      this.isServerRunning = false;
    }
  }

  // OSC Client Management
  async connectOSCClient(host = '127.0.0.1', port = 8001) {
    try {
      this.clientHost = host;
      this.clientPort = port;
      
      // Create WebSocket client for OSC over WebSocket
      this.oscClient = new WebSocket(`ws://${host}:${port}`);
      
      this.oscClient.onopen = () => {
        this.isClientConnected = true;
        this.notifyOSCEvent('client_connected', { host, port });
      };

      this.oscClient.onclose = () => {
        this.isClientConnected = false;
        this.notifyOSCEvent('client_disconnected', { host, port });
      };

      this.oscClient.onerror = (error) => {
        console.error('OSC Client error:', error);
        this.notifyOSCEvent('client_error', { error });
      };

      return true;
    } catch (error) {
      console.error('Failed to connect OSC client:', error);
      return false;
    }
  }

  disconnectOSCClient() {
    if (this.oscClient) {
      this.oscClient.close();
      this.oscClient = null;
      this.isClientConnected = false;
    }
  }

  // Message Handling
  registerMessageHandler(address, handler) {
    this.messageHandlers.set(address, handler);
  }

  unregisterMessageHandler(address) {
    this.messageHandlers.delete(address);
  }

  handleOSCMessage(data) {
    try {
      const message = this.parseOSCMessage(data);
      if (!message) return;

      const handler = this.messageHandlers.get(message.address);
      if (handler) {
        handler(message);
      } else {
        console.warn(`No handler for OSC address: ${message.address}`);
      }

      this.notifyOSCEvent('message_received', message);
    } catch (error) {
      console.error('Failed to handle OSC message:', error);
    }
  }

  parseOSCMessage(data) {
    try {
      // Simple OSC message parser
      const parts = data.split(' ');
      const address = parts[0];
      const args = parts.slice(1).map(arg => {
        // Try to parse as number
        const num = parseFloat(arg);
        if (!isNaN(num)) return num;
        
        // Return as string
        return arg;
      });

      return {
        address,
        args,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to parse OSC message:', error);
      return null;
    }
  }

  // Message Sending
  sendOSCMessage(address, args = []) {
    if (!this.isClientConnected) return false;

    try {
      const message = this.formatOSCMessage(address, args);
      this.oscClient.send(message);
      
      this.notifyOSCEvent('message_sent', { address, args });
      return true;
    } catch (error) {
      console.error('Failed to send OSC message:', error);
      return false;
    }
  }

  formatOSCMessage(address, args) {
    const argStrings = args.map(arg => {
      if (typeof arg === 'number') {
        return arg.toString();
      } else if (typeof arg === 'string') {
        return arg;
      } else {
        return String(arg);
      }
    });

    return `${address} ${argStrings.join(' ')}`;
  }

  // Lighting Control Integration
  setChannelLevel(channel, value) {
    const levels = new Uint8Array(512);
    levels[channel - 1] = Math.round(value * 255);
    this.qListManager.setLevels(levels);
  }

  fadeChannelLevel(channel, value, time) {
    const levels = new Uint8Array(512);
    levels[channel - 1] = Math.round(value * 255);
    this.qListManager.fadeToLevels(levels, time);
  }

  setGrandMaster(value) {
    const intensity = Math.round(value * 255);
    document.getElementById('grand-master').value = intensity;
    document.getElementById('gm-value').textContent = intensity;
  }

  // Advanced OSC Features
  createOSCTrigger(address, condition, action) {
    const trigger = {
      id: this.generateTriggerId(),
      address,
      condition,
      action,
      isActive: true,
      lastTriggered: null,
      triggerCount: 0
    };

    this.registerMessageHandler(address, (message) => {
      if (this.evaluateCondition(condition, message)) {
        this.executeAction(action, message);
        trigger.lastTriggered = Date.now();
        trigger.triggerCount++;
      }
    });

    return trigger;
  }

  evaluateCondition(condition, message) {
    switch (condition.type) {
      case 'value_equals':
        return message.args[condition.argIndex] === condition.value;
      case 'value_greater':
        return message.args[condition.argIndex] > condition.value;
      case 'value_less':
        return message.args[condition.argIndex] < condition.value;
      case 'value_range':
        const value = message.args[condition.argIndex];
        return value >= condition.min && value <= condition.max;
      case 'custom':
        if (condition.evaluator) {
          return condition.evaluator(message);
        }
        return true;
      default:
        return true;
    }
  }

  executeAction(action, message) {
    switch (action.type) {
      case 'go_to_cue':
        this.qListManager.goToCue(action.cueNumber);
        break;
      case 'start_effect':
        this.effectsEngine.startEffect(action.effectId, action.channels);
        break;
      case 'set_levels':
        this.setChannelLevel(action.channel, action.value);
        break;
      case 'send_osc':
        this.sendOSCMessage(action.address, action.args);
        break;
      case 'custom':
        if (action.callback) {
          action.callback(message, action.data);
        }
        break;
    }
  }

  // OSC Routing
  createOSCRoute(fromAddress, toAddress, transform = null) {
    const route = {
      id: this.generateRouteId(),
      fromAddress,
      toAddress,
      transform,
      isActive: true,
      messageCount: 0
    };

    this.registerMessageHandler(fromAddress, (message) => {
      if (route.isActive) {
        let transformedMessage = message;
        
        if (transform) {
          transformedMessage = this.transformMessage(message, transform);
        }
        
        this.sendOSCMessage(toAddress, transformedMessage.args);
        route.messageCount++;
      }
    });

    return route;
  }

  transformMessage(message, transform) {
    const transformedArgs = [...message.args];
    
    switch (transform.type) {
      case 'scale':
        transformedArgs[transform.argIndex] *= transform.factor;
        break;
      case 'offset':
        transformedArgs[transform.argIndex] += transform.offset;
        break;
      case 'clamp':
        const value = transformedArgs[transform.argIndex];
        transformedArgs[transform.argIndex] = Math.max(transform.min, Math.min(transform.max, value));
        break;
      case 'map':
        const inputValue = transformedArgs[transform.argIndex];
        const inputRange = transform.inputMax - transform.inputMin;
        const outputRange = transform.outputMax - transform.outputMin;
        const normalizedValue = (inputValue - transform.inputMin) / inputRange;
        transformedArgs[transform.argIndex] = transform.outputMin + (normalizedValue * outputRange);
        break;
      case 'custom':
        if (transform.transformer) {
          transformedArgs[transform.argIndex] = transform.transformer(transformedArgs[transform.argIndex]);
        }
        break;
    }
    
    return {
      address: message.address,
      args: transformedArgs,
      timestamp: message.timestamp
    };
  }

  // OSC Discovery
  async discoverOSCDevices() {
    const devices = [];
    
    // Scan common OSC ports
    const commonPorts = [8000, 8001, 9000, 9001, 10000, 10001];
    
    for (const port of commonPorts) {
      try {
        const device = await this.testOSCConnection('127.0.0.1', port);
        if (device) {
          devices.push(device);
        }
      } catch (error) {
        // Port not available
      }
    }
    
    return devices;
  }

  async testOSCConnection(host, port) {
    return new Promise((resolve) => {
      const testSocket = new WebSocket(`ws://${host}:${port}`);
      const timeout = setTimeout(() => {
        testSocket.close();
        resolve(null);
      }, 1000);
      
      testSocket.onopen = () => {
        clearTimeout(timeout);
        testSocket.close();
        resolve({
          host,
          port,
          name: `OSC Device ${port}`,
          status: 'connected'
        });
      };
      
      testSocket.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };
    });
  }

  // Utility Functions
  generateTriggerId() {
    return 'osc_trigger_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateRouteId() {
    return 'osc_route_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getOSCStatus() {
    return {
      serverRunning: this.isServerRunning,
      clientConnected: this.isClientConnected,
      serverPort: this.serverPort,
      clientHost: this.clientHost,
      clientPort: this.clientPort,
      messageHandlers: this.messageHandlers.size,
      messageQueue: this.messageQueue.length
    };
  }

  // Event Notifications
  notifyOSCEvent(eventType, data) {
    const event = new CustomEvent('osc-event', {
      detail: { eventType, data }
    });
    document.dispatchEvent(event);
  }

  // Cleanup
  destroy() {
    this.stopOSCServer();
    this.disconnectOSCClient();
    this.messageHandlers.clear();
    this.messageQueue = [];
  }
}

// Global OSC Protocol Support Instance
const oscProtocolSupport = new OSCProtocolSupport(qListManager, effectsEngine, midiIntegrationSystem);
