// Fixture Integration - Connect fixture system with existing controls
// Integrates fixture management with faders, scenes, Q lists, and color system

class FixtureIntegration {
  constructor(fixtureCore, fixtureUI) {
    this.fixtureCore = fixtureCore;
    this.fixtureUI = fixtureUI;
    
    this.initializeIntegration();
  }

  initializeIntegration() {
    this.addFixtureTabToInterface();
    this.addFixtureControlsToDesk();
    this.integrateWithFaders();
    this.integrateWithScenes();
    this.integrateWithQList();
    this.integrateWithColorSystem();
    this.integrateWithMacros();
    this.setupKeyboardShortcuts();
  }

  addFixtureTabToInterface() {
    // Add Fixtures tab to main interface
    const tabContainer = document.querySelector('.tabs');
    if (tabContainer) {
      const fixtureTab = document.createElement('a');
      fixtureTab.href = '#fixtures';
      fixtureTab.id = 'tab-fixtures';
      fixtureTab.className = 'tab';
      fixtureTab.textContent = 'Fixtures';
      tabContainer.appendChild(fixtureTab);
    }

    // Add Fixtures view
    const viewContainer = document.querySelector('.views');
    if (viewContainer) {
      const fixtureView = document.createElement('div');
      fixtureView.id = 'view-fixtures';
      fixtureView.className = 'view';
      fixtureView.innerHTML = `
        <div class="fixture-controls-section">
          <div class="row">
            <button id="open-fixture-library" class="primary-btn">Fixture Library</button>
            <button id="add-fixture-quick" class="secondary-btn">Add Fixture</button>
            <button id="patch-fixtures" class="secondary-btn">Patch</button>
            <button id="create-group-quick" class="secondary-btn">Create Group</button>
          </div>
          
          <div class="row">
            <select id="fixture-group-select" class="group-select">
              <option value="">All Fixtures</option>
            </select>
            <button id="select-group" class="secondary-btn">Select Group</button>
            <button id="clear-selection" class="secondary-btn">Clear Selection</button>
          </div>
        </div>

        <div class="fixture-list-section">
          <h3>Fixtures</h3>
          <div id="fixture-list-compact" class="fixture-list-compact"></div>
        </div>

        <div class="fixture-control-section">
          <h3>Fixture Control</h3>
          <div class="fixture-controls-grid">
            <div class="control-group">
              <label>Intensity</label>
              <input type="range" id="fixture-intensity" min="0" max="255" value="0" class="fixture-slider">
              <input type="number" id="fixture-intensity-value" min="0" max="255" value="0" class="fixture-value">
            </div>
            
            <div class="control-group">
              <label>Red</label>
              <input type="range" id="fixture-red" min="0" max="255" value="0" class="fixture-slider">
              <input type="number" id="fixture-red-value" min="0" max="255" value="0" class="fixture-value">
            </div>
            
            <div class="control-group">
              <label>Green</label>
              <input type="range" id="fixture-green" min="0" max="255" value="0" class="fixture-slider">
              <input type="number" id="fixture-green-value" min="0" max="255" value="0" class="fixture-value">
            </div>
            
            <div class="control-group">
              <label>Blue</label>
              <input type="range" id="fixture-blue" min="0" max="255" value="0" class="fixture-slider">
              <input type="number" id="fixture-blue-value" min="0" max="255" value="0" class="fixture-value">
            </div>
            
            <div class="control-group">
              <label>Pan</label>
              <input type="range" id="fixture-pan" min="0" max="255" value="128" class="fixture-slider">
              <input type="number" id="fixture-pan-value" min="0" max="255" value="128" class="fixture-value">
            </div>
            
            <div class="control-group">
              <label>Tilt</label>
              <input type="range" id="fixture-tilt" min="0" max="255" value="128" class="fixture-slider">
              <input type="number" id="fixture-tilt-value" min="0" max="255" value="128" class="fixture-value">
            </div>
          </div>
        </div>

        <div class="fixture-effects-section">
          <h3>Effects</h3>
          <div class="effects-controls">
            <button id="fixture-strobe" class="effect-btn">Strobe</button>
            <button id="fixture-rainbow" class="effect-btn">Rainbow</button>
            <button id="fixture-fade-in" class="effect-btn">Fade In</button>
            <button id="fixture-fade-out" class="effect-btn">Fade Out</button>
            <button id="fixture-blackout" class="effect-btn">Blackout</button>
            <button id="fixture-full" class="effect-btn">Full</button>
          </div>
        </div>

        <div class="fixture-status">
          <div id="fixture-status-text">Ready</div>
        </div>
      `;
      viewContainer.appendChild(fixtureView);
    }

    this.setupFixtureTabEvents();
  }

