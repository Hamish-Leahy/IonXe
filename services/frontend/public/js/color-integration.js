// Color Integration - Connect color system with existing controls
// Integrates color picker with faders, scenes, Q lists, and macros

class ColorIntegration {
  constructor(colorCore, colorPickerUI, colorPalettes) {
    this.colorCore = colorCore;
    this.colorPickerUI = colorPickerUI;
    this.colorPalettes = colorPalettes;
    
    this.initializeIntegration();
  }

  initializeIntegration() {
    this.addColorTabToInterface();
    this.addColorControlsToDesk();
    this.integrateWithFaders();
    this.integrateWithScenes();
    this.integrateWithQList();
    this.integrateWithMacros();
    this.setupKeyboardShortcuts();
  }

  addColorTabToInterface() {
    // Add Color tab to main interface
    const tabContainer = document.querySelector('.tabs');
    if (tabContainer) {
      const colorTab = document.createElement('a');
      colorTab.href = '#color';
      colorTab.id = 'tab-color';
      colorTab.className = 'tab';
      colorTab.textContent = 'Color';
      tabContainer.appendChild(colorTab);
    }

    // Add Color view
    const viewContainer = document.querySelector('.views');
    if (viewContainer) {
      const colorView = document.createElement('div');
      colorView.id = 'view-color';
      colorView.className = 'view';
      colorView.innerHTML = `
        <div class="color-controls-section">
          <div class="row">
            <button id="open-color-picker" class="primary-btn">Open Color Picker</button>
            <button id="add-to-palette" class="secondary-btn">Add to Palette</button>
            <button id="create-palette" class="secondary-btn">Create Palette</button>
            <button id="import-palettes" class="secondary-btn">Import</button>
            <button id="export-palettes" class="secondary-btn">Export</button>
          </div>
          
          <div class="row">
            <select id="palette-select" class="palette-select">
              <option value="">Select Palette</option>
            </select>
            <button id="apply-palette-color" class="secondary-btn">Apply Color</button>
            <button id="delete-palette" class="danger-btn">Delete Palette</button>
          </div>
        </div>

        <div class="color-palette-section">
          <h3>Current Palette</h3>
          <div id="current-palette" class="palette-display"></div>
        </div>

        <div class="color-channels-section">
          <h3>Channel Assignment</h3>
          <div class="channel-assignment">
            <div class="channel-group">
              <label>Red Channel:</label>
              <input type="number" id="color-red-channel" min="1" max="512" value="1">
            </div>
            <div class="channel-group">
              <label>Green Channel:</label>
              <input type="number" id="color-green-channel" min="1" max="512" value="2">
            </div>
            <div class="channel-group">
              <label>Blue Channel:</label>
              <input type="number" id="color-blue-channel" min="1" max="512" value="3">
            </div>
            <button id="apply-color-channels" class="primary-btn">Apply to Channels</button>
          </div>
        </div>

        <div class="color-effects-section">
          <h3>Color Effects</h3>
          <div class="effects-controls">
            <button id="color-fade-in" class="effect-btn">Fade In</button>
            <button id="color-fade-out" class="effect-btn">Fade Out</button>
            <button id="color-strobe" class="effect-btn">Strobe</button>
            <button id="color-rainbow" class="effect-btn">Rainbow</button>
            <button id="color-temperature" class="effect-btn">Temperature</button>
          </div>
        </div>

        <div class="color-status">
          <div id="color-status-text">Ready</div>
        </div>
      `;
      viewContainer.appendChild(colorView);
    }

    this.setupColorTabEvents();
  }

