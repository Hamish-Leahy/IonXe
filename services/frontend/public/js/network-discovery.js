// Network Discovery System
// Automatic discovery and management of network devices

class NetworkDiscoverySystem {
  constructor(qListManager, midiSystem, oscSystem) {
    this.qListManager = qListManager;
    this.midiSystem = midiSystem;
    this.oscSystem = oscSystem;
    this.discoveredDevices = new Map();
    this.scanningIntervals = new Map();
    this.isScanning = false;
    this.scanTimeout = 5000;
    this.retryAttempts = 3;
    this.retryDelay = 1000;
    this.deviceTypes = new Map();
    this.connectionPool = new Map();
    
    this.initializeDiscoverySystem();
  }

  // System Initialization
  initializeDiscoverySystem() {
    this.setupDeviceTypes();
    this.setupDiscoveryProtocols();
    this.setupEventListeners();
  }

  setupDeviceTypes() {
    const types = [
      { id: 'lighting_console', name: 'Lighting Console', protocols: ['artnet', 'sacn', 'osc'] },
      { id: 'dmx_node', name: 'DMX Node', protocols: ['artnet', 'sacn'] },
      { id: 'media_server', name: 'Media Server', protocols: ['osc', 'http'] },
      { id: 'audio_mixer', name: 'Audio Mixer', protocols: ['osc', 'midi'] },
      { id: 'video_switcher', name: 'Video Switcher', protocols: ['osc', 'http'] },
      { id: 'camera', name: 'Camera', protocols: ['http', 'rtsp'] },
      { id: 'sensor', name: 'Sensor', protocols: ['http', 'mqtt'] },
      { id: 'controller', name: 'Controller', protocols: ['osc', 'midi', 'http'] }
    ];

    for (const type of types) {
      this.deviceTypes.set(type.id, type);
    }
  }

  setupDiscoveryProtocols() {
    this.discoveryProtocols = {
      artnet: {
        name: 'Art-Net',
        port: 6454,
        scan: () => this.scanArtNet(),
        connect: (device) => this.connectArtNet(device)
      },
      sacn: {
        name: 'sACN (E1.31)',
        port: 5568,
        scan: () => this.scanSACN(),
        connect: (device) => this.connectSACN(device)
      },
      osc: {
        name: 'OSC',
        port: 8000,
        scan: () => this.scanOSC(),
        connect: (device) => this.connectOSC(device)
      },
      http: {
        name: 'HTTP',
        port: 80,
        scan: () => this.scanHTTP(),
        connect: (device) => this.connectHTTP(device)
      },
      midi: {
        name: 'MIDI',
        port: null,
        scan: () => this.scanMIDI(),
        connect: (device) => this.connectMIDI(device)
      }
    };
  }

  setupEventListeners() {
    // Listen for network changes
    window.addEventListener('online', () => {
      this.startNetworkScan();
    });

    window.addEventListener('offline', () => {
      this.stopNetworkScan();
    });
  }

  // Device Discovery
  async startNetworkScan(protocols = null) {
    if (this.isScanning) return;

    this.isScanning = true;
    this.notifyDiscoveryEvent('scan_started', null);

    try {
      const protocolsToScan = protocols || Object.keys(this.discoveryProtocols);
      
      for (const protocol of protocolsToScan) {
        const protocolHandler = this.discoveryProtocols[protocol];
        if (protocolHandler && protocolHandler.scan) {
          await protocolHandler.scan();
        }
      }
    } catch (error) {
      console.error('Network scan failed:', error);
    } finally {
      this.isScanning = false;
      this.notifyDiscoveryEvent('scan_completed', null);
    }
  }

  stopNetworkScan() {
    this.isScanning = false;
    
    // Clear all scanning intervals
    for (const interval of this.scanningIntervals.values()) {
      clearInterval(interval);
    }
    this.scanningIntervals.clear();
    
    this.notifyDiscoveryEvent('scan_stopped', null);
  }

