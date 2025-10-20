// Fixture Library Manager
// Comprehensive fixture database and management system

class FixtureLibraryManager {
  constructor(qListManager, effectsEngine) {
    this.qListManager = qListManager;
    this.effectsEngine = effectsEngine;
    this.fixtureLibrary = new Map();
    this.fixtureCategories = new Map();
    this.fixtureManufacturers = new Map();
    this.customFixtures = new Map();
    this.fixtureTemplates = new Map();
    this.isInitialized = false;
    this.libraryVersion = '1.0.0';
    this.lastUpdated = null;
    
    this.initializeFixtureLibrary();
  }

  // Library Initialization
  initializeFixtureLibrary() {
    this.setupDefaultCategories();
    this.setupDefaultManufacturers();
    this.loadBuiltInFixtures();
    this.loadCustomFixtures();
    this.isInitialized = true;
  }

  setupDefaultCategories() {
    const categories = [
      { id: 'moving_head', name: 'Moving Head', description: 'Moving head fixtures' },
      { id: 'par_can', name: 'PAR Can', description: 'PAR can fixtures' },
      { id: 'led_strip', name: 'LED Strip', description: 'LED strip fixtures' },
      { id: 'flood', name: 'Flood', description: 'Flood light fixtures' },
      { id: 'spot', name: 'Spot', description: 'Spot light fixtures' },
      { id: 'wash', name: 'Wash', description: 'Wash light fixtures' },
      { id: 'beam', name: 'Beam', description: 'Beam light fixtures' },
      { id: 'laser', name: 'Laser', description: 'Laser fixtures' },
      { id: 'hazer', name: 'Hazer', description: 'Hazer fixtures' },
      { id: 'fog', name: 'Fog', description: 'Fog machine fixtures' }
    ];

    for (const category of categories) {
      this.fixtureCategories.set(category.id, category);
    }
  }

  setupDefaultManufacturers() {
    const manufacturers = [
      { id: 'eternal', name: 'Eternal', description: 'Eternal Lighting' },
      { id: 'martin', name: 'Martin', description: 'Martin Professional' },
      { id: 'clay_paky', name: 'Clay Paky', description: 'Clay Paky' },
      { id: 'robert_juliat', name: 'Robert Juliat', description: 'Robert Juliat' },
      { id: 'eternal', name: 'Eternal', description: 'Eternal Lighting' },
      { id: 'eternal', name: 'Eternal', description: 'Eternal Lighting' },
      { id: 'eternal', name: 'Eternal', description: 'Eternal Lighting' },
      { id: 'eternal', name: 'Eternal', description: 'Eternal Lighting' },
      { id: 'eternal', name: 'Eternal', description: 'Eternal Lighting' },
      { id: 'eternal', name: 'Eternal', description: 'Eternal Lighting' }
    ];

    for (const manufacturer of manufacturers) {
      this.fixtureManufacturers.set(manufacturer.id, manufacturer);
    }
  }

