// Network Core - Art-Net and sACN protocol implementation
// Professional lighting network protocols for DMX output

class NetworkCore {
  constructor() {
    this.artNet = null;
    this.sACN = null;
    this.isEnabled = false;
    this.universes = new Map();
    this.outputRate = 44; // Hz (Art-Net standard)
    this.lastOutput = 0;
    this.sequenceNumber = 0;
    
    this.initializeNetworkProtocols();
  }

  initializeNetworkProtocols() {
    // Initialize Art-Net
    this.artNet = {
      enabled: false,
      ip: '192.168.1.255', // Broadcast address
      port: 6454,
      universes: new Map(),
      sequence: 0
    };

    // Initialize sACN
    this.sACN = {
      enabled: false,
      ip: '239.255.0.1', // Multicast address
      port: 5568,
      universes: new Map(),
      sequence: 0,
      priority: 100
    };

    // Initialize default universes
    this.initializeUniverses();
  }

  initializeUniverses() {
    // Create 4 universes (512 channels each)
    for (let i = 0; i < 4; i++) {
      this.universes.set(i, {
        universe: i,
        data: new Uint8Array(512),
        dirty: false,
        lastUpdate: 0
      });
    }
  }

  // Art-Net implementation
  enableArtNet(enabled = true) {
    this.artNet.enabled = enabled;
    if (enabled) {
      this.startArtNetOutput();
    }
    return enabled;
  }

  setArtNetIP(ip) {
    this.artNet.ip = ip;
  }

  setArtNetPort(port) {
    this.artNet.port = port;
  }

  startArtNetOutput() {
    if (!this.artNet.enabled) return;

    const output = () => {
      this.sendArtNetData();
      setTimeout(output, 1000 / this.outputRate);
    };
    output();
  }

  sendArtNetData() {
    if (!this.artNet.enabled) return;

    this.universes.forEach((universe, universeId) => {
      if (universe.dirty) {
        this.sendArtNetUniverse(universeId, universe.data);
        universe.dirty = false;
      }
    });
  }

  sendArtNetUniverse(universeId, data) {
    // Art-Net packet structure
    const packet = new Uint8Array(530); // 18 bytes header + 512 bytes data
    
    // Art-Net header
    packet.set([0x41, 0x72, 0x74, 0x2d, 0x4e, 0x65, 0x74, 0x00], 0); // "Art-Net\0"
    packet[8] = 0x00; // OpCode low byte
    packet[9] = 0x50; // OpCode high byte (ArtDMX)
    packet[10] = 0x00; // Protocol version high
    packet[11] = 0x0E; // Protocol version low
    packet[12] = this.artNet.sequence; // Sequence
    packet[13] = 0x00; // Physical
    packet[14] = universeId & 0xFF; // Universe low
    packet[15] = (universeId >> 8) & 0xFF; // Universe high
    packet[16] = (data.length >> 8) & 0xFF; // Data length high
    packet[17] = data.length & 0xFF; // Data length low
    
    // DMX data
    packet.set(data, 18);
    
    // Send packet (simplified - would use WebRTC or WebSocket in real implementation)
    this.sendUDPPacket(this.artNet.ip, this.artNet.port, packet);
    
    this.artNet.sequence = (this.artNet.sequence + 1) % 256;
  }

  // sACN implementation
  enableSACN(enabled = true) {
    this.sACN.enabled = enabled;
    if (enabled) {
      this.startSACNOutput();
    }
    return enabled;
  }

  setSACNIP(ip) {
    this.sACN.ip = ip;
  }

  setSACNPort(port) {
    this.sACN.port = port;
  }

  setSACNPriority(priority) {
    this.sACN.priority = Math.max(0, Math.min(200, priority));
  }

  startSACNOutput() {
    if (!this.sACN.enabled) return;

    const output = () => {
      this.sendSACNData();
      setTimeout(output, 1000 / this.outputRate);
    };
    output();
  }

