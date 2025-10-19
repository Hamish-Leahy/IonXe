// MIDI Integration System
// Comprehensive MIDI input/output control for lighting

class MIDIIntegrationSystem {
  constructor(qListManager, effectsEngine, showAutomation) {
    this.qListManager = qListManager;
    this.effectsEngine = effectsEngine;
    this.showAutomation = showAutomation;
    this.midiAccess = null;
    this.inputs = new Map();
    this.outputs = new Map();
    this.midiMappings = new Map();
    this.isInitialized = false;
    this.isEnabled = false;
    this.midiQueue = [];
    this.processingInterval = null;
    
    this.initializeMIDISystem();
  }

  // MIDI System Initialization
  async initializeMIDISystem() {
    try {
      if (navigator.requestMIDIAccess) {
        this.midiAccess = await navigator.requestMIDIAccess({ sysex: true });
        this.setupMIDIEventListeners();
        this.isInitialized = true;
        this.notifyMIDIEvent('system_initialized', null);
        return true;
      } else {
        console.warn('Web MIDI API not supported');
        return false;
      }
    } catch (error) {
      console.error('Failed to initialize MIDI system:', error);
      return false;
    }
  }

  setupMIDIEventListeners() {
    // Handle MIDI input connections
    this.midiAccess.onstatechange = (event) => {
      const port = event.port;
      
      if (port.type === 'input') {
        if (port.state === 'connected') {
          this.addMIDIInput(port);
        } else if (port.state === 'disconnected') {
          this.removeMIDIInput(port);
        }
      } else if (port.type === 'output') {
        if (port.state === 'connected') {
          this.addMIDIOutput(port);
        } else if (port.state === 'disconnected') {
          this.removeMIDIOutput(port);
        }
      }
    };

    // Initialize existing ports
    for (const input of this.midiAccess.inputs.values()) {
      this.addMIDIInput(input);
    }

    for (const output of this.midiAccess.outputs.values()) {
      this.addMIDIOutput(output);
    }
  }

  // MIDI Input Management
  addMIDIInput(port) {
    const input = {
      id: port.id,
      name: port.name,
      manufacturer: port.manufacturer,
      state: port.state,
      connection: port.connection,
      port: port,
      mappings: new Map(),
      isActive: false
    };

    this.inputs.set(port.id, input);
    this.notifyMIDIEvent('input_connected', input);
  }

  removeMIDIInput(port) {
    const input = this.inputs.get(port.id);
    if (input) {
      input.isActive = false;
      this.inputs.delete(port.id);
      this.notifyMIDIEvent('input_disconnected', input);
    }
  }

  enableMIDIInput(inputId) {
    const input = this.inputs.get(inputId);
    if (!input) return false;

    input.port.onmidimessage = (message) => {
      this.handleMIDIMessage(inputId, message);
    };

    input.isActive = true;
    this.notifyMIDIEvent('input_enabled', input);
    return true;
  }

  disableMIDIInput(inputId) {
    const input = this.inputs.get(inputId);
    if (!input) return false;

    input.port.onmidimessage = null;
    input.isActive = false;
    this.notifyMIDIEvent('input_disabled', input);
    return true;
  }

  // MIDI Output Management
  addMIDIOutput(port) {
    const output = {
      id: port.id,
      name: port.name,
      manufacturer: port.manufacturer,
      state: port.state,
      connection: port.connection,
      port: port,
      isActive: false
    };

    this.outputs.set(port.id, output);
    this.notifyMIDIEvent('output_connected', output);
  }

  removeMIDIOutput(port) {
    const output = this.outputs.get(port.id);
    if (output) {
      output.isActive = false;
      this.outputs.delete(port.id);
      this.notifyMIDIEvent('output_disconnected', output);
    }
  }

  enableMIDIOutput(outputId) {
    const output = this.outputs.get(outputId);
    if (!output) return false;

    output.isActive = true;
    this.notifyMIDIEvent('output_enabled', output);
    return true;
  }

  disableMIDIOutput(outputId) {
    const output = this.outputs.get(outputId);
    if (!output) return false;

    output.isActive = false;
    this.notifyMIDIEvent('output_disabled', output);
    return true;
  }

  // MIDI Message Handling
  handleMIDIMessage(inputId, message) {
    const input = this.inputs.get(inputId);
    if (!input || !input.isActive) return;

    const midiData = {
      inputId,
      timestamp: message.timestamp,
      data: Array.from(message.data),
      type: this.getMIDIMessageType(message.data[0]),
      channel: (message.data[0] & 0x0F) + 1,
      command: message.data[0] & 0xF0
    };

    // Queue message for processing
    this.midiQueue.push(midiData);

    // Process mappings
    this.processMIDIMappings(inputId, midiData);
  }

