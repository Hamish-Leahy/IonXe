// Q List Integration
// Connects Q list with faders, scenes, and other systems

class QListIntegration {
  constructor(qListManager, qListLabelManager, qListStateManager, qListTimingManager) {
    this.qListManager = qListManager;
    this.qListLabelManager = qListLabelManager;
    this.qListStateManager = qListStateManager;
    this.qListTimingManager = qListTimingManager;
    
    this.initializeIntegration();
  }

  initializeIntegration() {
    // Connect with fader system
    this.connectWithFaders();
    
    // Connect with scene system
    this.connectWithScenes();
    
    // Connect with macro system
    this.connectWithMacros();
    
    // Connect with button controls
    this.connectWithButtons();
  }

  // Fader Integration
  connectWithFaders() {
    // When faders change, update current cue if in record mode
    const originalScheduleFlush = window.scheduleFlush;
    window.scheduleFlush = () => {
      originalScheduleFlush();
      this.updateCurrentCueFromFaders();
    };

    // When Q list cue changes, update faders
    this.qListManager.onCueChanged = (cue) => {
      if (cue.state.isActive) {
        this.updateFadersFromCue(cue);
      }
    };
  }

  updateCurrentCueFromFaders() {
    const currentCue = this.qListManager.getCurrentCue();
    if (currentCue && currentCue.state.isActive) {
      // Update current cue levels from fader values
      currentCue.levels.set(faderValues);
      currentCue.updatedAt = new Date().toISOString();
      this.qListManager.notifyCueChanged(currentCue);
    }
  }

  updateFadersFromCue(cue) {
    // Update fader values from cue levels
    faderValues.set(cue.levels);
    
    // Update visible fader positions
    const faderRanges = document.querySelectorAll('.fader input[type="range"]');
    faderRanges.forEach((range, index) => {
      if (index < 512) {
        range.value = cue.levels[index];
      }
    });
  }

  // Scene Integration
  connectWithScenes() {
    // Add scene to Q list button
    this.addSceneToQListButton();
    
    // Convert Q list cue to scene
    this.addCueToSceneButton();
  }

  addSceneToQListButton() {
    // Add button to scene controls
    const sceneControls = document.querySelector('#view-console .row');
    if (sceneControls) {
      const addToQListBtn = document.createElement('button');
      addToQListBtn.textContent = 'Add to Q List';
      addToQListBtn.id = 'add-scene-to-qlist';
      addToQListBtn.onclick = () => this.addCurrentSceneToQList();
      sceneControls.appendChild(addToQListBtn);
    }
  }

  addCueToSceneButton() {
    // Add button to Q list controls
    const qListControls = document.querySelector('#view-qlist .row');
    if (qListControls) {
      const addToSceneBtn = document.createElement('button');
      addToSceneBtn.textContent = 'Save as Scene';
      addToSceneBtn.id = 'add-cue-to-scene';
      addToSceneBtn.onclick = () => this.addCurrentCueToScenes();
      qListControls.appendChild(addToSceneBtn);
    }
  }

  addCurrentSceneToQList() {
    const sceneSelect = document.getElementById('scenes-list');
    if (!sceneSelect || !sceneSelect.value) {
      alert('Please select a scene first');
      return;
    }

    // Get scene data (simplified - would need to fetch from API)
    const sceneId = sceneSelect.value;
    const sceneLabel = sceneSelect.options[sceneSelect.selectedIndex].text;
    
    // Create cue from current fader values
    const cue = this.qListManager.addCue({
      label: sceneLabel,
      description: `From scene ${sceneId}`,
      levels: new Uint8Array(faderValues)
    });

    this.qListStateManager.saveStateToServer();
    console.log('Added scene to Q list:', cue);
  }

