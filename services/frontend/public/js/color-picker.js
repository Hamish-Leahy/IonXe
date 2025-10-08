// Color Picker UI - Professional RGB/HSL Color Selection Interface
// Modern, intuitive color picker for lighting control

class ColorPickerUI {
  constructor(colorCore) {
    this.colorCore = colorCore;
    this.isVisible = false;
    this.currentMode = 'hsl'; // 'hsl' or 'rgb'
    
    this.initializeUI();
    this.setupEventListeners();
  }

  initializeUI() {
    this.createColorPickerHTML();
    this.updateDisplay();
  }

  createColorPickerHTML() {
    // Create color picker container
    const colorPickerContainer = document.createElement('div');
    colorPickerContainer.id = 'color-picker-panel';
    colorPickerContainer.className = 'color-picker-panel';
    colorPickerContainer.innerHTML = `
      <div class="color-picker-header">
        <h3>Color Picker</h3>
        <div class="color-picker-modes">
          <button id="color-mode-hsl" class="mode-btn active">HSL</button>
          <button id="color-mode-rgb" class="mode-btn">RGB</button>
        </div>
        <button id="color-picker-close" class="close-btn">×</button>
      </div>
      
      <div class="color-picker-content">
        <!-- Color Preview -->
        <div class="color-preview-section">
          <div class="color-preview-large" id="color-preview-large"></div>
          <div class="color-preview-info">
            <div class="color-hex" id="color-hex-display">#FFFFFF</div>
            <div class="color-rgb" id="color-rgb-display">RGB(255, 255, 255)</div>
            <div class="color-hsl" id="color-hsl-display">HSL(0°, 0%, 100%)</div>
          </div>
        </div>

        <!-- HSL Controls -->
        <div class="color-controls hsl-controls" id="hsl-controls">
          <div class="control-group">
            <label>Hue</label>
            <div class="slider-container">
              <input type="range" id="hue-slider" min="0" max="360" value="0" class="hue-slider">
              <div class="slider-track" id="hue-track"></div>
            </div>
            <input type="number" id="hue-input" min="0" max="360" value="0" class="number-input">
          </div>
          
          <div class="control-group">
            <label>Saturation</label>
            <div class="slider-container">
              <input type="range" id="saturation-slider" min="0" max="100" value="0" class="saturation-slider">
              <div class="slider-track" id="saturation-track"></div>
            </div>
            <input type="number" id="saturation-input" min="0" max="100" value="0" class="number-input">
          </div>
          
          <div class="control-group">
            <label>Lightness</label>
            <div class="slider-container">
              <input type="range" id="lightness-slider" min="0" max="100" value="100" class="lightness-slider">
              <div class="slider-track" id="lightness-track"></div>
            </div>
            <input type="number" id="lightness-input" min="0" max="100" value="100" class="number-input">
          </div>
        </div>

        <!-- RGB Controls -->
        <div class="color-controls rgb-controls" id="rgb-controls" style="display: none;">
          <div class="control-group">
            <label>Red</label>
            <div class="slider-container">
              <input type="range" id="red-slider" min="0" max="255" value="255" class="red-slider">
              <div class="slider-track" id="red-track"></div>
            </div>
            <input type="number" id="red-input" min="0" max="255" value="255" class="number-input">
          </div>
          
          <div class="control-group">
            <label>Green</label>
            <div class="slider-container">
              <input type="range" id="green-slider" min="0" max="255" value="255" class="green-slider">
              <div class="slider-track" id="green-track"></div>
            </div>
            <input type="number" id="green-input" min="0" max="255" value="255" class="number-input">
          </div>
          
          <div class="control-group">
            <label>Blue</label>
            <div class="slider-container">
              <input type="range" id="blue-slider" min="0" max="255" value="255" class="blue-slider">
              <div class="slider-track" id="blue-track"></div>
            </div>
            <input type="number" id="blue-input" min="0" max="255" value="255" class="number-input">
          </div>
        </div>

        <!-- Color Presets -->
        <div class="color-presets">
          <h4>Presets</h4>
          <div class="preset-grid" id="preset-grid"></div>
        </div>

        <!-- Channel Selection -->
        <div class="channel-selection">
          <h4>Apply to Channels</h4>
          <div class="channel-inputs">
            <input type="number" id="red-channel" placeholder="Red Channel" min="1" max="512">
            <input type="number" id="green-channel" placeholder="Green Channel" min="1" max="512">
            <input type="number" id="blue-channel" placeholder="Blue Channel" min="1" max="512">
          </div>
          <div class="channel-actions">
            <button id="apply-color">Apply Color</button>
            <button id="apply-to-selected">Apply to Selected</button>
          </div>
        </div>

        <!-- Color History -->
        <div class="color-history">
          <h4>Recent Colors</h4>
          <div class="history-grid" id="history-grid"></div>
        </div>
      </div>
    `;

    // Add to page
    document.body.appendChild(colorPickerContainer);
  }