  loadBuiltInFixtures() {
    // Moving Head Fixtures
    this.addFixture({
      id: 'eternal_spot_250',
      name: 'Eternal Spot 250',
      manufacturer: 'eternal',
      category: 'moving_head',
      type: 'spot',
      channels: 16,
      capabilities: {
        pan: { min: 0, max: 540, default: 270 },
        tilt: { min: 0, max: 270, default: 135 },
        dimmer: { min: 0, max: 255, default: 255 },
        strobe: { min: 0, max: 255, default: 0 },
        color: { type: 'rgb', channels: ['red', 'green', 'blue'] },
        gobo: { type: 'wheel', positions: 16 },
        goboRotation: { min: 0, max: 255, default: 0 },
        focus: { min: 0, max: 255, default: 128 },
        zoom: { min: 0, max: 255, default: 128 },
        prism: { type: 'wheel', positions: 8 },
        prismRotation: { min: 0, max: 255, default: 0 },
        frost: { min: 0, max: 255, default: 0 },
        iris: { min: 0, max: 255, default: 255 }
      },
      channelMap: {
        pan: 1,
        panFine: 2,
        tilt: 3,
        tiltFine: 4,
        dimmer: 5,
        strobe: 6,
        red: 7,
        green: 8,
        blue: 9,
        gobo: 10,
        goboRotation: 11,
        focus: 12,
        zoom: 13,
        prism: 14,
        prismRotation: 15,
        frost: 16
      },
      powerConsumption: 250,
      weight: 12.5,
      dimensions: { width: 320, height: 420, depth: 320 },
      beamAngle: { min: 5, max: 50 },
      colorTemperature: 3200,
      description: 'Professional moving head spot fixture'
    });

    // PAR Can Fixtures
    this.addFixture({
      id: 'eternal_par_64',
      name: 'Eternal PAR 64',
      manufacturer: 'eternal',
      category: 'par_can',
      type: 'wash',
      channels: 4,
      capabilities: {
        dimmer: { min: 0, max: 255, default: 255 },
        red: { min: 0, max: 255, default: 255 },
        green: { min: 0, max: 255, default: 255 },
        blue: { min: 0, max: 255, default: 255 }
      },
      channelMap: {
        dimmer: 1,
        red: 2,
        green: 3,
        blue: 4
      },
      powerConsumption: 100,
      weight: 2.5,
      dimensions: { width: 200, height: 200, depth: 200 },
      beamAngle: { min: 15, max: 45 },
      colorTemperature: 3200,
      description: 'LED PAR can fixture'
    });

    // LED Strip Fixtures
    this.addFixture({
      id: 'eternal_strip_rgbw',
      name: 'Eternal Strip RGBW',
      manufacturer: 'eternal',
      category: 'led_strip',
      type: 'wash',
      channels: 5,
      capabilities: {
        dimmer: { min: 0, max: 255, default: 255 },
        red: { min: 0, max: 255, default: 255 },
        green: { min: 0, max: 255, default: 255 },
        blue: { min: 0, max: 255, default: 255 },
        white: { min: 0, max: 255, default: 255 }
      },
      channelMap: {
        dimmer: 1,
        red: 2,
        green: 3,
        blue: 4,
        white: 5
      },
      powerConsumption: 50,
      weight: 1.0,
      dimensions: { width: 1000, height: 20, depth: 10 },
      beamAngle: { min: 120, max: 120 },
      colorTemperature: 3200,
      description: 'RGBW LED strip fixture'
    });
  }

