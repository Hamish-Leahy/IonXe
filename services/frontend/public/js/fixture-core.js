// Fixture Core - Lighting fixture management and control
// Professional fixture library with capabilities and profiles

class FixtureCore {
  constructor() {
    this.fixtures = new Map();
    this.fixtureTypes = new Map();
    this.fixtureGroups = new Map();
    this.patch = new Map(); // DMX address -> fixture mapping
    this.selectedFixtures = new Set();
    
    this.initializeDefaultFixtures();
    this.loadFixtureLibrary();
  }

  initializeDefaultFixtures() {
    // Basic fixture types
    this.addFixtureType('Generic RGB', {
      id: 'generic-rgb',
      name: 'Generic RGB',
      manufacturer: 'Generic',
      category: 'LED',
      channels: 3,
      capabilities: {
        intensity: { channel: 1, range: [0, 255] },
        red: { channel: 1, range: [0, 255] },
        green: { channel: 2, range: [0, 255] },
        blue: { channel: 3, range: [0, 255] }
      },
      defaultAddress: 1
    });

    this.addFixtureType('Generic RGBW', {
      id: 'generic-rgbw',
      name: 'Generic RGBW',
      manufacturer: 'Generic',
      category: 'LED',
      channels: 4,
      capabilities: {
        intensity: { channel: 1, range: [0, 255] },
        red: { channel: 2, range: [0, 255] },
        green: { channel: 3, range: [0, 255] },
        blue: { channel: 4, range: [0, 255] },
        white: { channel: 5, range: [0, 255] }
      },
      defaultAddress: 1
    });

    this.addFixtureType('Generic Dimmer', {
      id: 'generic-dimmer',
      name: 'Generic Dimmer',
      manufacturer: 'Generic',
      category: 'Dimmer',
      channels: 1,
      capabilities: {
        intensity: { channel: 1, range: [0, 255] }
      },
      defaultAddress: 1
    });

    this.addFixtureType('Generic Moving Head', {
      id: 'generic-moving-head',
      name: 'Generic Moving Head',
      manufacturer: 'Generic',
      category: 'Moving Head',
      channels: 8,
      capabilities: {
        intensity: { channel: 1, range: [0, 255] },
        pan: { channel: 2, range: [0, 255], fine: 3 },
        tilt: { channel: 4, range: [0, 255], fine: 5 },
        color: { channel: 6, range: [0, 255] },
        gobo: { channel: 7, range: [0, 255] },
        strobe: { channel: 8, range: [0, 255] }
      },
      defaultAddress: 1
    });

    // Professional fixture types
    this.addFixtureType('ETC ColorSource PAR', {
      id: 'etc-colorsource-par',
      name: 'ColorSource PAR',
      manufacturer: 'ETC',
      category: 'LED',
      channels: 4,
      capabilities: {
        intensity: { channel: 1, range: [0, 255] },
        red: { channel: 2, range: [0, 255] },
        green: { channel: 3, range: [0, 255] },
        blue: { channel: 4, range: [0, 255] }
      },
      defaultAddress: 1
    });

    this.addFixtureType('Martin MAC Aura', {
      id: 'martin-mac-aura',
      name: 'MAC Aura',
      manufacturer: 'Martin',
      category: 'Moving Head',
      channels: 12,
      capabilities: {
        intensity: { channel: 1, range: [0, 255] },
        pan: { channel: 2, range: [0, 255], fine: 3 },
        tilt: { channel: 4, range: [0, 255], fine: 5 },
        color: { channel: 6, range: [0, 255] },
        gobo: { channel: 7, range: [0, 255] },
        strobe: { channel: 8, range: [0, 255] },
        zoom: { channel: 9, range: [0, 255] },
        focus: { channel: 10, range: [0, 255] },
        prism: { channel: 11, range: [0, 255] },
        effects: { channel: 12, range: [0, 255] }
      },
      defaultAddress: 1
    });
  }