  setupEventListeners() {
    // Mode switching
    document.getElementById('color-mode-hsl').onclick = () => this.setMode('hsl');
    document.getElementById('color-mode-rgb').onclick = () => this.setMode('rgb');
    
    // Close button
    document.getElementById('color-picker-close').onclick = () => this.hide();

    // HSL sliders
    document.getElementById('hue-slider').oninput = (e) => this.updateFromHSLSlider('h', parseInt(e.target.value));
    document.getElementById('saturation-slider').oninput = (e) => this.updateFromHSLSlider('s', parseInt(e.target.value));
    document.getElementById('lightness-slider').oninput = (e) => this.updateFromHSLSlider('l', parseInt(e.target.value));

    // HSL inputs
    document.getElementById('hue-input').oninput = (e) => this.updateFromHSLInput('h', parseInt(e.target.value));
    document.getElementById('saturation-input').oninput = (e) => this.updateFromHSLInput('s', parseInt(e.target.value));
    document.getElementById('lightness-input').oninput = (e) => this.updateFromHSLInput('l', parseInt(e.target.value));

    // RGB sliders
    document.getElementById('red-slider').oninput = (e) => this.updateFromRGBSlider('r', parseInt(e.target.value));
    document.getElementById('green-slider').oninput = (e) => this.updateFromRGBSlider('g', parseInt(e.target.value));
    document.getElementById('blue-slider').oninput = (e) => this.updateFromRGBSlider('b', parseInt(e.target.value));

    // RGB inputs
    document.getElementById('red-input').oninput = (e) => this.updateFromRGBInput('r', parseInt(e.target.value));
    document.getElementById('green-input').oninput = (e) => this.updateFromRGBInput('g', parseInt(e.target.value));
    document.getElementById('blue-input').oninput = (e) => this.updateFromRGBInput('b', parseInt(e.target.value));

    // Apply buttons
    document.getElementById('apply-color').onclick = () => this.applyColorToChannels();
    document.getElementById('apply-to-selected').onclick = () => this.applyToSelectedChannels();

    // Color core events
    this.colorCore.onColorChanged = (color) => this.updateDisplay();
    this.colorCore.onSelectionChanged = (channels) => this.updateChannelSelection();
  }

  setMode(mode) {
    this.currentMode = mode;
    
    // Update mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`color-mode-${mode}`).classList.add('active');
    
    // Show/hide controls
    document.getElementById('hsl-controls').style.display = mode === 'hsl' ? 'block' : 'none';
    document.getElementById('rgb-controls').style.display = mode === 'rgb' ? 'block' : 'none';
  }

  updateFromHSLSlider(component, value) {
    const hsl = this.colorCore.getHSL();
    hsl[component] = value;
    this.colorCore.updateColorFromHSL(hsl.h, hsl.s, hsl.l);
    this.updateSliderTracks();
  }

  updateFromHSLInput(component, value) {
    const hsl = this.colorCore.getHSL();
    hsl[component] = value;
    this.colorCore.updateColorFromHSL(hsl.h, hsl.s, hsl.l);
    this.updateSliderTracks();
  }

  updateFromRGBSlider(component, value) {
    const rgb = this.colorCore.getRGB();
    rgb[component] = value;
    this.colorCore.updateColorFromRGB(rgb.r, rgb.g, rgb.b);
    this.updateSliderTracks();
  }

  updateFromRGBInput(component, value) {
    const rgb = this.colorCore.getRGB();
    rgb[component] = value;
    this.colorCore.updateColorFromRGB(rgb.r, rgb.g, rgb.b);
    this.updateSliderTracks();
  }

  updateDisplay() {
    const color = this.colorCore.getCurrentColor();
    
    // Update preview
    document.getElementById('color-preview-large').style.backgroundColor = this.colorCore.getCSS();
    
    // Update text displays
    document.getElementById('color-hex-display').textContent = this.colorCore.getHex();
    document.getElementById('color-rgb-display').textContent = `RGB(${color.r}, ${color.g}, ${color.b})`;
    document.getElementById('color-hsl-display').textContent = `HSL(${color.h}°, ${color.s}%, ${color.l}%)`;
    
    // Update sliders and inputs
    document.getElementById('hue-slider').value = color.h;
    document.getElementById('hue-input').value = color.h;
    document.getElementById('saturation-slider').value = color.s;
    document.getElementById('saturation-input').value = color.s;
    document.getElementById('lightness-slider').value = color.l;
    document.getElementById('lightness-input').value = color.l;
    
    document.getElementById('red-slider').value = color.r;
    document.getElementById('red-input').value = color.r;
    document.getElementById('green-slider').value = color.g;
    document.getElementById('green-input').value = color.g;
    document.getElementById('blue-slider').value = color.b;
    document.getElementById('blue-input').value = color.b;
    
    this.updateSliderTracks();
    this.updatePresets();
    this.updateHistory();
  }

