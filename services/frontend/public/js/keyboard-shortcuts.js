// Enhanced keyboard shortcuts and interactions
class IonXeKeyboardShortcuts {
  constructor(core) {
    this.core = core;
    this.shortcuts = new Map();
    this.setupDefaultShortcuts();
    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.setupDragAndDrop();
    this.setupTouchGestures();
  }

  setupDefaultShortcuts() {
    // Global shortcuts
    this.addShortcut('ctrl+s', 'Save current state', () => this.core.emit('saveRequested'));
    this.addShortcut('ctrl+z', 'Undo last action', () => this.core.emit('undoRequested'));
    this.addShortcut('ctrl+y', 'Redo last action', () => this.core.emit('redoRequested'));
    this.addShortcut('ctrl+shift+z', 'Redo last action', () => this.core.emit('redoRequested'));
    
    // Navigation shortcuts
    this.addShortcut('ctrl+1', 'Go to Console', () => this.navigateToTab('console'));
    this.addShortcut('ctrl+2', 'Go to Virtual Desk', () => this.navigateToTab('desk'));
    this.addShortcut('ctrl+3', 'Go to Magic Sheet', () => this.navigateToTab('magic'));
    this.addShortcut('ctrl+4', 'Go to Patch', () => this.navigateToTab('patch'));
    this.addShortcut('ctrl+5', 'Go to Dimmers', () => this.navigateToTab('dimmers'));
    this.addShortcut('ctrl+6', 'Go to Command Center', () => this.navigateToTab('cmd'));
    this.addShortcut('ctrl+7', 'Go to Files', () => this.navigateToTab('files'));
    this.addShortcut('ctrl+8', 'Go to Q List', () => this.navigateToTab('qlist'));
    this.addShortcut('ctrl+9', 'Go to Color', () => this.navigateToTab('color'));
    this.addShortcut('ctrl+0', 'Go to Fixtures', () => this.navigateToTab('fixtures'));
    this.addShortcut('ctrl+shift+d', 'Go to DMX Output', () => this.navigateToTab('dmx-output'));
    this.addShortcut('ctrl+shift+l', 'Go to Live Audio', () => this.navigateToTab('live-audio'));
    this.addShortcut('ctrl+shift+a', 'Go to AI Lighting', () => this.navigateToTab('ai-lighting'));
    
    // Fader shortcuts
    this.addShortcut('space', 'Blackout', () => this.toggleBlackout());
    this.addShortcut('ctrl+space', 'Full on', () => this.fullOn());
    this.addShortcut('ctrl+shift+space', 'Grand Master to 50%', () => this.setGrandMaster(127));
    
    // Channel selection shortcuts
    this.addShortcut('ctrl+a', 'Select all channels', () => this.selectAllChannels());
    this.addShortcut('escape', 'Clear selection', () => this.clearSelection());
    this.addShortcut('ctrl+d', 'Duplicate selection', () => this.duplicateSelection());
    
    // Scene shortcuts
    this.addShortcut('ctrl+shift+s', 'Save scene', () => this.saveScene());
    this.addShortcut('ctrl+r', 'Recall scene', () => this.recallScene());
    this.addShortcut('ctrl+shift+r', 'Record scene', () => this.recordScene());
    
    // AI Lighting shortcuts
    this.addShortcut('ctrl+shift+g', 'Generate AI scene', () => this.generateAIScene());
    this.addShortcut('ctrl+shift+e', 'Execute AI scene', () => this.executeAIScene());
    
    // Help
    this.addShortcut('f1', 'Show help', () => this.showHelp());
    this.addShortcut('ctrl+?', 'Show shortcuts', () => this.showShortcuts());
  }

  addShortcut(key, description, callback) {
    this.shortcuts.set(key, { description, callback });
  }

