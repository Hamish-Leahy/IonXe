// Venue Mapping System
// 3D venue visualization and spatial lighting control

class VenueMappingSystem {
  constructor(qListManager, fixtureManager) {
    this.qListManager = qListManager;
    this.fixtureManager = fixtureManager;
    this.venue = null;
    this.fixtures = new Map();
    this.lightingZones = new Map();
    this.viewer = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.isInitialized = false;
    this.selectedFixtures = new Set();
    this.highlightedFixtures = new Set();
    
    this.initializeVenueSystem();
  }

  // Venue Management
  async loadVenue(venueData) {
    try {
      this.venue = {
        id: venueData.id || 'default_venue',
        name: venueData.name || 'Untitled Venue',
        dimensions: venueData.dimensions || { width: 20, height: 10, depth: 15 },
        origin: venueData.origin || { x: 0, y: 0, z: 0 },
        units: venueData.units || 'meters',
        geometry: venueData.geometry || null,
        materials: venueData.materials || {},
        lightingZones: venueData.lightingZones || [],
        createdAt: new Date().toISOString()
      };

      await this.initialize3DViewer();
      await this.loadVenueGeometry();
      await this.loadFixtures();
      await this.createLightingZones();
      
      this.isInitialized = true;
      this.notifyVenueEvent('venue_loaded', this.venue);
      
      return true;
    } catch (error) {
      console.error('Failed to load venue:', error);
      return false;
    }
  }

  // 3D Viewer Initialization
  async initialize3DViewer() {
    // Check if Three.js is available
    if (typeof THREE === 'undefined') {
      await this.loadThreeJS();
    }

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(15, 10, 15);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Add renderer to DOM
    const container = document.getElementById('venue-viewer');
    if (container) {
      container.appendChild(this.renderer.domElement);
    }

    // Create controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;
    this.controls.enablePan = true;

    // Add lighting
    this.addAmbientLight();
    this.addDirectionalLight();

    // Start render loop
    this.startRenderLoop();

    // Handle window resize
    window.addEventListener('resize', () => this.handleWindowResize());
  }