  // Protocol-specific Discovery
  async scanArtNet() {
    const devices = [];
    const subnet = this.getLocalSubnet();
    
    for (let i = 1; i < 255; i++) {
      const ip = `${subnet}.${i}`;
      try {
        const device = await this.testArtNetConnection(ip);
        if (device) {
          devices.push(device);
          this.addDiscoveredDevice(device);
        }
      } catch (error) {
        // Device not responding
      }
    }
    
    return devices;
  }

  async testArtNetConnection(ip) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, 1000);

      // Create WebSocket connection for Art-Net testing
      const testSocket = new WebSocket(`ws://${ip}:6454`);
      
      testSocket.onopen = () => {
        clearTimeout(timeout);
        testSocket.close();
        resolve({
          id: this.generateDeviceId(),
          name: `Art-Net Device ${ip}`,
          type: 'dmx_node',
          protocol: 'artnet',
          ip: ip,
          port: 6454,
          status: 'connected',
          capabilities: ['dmx_output'],
          lastSeen: Date.now()
        });
      };
      
      testSocket.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };
    });
  }

  async scanSACN() {
    const devices = [];
    const subnet = this.getLocalSubnet();
    
    for (let i = 1; i < 255; i++) {
      const ip = `${subnet}.${i}`;
      try {
        const device = await this.testSACNConnection(ip);
        if (device) {
          devices.push(device);
          this.addDiscoveredDevice(device);
        }
      } catch (error) {
        // Device not responding
      }
    }
    
    return devices;
  }

  async testSACNConnection(ip) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, 1000);

      const testSocket = new WebSocket(`ws://${ip}:5568`);
      
      testSocket.onopen = () => {
        clearTimeout(timeout);
        testSocket.close();
        resolve({
          id: this.generateDeviceId(),
          name: `sACN Device ${ip}`,
          type: 'dmx_node',
          protocol: 'sacn',
          ip: ip,
          port: 5568,
          status: 'connected',
          capabilities: ['dmx_output'],
          lastSeen: Date.now()
        });
      };
      
      testSocket.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };
    });
  }

  async scanOSC() {
    const devices = [];
    const subnet = this.getLocalSubnet();
    const commonPorts = [8000, 8001, 9000, 9001];
    
    for (let i = 1; i < 255; i++) {
      const ip = `${subnet}.${i}`;
      for (const port of commonPorts) {
        try {
          const device = await this.testOSCConnection(ip, port);
          if (device) {
            devices.push(device);
            this.addDiscoveredDevice(device);
          }
        } catch (error) {
          // Device not responding
        }
      }
    }
    
    return devices;
  }

  async testOSCConnection(ip, port) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, 1000);

      const testSocket = new WebSocket(`ws://${ip}:${port}`);
      
      testSocket.onopen = () => {
        clearTimeout(timeout);
        testSocket.close();
        resolve({
          id: this.generateDeviceId(),
          name: `OSC Device ${ip}:${port}`,
          type: 'controller',
          protocol: 'osc',
          ip: ip,
          port: port,
          status: 'connected',
          capabilities: ['osc_control'],
          lastSeen: Date.now()
        });
      };
      
      testSocket.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };
    });
  }

  async scanHTTP() {
    const devices = [];
    const subnet = this.getLocalSubnet();
    const commonPorts = [80, 8080, 8000, 3000];
    
    for (let i = 1; i < 255; i++) {
      const ip = `${subnet}.${i}`;
      for (const port of commonPorts) {
        try {
          const device = await this.testHTTPConnection(ip, port);
          if (device) {
            devices.push(device);
            this.addDiscoveredDevice(device);
          }
        } catch (error) {
          // Device not responding
        }
      }
    }
    
    return devices;
  }

  async testHTTPConnection(ip, port) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, 1000);

      fetch(`http://${ip}:${port}`, { 
        method: 'HEAD',
        mode: 'no-cors',
        timeout: 1000
      })
      .then(() => {
        clearTimeout(timeout);
        resolve({
          id: this.generateDeviceId(),
          name: `HTTP Device ${ip}:${port}`,
          type: 'media_server',
          protocol: 'http',
          ip: ip,
          port: port,
          status: 'connected',
          capabilities: ['http_api'],
          lastSeen: Date.now()
        });
      })
      .catch(() => {
        clearTimeout(timeout);
        resolve(null);
      });
    });
  }

  async scanMIDI() {
    // MIDI devices are handled by the MIDI system
    const midiDevices = this.midiSystem.getAllInputs();
    const devices = [];
    
    for (const midiDevice of midiDevices) {
      const device = {
        id: this.generateDeviceId(),
        name: midiDevice.name,
        type: 'controller',
        protocol: 'midi',
        port: midiDevice.id,
        status: midiDevice.isActive ? 'connected' : 'disconnected',
        capabilities: ['midi_control'],
        lastSeen: Date.now()
      };
      
      devices.push(device);
      this.addDiscoveredDevice(device);
    }
    
    return devices;
  }

  // Device Management
  addDiscoveredDevice(device) {
    // Check if device already exists
    const existingDevice = this.findDeviceByAddress(device.ip, device.port);
    if (existingDevice) {
      // Update existing device
      existingDevice.lastSeen = Date.now();
      existingDevice.status = device.status;
      this.notifyDiscoveryEvent('device_updated', existingDevice);
    } else {
      // Add new device
      this.discoveredDevices.set(device.id, device);
      this.notifyDiscoveryEvent('device_discovered', device);
    }
  }

  findDeviceByAddress(ip, port) {
    for (const device of this.discoveredDevices.values()) {
      if (device.ip === ip && device.port === port) {
        return device;
      }
    }
    return null;
  }

  removeDevice(deviceId) {
    const device = this.discoveredDevices.get(deviceId);
    if (device) {
      this.discoveredDevices.delete(deviceId);
      this.notifyDiscoveryEvent('device_removed', device);
      return true;
    }
    return false;
  }

  // Device Connection
  async connectToDevice(deviceId) {
    const device = this.discoveredDevices.get(deviceId);
    if (!device) return false;

    try {
      const protocolHandler = this.discoveryProtocols[device.protocol];
      if (protocolHandler && protocolHandler.connect) {
        const connection = await protocolHandler.connect(device);
        if (connection) {
          this.connectionPool.set(deviceId, connection);
          device.status = 'connected';
          this.notifyDiscoveryEvent('device_connected', device);
          return true;
        }
      }
    } catch (error) {
      console.error(`Failed to connect to device ${deviceId}:`, error);
      device.status = 'error';
      this.notifyDiscoveryEvent('device_connection_failed', { device, error });
    }

    return false;
  }

  async disconnectFromDevice(deviceId) {
    const device = this.discoveredDevices.get(deviceId);
    const connection = this.connectionPool.get(deviceId);
    
    if (device && connection) {
      try {
        if (connection.close) {
          connection.close();
        }
        
        this.connectionPool.delete(deviceId);
        device.status = 'disconnected';
        this.notifyDiscoveryEvent('device_disconnected', device);
        return true;
      } catch (error) {
        console.error(`Failed to disconnect from device ${deviceId}:`, error);
      }
    }
    
    return false;
  }

  // Device Communication
  async sendToDevice(deviceId, message) {
    const device = this.discoveredDevices.get(deviceId);
    const connection = this.connectionPool.get(deviceId);
    
    if (!device || !connection) return false;

    try {
      switch (device.protocol) {
        case 'artnet':
          return await this.sendArtNetMessage(connection, message);
        case 'sacn':
          return await this.sendSACNMessage(connection, message);
        case 'osc':
          return await this.sendOSCMessage(connection, message);
        case 'http':
          return await this.sendHTTPMessage(connection, message);
        case 'midi':
          return await this.sendMIDIMessage(connection, message);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Failed to send message to device ${deviceId}:`, error);
      return false;
    }
  }

  async sendArtNetMessage(connection, message) {
    // Art-Net message sending implementation
    return true;
  }

  async sendSACNMessage(connection, message) {
    // sACN message sending implementation
    return true;
  }

  async sendOSCMessage(connection, message) {
    // OSC message sending implementation
    return true;
  }

  async sendHTTPMessage(connection, message) {
    // HTTP message sending implementation
    return true;
  }

  async sendMIDIMessage(connection, message) {
    // MIDI message sending implementation
    return true;
  }

  // Device Monitoring
  startDeviceMonitoring(deviceId, interval = 30000) {
    const device = this.discoveredDevices.get(deviceId);
    if (!device) return false;

    const monitorInterval = setInterval(async () => {
      const isAlive = await this.pingDevice(deviceId);
      if (!isAlive) {
        device.status = 'disconnected';
        this.notifyDiscoveryEvent('device_lost', device);
        this.stopDeviceMonitoring(deviceId);
      }
    }, interval);

    this.scanningIntervals.set(`monitor_${deviceId}`, monitorInterval);
    return true;
  }

  stopDeviceMonitoring(deviceId) {
    const interval = this.scanningIntervals.get(`monitor_${deviceId}`);
    if (interval) {
      clearInterval(interval);
      this.scanningIntervals.delete(`monitor_${deviceId}`);
      return true;
    }
    return false;
  }

  async pingDevice(deviceId) {
    const device = this.discoveredDevices.get(deviceId);
    if (!device) return false;

    try {
      switch (device.protocol) {
        case 'http':
          const response = await fetch(`http://${device.ip}:${device.port}`, { 
            method: 'HEAD',
            mode: 'no-cors',
            timeout: 1000
          });
          return true;
        case 'osc':
        case 'artnet':
        case 'sacn':
          // WebSocket ping
          return await this.pingWebSocket(device.ip, device.port);
        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  }

  async pingWebSocket(ip, port) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 1000);

      const testSocket = new WebSocket(`ws://${ip}:${port}`);
      
      testSocket.onopen = () => {
        clearTimeout(timeout);
        testSocket.close();
        resolve(true);
      };
      
      testSocket.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
    });
  }

  // Utility Functions
  getLocalSubnet() {
    // This would get the local subnet in a real implementation
    // For now, return a default subnet
    return '192.168.1';
  }

  generateDeviceId() {
    return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getAllDevices() {
    return Array.from(this.discoveredDevices.values());
  }

  getDevicesByType(type) {
    return Array.from(this.discoveredDevices.values())
      .filter(device => device.type === type);
  }

  getDevicesByProtocol(protocol) {
    return Array.from(this.discoveredDevices.values())
      .filter(device => device.protocol === protocol);
  }

  getConnectedDevices() {
    return Array.from(this.discoveredDevices.values())
      .filter(device => device.status === 'connected');
  }

  getDiscoveryStats() {
    const devices = this.getAllDevices();
    const stats = {
      totalDevices: devices.length,
      connectedDevices: devices.filter(d => d.status === 'connected').length,
      disconnectedDevices: devices.filter(d => d.status === 'disconnected').length,
      errorDevices: devices.filter(d => d.status === 'error').length,
      protocols: {},
      types: {}
    };

    // Count by protocol
    for (const device of devices) {
      stats.protocols[device.protocol] = (stats.protocols[device.protocol] || 0) + 1;
      stats.types[device.type] = (stats.types[device.type] || 0) + 1;
    }

    return stats;
  }

  // Event Notifications
  notifyDiscoveryEvent(eventType, data) {
    const event = new CustomEvent('discovery-event', {
      detail: { eventType, data }
    });
    document.dispatchEvent(event);
  }

  // Cleanup
  destroy() {
    this.stopNetworkScan();
    this.discoveredDevices.clear();
    this.connectionPool.clear();
    this.scanningIntervals.clear();
  }
}

// Global Network Discovery System Instance
const networkDiscoverySystem = new NetworkDiscoverySystem(qListManager, midiIntegrationSystem, oscProtocolSupport);