  addFixtureType(id, fixtureType) {
    this.fixtureTypes.set(id, {
      ...fixtureType,
      id,
      created: new Date().toISOString()
    });
  }

  getFixtureType(id) {
    return this.fixtureTypes.get(id);
  }

  getAllFixtureTypes() {
    return Array.from(this.fixtureTypes.values());
  }

  getFixtureTypesByCategory(category) {
    return Array.from(this.fixtureTypes.values()).filter(ft => ft.category === category);
  }

  addFixture(fixtureData) {
    const fixture = {
      id: this.generateId(),
      name: fixtureData.name || 'Unnamed Fixture',
      type: fixtureData.type,
      address: fixtureData.address || 1,
      universe: fixtureData.universe || 1,
      position: fixtureData.position || { x: 0, y: 0, z: 0 },
      rotation: fixtureData.rotation || { x: 0, y: 0, z: 0 },
      group: fixtureData.group || null,
      enabled: fixtureData.enabled !== false,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      ...fixtureData
    };

    this.fixtures.set(fixture.id, fixture);
    this.updatePatch();
    this.saveFixtureLibrary();
    return fixture;
  }

  updateFixture(id, updates) {
    const fixture = this.fixtures.get(id);
    if (fixture) {
      Object.assign(fixture, updates, {
        modified: new Date().toISOString()
      });
      this.updatePatch();
      this.saveFixtureLibrary();
      return fixture;
    }
    return null;
  }

  deleteFixture(id) {
    if (this.fixtures.has(id)) {
      this.fixtures.delete(id);
      this.selectedFixtures.delete(id);
      this.updatePatch();
      this.saveFixtureLibrary();
      return true;
    }
    return false;
  }

  getFixture(id) {
    return this.fixtures.get(id);
  }

  getAllFixtures() {
    return Array.from(this.fixtures.values());
  }

  getFixturesByGroup(groupId) {
    return Array.from(this.fixtures.values()).filter(f => f.group === groupId);
  }

  getFixturesByType(typeId) {
    return Array.from(this.fixtures.values()).filter(f => f.type === typeId);
  }

  // Patch management
  updatePatch() {
    this.patch.clear();
    this.fixtures.forEach(fixture => {
      if (fixture.enabled) {
        const fixtureType = this.getFixtureType(fixture.type);
        if (fixtureType) {
          for (let i = 0; i < fixtureType.channels; i++) {
            const address = fixture.address + i;
            if (address <= 512) {
              this.patch.set(address, {
                fixture: fixture.id,
                channel: i + 1,
                capability: this.getCapabilityByChannel(fixtureType, i + 1)
              });
            }
          }
        }
      }
    });
  }

  getCapabilityByChannel(fixtureType, channel) {
    for (const [capability, config] of Object.entries(fixtureType.capabilities)) {
      if (config.channel === channel) {
        return capability;
      }
    }
    return null;
  }

  getPatch() {
    return Array.from(this.patch.entries()).map(([address, data]) => ({
      address,
      ...data
    }));
  }

  getFixtureAtAddress(address) {
    const patchData = this.patch.get(address);
    return patchData ? this.getFixture(patchData.fixture) : null;
  }

  // Fixture groups
  createGroup(name, fixtureIds = []) {
    const group = {
      id: this.generateId(),
      name,
      fixtures: [...fixtureIds],
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };

    this.fixtureGroups.set(group.id, group);
    
    // Update fixtures to reference this group
    fixtureIds.forEach(id => {
      const fixture = this.fixtures.get(id);
      if (fixture) {
        fixture.group = group.id;
      }
    });

    this.saveFixtureLibrary();
    return group;
  }

  updateGroup(id, updates) {
    const group = this.fixtureGroups.get(id);
    if (group) {
      Object.assign(group, updates, {
        modified: new Date().toISOString()
      });
      this.saveFixtureLibrary();
      return group;
    }
    return null;
  }

