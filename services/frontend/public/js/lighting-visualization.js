// Lighting Visualization Engine
// Real-time 3D lighting visualization and preview

class LightingVisualizationEngine {
  constructor(qListManager, fixtureManager, venueMapping) {
    this.qListManager = qListManager;
    this.fixtureManager = fixtureManager;
    this.venueMapping = venueMapping;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.isInitialized = false;
    this.isRendering = false;
    this.frameRate = 60;
    this.lastFrameTime = 0;
    
    this.fixtureMeshes = new Map();
    this.lightObjects = new Map();
    this.beamVisualizations = new Map();
    this.goboProjections = new Map();
    this.colorWheels = new Map();
    
    this.initializeVisualizationEngine();
  }

  // Engine Initialization
  async initializeVisualizationEngine() {
    try {
      await this.loadThreeJS();
      this.setupScene();
      this.setupCamera();
      this.setupRenderer();
      this.setupControls();
      this.setupLighting();
      this.startRenderLoop();
      
      this.isInitialized = true;
      this.notifyVisualizationEvent('engine_initialized', null);
      return true;
    } catch (error) {
      console.error('Failed to initialize visualization engine:', error);
      return false;
    }
  }

  async loadThreeJS() {
    if (typeof THREE !== 'undefined') return;
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.onload = () => {
        // Load additional Three.js modules
        this.loadThreeJSModules().then(resolve).catch(reject);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async loadThreeJSModules() {
    const modules = [
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js',
      'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js'
    ];

    for (const moduleUrl of modules) {
      await this.loadScript(moduleUrl);
    }
  }

  loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Scene Setup
  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);
    this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 100);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(20, 15, 20);
    this.camera.lookAt(0, 0, 0);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Add renderer to DOM
    const container = document.getElementById('visualization-viewer');
    if (container) {
      container.appendChild(this.renderer.domElement);
    }
  }

  setupControls() {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
    this.controls.maxPolarAngle = Math.PI / 2;
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    this.scene.add(ambientLight);

    // Directional light for shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -25;
    directionalLight.shadow.camera.right = 25;
    directionalLight.shadow.camera.top = 25;
    directionalLight.shadow.camera.bottom = -25;
    this.scene.add(directionalLight);
  }

  // Fixture Visualization
  createFixtureVisualization(fixture) {
    const fixture3D = {
      id: fixture.id,
      name: fixture.name,
      type: fixture.type,
      position: fixture.position || { x: 0, y: 2, z: 0 },
      rotation: fixture.rotation || { x: 0, y: 0, z: 0 },
      mesh: null,
      light: null,
      beam: null,
      gobo: null,
      colorWheel: null,
      isActive: false,
      intensity: 0,
      color: new THREE.Color(0xffffff),
      beamAngle: 15,
      beamLength: 20
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

    // Create gobo projection
    fixture3D.gobo = this.createGoboProjection(fixture3D);
    this.scene.add(fixture3D.gobo);

    // Create color wheel
    fixture3D.colorWheel = this.createColorWheel(fixture3D);
    this.scene.add(fixture3D.colorWheel);

    this.fixtureMeshes.set(fixture.id, fixture3D);
    return fixture3D;
  }

  createFixtureMesh(fixture3D) {
    let geometry;
    
    switch (fixture3D.type) {
      case 'moving_head':
        geometry = new THREE.ConeGeometry(0.3, 1.5, 8);
        break;
      case 'par_can':
        geometry = new THREE.CylinderGeometry(0.4, 0.4, 1, 8);
        break;
      case 'led_strip':
        geometry = new THREE.BoxGeometry(0.2, 0.2, 3);
        break;
      case 'flood':
        geometry = new THREE.SphereGeometry(0.5, 8, 6);
        break;
      case 'spot':
        geometry = new THREE.ConeGeometry(0.2, 1, 8);
        break;
      default:
        geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    }

    const material = new THREE.MeshLambertMaterial({ 
      color: 0x666666,
      transparent: true,
      opacity: 0.8
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(fixture3D.position.x, fixture3D.position.y, fixture3D.position.z);
    mesh.rotation.set(fixture3D.rotation.x, fixture3D.rotation.y, fixture3D.rotation.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { fixtureId: fixture3D.id, type: 'fixture' };

    return mesh;
  }

  createFixtureLight(fixture3D) {
    const light = new THREE.SpotLight(
      fixture3D.color,
      0,
      50,
      Math.PI / 6,
      0.3,
      1
    );
    
    light.position.set(fixture3D.position.x, fixture3D.position.y, fixture3D.position.z);
    light.target.position.set(
      fixture3D.position.x + Math.sin(fixture3D.rotation.y),
      fixture3D.position.y - Math.sin(fixture3D.rotation.x),
      fixture3D.position.z + Math.cos(fixture3D.rotation.y)
    );
    
    light.castShadow = true;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 50;
    light.shadow.camera.fov = 30;
    light.visible = false;
    light.userData = { fixtureId: fixture3D.id, type: 'light' };

    return light;
  }

  createBeamVisualization(fixture3D) {
    const beamGeometry = new THREE.ConeGeometry(
      Math.tan(fixture3D.beamAngle * Math.PI / 180) * fixture3D.beamLength,
      fixture3D.beamLength,
      16
    );
    
    const beamMaterial = new THREE.MeshBasicMaterial({ 
      color: fixture3D.color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    beam.position.set(fixture3D.position.x, fixture3D.position.y, fixture3D.position.z);
    beam.rotation.set(fixture3D.rotation.x, fixture3D.rotation.y, fixture3D.rotation.z);
    beam.visible = false;
    beam.userData = { fixtureId: fixture3D.id, type: 'beam' };

    return beam;
  }

  createGoboProjection(fixture3D) {
    const goboGeometry = new THREE.PlaneGeometry(2, 2);
    const goboMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    
    const gobo = new THREE.Mesh(goboGeometry, goboMaterial);
    gobo.position.set(
      fixture3D.position.x + Math.sin(fixture3D.rotation.y) * 10,
      fixture3D.position.y - Math.sin(fixture3D.rotation.x) * 10,
      fixture3D.position.z + Math.cos(fixture3D.rotation.y) * 10
    );
    gobo.visible = false;
    gobo.userData = { fixtureId: fixture3D.id, type: 'gobo' };

    return gobo;
  }

  createColorWheel(fixture3D) {
    const colorWheelGeometry = new THREE.RingGeometry(0.1, 0.3, 16);
    const colorWheelMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7
    });
    
    const colorWheel = new THREE.Mesh(colorWheelGeometry, colorWheelMaterial);
    colorWheel.position.set(fixture3D.position.x, fixture3D.position.y, fixture3D.position.z);
    colorWheel.visible = false;
    colorWheel.userData = { fixtureId: fixture3D.id, type: 'colorWheel' };

    return colorWheel;
  }

  // Lighting Updates
  updateFixtureLighting(fixtureId, levels) {
    const fixture3D = this.fixtureMeshes.get(fixtureId);
    if (!fixture3D) return;

    // Update intensity
    const intensity = levels[0] / 255;
    fixture3D.intensity = intensity;
    fixture3D.light.intensity = intensity;
    fixture3D.light.visible = intensity > 0;

    // Update beam visualization
    fixture3D.beam.visible = intensity > 0;
    fixture3D.beam.material.opacity = intensity * 0.4;

    // Update color if RGB channels available
    if (levels.length >= 4) {
      const color = new THREE.Color(
        levels[1] / 255, // Red
        levels[2] / 255, // Green
        levels[3] / 255  // Blue
      );
      fixture3D.color = color;
      fixture3D.light.color = color;
      fixture3D.beam.material.color = color;
    }

    // Update gobo if available
    if (levels.length >= 5) {
      const goboIndex = levels[4];
      this.updateGoboProjection(fixture3D, goboIndex);
    }

    // Update color wheel if available
    if (levels.length >= 6) {
      const colorWheelIndex = levels[5];
      this.updateColorWheel(fixture3D, colorWheelIndex);
    }

    fixture3D.isActive = intensity > 0;
  }

  updateGoboProjection(fixture3D, goboIndex) {
    if (goboIndex === 0) {
      fixture3D.gobo.visible = false;
      return;
    }

    // Load gobo texture based on index
    const goboTexture = this.loadGoboTexture(goboIndex);
    fixture3D.gobo.material.map = goboTexture;
    fixture3D.gobo.material.needsUpdate = true;
    fixture3D.gobo.visible = true;
  }

  updateColorWheel(fixture3D, colorWheelIndex) {
    if (colorWheelIndex === 0) {
      fixture3D.colorWheel.visible = false;
      return;
    }

    // Set color wheel color based on index
    const colors = [
      0xff0000, // Red
      0xff8000, // Orange
      0xffff00, // Yellow
      0x80ff00, // Lime
      0x00ff00, // Green
      0x00ff80, // Cyan
      0x00ffff, // Cyan
      0x0080ff, // Light Blue
      0x0000ff, // Blue
      0x8000ff, // Purple
      0xff00ff, // Magenta
      0xff0080  // Pink
    ];

    const color = colors[colorWheelIndex % colors.length];
    fixture3D.colorWheel.material.color.setHex(color);
    fixture3D.colorWheel.visible = true;
  }

  loadGoboTexture(goboIndex) {
    // This would load actual gobo textures
    // For now, create a simple pattern
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 256);
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(128, 128, 50, 0, 2 * Math.PI);
    ctx.fill();
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // Rendering
  startRenderLoop() {
    const animate = (currentTime) => {
      requestAnimationFrame(animate);
      
      if (currentTime - this.lastFrameTime >= 1000 / this.frameRate) {
        this.render();
        this.lastFrameTime = currentTime;
      }
    };
    
    animate(0);
  }

  render() {
    if (!this.isRendering) return;
    
    this.controls.update();
    this.updateVisualizations();
    this.renderer.render(this.scene, this.camera);
  }

  updateVisualizations() {
    // Update beam visualizations
    for (const fixture3D of this.fixtureMeshes.values()) {
      if (fixture3D.isActive) {
        this.updateBeamVisualization(fixture3D);
      }
    }
  }

  updateBeamVisualization(fixture3D) {
    // Update beam direction based on fixture rotation
    const direction = new THREE.Vector3(
      Math.sin(fixture3D.rotation.y),
      -Math.sin(fixture3D.rotation.x),
      Math.cos(fixture3D.rotation.y)
    );
    
    fixture3D.beam.lookAt(
      fixture3D.position.x + direction.x * fixture3D.beamLength,
      fixture3D.position.y + direction.y * fixture3D.beamLength,
      fixture3D.position.z + direction.z * fixture3D.beamLength
    );
  }

  // Camera Controls
  setCameraPosition(x, y, z) {
    this.camera.position.set(x, y, z);
    this.controls.update();
  }

  setCameraTarget(x, y, z) {
    this.controls.target.set(x, y, z);
    this.controls.update();
  }

  // View Modes
  setViewMode(mode) {
    switch (mode) {
      case 'front':
        this.setCameraPosition(0, 5, 20);
        this.setCameraTarget(0, 0, 0);
        break;
      case 'back':
        this.setCameraPosition(0, 5, -20);
        this.setCameraTarget(0, 0, 0);
        break;
      case 'left':
        this.setCameraPosition(-20, 5, 0);
        this.setCameraTarget(0, 0, 0);
        break;
      case 'right':
        this.setCameraPosition(20, 5, 0);
        this.setCameraTarget(0, 0, 0);
        break;
      case 'top':
        this.setCameraPosition(0, 30, 0);
        this.setCameraTarget(0, 0, 0);
        break;
      case 'iso':
        this.setCameraPosition(20, 15, 20);
        this.setCameraTarget(0, 0, 0);
        break;
    }
  }

  // Utility Functions
  startRendering() {
    this.isRendering = true;
  }

  stopRendering() {
    this.isRendering = false;
  }

  handleWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Event Notifications
  notifyVisualizationEvent(eventType, data) {
    const event = new CustomEvent('visualization-event', {
      detail: { eventType, data }
    });
    document.dispatchEvent(event);
  }

  // Cleanup
  destroy() {
    this.stopRendering();
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    this.fixtureMeshes.clear();
    this.lightObjects.clear();
    this.beamVisualizations.clear();
    this.goboProjections.clear();
    this.colorWheels.clear();
    
    this.isInitialized = false;
  }
}

// Global Lighting Visualization Engine Instance
const lightingVisualizationEngine = new LightingVisualizationEngine(qListManager, fixtureManager, venueMappingSystem);