  setupFixtureTabEvents() {
    // Open fixture library
    document.getElementById('open-fixture-library').onclick = () => {
      this.fixtureUI.show();
    };

    // Quick add fixture
    document.getElementById('add-fixture-quick').onclick = () => {
      this.showQuickAddFixtureDialog();
    };

    // Patch fixtures
    document.getElementById('patch-fixtures').onclick = () => {
      this.fixtureUI.patchAllFixtures();
      this.updateFixtureList();
      this.setStatus('Fixtures patched');
    };

    // Create group
    document.getElementById('create-group-quick').onclick = () => {
      const name = prompt('Enter group name:');
      if (name) {
        this.fixtureCore.createGroup(name);
        this.updateGroupSelect();
        this.setStatus(`Created group: ${name}`);
      }
    };

    // Group selection
    document.getElementById('fixture-group-select').onchange = (e) => {
      const groupId = e.target.value;
      if (groupId) {
        this.selectGroupFixtures(groupId);
      } else {
        this.fixtureCore.clearSelection();
      }
    };

    // Select group
    document.getElementById('select-group').onclick = () => {
      const groupId = document.getElementById('fixture-group-select').value;
      if (groupId) {
        this.selectGroupFixtures(groupId);
      }
    };

    // Clear selection
    document.getElementById('clear-selection').onclick = () => {
      this.fixtureCore.clearSelection();
      this.updateFixtureList();
    };

    // Fixture controls
    this.setupFixtureControls();

    // Effects
    document.getElementById('fixture-strobe').onclick = () => this.startStrobeEffect();
    document.getElementById('fixture-rainbow').onclick = () => this.startRainbowEffect();
    document.getElementById('fixture-fade-in').onclick = () => this.startFadeEffect('in');
    document.getElementById('fixture-fade-out').onclick = () => this.startFadeEffect('out');
    document.getElementById('fixture-blackout').onclick = () => this.blackoutFixtures();
    document.getElementById('fixture-full').onclick = () => this.fullFixtures();
  }

  setupFixtureControls() {
    const controls = [
      { slider: 'fixture-intensity', value: 'fixture-intensity-value', capability: 'intensity' },
      { slider: 'fixture-red', value: 'fixture-red-value', capability: 'red' },
      { slider: 'fixture-green', value: 'fixture-green-value', capability: 'green' },
      { slider: 'fixture-blue', value: 'fixture-blue-value', capability: 'blue' },
      { slider: 'fixture-pan', value: 'fixture-pan-value', capability: 'pan' },
      { slider: 'fixture-tilt', value: 'fixture-tilt-value', capability: 'tilt' }
    ];

    controls.forEach(control => {
      const slider = document.getElementById(control.slider);
      const valueInput = document.getElementById(control.value);

      slider.oninput = (e) => {
        const value = parseInt(e.target.value);
        valueInput.value = value;
        this.applyToSelectedFixtures(control.capability, value);
      };

      valueInput.oninput = (e) => {
        const value = parseInt(e.target.value);
        slider.value = value;
        this.applyToSelectedFixtures(control.capability, value);
      };
    });
  }

  addFixtureControlsToDesk() {
    // Add fixture controls to virtual desk
    const deskRight = document.querySelector('.desk-right');
    if (deskRight) {
      const fixtureControls = document.createElement('div');
      fixtureControls.className = 'fixture-desk-controls';
      fixtureControls.innerHTML = `
        <div class="fixture-desk-header">
          <h4>Fixtures</h4>
          <button id="desk-fixture-library">Library</button>
        </div>
        <div class="fixture-desk-list" id="desk-fixture-list"></div>
        <div class="fixture-desk-controls">
          <button id="desk-fixture-intensity">Intensity</button>
          <button id="desk-fixture-color">Color</button>
          <button id="desk-fixture-position">Position</button>
        </div>
        <div class="fixture-desk-status">
          <span id="desk-fixture-count">0 selected</span>
        </div>
      `;
      deskRight.appendChild(fixtureControls);

      // Wire up desk controls
      document.getElementById('desk-fixture-library').onclick = () => {
        this.fixtureUI.show();
      };

      document.getElementById('desk-fixture-intensity').onclick = () => {
        this.showIntensityControl();
      };

      document.getElementById('desk-fixture-color').onclick = () => {
        if (typeof colorPickerUI !== 'undefined') {
          colorPickerUI.show();
        }
      };

      document.getElementById('desk-fixture-position').onclick = () => {
        this.showPositionControl();
      };

      // Update fixture count
      this.fixtureCore.onSelectionChanged = (selected) => {
        document.getElementById('desk-fixture-count').textContent = `${selected.length} selected`;
        this.updateDeskFixtureList();
      };
    }
  }