  deleteGroup(id) {
    if (this.fixtureGroups.has(id)) {
      // Remove group reference from fixtures
      const group = this.fixtureGroups.get(id);
      group.fixtures.forEach(fixtureId => {
        const fixture = this.fixtures.get(fixtureId);
        if (fixture) {
          fixture.group = null;
        }
      });

      this.fixtureGroups.delete(id);
      this.saveFixtureLibrary();
      return true;
    }
    return false;
  }

  getGroup(id) {
    return this.fixtureGroups.get(id);
  }

  getAllGroups() {
    return Array.from(this.fixtureGroups.values());
  }

  addFixtureToGroup(fixtureId, groupId) {
    const fixture = this.fixtures.get(fixtureId);
    const group = this.fixtureGroups.get(groupId);
    
    if (fixture && group) {
      fixture.group = groupId;
      if (!group.fixtures.includes(fixtureId)) {
        group.fixtures.push(fixtureId);
        group.modified = new Date().toISOString();
      }
      this.saveFixtureLibrary();
      return true;
    }
    return false;
  }

  removeFixtureFromGroup(fixtureId, groupId) {
    const fixture = this.fixtures.get(fixtureId);
    const group = this.fixtureGroups.get(groupId);
    
    if (fixture && group) {
      fixture.group = null;
      group.fixtures = group.fixtures.filter(id => id !== fixtureId);
      group.modified = new Date().toISOString();
      this.saveFixtureLibrary();
      return true;
    }
    return false;
  }

  // Selection management
  selectFixture(id) {
    this.selectedFixtures.add(id);
    this.notifySelectionChanged();
  }

  deselectFixture(id) {
    this.selectedFixtures.delete(id);
    this.notifySelectionChanged();
  }

  toggleFixtureSelection(id) {
    if (this.selectedFixtures.has(id)) {
      this.deselectFixture(id);
    } else {
      this.selectFixture(id);
    }
  }

  selectAllFixtures() {
    this.fixtures.forEach((_, id) => this.selectedFixtures.add(id));
    this.notifySelectionChanged();
  }

  clearSelection() {
    this.selectedFixtures.clear();
    this.notifySelectionChanged();
  }

  getSelectedFixtures() {
    return Array.from(this.selectedFixtures);
  }

  // Fixture control
  setFixtureValue(fixtureId, capability, value) {
    const fixture = this.fixtures.get(fixtureId);
    if (!fixture) return false;

    const fixtureType = this.getFixtureType(fixture.type);
    if (!fixtureType) return false;

    const capabilityConfig = fixtureType.capabilities[capability];
    if (!capabilityConfig) return false;

    const address = fixture.address + capabilityConfig.channel - 1;
    if (address >= 1 && address <= 512) {
      faderValues[address - 1] = Math.max(0, Math.min(255, value));
      this.updateFaderDisplay();
      this.notifyFixtureValueChanged(fixtureId, capability, value);
      return true;
    }
    return false;
  }

  getFixtureValue(fixtureId, capability) {
    const fixture = this.fixtures.get(fixtureId);
    if (!fixture) return 0;

    const fixtureType = this.getFixtureType(fixture.type);
    if (!fixtureType) return 0;

    const capabilityConfig = fixtureType.capabilities[capability];
    if (!capabilityConfig) return 0;

    const address = fixture.address + capabilityConfig.channel - 1;
    if (address >= 1 && address <= 512) {
      return faderValues[address - 1];
    }
    return 0;
  }

  setGroupValue(groupId, capability, value) {
    const group = this.fixtureGroups.get(groupId);
    if (!group) return false;

    let success = false;
    group.fixtures.forEach(fixtureId => {
      if (this.setFixtureValue(fixtureId, capability, value)) {
        success = true;
      }
    });
    return success;
  }