  sendSACNData() {
    if (!this.sACN.enabled) return;

    this.universes.forEach((universe, universeId) => {
      if (universe.dirty) {
        this.sendSACNUniverse(universeId, universe.data);
        universe.dirty = false;
      }
    });
  }

  sendSACNUniverse(universeId, data) {
    // sACN packet structure
    const packet = new Uint8Array(638); // 126 bytes header + 512 bytes data
    
    // Root Layer
    packet[0] = 0x00; // Flags and Length
    packet[1] = 0x10; // Length high
    packet[2] = 0x00; // Length low
    packet[3] = 0x00; // Length low
    packet[4] = 0x41; // Vector (VECTOR_ROOT_E131_DATA)
    packet[5] = 0x53;
    packet[6] = 0x43;
    packet[7] = 0x4E;
    packet[8] = 0x2D;
    packet[9] = 0x45;
    packet[10] = 0x31;
    packet[11] = 0x2E;
    packet[12] = 0x31;
    packet[13] = 0x37;
    packet[14] = 0x00;
    packet[15] = 0x00;
    
    // CID (Client Identifier) - 16 bytes
    const cid = this.generateCID();
    packet.set(cid, 16);
    
    // Framing Layer
    packet[32] = 0x70; // Flags and Length
    packet[33] = 0x00; // Length high
    packet[34] = 0x00; // Length low
    packet[35] = 0x00; // Length low
    packet[36] = 0x00; // Vector (VECTOR_E131_DATA_PACKET)
    packet[37] = 0x00;
    packet[38] = 0x00;
    packet[39] = 0x00;
    
    // Source Name - 64 bytes
    const sourceName = 'IonXE Console';
    const sourceNameBytes = new TextEncoder().encode(sourceName);
    packet.set(sourceNameBytes, 40);
    
    // Priority
    packet[104] = this.sACN.priority;
    
    // Reserved
    packet[105] = 0x00;
    packet[106] = 0x00;
    packet[107] = 0x00;
    
    // Sequence Number
    packet[108] = this.sACN.sequence;
    
    // Options
    packet[109] = 0x00;
    
    // Universe
    packet[110] = (universeId >> 8) & 0xFF;
    packet[111] = universeId & 0xFF;
    
    // DMP Layer
    packet[112] = 0x70; // Flags and Length
    packet[113] = 0x00; // Length high
    packet[114] = 0x00; // Length low
    packet[115] = 0x00; // Length low
    packet[116] = 0x02; // Vector (VECTOR_DMP_SET_PROPERTY)
    packet[117] = 0x00;
    packet[118] = 0x00;
    packet[119] = 0x00;
    
    // Address Type & Data Type
    packet[120] = 0xA1;
    packet[121] = 0x02;
    
    // First Property Address
    packet[122] = 0x00;
    packet[123] = 0x00;
    
    // Address Increment
    packet[124] = 0x00;
    packet[125] = 0x01;
    
    // Property Value Count
    packet[126] = (data.length >> 8) & 0xFF;
    packet[127] = data.length & 0xFF;
    
    // DMX data
    packet.set(data, 128);
    
    // Send packet
    this.sendUDPPacket(this.sACN.ip, this.sACN.port, packet);
    
    this.sACN.sequence = (this.sACN.sequence + 1) % 256;
  }

  // DMX data management
  setDMXValue(universe, channel, value) {
    if (universe < 0 || universe >= 4) return false;
    if (channel < 1 || channel > 512) return false;
    
    const universeData = this.universes.get(universe);
    if (universeData) {
      universeData.data[channel - 1] = Math.max(0, Math.min(255, value));
      universeData.dirty = true;
      universeData.lastUpdate = Date.now();
      return true;
    }
    return false;
  }

  getDMXValue(universe, channel) {
    if (universe < 0 || universe >= 4) return 0;
    if (channel < 1 || channel > 512) return 0;
    
    const universeData = this.universes.get(universe);
    return universeData ? universeData.data[channel - 1] : 0;
  }