  getMIDIMessageType(statusByte) {
    const command = statusByte & 0xF0;
    
    switch (command) {
      case 0x80: return 'note_off';
      case 0x90: return 'note_on';
      case 0xA0: return 'polyphonic_key_pressure';
      case 0xB0: return 'control_change';
      case 0xC0: return 'program_change';
      case 0xD0: return 'channel_pressure';
      case 0xE0: return 'pitch_bend';
      case 0xF0: return 'system_message';
      default: return 'unknown';
    }
  }

  // MIDI Mapping System
  createMIDIMapping(inputId, config) {
    const mapping = {
      id: this.generateMappingId(),
      inputId,
      name: config.name || 'Untitled Mapping',
      type: config.type || 'note', // note, cc, program_change, pitch_bend
      channel: config.channel || 1,
      note: config.note || null,
      cc: config.cc || null,
      minValue: config.minValue || 0,
      maxValue: config.maxValue || 127,
      action: config.action || 'cue_go',
      parameters: config.parameters || {},
      enabled: config.enabled !== false,
      createdAt: new Date().toISOString()
    };

    const input = this.inputs.get(inputId);
    if (input) {
      input.mappings.set(mapping.id, mapping);
    }

    this.midiMappings.set(mapping.id, mapping);
    return mapping;
  }

  processMIDIMappings(inputId, midiData) {
    const input = this.inputs.get(inputId);
    if (!input) return;

    for (const mapping of input.mappings.values()) {
      if (!mapping.enabled) continue;

      let isMatch = false;
      let value = 0;

      switch (mapping.type) {
        case 'note':
          if (midiData.type === 'note_on' && midiData.data[1] === mapping.note) {
            isMatch = true;
            value = midiData.data[2];
          }
          break;
        case 'cc':
          if (midiData.type === 'control_change' && midiData.data[1] === mapping.cc) {
            isMatch = true;
            value = midiData.data[2];
          }
          break;
        case 'program_change':
          if (midiData.type === 'program_change') {
            isMatch = true;
            value = midiData.data[1];
          }
          break;
        case 'pitch_bend':
          if (midiData.type === 'pitch_bend') {
            isMatch = true;
            value = (midiData.data[2] << 7) | midiData.data[1];
          }
          break;
      }

      if (isMatch && midiData.channel === mapping.channel) {
        this.executeMIDIMapping(mapping, value);
      }
    }
  }

  executeMIDIMapping(mapping, value) {
    // Normalize value to 0-1 range
    const normalizedValue = (value - mapping.minValue) / (mapping.maxValue - mapping.minValue);
    
    switch (mapping.action) {
      case 'cue_go':
        this.qListManager.goToCue(mapping.parameters.cueNumber);
        break;
      case 'cue_next':
        this.qListManager.nextCue();
        break;
      case 'cue_previous':
        this.qListManager.previousCue();
        break;
      case 'play':
        this.qListManager.play();
        break;
      case 'pause':
        this.qListManager.pause();
        break;
      case 'stop':
        this.qListManager.stop();
        break;
      case 'set_levels':
        this.setLevelsFromMIDI(mapping.parameters.channels, normalizedValue);
        break;
      case 'fade_to_levels':
        this.fadeToLevelsFromMIDI(mapping.parameters.channels, normalizedValue, mapping.parameters.fadeTime);
        break;
      case 'start_effect':
        if (normalizedValue > 0.5) {
          this.effectsEngine.startEffect(mapping.parameters.effectId, mapping.parameters.channels);
        } else {
          this.effectsEngine.stopEffect(mapping.parameters.effectId);
        }
        break;
      case 'trigger_automation':
        this.showAutomation.executeTriggerAutomation(mapping.parameters.automationId);
        break;
      case 'grand_master':
        this.setGrandMaster(normalizedValue);
        break;
      case 'blackout':
        if (normalizedValue > 0.5) {
          this.qListManager.setLevels(new Uint8Array(512));
        }
        break;
      case 'custom':
        if (mapping.parameters.callback) {
          mapping.parameters.callback(normalizedValue, mapping.parameters.data);
        }
        break;
    }

    this.notifyMIDIEvent('mapping_executed', { mapping, value, normalizedValue });
  }

  // MIDI Output Functions
  sendMIDINote(outputId, channel, note, velocity) {
    const output = this.outputs.get(outputId);
    if (!output || !output.isActive) return false;

    const message = [0x90 | (channel - 1), note, velocity];
    output.port.send(message);
    return true;
  }