  integrateWithFaders() {
    // When faders change, update fixture values
    const originalScheduleFlush = window.scheduleFlush;
    window.scheduleFlush = () => {
      originalScheduleFlush();
      this.updateFixturesFromFaders();
    };
  }

  updateFixturesFromFaders() {
    const patch = this.fixtureCore.getPatch();
    patch.forEach(patchData => {
      const fixture = this.fixtureCore.getFixture(patchData.fixture);
      if (fixture && patchData.capability) {
        const value = faderValues[patchData.address - 1];
        // Update fixture value in memory (not UI to avoid loops)
        fixture.currentValues = fixture.currentValues || {};
        fixture.currentValues[patchData.capability] = value;
      }
    });
  }

  integrateWithScenes() {
    // Add fixture data to scenes
    const originalSaveScene = window.saveScene;
    window.saveScene = (sceneData) => {
      const fixtureData = {
        fixtures: this.fixtureCore.getAllFixtures().map(f => ({
          id: f.id,
          values: f.currentValues || {}
        })),
        patch: this.fixtureCore.getPatch()
      };
      
      return originalSaveScene({
        ...sceneData,
        fixtures: fixtureData
      });
    };
  }

  integrateWithQList() {
    // Add fixture support to Q list cues
    if (typeof qListManager !== 'undefined') {
      const originalAddCue = qListManager.addCue;
      qListManager.addCue = (cueData) => {
        const fixtureData = {
          fixtures: this.fixtureCore.getAllFixtures().map(f => ({
            id: f.id,
            values: f.currentValues || {}
          }))
        };
        
        return originalAddCue({
          ...cueData,
          fixtures: fixtureData
        });
      };
    }
  }

  integrateWithColorSystem() {
    // Connect with color system
    if (typeof colorCore !== 'undefined') {
      colorCore.onColorApplied = (color, channels) => {
        // Apply color to selected fixtures
        const selected = this.fixtureCore.getSelectedFixtures();
        selected.forEach(fixtureId => {
          this.fixtureCore.setFixtureColor(fixtureId, color);
        });
      };
    }
  }

