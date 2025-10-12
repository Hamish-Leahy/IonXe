// Advanced Q List UI
// Enhanced user interface for advanced Q List features

class AdvancedQListUI {
  constructor(qListManager, qListTimingManager, advancedTiming) {
    this.qListManager = qListManager;
    this.timingManager = qListTimingManager;
    this.advancedTiming = advancedTiming;
    this.selectedCues = new Set();
    this.effectDialogs = new Map();
    
    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.setupAdvancedControls();
    this.updateUI();
  }

  setupEventListeners() {
    // Playback controls
    document.getElementById('qlist-pause')?.addEventListener('click', () => this.togglePause());
    document.getElementById('qlist-stop')?.addEventListener('click', () => this.stopPlayback());
    
    // Auto-follow and loop
    document.getElementById('qlist-auto-follow')?.addEventListener('change', (e) => {
      if (e.target.checked) {
        this.advancedTiming.enableAutoFollow();
      } else {
        this.advancedTiming.disableAutoFollow();
      }
    });

    document.getElementById('qlist-loop')?.addEventListener('change', (e) => {
      this.qListManager.loopMode = e.target.checked;
    });

    // Speed control
    document.getElementById('qlist-speed')?.addEventListener('input', (e) => {
      this.qListManager.playbackSpeed = parseFloat(e.target.value);
      document.getElementById('qlist-speed-value').textContent = e.target.value + 'x';
    });

    // Timing curve controls
    document.getElementById('qlist-apply-curve')?.addEventListener('click', () => this.applyCurveToSelected());
    document.getElementById('qlist-apply-all')?.addEventListener('click', () => this.applyCurveToAll());

    // Easing controls
    document.getElementById('qlist-fade-in-easing')?.addEventListener('change', (e) => {
      this.applyEasingToSelected('fadeInEasing', e.target.value);
    });

    document.getElementById('qlist-fade-out-easing')?.addEventListener('change', (e) => {
      this.applyEasingToSelected('fadeOutEasing', e.target.value);
    });

    // Effect controls
    document.getElementById('qlist-add-fade-effect')?.addEventListener('click', () => this.showFadeEffectDialog());
    document.getElementById('qlist-add-chase-effect')?.addEventListener('click', () => this.showChaseEffectDialog());
    document.getElementById('qlist-add-pulse-effect')?.addEventListener('click', () => this.showPulseEffectDialog());
    document.getElementById('qlist-add-strobe-effect')?.addEventListener('click', () => this.showStrobeEffectDialog());
    document.getElementById('qlist-clear-effects')?.addEventListener('click', () => this.clearEffectsFromSelected());

    // Cue linking
    document.getElementById('qlist-create-link')?.addEventListener('click', () => this.createCueLink());
    document.getElementById('qlist-break-link')?.addEventListener('click', () => this.breakCueLink());
    document.getElementById('qlist-show-links')?.addEventListener('click', () => this.showCueLinks());

    // Table enhancements
    this.setupTableEnhancements();
  }

  setupAdvancedControls() {
    // Initialize auto-follow state
    document.getElementById('qlist-auto-follow').checked = this.advancedTiming.isAutoFollowEnabled();
    
    // Initialize loop state
    document.getElementById('qlist-loop').checked = this.qListManager.loopMode;
    
    // Initialize speed
    const speedSlider = document.getElementById('qlist-speed');
    speedSlider.value = this.qListManager.playbackSpeed;
    document.getElementById('qlist-speed-value').textContent = this.qListManager.playbackSpeed + 'x';
  }