  addCurrentCueToScenes() {
    const currentCue = this.qListManager.getCurrentCue();
    if (!currentCue) {
      alert('Please select a cue first');
      return;
    }

    // Create scene from cue
    const sceneData = {
      id: '00000000-0000-0000-0000-000000000000',
      label: currentCue.label || `Cue ${currentCue.number}`,
      levels: Array.from(currentCue.levels)
    };

    // Save scene via API
    apiFetch('/api/v1/scenes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sceneData)
    }).then(response => {
      if (response.ok) {
        // Refresh scenes list
        if (typeof refreshScenes === 'function') {
          refreshScenes();
        }
        console.log('Added cue to scenes');
      }
    });
  }

  // Macro Integration
  connectWithMacros() {
    // Add Q list actions to macro system
    this.addQListMacroActions();
  }

  addQListMacroActions() {
    // Extend macro execution to support Q list actions
    const originalExecuteMacroStep = qListTimingManager.executeMacroStep;
    qListTimingManager.executeMacroStep = async (step) => {
      switch (step.action) {
        case 'go_to_cue':
          if (step.parameters.cueNumber) {
            this.qListManager.goToCue(step.parameters.cueNumber);
          }
          break;
        case 'next_cue':
          this.qListManager.nextCue();
          break;
        case 'previous_cue':
          this.qListManager.previousCue();
          break;
        case 'play_cue_list':
          this.qListManager.play();
          break;
        case 'pause_cue_list':
          this.qListManager.pause();
          break;
        case 'stop_cue_list':
          this.qListManager.stop();
          break;
        default:
          // Call original function for other actions
          return originalExecuteMacroStep.call(qListTimingManager, step);
      }
    };
  }

  // Button Integration
  connectWithButtons() {
    // Add Q list controls to virtual desk
    this.addQListButtonsToDesk();
  }

  addQListButtonsToDesk() {
    const deskRight = document.querySelector('.desk-right');
    if (deskRight) {
      const qListControls = document.createElement('div');
      qListControls.className = 'qlist-desk-controls';
      qListControls.innerHTML = `
        <div class="qlist-buttons">
          <button id="desk-qlist-go">Go</button>
          <button id="desk-qlist-prev">Prev</button>
          <button id="desk-qlist-next">Next</button>
        </div>
        <div class="qlist-status">
          <span id="desk-qlist-current">No Cue</span>
        </div>
      `;
      deskRight.appendChild(qListControls);

      // Wire up buttons
      document.getElementById('desk-qlist-go').onclick = () => {
        const cue = this.qListManager.getCurrentCue() || this.qListManager.cues[0];
        if (cue) {
          qListTimingManager.executeCueWithTiming(cue);
        }
      };

      document.getElementById('desk-qlist-prev').onclick = () => {
        this.qListManager.previousCue();
      };

      document.getElementById('desk-qlist-next').onclick = () => {
        this.qListManager.nextCue();
      };

      // Update status display
      this.qListManager.onCueChanged = (cue) => {
        const statusEl = document.getElementById('desk-qlist-current');
        if (statusEl) {
          statusEl.textContent = cue ? `Cue ${cue.number}` : 'No Cue';
        }
      };
    }
  }

  // Auto-save Integration
  enableAutoSave() {
    // Auto-save Q list state every 30 seconds
    setInterval(() => {
      if (this.qListManager.cues.length > 0) {
        this.qListStateManager.saveStateToServer();
      }
    }, 30000);
  }

  // Validation Integration
  validateQList() {
    const validation = this.qListStateManager.validateCueList();
    
    if (!validation.isValid) {
      console.error('Q List validation errors:', validation.errors);
      return false;
    }
    
    if (validation.warnings.length > 0) {
      console.warn('Q List validation warnings:', validation.warnings);
    }
    
    return true;
  }

  // Export Integration
  exportQListWithScenes() {
    const qListData = this.qListManager.exportCueList();
    
    // Include related scenes
    const scenes = [];
    qListData.cues.forEach(cue => {
      if (cue.label && cue.label !== 'New Cue') {
        scenes.push({
          label: cue.label,
          levels: Array.from(cue.levels),
          cueNumber: cue.number
        });
      }
    });
    
    const exportData = {
      ...qListData,
      relatedScenes: scenes,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ionxe-qlist-with-scenes.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Keyboard Integration
  setupGlobalKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Global Q list shortcuts (when not in input fields)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
        return;
      }
      
      switch (e.key) {
        case 'F1':
          e.preventDefault();
          this.qListManager.previousCue();
          break;
        case 'F2':
          e.preventDefault();
          this.qListManager.nextCue();
          break;
        case 'F3':
          e.preventDefault();
          const cue = this.qListManager.getCurrentCue() || this.qListManager.cues[0];
          if (cue) {
            qListTimingManager.executeCueWithTiming(cue);
          }
          break;
        case 'F4':
          e.preventDefault();
          if (this.qListManager.isPlaying) {
            this.qListManager.pause();
          } else {
            this.qListManager.play();
          }
          break;
      }
    });
  }
}

// Initialize Q List Integration
const qListIntegration = new QListIntegration(
  qListManager,
  qListLabelManager,
  qListStateManager,
  qListTimingManager
);

// Enable auto-save and global shortcuts
qListIntegration.enableAutoSave();
qListIntegration.setupGlobalKeyboardShortcuts();