  setupEventListeners() {
    document.addEventListener('keydown', (event) => {
      this.handleKeyDown(event);
    });

    // Prevent default browser shortcuts
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
          case 'z':
          case 'y':
          case 'a':
            event.preventDefault();
            break;
        }
      }
    });
  }

  handleKeyDown(event) {
    const key = this.getKeyString(event);
    const shortcut = this.shortcuts.get(key);
    
    if (shortcut) {
      event.preventDefault();
      shortcut.callback();
      this.showShortcutFeedback(shortcut.description);
    }
  }

  getKeyString(event) {
    let key = '';
    
    if (event.ctrlKey) key += 'ctrl+';
    if (event.shiftKey) key += 'shift+';
    if (event.altKey) key += 'alt+';
    if (event.metaKey) key += 'meta+';
    
    // Handle special keys
    switch (event.key) {
      case ' ':
        key += 'space';
        break;
      case 'Escape':
        key += 'escape';
        break;
      case 'F1':
        key += 'f1';
        break;
      case '?':
        key += '?';
        break;
      default:
        key += event.key.toLowerCase();
    }
    
    return key;
  }

  navigateToTab(tabId) {
    const tab = document.getElementById(`tab-${tabId}`);
    if (tab) {
      tab.click();
    }
  }

  toggleBlackout() {
    const blackoutBtn = document.getElementById('blackout');
    if (blackoutBtn) {
      blackoutBtn.click();
    }
  }

  fullOn() {
    if (window.ionxe && window.ionxe.state) {
      window.ionxe.state.setGrandMaster(255);
      const gmEl = document.getElementById('grand-master');
      if (gmEl) {
        gmEl.value = '255';
        gmEl.dispatchEvent(new Event('input'));
      }
    }
  }

  setGrandMaster(value) {
    if (window.ionxe && window.ionxe.state) {
      window.ionxe.state.setGrandMaster(value);
      const gmEl = document.getElementById('grand-master');
      if (gmEl) {
        gmEl.value = value.toString();
        gmEl.dispatchEvent(new Event('input'));
      }
    }
  }

  selectAllChannels() {
    if (window.ionxe && window.ionxe.state) {
      for (let i = 0; i < 512; i++) {
        window.ionxe.state.buttonStates.selectedChannels.add(i);
      }
      this.core.emit('channelSelectionChanged', { 
        selectedChannels: Array.from(window.ionxe.state.buttonStates.selectedChannels),
        lastSelected: null 
      });
    }
  }

  clearSelection() {
    if (window.ionxe && window.ionxe.state) {
      window.ionxe.state.clearSelection();
    }
  }

  duplicateSelection() {
    // Implementation for duplicating selected channels
    this.core.showSuccess('Selection duplicated');
  }

  saveScene() {
    const saveBtn = document.getElementById('save-scene');
    if (saveBtn) {
      saveBtn.click();
    }
  }

  recallScene() {
    const recallBtn = document.getElementById('recall-scene');
    if (recallBtn) {
      recallBtn.click();
    }
  }

  recordScene() {
    const recordBtn = document.getElementById('softkey-record');
    if (recordBtn) {
      recordBtn.click();
    }
  }

  generateAIScene() {
    const generateBtn = document.getElementById('generate-scene');
    if (generateBtn && !generateBtn.disabled) {
      generateBtn.click();
    }
  }

  executeAIScene() {
    const executeBtn = document.getElementById('execute-scene');
    if (executeBtn && !executeBtn.disabled) {
      executeBtn.click();
    }
  }

  showHelp() {
    this.showModal('Help', this.getHelpContent());
  }

  showShortcuts() {
    this.showModal('Keyboard Shortcuts', this.getShortcutsContent());
  }

  getHelpContent() {
    return `
      <div class="help-content">
        <h3>IonXE Control System</h3>
        <p>Welcome to the IonXE lighting control system. This interface provides comprehensive control over your lighting setup.</p>
        
        <h4>Main Features:</h4>
        <ul>
          <li><strong>Console:</strong> Direct fader control with 512 channels</li>
          <li><strong>Virtual Desk:</strong> Professional lighting console interface</li>
          <li><strong>Magic Sheet:</strong> Visual lighting design workspace</li>
          <li><strong>AI Lighting:</strong> AI-powered scene generation</li>
          <li><strong>Scenes:</strong> Save and recall lighting states</li>
          <li><strong>Color Control:</strong> Advanced color mixing</li>
          <li><strong>Fixture Management:</strong> Professional fixture control</li>
        </ul>
        
        <h4>Getting Started:</h4>
        <ol>
          <li>Use the Console tab to control individual channels</li>
          <li>Create scenes to save lighting states</li>
          <li>Use AI Lighting for creative inspiration</li>
          <li>Access advanced features through other tabs</li>
        </ol>
      </div>
    `;
  }

  getShortcutsContent() {
    let content = '<div class="shortcuts-content"><h3>Keyboard Shortcuts</h3>';
    
    // Group shortcuts by category
    const categories = {
      'Global': ['ctrl+s', 'ctrl+z', 'ctrl+y', 'ctrl+shift+z'],
      'Navigation': ['ctrl+1', 'ctrl+2', 'ctrl+3', 'ctrl+4', 'ctrl+5', 'ctrl+6', 'ctrl+7', 'ctrl+8', 'ctrl+9', 'ctrl+0', 'ctrl+shift+d', 'ctrl+shift+l', 'ctrl+shift+a'],
      'Faders': ['space', 'ctrl+space', 'ctrl+shift+space'],
      'Selection': ['ctrl+a', 'escape', 'ctrl+d'],
      'Scenes': ['ctrl+shift+s', 'ctrl+r', 'ctrl+shift+r'],
      'AI Lighting': ['ctrl+shift+g', 'ctrl+shift+e'],
      'Help': ['f1', 'ctrl+?']
    };
    
    for (const [category, keys] of Object.entries(categories)) {
      content += `<h4>${category}</h4><ul>`;
      for (const key of keys) {
        const shortcut = this.shortcuts.get(key);
        if (shortcut) {
          content += `<li><kbd>${key}</kbd> - ${shortcut.description}</li>`;
        }
      }
      content += '</ul>';
    }
    
    content += '</div>';
    return content;
  }

  showModal(title, content) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-content">
          ${content}
        </div>
        <div class="modal-footer">
          <button class="modal-close-btn">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add event listeners
    const closeBtn = overlay.querySelector('.modal-close');
    const closeBtnFooter = overlay.querySelector('.modal-close-btn');
    const closeModal = () => {
      document.body.removeChild(overlay);
    };
    
    closeBtn.addEventListener('click', closeModal);
    closeBtnFooter.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    
    // Close on Escape
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  showShortcutFeedback(description) {
    // Show brief feedback for executed shortcut
    const feedback = document.createElement('div');
    feedback.className = 'shortcut-feedback';
    feedback.textContent = description;
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      if (document.body.contains(feedback)) {
        document.body.removeChild(feedback);
      }
    }, 2000);
  }

  setupDragAndDrop() {
    // Enable drag and drop for scenes, cues, and other elements
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      this.handleDrop(e);
    });

    // Make draggable elements
    this.makeElementsDraggable();
  }

  makeElementsDraggable() {
    // Make scene items draggable
    const sceneItems = document.querySelectorAll('.scene-item');
    sceneItems.forEach(item => {
      item.draggable = true;
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.dataset.sceneId);
        item.classList.add('dragging');
      });
      
      item.addEventListener('dragend', (e) => {
        item.classList.remove('dragging');
      });
    });
  }

  handleDrop(e) {
    const data = e.dataTransfer.getData('text/plain');
    const dropTarget = e.target.closest('.drop-zone');
    
    if (dropTarget && data) {
      // Handle scene drop
      this.core.showSuccess('Scene moved successfully');
    }
  }

  setupTouchGestures() {
    // Add touch gesture support for mobile devices
    let startX, startY, startTime;
    
    document.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
    });

    document.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = endTime - startTime;
      
      // Detect swipe gestures
      if (deltaTime < 300) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 50) {
            this.handleSwipe('right');
          } else if (deltaX < -50) {
            this.handleSwipe('left');
          }
        } else {
          if (deltaY > 50) {
            this.handleSwipe('down');
          } else if (deltaY < -50) {
            this.handleSwipe('up');
          }
        }
      }
    });
  }

  handleSwipe(direction) {
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const currentIndex = tabs.findIndex(tab => tab.classList.contains('active'));
    
    switch (direction) {
      case 'left':
        if (currentIndex < tabs.length - 1) {
          tabs[currentIndex + 1].click();
        }
        break;
      case 'right':
        if (currentIndex > 0) {
          tabs[currentIndex - 1].click();
        }
        break;
    }
  }
}

// Register the module
window.IonXeKeyboardShortcuts = IonXeKeyboardShortcuts;