  setDMXUniverse(universe, data) {
    if (universe < 0 || universe >= 4) return false;
    if (data.length !== 512) return false;
    
    const universeData = this.universes.get(universe);
    if (universeData) {
      universeData.data.set(data);
      universeData.dirty = true;
      universeData.lastUpdate = Date.now();
      return true;
    }
    return false;
  }

  getDMXUniverse(universe) {
    if (universe < 0 || universe >= 4) return null;
    
    const universeData = this.universes.get(universe);
    return universeData ? new Uint8Array(universeData.data) : null;
  }

  // Network discovery
  discoverDevices() {
    // Send Art-Net discovery packet
    const discoveryPacket = new Uint8Array(14);
    discoveryPacket.set([0x41, 0x72, 0x74, 0x2d, 0x4e, 0x65, 0x74, 0x00], 0); // "Art-Net\0"
    discoveryPacket[8] = 0x00; // OpCode low
    discoveryPacket[9] = 0x20; // OpCode high (ArtPoll)
    discoveryPacket[10] = 0x00; // Protocol version high
    discoveryPacket[11] = 0x0E; // Protocol version low
    discoveryPacket[12] = 0x00; // TalkToMe
    discoveryPacket[13] = 0x00; // Priority
    
    this.sendUDPPacket('255.255.255.255', 6454, discoveryPacket);
  }

  // Utility functions
  generateCID() {
    // Generate a random 16-byte Client Identifier
    const cid = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      cid[i] = Math.floor(Math.random() * 256);
    }
    return cid;
  }

  sendUDPPacket(ip, port, data) {
    // Simplified UDP sending - in a real implementation, this would use
    // WebRTC DataChannels, WebSocket, or a native UDP implementation
    console.log(`Sending ${data.length} bytes to ${ip}:${port}`);
    
    // In a real implementation, this would send the actual UDP packet
    // For now, we'll just log the data
    if (this.onPacketSent) {
      this.onPacketSent(ip, port, data);
    }
  }

  // Network status
  getNetworkStatus() {
    return {
      artNet: {
        enabled: this.artNet.enabled,
        ip: this.artNet.ip,
        port: this.artNet.port,
        sequence: this.artNet.sequence
      },
      sACN: {
        enabled: this.sACN.enabled,
        ip: this.sACN.ip,
        port: this.sACN.port,
        priority: this.sACN.priority,
        sequence: this.sACN.sequence
      },
      universes: Array.from(this.universes.entries()).map(([id, universe]) => ({
        id,
        dirty: universe.dirty,
        lastUpdate: universe.lastUpdate
      }))
    };
  }

  // Enable/disable network output
  enableNetworkOutput(enabled = true) {
    this.isEnabled = enabled;
    
    if (enabled) {
      this.startNetworkOutput();
    } else {
      this.stopNetworkOutput();
    }
    
    return enabled;
  }

  startNetworkOutput() {
    if (this.artNet.enabled) {
      this.startArtNetOutput();
    }
    
    if (this.sACN.enabled) {
      this.startSACNOutput();
    }
  }

  stopNetworkOutput() {
    // Stop all network output
    this.artNet.enabled = false;
    this.sACN.enabled = false;
  }

  // Sync with fader values
  syncWithFaders() {
    if (!this.isEnabled) return;
    
    // Sync all 512 channels to universe 0
    for (let i = 0; i < 512; i++) {
      this.setDMXValue(0, i + 1, faderValues[i]);
    }
  }

  // Event notifications
  notifyPacketSent(ip, port, data) {
    if (this.onPacketSent) {
      this.onPacketSent(ip, port, data);
    }
  }

  notifyDeviceDiscovered(device) {
    if (this.onDeviceDiscovered) {
      this.onDeviceDiscovered(device);
    }
  }

  // Cleanup
  cleanup() {
    this.stopNetworkOutput();
    this.universes.clear();
  }
}

// Initialize network core
const networkCore = new NetworkCore();