  // Color control for RGB fixtures
  setFixtureColor(fixtureId, color) {
    const fixture = this.fixtures.get(fixtureId);
    if (!fixture) return false;

    const fixtureType = this.getFixtureType(fixture.type);
    if (!fixtureType) return false;

    let success = true;
    
    if (fixtureType.capabilities.red) {
      success &= this.setFixtureValue(fixtureId, 'red', color.r);
    }
    if (fixtureType.capabilities.green) {
      success &= this.setFixtureValue(fixtureId, 'green', color.g);
    }
    if (fixtureType.capabilities.blue) {
      success &= this.setFixtureValue(fixtureId, 'blue', color.b);
    }
    if (fixtureType.capabilities.white && color.w !== undefined) {
      success &= this.setFixtureValue(fixtureId, 'white', color.w);
    }

    return success;
  }

  setGroupColor(groupId, color) {
    const group = this.fixtureGroups.get(groupId);
    if (!group) return false;

    let success = false;
    group.fixtures.forEach(fixtureId => {
      if (this.setFixtureColor(fixtureId, color)) {
        success = true;
      }
    });
    return success;
  }

  // Position control for moving fixtures
  setFixturePosition(fixtureId, pan, tilt) {
    const fixture = this.fixtures.get(fixtureId);
    if (!fixture) return false;

    const fixtureType = this.getFixtureType(fixture.type);
    if (!fixtureType) return false;

    let success = true;
    
    if (fixtureType.capabilities.pan) {
      success &= this.setFixtureValue(fixtureId, 'pan', pan);
    }
    if (fixtureType.capabilities.tilt) {
      success &= this.setFixtureValue(fixtureId, 'tilt', tilt);
    }

    return success;
  }

  // Update fader display
  updateFaderDisplay() {
    const faderRanges = document.querySelectorAll('.fader input[type="range"]');
    faderRanges.forEach((range, index) => {
      if (index < 512) {
        range.value = faderValues[index];
      }
    });
  }

  // Storage management
  saveFixtureLibrary() {
    const data = {
      fixtures: Array.from(this.fixtures.entries()),
      fixtureTypes: Array.from(this.fixtureTypes.entries()),
      groups: Array.from(this.fixtureGroups.entries()),
      version: '1.0'
    };
    localStorage.setItem('ionxe-fixture-library', JSON.stringify(data));
  }

  loadFixtureLibrary() {
    try {
      const data = JSON.parse(localStorage.getItem('ionxe-fixture-library'));
      if (data) {
        if (data.fixtures) {
          this.fixtures = new Map(data.fixtures);
        }
        if (data.groups) {
          this.fixtureGroups = new Map(data.groups);
        }
        // Don't overwrite default fixture types
        if (data.fixtureTypes) {
          data.fixtureTypes.forEach(([id, type]) => {
            if (!this.fixtureTypes.has(id)) {
              this.fixtureTypes.set(id, type);
            }
          });
        }
        this.updatePatch();
      }
    } catch (error) {
      console.warn('Failed to load fixture library:', error);
    }
  }

  // Export/Import
  exportFixtureLibrary() {
    const data = {
      fixtures: Array.from(this.fixtures.entries()),
      fixtureTypes: Array.from(this.fixtureTypes.entries()),
      groups: Array.from(this.fixtureGroups.entries()),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ionxe-fixture-library.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  importFixtureLibrary(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          if (data.fixtures) {
            this.fixtures = new Map(data.fixtures);
          }
          if (data.fixtureTypes) {
            data.fixtureTypes.forEach(([id, type]) => {
              this.fixtureTypes.set(id, type);
            });
          }
          if (data.groups) {
            this.fixtureGroups = new Map(data.groups);
          }
          
          this.updatePatch();
          this.saveFixtureLibrary();
          resolve({ success: true });
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  }

  // Utility functions
  generateId() {
    return 'fixture_' + Math.random().toString(36).substr(2, 9);
  }

  // Event notifications
  notifySelectionChanged() {
    if (this.onSelectionChanged) {
      this.onSelectionChanged(this.getSelectedFixtures());
    }
  }

  notifyFixtureValueChanged(fixtureId, capability, value) {
    if (this.onFixtureValueChanged) {
      this.onFixtureValueChanged(fixtureId, capability, value);
    }
  }
}

// Initialize fixture core
const fixtureCore = new FixtureCore();