  // Fixture Management
  addFixture(fixtureData) {
    const fixture = {
      id: fixtureData.id,
      name: fixtureData.name,
      manufacturer: fixtureData.manufacturer,
      category: fixtureData.category,
      type: fixtureData.type,
      channels: fixtureData.channels,
      capabilities: fixtureData.capabilities,
      channelMap: fixtureData.channelMap,
      powerConsumption: fixtureData.powerConsumption,
      weight: fixtureData.weight,
      dimensions: fixtureData.dimensions,
      beamAngle: fixtureData.beamAngle,
      colorTemperature: fixtureData.colorTemperature,
      description: fixtureData.description,
      isCustom: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.fixtureLibrary.set(fixture.id, fixture);
    this.lastUpdated = Date.now();
    return fixture;
  }

  createCustomFixture(fixtureData) {
    const fixture = {
      ...fixtureData,
      id: fixtureData.id || this.generateFixtureId(),
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.customFixtures.set(fixture.id, fixture);
    this.fixtureLibrary.set(fixture.id, fixture);
    this.lastUpdated = Date.now();
    
    this.notifyFixtureEvent('custom_fixture_created', fixture);
    return fixture;
  }

  updateFixture(fixtureId, updates) {
    const fixture = this.fixtureLibrary.get(fixtureId);
    if (!fixture) return false;

    Object.assign(fixture, updates);
    fixture.updatedAt = new Date().toISOString();
    this.lastUpdated = Date.now();
    
    this.notifyFixtureEvent('fixture_updated', fixture);
    return true;
  }

  deleteFixture(fixtureId) {
    const fixture = this.fixtureLibrary.get(fixtureId);
    if (!fixture) return false;

    this.fixtureLibrary.delete(fixtureId);
    
    if (fixture.isCustom) {
      this.customFixtures.delete(fixtureId);
    }
    
    this.lastUpdated = Date.now();
    this.notifyFixtureEvent('fixture_deleted', fixture);
    return true;
  }

  // Fixture Templates
  createFixtureTemplate(templateData) {
    const template = {
      id: templateData.id || this.generateTemplateId(),
      name: templateData.name,
      description: templateData.description,
      category: templateData.category,
      channels: templateData.channels,
      capabilities: templateData.capabilities,
      channelMap: templateData.channelMap,
      parameters: templateData.parameters || {},
      createdAt: new Date().toISOString()
    };

    this.fixtureTemplates.set(template.id, template);
    return template;
  }

  createFixtureFromTemplate(templateId, fixtureData) {
    const template = this.fixtureTemplates.get(templateId);
    if (!template) return null;

    const fixture = {
      ...template,
      ...fixtureData,
      id: fixtureData.id || this.generateFixtureId(),
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.customFixtures.set(fixture.id, fixture);
    this.fixtureLibrary.set(fixture.id, fixture);
    
    return fixture;
  }

  // Fixture Search and Filtering
  searchFixtures(query, filters = {}) {
    const results = [];
    
    for (const fixture of this.fixtureLibrary.values()) {
      if (this.matchesQuery(fixture, query) && this.matchesFilters(fixture, filters)) {
        results.push(fixture);
      }
    }
    
    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  matchesQuery(fixture, query) {
    if (!query) return true;
    
    const searchText = query.toLowerCase();
    return fixture.name.toLowerCase().includes(searchText) ||
           fixture.description.toLowerCase().includes(searchText) ||
           fixture.manufacturer.toLowerCase().includes(searchText);
  }

  matchesFilters(fixture, filters) {
    if (filters.category && fixture.category !== filters.category) return false;
    if (filters.manufacturer && fixture.manufacturer !== filters.manufacturer) return false;
    if (filters.type && fixture.type !== filters.type) return false;
    if (filters.minChannels && fixture.channels < filters.minChannels) return false;
    if (filters.maxChannels && fixture.channels > filters.maxChannels) return false;
    if (filters.hasColor && !fixture.capabilities.color) return false;
    if (filters.hasGobo && !fixture.capabilities.gobo) return false;
    if (filters.hasPan && !fixture.capabilities.pan) return false;
    if (filters.hasTilt && !fixture.capabilities.tilt) return false;
    
    return true;
  }

  getFixturesByCategory(categoryId) {
    return Array.from(this.fixtureLibrary.values())
      .filter(fixture => fixture.category === categoryId);
  }

  getFixturesByManufacturer(manufacturerId) {
    return Array.from(this.fixtureLibrary.values())
      .filter(fixture => fixture.manufacturer === manufacturerId);
  }

  // Fixture Capabilities
  getFixtureCapabilities(fixtureId) {
    const fixture = this.fixtureLibrary.get(fixtureId);
    return fixture ? fixture.capabilities : null;
  }

  hasCapability(fixtureId, capability) {
    const fixture = this.fixtureLibrary.get(fixtureId);
    return fixture ? fixture.capabilities.hasOwnProperty(capability) : false;
  }

  getCapabilityRange(fixtureId, capability) {
    const fixture = this.fixtureLibrary.get(fixtureId);
    if (!fixture || !fixture.capabilities[capability]) return null;
    
    const cap = fixture.capabilities[capability];
    return {
      min: cap.min || 0,
      max: cap.max || 255,
      default: cap.default || 0
    };
  }

  // Channel Mapping
  getChannelMap(fixtureId) {
    const fixture = this.fixtureLibrary.get(fixtureId);
    return fixture ? fixture.channelMap : null;
  }

  getChannelForCapability(fixtureId, capability) {
    const fixture = this.fixtureLibrary.get(fixtureId);
    if (!fixture || !fixture.channelMap) return null;
    
    return fixture.channelMap[capability];
  }

  // Fixture Instances
  createFixtureInstance(fixtureId, instanceData) {
    const fixture = this.fixtureLibrary.get(fixtureId);
    if (!fixture) return null;

    const instance = {
      id: instanceData.id || this.generateInstanceId(),
      fixtureId: fixtureId,
      name: instanceData.name || `${fixture.name} ${instanceData.number || 1}`,
      number: instanceData.number || 1,
      universe: instanceData.universe || 1,
      address: instanceData.address || 1,
      position: instanceData.position || { x: 0, y: 0, z: 0 },
      rotation: instanceData.rotation || { x: 0, y: 0, z: 0 },
      scale: instanceData.scale || { x: 1, y: 1, z: 1 },
      isActive: true,
      currentLevels: new Uint8Array(fixture.channels),
      createdAt: new Date().toISOString()
    };

    return instance;
  }

  updateFixtureInstance(instanceId, updates) {
    // This would update a fixture instance
    // Implementation depends on how instances are stored
  }

  // Library Management
  exportFixtureLibrary() {
    const library = {
      version: this.libraryVersion,
      lastUpdated: this.lastUpdated,
      fixtures: Array.from(this.fixtureLibrary.values()),
      categories: Array.from(this.fixtureCategories.values()),
      manufacturers: Array.from(this.fixtureManufacturers.values()),
      templates: Array.from(this.fixtureTemplates.values())
    };

    return library;
  }

  importFixtureLibrary(libraryData) {
    try {
      if (libraryData.fixtures) {
        for (const fixture of libraryData.fixtures) {
          this.fixtureLibrary.set(fixture.id, fixture);
        }
      }

      if (libraryData.categories) {
        for (const category of libraryData.categories) {
          this.fixtureCategories.set(category.id, category);
        }
      }

      if (libraryData.manufacturers) {
        for (const manufacturer of libraryData.manufacturers) {
          this.fixtureManufacturers.set(manufacturer.id, manufacturer);
        }
      }

      if (libraryData.templates) {
        for (const template of libraryData.templates) {
          this.fixtureTemplates.set(template.id, template);
        }
      }

      this.lastUpdated = Date.now();
      this.notifyFixtureEvent('library_imported', { count: libraryData.fixtures?.length || 0 });
      
      return true;
    } catch (error) {
      console.error('Failed to import fixture library:', error);
      return false;
    }
  }

  // Utility Functions
  generateFixtureId() {
    return 'fixture_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateTemplateId() {
    return 'template_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateInstanceId() {
    return 'instance_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getAllFixtures() {
    return Array.from(this.fixtureLibrary.values());
  }

  getAllCategories() {
    return Array.from(this.fixtureCategories.values());
  }

  getAllManufacturers() {
    return Array.from(this.fixtureManufacturers.values());
  }

  getAllTemplates() {
    return Array.from(this.fixtureTemplates.values());
  }

  getLibraryStats() {
    return {
      totalFixtures: this.fixtureLibrary.size,
      customFixtures: this.customFixtures.size,
      categories: this.fixtureCategories.size,
      manufacturers: this.fixtureManufacturers.size,
      templates: this.fixtureTemplates.size,
      lastUpdated: this.lastUpdated,
      version: this.libraryVersion
    };
  }

  // Event Notifications
  notifyFixtureEvent(eventType, data) {
    const event = new CustomEvent('fixture-event', {
      detail: { eventType, data }
    });
    document.dispatchEvent(event);
  }

  // Cleanup
  destroy() {
    this.fixtureLibrary.clear();
    this.fixtureCategories.clear();
    this.fixtureManufacturers.clear();
    this.customFixtures.clear();
    this.fixtureTemplates.clear();
    this.isInitialized = false;
  }
}

// Global Fixture Library Manager Instance
const fixtureLibraryManager = new FixtureLibraryManager(qListManager, effectsEngine);