  setupColorTabEvents() {
    // Open color picker
    document.getElementById('open-color-picker').onclick = () => {
      this.colorPickerUI.show();
    };

    // Add current color to palette
    document.getElementById('add-to-palette').onclick = () => {
      const currentColor = this.colorCore.getCurrentColor();
      const palette = this.colorPalettes.getCurrentPalette();
      
      if (palette) {
        this.colorPalettes.addColorToCurrentPalette(currentColor);
        this.updatePaletteDisplay();
        this.setStatus('Color added to palette');
      } else {
        alert('Please select a palette first');
      }
    };

    // Create new palette
    document.getElementById('create-palette').onclick = () => {
      const name = prompt('Enter palette name:');
      if (name) {
        this.colorPalettes.addPalette(name, []);
        this.updatePaletteSelect();
        this.setStatus(`Created palette: ${name}`);
      }
    };

    // Import palettes
    document.getElementById('import-palettes').onclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        if (e.target.files[0]) {
          this.colorPalettes.importPalette(e.target.files[0])
            .then(result => {
              this.updatePaletteSelect();
              this.setStatus(`Imported ${result.count} palette(s)`);
            })
            .catch(error => {
              alert('Import failed: ' + error.message);
            });
        }
      };
      input.click();
    };

    // Export palettes
    document.getElementById('export-palettes').onclick = () => {
      this.colorPalettes.exportAllPalettes();
      this.setStatus('Palettes exported');
    };

    // Palette selection
    document.getElementById('palette-select').onchange = (e) => {
      const paletteId = e.target.value;
      if (paletteId) {
        this.colorPalettes.setCurrentPalette(paletteId);
        this.updatePaletteDisplay();
      }
    };

    // Apply palette color
    document.getElementById('apply-palette-color').onclick = () => {
      const palette = this.colorPalettes.getCurrentPalette();
      if (palette && palette.colors.length > 0) {
        // Apply first color from palette
        const color = palette.colors[0];
        this.colorCore.updateColorFromRGB(color.r, color.g, color.b);
        this.setStatus(`Applied ${color.name}`);
      }
    };

    // Delete palette
    document.getElementById('delete-palette').onclick = () => {
      const palette = this.colorPalettes.getCurrentPalette();
      if (palette && confirm(`Delete palette "${palette.name}"?`)) {
        this.colorPalettes.deletePalette(palette.id);
        this.updatePaletteSelect();
        this.updatePaletteDisplay();
        this.setStatus('Palette deleted');
      }
    };

    // Apply color to channels
    document.getElementById('apply-color-channels').onclick = () => {
      const rChannel = parseInt(document.getElementById('color-red-channel').value);
      const gChannel = parseInt(document.getElementById('color-green-channel').value);
      const bChannel = parseInt(document.getElementById('color-blue-channel').value);
      
      if (rChannel && gChannel && bChannel) {
        this.colorCore.applyColorToRGBChannels(rChannel, gChannel, bChannel);
        this.setStatus(`Applied color to channels ${rChannel}, ${gChannel}, ${bChannel}`);
      } else {
        alert('Please specify all three channels');
      }
    };

    // Color effects
    document.getElementById('color-fade-in').onclick = () => this.startColorFade('in');
    document.getElementById('color-fade-out').onclick = () => this.startColorFade('out');
    document.getElementById('color-strobe').onclick = () => this.startStrobeEffect();
    document.getElementById('color-rainbow').onclick = () => this.startRainbowEffect();
    document.getElementById('color-temperature').onclick = () => this.showTemperatureControl();
  }

  addColorControlsToDesk() {
    // Add color controls to virtual desk
    const deskRight = document.querySelector('.desk-right');
    if (deskRight) {
      const colorControls = document.createElement('div');
      colorControls.className = 'color-desk-controls';
      colorControls.innerHTML = `
        <div class="color-preview-small" id="desk-color-preview"></div>
        <div class="color-desk-buttons">
          <button id="desk-color-picker">Color</button>
          <button id="desk-color-apply">Apply</button>
        </div>
        <div class="color-desk-info">
          <span id="desk-color-info">White</span>
        </div>
      `;
      deskRight.appendChild(colorControls);

      // Wire up desk controls
      document.getElementById('desk-color-picker').onclick = () => {
        this.colorPickerUI.show();
      };

      document.getElementById('desk-color-apply').onclick = () => {
        this.colorCore.applyColorToChannels();
        this.setStatus('Color applied to selected channels');
      };

      // Update color display
      this.colorCore.onColorChanged = (color) => {
        document.getElementById('desk-color-preview').style.backgroundColor = 
          `rgb(${color.r}, ${color.g}, ${color.b})`;
        document.getElementById('desk-color-info').textContent = 
          `RGB(${color.r}, ${color.g}, ${color.b})`;
      };
    }
  }

  integrateWithFaders() {
    // When faders change, update color if RGB channels are selected
    const originalScheduleFlush = window.scheduleFlush;
    window.scheduleFlush = () => {
      originalScheduleFlush();
      this.updateColorFromFaders();
    };
  }

  updateColorFromFaders() {
    const rChannel = parseInt(document.getElementById('color-red-channel').value) - 1;
    const gChannel = parseInt(document.getElementById('color-green-channel').value) - 1;
    const bChannel = parseInt(document.getElementById('color-blue-channel').value) - 1;
    
    if (rChannel >= 0 && gChannel >= 0 && bChannel >= 0 && 
        rChannel < 512 && gChannel < 512 && bChannel < 512) {
      
      const r = faderValues[rChannel];
      const g = faderValues[gChannel];
      const b = faderValues[bChannel];
      
      this.colorCore.updateColorFromRGB(r, g, b);
    }
  }

  integrateWithScenes() {
    // Add color information to scenes
    const originalSaveScene = window.saveScene;
    window.saveScene = (sceneData) => {
      const colorData = {
        currentColor: this.colorCore.getCurrentColor(),
        redChannel: parseInt(document.getElementById('color-red-channel').value),
        greenChannel: parseInt(document.getElementById('color-green-channel').value),
        blueChannel: parseInt(document.getElementById('color-blue-channel').value)
      };
      
      return originalSaveScene({
        ...sceneData,
        color: colorData
      });
    };
  }

  integrateWithQList() {
    // Add color support to Q list cues
    if (typeof qListManager !== 'undefined') {
      const originalAddCue = qListManager.addCue;
      qListManager.addCue = (cueData) => {
        const colorData = {
          currentColor: this.colorCore.getCurrentColor(),
          redChannel: parseInt(document.getElementById('color-red-channel').value),
          greenChannel: parseInt(document.getElementById('color-green-channel').value),
          blueChannel: parseInt(document.getElementById('color-blue-channel').value)
        };
        
        return originalAddCue({
          ...cueData,
          color: colorData
        });
      };
    }
  }

  integrateWithMacros() {
    // Add color actions to macro system
    if (typeof qListTimingManager !== 'undefined') {
      const originalExecuteMacroStep = qListTimingManager.executeMacroStep;
      qListTimingManager.executeMacroStep = async (step) => {
        switch (step.action) {
          case 'set_color':
            if (step.parameters.r !== undefined && 
                step.parameters.g !== undefined && 
                step.parameters.b !== undefined) {
              this.colorCore.updateColorFromRGB(
                step.parameters.r, 
                step.parameters.g, 
                step.parameters.b
              );
            }
            break;
          case 'apply_color':
            this.colorCore.applyColorToChannels();
            break;
          case 'fade_color':
            this.startColorFade(step.parameters.direction || 'in', step.parameters.duration || 1000);
            break;
          default:
            return originalExecuteMacroStep.call(qListTimingManager, step);
        }
      };
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only handle shortcuts when Color tab is active
      if (!document.getElementById('view-color').classList.contains('active')) return;
      
      switch (e.key) {
        case 'c':
          if (e.ctrlKey) {
            e.preventDefault();
            this.colorPickerUI.toggle();
          }
          break;
        case 'p':
          if (e.ctrlKey) {
            e.preventDefault();
            this.colorPalettes.addColorToCurrentPalette(this.colorCore.getCurrentColor());
            this.updatePaletteDisplay();
            this.setStatus('Color added to palette');
          }
          break;
      }
    });
  }

  // Color effects
  startColorFade(direction, duration = 1000) {
    const startTime = Date.now();
    const startColor = this.colorCore.getCurrentColor();
    const targetColor = direction === 'in' ? startColor : { r: 0, g: 0, b: 0 };
    
    const fade = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (direction === 'in') {
        // Fade in from black
        const r = Math.round(startColor.r * progress);
        const g = Math.round(startColor.g * progress);
        const b = Math.round(startColor.b * progress);
        this.colorCore.updateColorFromRGB(r, g, b);
      } else {
        // Fade out to black
        const r = Math.round(startColor.r * (1 - progress));
        const g = Math.round(startColor.g * (1 - progress));
        const b = Math.round(startColor.b * (1 - progress));
        this.colorCore.updateColorFromRGB(r, g, b);
      }
      
      if (progress < 1) {
        requestAnimationFrame(fade);
      }
    };
    
    fade();
  }

  startStrobeEffect() {
    let strobeActive = true;
    let strobeState = true;
    
    const strobe = () => {
      if (strobeActive) {
        if (strobeState) {
          this.colorCore.applyColorToChannels();
        } else {
          // Turn off channels
          const selected = this.colorCore.getSelectedChannels();
          selected.forEach(channel => {
            if (channel >= 1 && channel <= 512) {
              faderValues[channel - 1] = 0;
            }
          });
        }
        
        strobeState = !strobeState;
        setTimeout(strobe, 100); // 10Hz strobe
      }
    };
    
    strobe();
    
    // Stop strobe after 5 seconds
    setTimeout(() => {
      strobeActive = false;
    }, 5000);
  }

  startRainbowEffect() {
    let hue = 0;
    const rainbow = () => {
      const hsl = { h: hue, s: 100, l: 50 };
      const rgb = this.colorCore.hslToRgb(hsl.h, hsl.s, hsl.l);
      this.colorCore.updateColorFromRGB(rgb.r, rgb.g, rgb.b);
      this.colorCore.applyColorToChannels();
      
      hue = (hue + 2) % 360;
      setTimeout(rainbow, 50); // 20Hz rainbow
    };
    
    rainbow();
  }

  showTemperatureControl() {
    const temp = prompt('Enter color temperature (2000K - 10000K):', '3200');
    if (temp) {
      const temperature = parseInt(temp);
      if (temperature >= 2000 && temperature <= 10000) {
        const color = this.colorCore.getColorTemperature(temperature);
        this.colorCore.updateColorFromRGB(color.r, color.g, color.b);
        this.setStatus(`Set to ${temperature}K`);
      } else {
        alert('Temperature must be between 2000K and 10000K');
      }
    }
  }

  // UI updates
  updatePaletteSelect() {
    const select = document.getElementById('palette-select');
    select.innerHTML = '<option value="">Select Palette</option>';
    
    this.colorPalettes.getAllPalettes().forEach(palette => {
      const option = document.createElement('option');
      option.value = palette.id;
      option.textContent = palette.name;
      if (palette.id === this.colorPalettes.currentPalette) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  updatePaletteDisplay() {
    const container = document.getElementById('current-palette');
    const palette = this.colorPalettes.getCurrentPalette();
    
    if (palette) {
      container.innerHTML = '';
      palette.colors.forEach((color, index) => {
        const colorBtn = document.createElement('button');
        colorBtn.className = 'palette-color-btn';
        colorBtn.style.backgroundColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
        colorBtn.title = color.name;
        colorBtn.onclick = () => {
          this.colorCore.updateColorFromRGB(color.r, color.g, color.b);
          this.setStatus(`Applied ${color.name}`);
        };
        container.appendChild(colorBtn);
      });
    } else {
      container.innerHTML = '<p>No palette selected</p>';
    }
  }

  setStatus(message) {
    const statusEl = document.getElementById('color-status-text');
    if (statusEl) {
      statusEl.textContent = message;
      setTimeout(() => {
        statusEl.textContent = 'Ready';
      }, 3000);
    }
  }
}

// Initialize color integration
const colorIntegration = new ColorIntegration(colorCore, colorPickerUI, colorPalettes);