  async loadThreeJS() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.onload = () => {
        // Load OrbitControls
        const controlsScript = document.createElement('script');
        controlsScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
        controlsScript.onload = resolve;
        controlsScript.onerror = reject;
        document.head.appendChild(controlsScript);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Venue Geometry
  async loadVenueGeometry() {
    if (!this.venue.geometry) {
      this.createDefaultVenueGeometry();
      return;
    }

    // Load custom geometry
    if (this.venue.geometry.type === 'obj') {
      await this.loadOBJGeometry(this.venue.geometry.url);
    } else if (this.venue.geometry.type === 'gltf') {
      await this.loadGLTFGeometry(this.venue.geometry.url);
    } else if (this.venue.geometry.type === 'fbx') {
      await this.loadFBXGeometry(this.venue.geometry.url);
    }
  }

  createDefaultVenueGeometry() {
    const dimensions = this.venue.dimensions;
    
    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(dimensions.width, dimensions.depth);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x333333,
      transparent: true,
      opacity: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Create walls
    this.createWall(0, dimensions.height / 2, 0, dimensions.width, dimensions.height, 0.1); // Front
    this.createWall(0, dimensions.height / 2, -dimensions.depth, dimensions.width, dimensions.height, 0.1); // Back
    this.createWall(-dimensions.width / 2, dimensions.height / 2, -dimensions.depth / 2, 0.1, dimensions.height, dimensions.depth); // Left
    this.createWall(dimensions.width / 2, dimensions.height / 2, -dimensions.depth / 2, 0.1, dimensions.height, dimensions.depth); // Right

    // Create ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(dimensions.width, dimensions.depth);
    const ceilingMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x444444,
      transparent: true,
      opacity: 0.6
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.position.y = dimensions.height;
    ceiling.rotation.x = Math.PI / 2;
    this.scene.add(ceiling);
  }

  createWall(x, y, z, width, height, depth) {
    const wallGeometry = new THREE.BoxGeometry(width, height, depth);
    const wallMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x666666,
      transparent: true,
      opacity: 0.7
    });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);
  }

  // Fixture Management
  async loadFixtures() {
    const fixtures = this.fixtureManager.getAllFixtures();
    
    for (const fixture of fixtures) {
      await this.addFixtureToVenue(fixture);
    }
  }

  async addFixtureToVenue(fixture) {
    const fixture3D = {
      id: fixture.id,
      name: fixture.name,
      type: fixture.type,
      position: fixture.position || { x: 0, y: 2, z: 0 },
      rotation: fixture.rotation || { x: 0, y: 0, z: 0 },
      scale: fixture.scale || { x: 1, y: 1, z: 1 },
      mesh: null,
      light: null,
      beam: null,
      isSelected: false,
      isHighlighted: false,
      channels: fixture.channels || [],
      capabilities: fixture.capabilities || {}
    };

    // Create fixture mesh
    fixture3D.mesh = this.createFixtureMesh(fixture3D);
    this.scene.add(fixture3D.mesh);

    // Create fixture light
    fixture3D.light = this.createFixtureLight(fixture3D);
    this.scene.add(fixture3D.light);

    // Create beam visualization
    fixture3D.beam = this.createBeamVisualization(fixture3D);
    this.scene.add(fixture3D.beam);

    this.fixtures.set(fixture.id, fixture3D);
  }

  createFixtureMesh(fixture3D) {
    let geometry;
    
    switch (fixture3D.type) {
      case 'moving_head':
        geometry = new THREE.ConeGeometry(0.2, 1, 8);
        break;
      case 'par_can':
        geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8);
        break;
      case 'led_strip':
        geometry = new THREE.BoxGeometry(0.1, 0.1, 2);
        break;
      case 'flood':
        geometry = new THREE.SphereGeometry(0.4, 8, 6);
        break;
      default:
        geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    }

    const material = new THREE.MeshLambertMaterial({ 
      color: 0x888888,
      transparent: true,
      opacity: 0.8
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(fixture3D.position.x, fixture3D.position.y, fixture3D.position.z);
    mesh.rotation.set(fixture3D.rotation.x, fixture3D.rotation.y, fixture3D.rotation.z);
    mesh.scale.set(fixture3D.scale.x, fixture3D.scale.y, fixture3D.scale.z);
    mesh.castShadow = true;
    mesh.userData = { fixtureId: fixture3D.id, type: 'fixture' };

    return mesh;
  }

  createFixtureLight(fixture3D) {
    const light = new THREE.SpotLight(0xffffff, 1, 50, Math.PI / 6, 0.3, 1);
    light.position.set(fixture3D.position.x, fixture3D.position.y, fixture3D.position.z);
    light.target.position.set(
      fixture3D.position.x + Math.sin(fixture3D.rotation.y),
      fixture3D.position.y - Math.sin(fixture3D.rotation.x),
      fixture3D.position.z + Math.cos(fixture3D.rotation.y)
    );
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.visible = false; // Initially hidden
    light.userData = { fixtureId: fixture3D.id, type: 'light' };

    return light;
  }

  createBeamVisualization(fixture3D) {
    const beamGeometry = new THREE.ConeGeometry(0.1, 10, 8);
    const beamMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffff00,
      transparent: true,
      opacity: 0.3
    });
    
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.set(fixture3D.position.x, fixture3D.position.y, fixture3D.position.z);
    beam.rotation.set(fixture3D.rotation.x, fixture3D.rotation.y, fixture3D.rotation.z);
    beam.visible = false; // Initially hidden
    beam.userData = { fixtureId: fixture3D.id, type: 'beam' };

    return beam;
  }

  // Lighting Zones
  async createLightingZones() {
    for (const zoneData of this.venue.lightingZones) {
      const zone = {
        id: zoneData.id,
        name: zoneData.name,
        type: zoneData.type || 'area',
        bounds: zoneData.bounds,
        fixtures: zoneData.fixtures || [],
        color: zoneData.color || 0x00ff00,
        opacity: zoneData.opacity || 0.2,
        mesh: null,
        isActive: false
      };

      zone.mesh = this.createZoneMesh(zone);
      this.scene.add(zone.mesh);
      
      this.lightingZones.set(zone.id, zone);
    }
  }

  createZoneMesh(zone) {
    const geometry = new THREE.BoxGeometry(
      zone.bounds.width,
      zone.bounds.height,
      zone.bounds.depth
    );
    
    const material = new THREE.MeshBasicMaterial({
      color: zone.color,
      transparent: true,
      opacity: zone.opacity,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      zone.bounds.x,
      zone.bounds.y,
      zone.bounds.z
    );
    mesh.visible = false; // Initially hidden
    mesh.userData = { zoneId: zone.id, type: 'zone' };

    return mesh;
  }

  // Interaction Handling
  setupInteraction() {
    this.renderer.domElement.addEventListener('click', (event) => {
      this.handleClick(event);
    });

    this.renderer.domElement.addEventListener('mousemove', (event) => {
      this.handleMouseMove(event);
    });
  }

  handleClick(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const intersects = raycaster.intersectObjects(this.scene.children, true);
    
    if (intersects.length > 0) {
      const object = intersects[0].object;
      const userData = object.userData;
      
      if (userData.type === 'fixture') {
        this.selectFixture(userData.fixtureId);
      } else if (userData.type === 'zone') {
        this.selectZone(userData.zoneId);
      }
    }
  }

  handleMouseMove(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const intersects = raycaster.intersectObjects(this.scene.children, true);
    
    // Clear previous highlights
    this.clearHighlights();
    
    if (intersects.length > 0) {
      const object = intersects[0].object;
      const userData = object.userData;
      
      if (userData.type === 'fixture') {
        this.highlightFixture(userData.fixtureId);
      }
    }
  }

  // Selection Management
  selectFixture(fixtureId) {
    this.clearSelection();
    this.selectedFixtures.add(fixtureId);
    
    const fixture = this.fixtures.get(fixtureId);
    if (fixture) {
      fixture.isSelected = true;
      fixture.mesh.material.color.setHex(0x00ff00);
      this.notifyFixtureEvent('fixture_selected', fixture);
    }
  }

  selectZone(zoneId) {
    this.clearSelection();
    
    const zone = this.lightingZones.get(zoneId);
    if (zone) {
      zone.isActive = !zone.isActive;
      zone.mesh.visible = zone.isActive;
      this.notifyZoneEvent('zone_toggled', zone);
    }
  }

  highlightFixture(fixtureId) {
    this.highlightedFixtures.add(fixtureId);
    
    const fixture = this.fixtures.get(fixtureId);
    if (fixture && !fixture.isSelected) {
      fixture.isHighlighted = true;
      fixture.mesh.material.color.setHex(0xffaa00);
    }
  }

  clearSelection() {
    for (const fixtureId of this.selectedFixtures) {
      const fixture = this.fixtures.get(fixtureId);
      if (fixture) {
        fixture.isSelected = false;
        fixture.mesh.material.color.setHex(0x888888);
      }
    }
    this.selectedFixtures.clear();
  }

  clearHighlights() {
    for (const fixtureId of this.highlightedFixtures) {
      const fixture = this.fixtures.get(fixtureId);
      if (fixture && !fixture.isSelected) {
        fixture.isHighlighted = false;
        fixture.mesh.material.color.setHex(0x888888);
      }
    }
    this.highlightedFixtures.clear();
  }

  // Lighting Control
  updateFixtureLighting(fixtureId, levels) {
    const fixture = this.fixtures.get(fixtureId);
    if (!fixture) return;

    // Update light intensity
    const intensity = levels[0] / 255; // Assuming first channel is intensity
    fixture.light.intensity = intensity;
    fixture.light.visible = intensity > 0;

    // Update beam visualization
    fixture.beam.visible = intensity > 0;
    fixture.beam.material.opacity = intensity * 0.5;

    // Update color if RGB channels available
    if (levels.length >= 4) {
      const color = new THREE.Color(
        levels[1] / 255, // Red
        levels[2] / 255, // Green
        levels[3] / 255  // Blue
      );
      fixture.light.color = color;
      fixture.beam.material.color = color;
    }
  }

  // Rendering
  startRenderLoop() {
    const animate = () => {
      requestAnimationFrame(animate);
      
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    
    animate();
  }

  handleWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  addAmbientLight() {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);
  }

  addDirectionalLight() {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
  }

  // Event Notifications
  notifyVenueEvent(eventType, venueData) {
    const event = new CustomEvent('venue-event', {
      detail: { eventType, venueData }
    });
    document.dispatchEvent(event);
  }

  notifyFixtureEvent(eventType, fixtureData) {
    const event = new CustomEvent('venue-fixture', {
      detail: { eventType, fixtureData }
    });
    document.dispatchEvent(event);
  }

  notifyZoneEvent(eventType, zoneData) {
    const event = new CustomEvent('venue-zone', {
      detail: { eventType, zoneData }
    });
    document.dispatchEvent(event);
  }

  // Cleanup
  destroy() {
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    this.fixtures.clear();
    this.lightingZones.clear();
    this.selectedFixtures.clear();
    this.highlightedFixtures.clear();
    
    this.isInitialized = false;
  }
}

// Global Venue Mapping System Instance
const venueMappingSystem = new VenueMappingSystem(qListManager, fixtureManager);