  updateSliderTracks() {
    const color = this.colorCore.getCurrentColor();
    
    // Update hue track
    const hueTrack = document.getElementById('hue-track');
    hueTrack.style.background = `linear-gradient(to right, 
      hsl(0, 100%, 50%), 
      hsl(60, 100%, 50%), 
      hsl(120, 100%, 50%), 
      hsl(180, 100%, 50%), 
      hsl(240, 100%, 50%), 
      hsl(300, 100%, 50%), 
      hsl(360, 100%, 50%))`;
    
    // Update saturation track
    const satTrack = document.getElementById('saturation-track');
    const satColor = `hsl(${color.h}, 100%, ${color.l}%)`;
    satTrack.style.background = `linear-gradient(to right, 
      hsl(${color.h}, 0%, ${color.l}%), 
      ${satColor})`;
    
    // Update lightness track
    const lightTrack = document.getElementById('lightness-track');
    lightTrack.style.background = `linear-gradient(to right, 
      hsl(${color.h}, ${color.s}%, 0%), 
      hsl(${color.h}, ${color.s}%, 50%), 
      hsl(${color.h}, ${color.s}%, 100%))`;
    
    // Update RGB tracks
    document.getElementById('red-track').style.background = `linear-gradient(to right, 
      rgb(0, ${color.g}, ${color.b}), 
      rgb(255, ${color.g}, ${color.b}))`;
    document.getElementById('green-track').style.background = `linear-gradient(to right, 
      rgb(${color.r}, 0, ${color.b}), 
      rgb(${color.r}, 255, ${color.b}))`;
    document.getElementById('blue-track').style.background = `linear-gradient(to right, 
      rgb(${color.r}, ${color.g}, 0), 
      rgb(${color.r}, ${color.g}, 255))`;
  }

  updatePresets() {
    const presetGrid = document.getElementById('preset-grid');
    presetGrid.innerHTML = '';
    
    const presets = this.colorCore.getColorPresets();
    presets.forEach(preset => {
      const presetBtn = document.createElement('button');
      presetBtn.className = 'preset-btn';
      presetBtn.style.backgroundColor = `rgb(${preset.r}, ${preset.g}, ${preset.b})`;
      presetBtn.title = preset.name;
      presetBtn.onclick = () => {
        this.colorCore.applyPreset(preset);
        this.updateDisplay();
      };
      presetGrid.appendChild(presetBtn);
    });
  }

  updateHistory() {
    const historyGrid = document.getElementById('history-grid');
    historyGrid.innerHTML = '';
    
    const history = this.colorCore.getColorHistory();
    history.reverse().forEach(color => {
      const historyBtn = document.createElement('button');
      historyBtn.className = 'history-btn';
      historyBtn.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
      historyBtn.onclick = () => {
        this.colorCore.updateColorFromRGB(color.r, color.g, color.b);
        this.updateDisplay();
      };
      historyGrid.appendChild(historyBtn);
    });
  }

  updateChannelSelection() {
    const selected = this.colorCore.getSelectedChannels();
    // Update UI to show selected channels
    console.log('Selected channels:', selected);
  }

  applyColorToChannels() {
    const rChannel = parseInt(document.getElementById('red-channel').value);
    const gChannel = parseInt(document.getElementById('green-channel').value);
    const bChannel = parseInt(document.getElementById('blue-channel').value);
    
    if (rChannel && gChannel && bChannel) {
      this.colorCore.applyColorToRGBChannels(rChannel, gChannel, bChannel);
    } else {
      alert('Please specify Red, Green, and Blue channels');
    }
  }

  applyToSelectedChannels() {
    const selected = this.colorCore.getSelectedChannels();
    if (selected.length === 0) {
      alert('Please select channels first');
      return;
    }
    
    this.colorCore.applyColorToChannels();
  }

  show() {
    document.getElementById('color-picker-panel').classList.add('visible');
    this.isVisible = true;
    this.updateDisplay();
  }

  hide() {
    document.getElementById('color-picker-panel').classList.remove('visible');
    this.isVisible = false;
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}

// Initialize color picker UI
const colorPickerUI = new ColorPickerUI(colorCore);