  sendMIDICC(outputId, channel, cc, value) {
    const output = this.outputs.get(outputId);
    if (!output || !output.isActive) return false;

    const message = [0xB0 | (channel - 1), cc, value];
    output.port.send(message);
    return true;
  }

  sendMIDIProgramChange(outputId, channel, program) {
    const output = this.outputs.get(outputId);
    if (!output || !output.isActive) return false;

    const message = [0xC0 | (channel - 1), program];
    output.port.send(message);
    return true;
  }

  sendMIDIPitchBend(outputId, channel, value) {
    const output = this.outputs.get(outputId);
    if (!output || !output.isActive) return false;

    const lsb = value & 0x7F;
    const msb = (value >> 7) & 0x7F;
    const message = [0xE0 | (channel - 1), lsb, msb];
    output.port.send(message);
    return true;
  }

  // Lighting Control Integration
  setLevelsFromMIDI(channels, value) {
    const levels = new Uint8Array(512);
    const intensity = Math.round(value * 255);
    
    for (const channel of channels) {
      levels[channel - 1] = intensity;
    }
    
    this.qListManager.setLevels(levels);
  }

  fadeToLevelsFromMIDI(channels, value, fadeTime) {
    const levels = new Uint8Array(512);
    const intensity = Math.round(value * 255);
    
    for (const channel of channels) {
      levels[channel - 1] = intensity;
    }
    
    this.qListManager.fadeToLevels(levels, fadeTime);
  }

  setGrandMaster(value) {
    const intensity = Math.round(value * 255);
    // This would integrate with the grand master control
    document.getElementById('grand-master').value = intensity;
    document.getElementById('gm-value').textContent = intensity;
  }

  // MIDI Clock Sync
  enableMIDIClockSync(inputId) {
    const input = this.inputs.get(inputId);
    if (!input) return false;

    input.clockSync = {
      enabled: true,
      tempo: 120,
      beatsPerBar: 4,
      currentBeat: 0,
      lastClockTime: 0
    };

    return true;
  }

  handleMIDIClock(message) {
    const input = this.inputs.get(message.inputId);
    if (!input || !input.clockSync?.enabled) return;

    const clock = input.clockSync;
    const now = Date.now();
    
    if (message.data[0] === 0xF8) { // MIDI Clock
      clock.currentBeat++;
      
      if (clock.currentBeat >= clock.beatsPerBar) {
        clock.currentBeat = 0;
        this.notifyMIDIEvent('bar_beat', { inputId: message.inputId, beat: clock.currentBeat });
      }
      
      this.notifyMIDIEvent('clock_tick', { inputId: message.inputId, beat: clock.currentBeat });
    } else if (message.data[0] === 0xFA) { // Start
      clock.currentBeat = 0;
      this.notifyMIDIEvent('clock_start', { inputId: message.inputId });
    } else if (message.data[0] === 0xFB) { // Continue
      this.notifyMIDIEvent('clock_continue', { inputId: message.inputId });
    } else if (message.data[0] === 0xFC) { // Stop
      this.notifyMIDIEvent('clock_stop', { inputId: message.inputId });
    }
  }

  // Utility Functions
  generateMappingId() {
    return 'midi_mapping_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getAllInputs() {
    return Array.from(this.inputs.values());
  }

  getAllOutputs() {
    return Array.from(this.outputs.values());
  }

  getAllMappings() {
    return Array.from(this.midiMappings.values());
  }

  getMIDIStatus() {
    return {
      isInitialized: this.isInitialized,
      isEnabled: this.isEnabled,
      inputCount: this.inputs.size,
      outputCount: this.outputs.size,
      mappingCount: this.midiMappings.size,
      queueLength: this.midiQueue.length
    };
  }

  // Event Notifications
  notifyMIDIEvent(eventType, data) {
    const event = new CustomEvent('midi-event', {
      detail: { eventType, data }
    });
    document.dispatchEvent(event);
  }

  // Cleanup
  disableAllInputs() {
    for (const inputId of this.inputs.keys()) {
      this.disableMIDIInput(inputId);
    }
  }

  disableAllOutputs() {
    for (const outputId of this.outputs.keys()) {
      this.disableMIDIOutput(outputId);
    }
  }

  destroy() {
    this.disableAllInputs();
    this.disableAllOutputs();
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    this.inputs.clear();
    this.outputs.clear();
    this.midiMappings.clear();
    this.midiQueue = [];
    this.isInitialized = false;
    this.isEnabled = false;
  }
}

// Global MIDI Integration System Instance
const midiIntegrationSystem = new MIDIIntegrationSystem(qListManager, effectsEngine, showAutomationFramework);