  integrateWithMacros() {
    // Add fixture actions to macro system
    if (typeof qListTimingManager !== 'undefined') {
      const originalExecuteMacroStep = qListTimingManager.executeMacroStep;
      qListTimingManager.executeMacroStep = async (step) => {
        switch (step.action) {
          case 'set_fixture_value':
            if (step.parameters.fixtureId && step.parameters.capability !== undefined) {
              this.fixtureCore.setFixtureValue(
                step.parameters.fixtureId,
                step.parameters.capability,
                step.parameters.value
              );
            }
            break;
          case 'set_fixture_color':
            if (step.parameters.fixtureId && step.parameters.color) {
              this.fixtureCore.setFixtureColor(step.parameters.fixtureId, step.parameters.color);
            }
            break;
          case 'set_group_value':
            if (step.parameters.groupId && step.parameters.capability !== undefined) {
              this.fixtureCore.setGroupValue(
                step.parameters.groupId,
                step.parameters.capability,
                step.parameters.value
              );
            }
            break;
          case 'select_fixtures':
            if (step.parameters.fixtureIds) {
              step.parameters.fixtureIds.forEach(id => {
                this.fixtureCore.selectFixture(id);
              });
            }
            break;
          default:
            return originalExecuteMacroStep.call(qListTimingManager, step);
        }
      };
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only handle shortcuts when Fixtures tab is active
      if (!document.getElementById('view-fixtures').classList.contains('active')) return;
      
      switch (e.key) {
        case 'f':
          if (e.ctrlKey) {
            e.preventDefault();
            this.fixtureUI.toggle();
          }
          break;
        case 'a':
          if (e.ctrlKey) {
            e.preventDefault();
            this.fixtureCore.selectAllFixtures();
            this.updateFixtureList();
          }
          break;
        case 'Escape':
          this.fixtureCore.clearSelection();
          this.updateFixtureList();
          break;
      }
    });
  }

  // Fixture control methods
  applyToSelectedFixtures(capability, value) {
    const selected = this.fixtureCore.getSelectedFixtures();
    selected.forEach(fixtureId => {
      this.fixtureCore.setFixtureValue(fixtureId, capability, value);
    });
  }

  selectGroupFixtures(groupId) {
    const group = this.fixtureCore.getGroup(groupId);
    if (group) {
      this.fixtureCore.clearSelection();
      group.fixtures.forEach(fixtureId => {
        this.fixtureCore.selectFixture(fixtureId);
      });
      this.updateFixtureList();
    }
  }

  // Effects
  startStrobeEffect() {
    const selected = this.fixtureCore.getSelectedFixtures();
    if (selected.length === 0) {
      alert('Please select fixtures first');
      return;
    }

    let strobeState = true;
    const strobe = () => {
      selected.forEach(fixtureId => {
        this.fixtureCore.setFixtureValue(fixtureId, 'intensity', strobeState ? 255 : 0);
      });
      strobeState = !strobeState;
      setTimeout(strobe, 100);
    };
    
    strobe();
    
    // Stop after 5 seconds
    setTimeout(() => {
      selected.forEach(fixtureId => {
        this.fixtureCore.setFixtureValue(fixtureId, 'intensity', 0);
      });
    }, 5000);
  }

  startRainbowEffect() {
    const selected = this.fixtureCore.getSelectedFixtures();
    if (selected.length === 0) {
      alert('Please select fixtures first');
      return;
    }

    let hue = 0;
    const rainbow = () => {
      const color = this.hslToRgb(hue, 100, 50);
      selected.forEach(fixtureId => {
        this.fixtureCore.setFixtureColor(fixtureId, color);
      });
      hue = (hue + 2) % 360;
      setTimeout(rainbow, 50);
    };
    
    rainbow();
  }

  startFadeEffect(direction) {
    const selected = this.fixtureCore.getSelectedFixtures();
    if (selected.length === 0) {
      alert('Please select fixtures first');
      return;
    }

    const startTime = Date.now();
    const duration = 2000; // 2 seconds
    const startValue = direction === 'in' ? 0 : 255;
    const endValue = direction === 'in' ? 255 : 0;

    const fade = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const value = Math.round(startValue + (endValue - startValue) * progress);
      
      selected.forEach(fixtureId => {
        this.fixtureCore.setFixtureValue(fixtureId, 'intensity', value);
      });
      
      if (progress < 1) {
        requestAnimationFrame(fade);
      }
    };
    
    fade();
  }

  blackoutFixtures() {
    const selected = this.fixtureCore.getSelectedFixtures();
    selected.forEach(fixtureId => {
      this.fixtureCore.setFixtureValue(fixtureId, 'intensity', 0);
    });
  }

  fullFixtures() {
    const selected = this.fixtureCore.getSelectedFixtures();
    selected.forEach(fixtureId => {
      this.fixtureCore.setFixtureValue(fixtureId, 'intensity', 255);
    });
  }

  // UI updates
  updateFixtureList() {
    const container = document.getElementById('fixture-list-compact');
    const fixtures = this.fixtureCore.getAllFixtures();
    
    container.innerHTML = '';
    
    fixtures.forEach(fixture => {
      const fixtureType = this.fixtureCore.getFixtureType(fixture.type);
      const isSelected = this.fixtureCore.selectedFixtures.has(fixture.id);
      
      const fixtureEl = document.createElement('div');
      fixtureEl.className = `fixture-compact ${isSelected ? 'selected' : ''}`;
      fixtureEl.dataset.fixtureId = fixture.id;
      fixtureEl.innerHTML = `
        <div class="fixture-name">${fixture.name}</div>
        <div class="fixture-address">${fixture.address}</div>
        <div class="fixture-type">${fixtureType ? fixtureType.name : 'Unknown'}</div>
      `;
      
      fixtureEl.onclick = () => {
        this.fixtureCore.toggleFixtureSelection(fixture.id);
        this.updateFixtureList();
      };
      
      container.appendChild(fixtureEl);
    });
  }

  updateDeskFixtureList() {
    const container = document.getElementById('desk-fixture-list');
    const selected = this.fixtureCore.getSelectedFixtures();
    
    container.innerHTML = '';
    
    selected.forEach(fixtureId => {
      const fixture = this.fixtureCore.getFixture(fixtureId);
      if (fixture) {
        const fixtureEl = document.createElement('div');
        fixtureEl.className = 'desk-fixture-item';
        fixtureEl.textContent = fixture.name;
        container.appendChild(fixtureEl);
      }
    });
  }

  updateGroupSelect() {
    const select = document.getElementById('fixture-group-select');
    select.innerHTML = '<option value="">All Fixtures</option>';
    
    this.fixtureCore.getAllGroups().forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.name;
      select.appendChild(option);
    });
  }

  showQuickAddFixtureDialog() {
    const dialog = this.createDialog('Quick Add Fixture', `
      <div class="form-group">
        <label>Name:</label>
        <input type="text" id="quick-fixture-name" placeholder="Fixture Name">
      </div>
      <div class="form-group">
        <label>Type:</label>
        <select id="quick-fixture-type">
          <option value="">Select Type</option>
        </select>
      </div>
      <div class="form-group">
        <label>Address:</label>
        <input type="number" id="quick-fixture-address" min="1" max="512" value="1">
      </div>
    `);
    
    // Populate type select
    const typeSelect = dialog.querySelector('#quick-fixture-type');
    this.fixtureCore.getAllFixtureTypes().forEach(type => {
      const option = document.createElement('option');
      option.value = type.id;
      option.textContent = `${type.manufacturer} ${type.name}`;
      typeSelect.appendChild(option);
    });
    
    dialog.querySelector('.dialog-ok').onclick = () => {
      const name = dialog.querySelector('#quick-fixture-name').value;
      const type = dialog.querySelector('#quick-fixture-type').value;
      const address = parseInt(dialog.querySelector('#quick-fixture-address').value);
      
      if (name && type) {
        this.fixtureCore.addFixture({ name, type, address });
        this.updateFixtureList();
        this.closeDialog(dialog);
        this.setStatus(`Added fixture: ${name}`);
      }
    };
  }

  showIntensityControl() {
    const selected = this.fixtureCore.getSelectedFixtures();
    if (selected.length === 0) {
      alert('Please select fixtures first');
      return;
    }
    
    const intensity = prompt('Enter intensity (0-255):', '255');
    if (intensity !== null) {
      const value = parseInt(intensity);
      if (value >= 0 && value <= 255) {
        selected.forEach(fixtureId => {
          this.fixtureCore.setFixtureValue(fixtureId, 'intensity', value);
        });
        this.setStatus(`Set intensity to ${value}`);
      }
    }
  }

  showPositionControl() {
    const selected = this.fixtureCore.getSelectedFixtures();
    if (selected.length === 0) {
      alert('Please select fixtures first');
      return;
    }
    
    const pan = prompt('Enter pan (0-255):', '128');
    const tilt = prompt('Enter tilt (0-255):', '128');
    
    if (pan !== null && tilt !== null) {
      const panValue = parseInt(pan);
      const tiltValue = parseInt(tilt);
      
      if (panValue >= 0 && panValue <= 255 && tiltValue >= 0 && tiltValue <= 255) {
        selected.forEach(fixtureId => {
          this.fixtureCore.setFixturePosition(fixtureId, panValue, tiltValue);
        });
        this.setStatus(`Set position: Pan ${panValue}, Tilt ${tiltValue}`);
      }
    }
  }

  // Utility functions
  hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  createDialog(title, content) {
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.innerHTML = `
      <div class="dialog">
        <div class="dialog-header">
          <h3>${title}</h3>
          <button class="dialog-close">×</button>
        </div>
        <div class="dialog-content">
          ${content}
        </div>
        <div class="dialog-actions">
          <button class="dialog-cancel">Cancel</button>
          <button class="dialog-ok primary-btn">OK</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('.dialog-close').onclick = () => this.closeDialog(dialog);
    dialog.querySelector('.dialog-cancel').onclick = () => this.closeDialog(dialog);
    
    return dialog;
  }

  closeDialog(dialog) {
    document.body.removeChild(dialog);
  }

  setStatus(message) {
    const statusEl = document.getElementById('fixture-status-text');
    if (statusEl) {
      statusEl.textContent = message;
      setTimeout(() => {
        statusEl.textContent = 'Ready';
      }, 3000);
    }
  }
}

// Initialize fixture integration
const fixtureIntegration = new FixtureIntegration(fixtureCore, fixtureUI);