  setupTableEnhancements() {
    const table = document.getElementById('qlist-table');
    if (!table) return;

    // Add row selection
    table.addEventListener('click', (e) => {
      const row = e.target.closest('tr');
      if (!row || row.tagName !== 'TR') return;

      const cueId = row.dataset.id;
      if (!cueId) return;

      if (e.ctrlKey || e.metaKey) {
        // Multi-select
        this.toggleCueSelection(cueId);
      } else {
        // Single select
        this.selectCue(cueId);
      }
    });

    // Add context menu
    table.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e);
    });
  }

  togglePause() {
    if (this.qListManager.isPlaying) {
      this.qListManager.pause();
      document.getElementById('qlist-pause').textContent = 'Resume';
    } else {
      this.qListManager.play();
      document.getElementById('qlist-pause').textContent = 'Pause';
    }
  }

  stopPlayback() {
    this.qListManager.stop();
    document.getElementById('qlist-pause').textContent = 'Pause';
    this.updateUI();
  }

  selectCue(cueId) {
    this.selectedCues.clear();
    this.selectedCues.add(cueId);
    this.updateSelectionUI();
  }

  toggleCueSelection(cueId) {
    if (this.selectedCues.has(cueId)) {
      this.selectedCues.delete(cueId);
    } else {
      this.selectedCues.add(cueId);
    }
    this.updateSelectionUI();
  }

  updateSelectionUI() {
    const table = document.getElementById('qlist-table');
    if (!table) return;

    // Clear all selection classes
    table.querySelectorAll('tr').forEach(row => {
      row.classList.remove('selected');
    });

    // Add selection class to selected rows
    this.selectedCues.forEach(cueId => {
      const row = table.querySelector(`tr[data-id="${cueId}"]`);
      if (row) {
        row.classList.add('selected');
      }
    });
  }

  applyCurveToSelected() {
    const curveId = document.getElementById('qlist-timing-curve').value;
    
    this.selectedCues.forEach(cueId => {
      this.advancedTiming.applyTimingCurve(cueId, curveId);
    });

    this.updateTable();
    this.showMessage(`Applied ${curveId} curve to ${this.selectedCues.size} cues`);
  }

  applyCurveToAll() {
    const curveId = document.getElementById('qlist-timing-curve').value;
    
    this.qListManager.cues.forEach(cue => {
      this.advancedTiming.applyTimingCurve(cue.id, curveId);
    });

    this.updateTable();
    this.showMessage(`Applied ${curveId} curve to all cues`);
  }

  applyEasingToSelected(property, easing) {
    this.selectedCues.forEach(cueId => {
      const cue = this.qListManager.cues.find(c => c.id === cueId);
      if (cue) {
        if (!cue.timing) cue.timing = {};
        cue.timing[property] = easing;
        cue.updatedAt = new Date().toISOString();
      }
    });

    this.qListManager.notifyCueListUpdated();
    this.showMessage(`Applied ${easing} easing to ${this.selectedCues.size} cues`);
  }

  showFadeEffectDialog() {
    if (this.selectedCues.size === 0) {
      this.showMessage('Please select cues first', 'warning');
      return;
    }

    const dialog = this.createEffectDialog('Fade Effect', {
      channels: { type: 'text', label: 'Channels', placeholder: '1-24,31,45', value: '1-24' },
      startValue: { type: 'number', label: 'Start Value', min: 0, max: 255, value: 0 },
      endValue: { type: 'number', label: 'End Value', min: 0, max: 255, value: 255 },
      duration: { type: 'number', label: 'Duration (ms)', min: 100, max: 10000, value: 1000 }
    }, (params) => {
      this.selectedCues.forEach(cueId => {
        this.advancedTiming.addFadeEffect(
          cueId,
          this.parseChannelRange(params.channels),
          parseInt(params.startValue),
          parseInt(params.endValue),
          parseInt(params.duration)
        );
      });
      this.updateTable();
      this.showMessage(`Added fade effect to ${this.selectedCues.size} cues`);
    });

    document.body.appendChild(dialog);
  }

  showChaseEffectDialog() {
    if (this.selectedCues.size === 0) {
      this.showMessage('Please select cues first', 'warning');
      return;
    }

    const dialog = this.createEffectDialog('Chase Effect', {
      channels: { type: 'text', label: 'Channels', placeholder: '1-24', value: '1-24' },
      speed: { type: 'number', label: 'Speed (ms)', min: 100, max: 5000, value: 500 },
      direction: { type: 'select', label: 'Direction', options: [
        { value: 'forward', text: 'Forward' },
        { value: 'backward', text: 'Backward' },
        { value: 'ping-pong', text: 'Ping-Pong' }
      ], value: 'forward' }
    }, (params) => {
      this.selectedCues.forEach(cueId => {
        this.advancedTiming.addChaseEffect(
          cueId,
          this.parseChannelRange(params.channels),
          parseInt(params.speed),
          params.direction
        );
      });
      this.updateTable();
      this.showMessage(`Added chase effect to ${this.selectedCues.size} cues`);
    });

    document.body.appendChild(dialog);
  }

  showPulseEffectDialog() {
    if (this.selectedCues.size === 0) {
      this.showMessage('Please select cues first', 'warning');
      return;
    }

    const dialog = this.createEffectDialog('Pulse Effect', {
      channels: { type: 'text', label: 'Channels', placeholder: '1-24', value: '1-24' },
      speed: { type: 'number', label: 'Speed (ms)', min: 200, max: 5000, value: 1000 },
      intensity: { type: 'range', label: 'Intensity', min: 0.1, max: 1.0, step: 0.1, value: 0.5 }
    }, (params) => {
      this.selectedCues.forEach(cueId => {
        this.advancedTiming.addPulseEffect(
          cueId,
          this.parseChannelRange(params.channels),
          parseInt(params.speed),
          parseFloat(params.intensity)
        );
      });
      this.updateTable();
      this.showMessage(`Added pulse effect to ${this.selectedCues.size} cues`);
    });

    document.body.appendChild(dialog);
  }

  showStrobeEffectDialog() {
    if (this.selectedCues.size === 0) {
      this.showMessage('Please select cues first', 'warning');
      return;
    }

    const dialog = this.createEffectDialog('Strobe Effect', {
      channels: { type: 'text', label: 'Channels', placeholder: '1-24', value: '1-24' },
      speed: { type: 'number', label: 'Speed (ms)', min: 50, max: 2000, value: 200 },
      intensity: { type: 'range', label: 'Intensity', min: 0.1, max: 1.0, step: 0.1, value: 1.0 }
    }, (params) => {
      this.selectedCues.forEach(cueId => {
        this.advancedTiming.addStrobeEffect(
          cueId,
          this.parseChannelRange(params.channels),
          parseInt(params.speed),
          parseFloat(params.intensity)
        );
      });
      this.updateTable();
      this.showMessage(`Added strobe effect to ${this.selectedCues.size} cues`);
    });

    document.body.appendChild(dialog);
  }

  createEffectDialog(title, fields, onApply) {
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-content">
          ${this.generateFormFields(fields)}
        </div>
        <div class="modal-footer">
          <button id="apply-effect" class="btn-primary">Apply</button>
          <button class="modal-close-btn">Cancel</button>
        </div>
      </div>
    `;

    // Event listeners
    const closeModal = () => {
      document.body.removeChild(dialog);
    };

    dialog.querySelector('.modal-close').addEventListener('click', closeModal);
    dialog.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    dialog.querySelector('#apply-effect').addEventListener('click', () => {
      const formData = this.getFormData(dialog, fields);
      onApply(formData);
      closeModal();
    });

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) closeModal();
    });

    return dialog;
  }

  generateFormFields(fields) {
    let html = '';
    for (const [name, config] of Object.entries(fields)) {
      html += `<div class="form-field">`;
      html += `<label>${config.label}:</label>`;
      
      switch (config.type) {
        case 'text':
          html += `<input type="text" name="${name}" placeholder="${config.placeholder}" value="${config.value || ''}">`;
          break;
        case 'number':
          html += `<input type="number" name="${name}" min="${config.min}" max="${config.max}" value="${config.value || ''}">`;
          break;
        case 'range':
          html += `<input type="range" name="${name}" min="${config.min}" max="${config.max}" step="${config.step}" value="${config.value || ''}">`;
          html += `<span class="range-value">${config.value || ''}</span>`;
          break;
        case 'select':
          html += `<select name="${name}">`;
          for (const option of config.options) {
            html += `<option value="${option.value}" ${option.value === config.value ? 'selected' : ''}>${option.text}</option>`;
          }
          html += `</select>`;
          break;
      }
      html += `</div>`;
    }
    return html;
  }

  getFormData(dialog, fields) {
    const data = {};
    for (const name of Object.keys(fields)) {
      const input = dialog.querySelector(`[name="${name}"]`);
      if (input) {
        data[name] = input.value;
      }
    }
    return data;
  }

  parseChannelRange(input) {
    const channels = [];
    const parts = input.split(',');
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
        for (let i = start; i <= end; i++) {
          channels.push(i);
        }
      } else {
        channels.push(parseInt(trimmed));
      }
    }
    
    return channels;
  }

  clearEffectsFromSelected() {
    this.selectedCues.forEach(cueId => {
      const cue = this.qListManager.cues.find(c => c.id === cueId);
      if (cue && cue.effects) {
        cue.effects = [];
        cue.updatedAt = new Date().toISOString();
      }
    });

    this.qListManager.notifyCueListUpdated();
    this.updateTable();
    this.showMessage(`Cleared effects from ${this.selectedCues.size} cues`);
  }

  createCueLink() {
    const linkCue = document.getElementById('qlist-link-cue').value;
    if (!linkCue || this.selectedCues.size === 0) {
      this.showMessage('Please select cues and enter a target cue number', 'warning');
      return;
    }

    this.selectedCues.forEach(cueId => {
      this.advancedTiming.linkCues(cueId, parseInt(linkCue));
    });

    this.updateTable();
    this.showMessage(`Linked ${this.selectedCues.size} cues to cue ${linkCue}`);
  }

  breakCueLink() {
    this.selectedCues.forEach(cueId => {
      this.advancedTiming.unlinkCue(cueId);
    });

    this.updateTable();
    this.showMessage(`Broke links for ${this.selectedCues.size} cues`);
  }

  showCueLinks() {
    const links = [];
    for (const [fromCueId, link] of this.advancedTiming.cueLinking) {
      const fromCue = this.qListManager.cues.find(c => c.id === fromCueId);
      const toCue = this.qListManager.cues.find(c => c.id === link.toCueId);
      if (fromCue && toCue) {
        links.push(`Cue ${fromCue.number} → Cue ${toCue.number}`);
      }
    }

    if (links.length === 0) {
      this.showMessage('No cue links found');
    } else {
      this.showMessage(`Cue Links:\n${links.join('\n')}`);
    }
  }

  showContextMenu(e) {
    // Remove existing context menu
    const existing = document.querySelector('.context-menu');
    if (existing) {
      existing.remove();
    }

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.left = e.pageX + 'px';
    menu.style.top = e.pageY + 'px';
    menu.innerHTML = `
      <div class="context-item" data-action="select">Select Cue</div>
      <div class="context-item" data-action="duplicate">Duplicate</div>
      <div class="context-item" data-action="delete">Delete</div>
      <div class="context-item" data-action="timing">Edit Timing</div>
      <div class="context-item" data-action="effects">Add Effects</div>
      <div class="context-item" data-action="link">Create Link</div>
    `;

    document.body.appendChild(menu);

    // Handle menu clicks
    menu.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleContextAction(action);
        menu.remove();
      }
    });

    // Remove menu when clicking elsewhere
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 0);
  }

  handleContextAction(action) {
    switch (action) {
      case 'select':
        // Already handled by table click
        break;
      case 'duplicate':
        // Implement duplicate
        break;
      case 'delete':
        // Implement delete
        break;
      case 'timing':
        this.showTimingDialog();
        break;
      case 'effects':
        this.showEffectMenu();
        break;
      case 'link':
        this.showLinkDialog();
        break;
    }
  }

  showTimingDialog() {
    // Implementation for timing dialog
    this.showMessage('Timing dialog not yet implemented');
  }

  showEffectMenu() {
    // Implementation for effect menu
    this.showMessage('Effect menu not yet implemented');
  }

  showLinkDialog() {
    // Implementation for link dialog
    this.showMessage('Link dialog not yet implemented');
  }

  updateTable() {
    // Trigger table update
    if (window.qListUI && window.qListUI.renderTable) {
      window.qListUI.renderTable();
    }
  }

  updateUI() {
    // Update UI state
    const isPlaying = this.qListManager.isPlaying;
    const isPaused = this.qListManager.isPaused;
    
    document.getElementById('qlist-pause').textContent = isPaused ? 'Resume' : 'Pause';
    document.getElementById('qlist-pause').disabled = !isPlaying && !isPaused;
  }

  showMessage(message, type = 'info') {
    // Simple message display
    const status = document.getElementById('qlist-status');
    if (status) {
      status.textContent = message;
      status.className = `status ${type}`;
      
      setTimeout(() => {
        status.textContent = '';
        status.className = 'status';
      }, 3000);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.qListManager && window.qListTimingManager && window.advancedQListTiming) {
    window.advancedQListUI = new AdvancedQListUI(
      window.qListManager,
      window.qListTimingManager,
      window.advancedQListTiming
    );
  }
});
