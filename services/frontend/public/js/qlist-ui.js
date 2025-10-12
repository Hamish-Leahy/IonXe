// Q List UI

(function(){
  const tableBody = document.querySelector('#qlist-table tbody');
  const nameInput = document.getElementById('qlist-name');
  const statusEl = document.getElementById('qlist-status');

  function renderTable() {
    tableBody.innerHTML = '';
    qListManager.cues.forEach((cue, index) => {
      const tr = document.createElement('tr');
      tr.className = 'qlist-cue-row';
      if (cue.state.isActive) tr.classList.add('playing');
      if (index === qListManager.currentCueIndex) tr.classList.add('selected');
      tr.dataset.id = cue.id;
      tr.draggable = true;
      
      // Enhanced table row with new columns
      tr.innerHTML = `
        <td class="col-number">
          <span class="qlist-cue-number">${cue.number}</span>
        </td>
        <td class="col-label">
          <span class="qlist-cue-label" contenteditable="true" data-field="label">${cue.label}</span>
        </td>
        <td class="col-description">
          <span class="qlist-cue-description" contenteditable="true" data-field="description">${cue.description || ''}</span>
        </td>
        <td class="col-hang">
          <span class="qlist-cue-hang">${cue.timing.hang || '0'}</span>
        </td>
        <td class="col-curve">
          <span class="qlist-cue-curve">${cue.timing.curve || 'smooth'}</span>
        </td>
        <td class="col-effects">
          <div class="qlist-cue-effects">
            ${(cue.effects || []).map(effect => 
              `<span class="qlist-effect-tag ${effect.type}">${effect.name}</span>`
            ).join('')}
          </div>
        </td>
        <td class="col-link">
          <span class="qlist-cue-link">${cue.link ? `→ ${cue.link}` : ''}</span>
        </td>
        <td class="col-fade-in">
          <span class="qlist-cue-timing" contenteditable="true" data-field="fadeIn">${cue.timing.fadeIn || '0'}</span>
        </td>
        <td class="col-fade-out">
          <span class="qlist-cue-timing" contenteditable="true" data-field="fadeOut">${cue.timing.fadeOut || '0'}</span>
        </td>
        <td class="col-delay">
          <span class="qlist-cue-timing" contenteditable="true" data-field="delay">${cue.timing.delay || '0'}</span>
        </td>
        <td class="col-follow">
          <span class="qlist-cue-follow" contenteditable="true" data-field="follow">${cue.timing.follow || '0'}</span>
        </td>
        <td class="col-progress">
          <div class="qlist-cue-progress">
            <div class="qlist-progress-bar" style="width: ${cue.state.progress || 0}%"></div>
          </div>
        </td>
        <td class="col-actions">
          <div class="qlist-cue-actions">
            <button class="qlist-edit-btn" onclick="editCue('${cue.id}')" title="Edit">✏️</button>
            <button class="qlist-duplicate-btn" onclick="duplicateCue('${cue.id}')" title="Duplicate">📋</button>
            <button class="qlist-move-up-btn" onclick="moveCueUp('${cue.id}')" title="Move Up">⬆️</button>
            <button class="qlist-move-down-btn" onclick="moveCueDown('${cue.id}')" title="Move Down">⬇️</button>
            <button class="qlist-delete-btn" onclick="deleteCue('${cue.id}')" title="Delete">🗑️</button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  function setStatus(text) { statusEl.textContent = text; }

  // Event wiring
  document.getElementById('qlist-new-cue').onclick = () => {
    const cue = qListManager.addCue({ label: 'New Cue', description: '', levels: new Uint8Array(faderValues) });
    renderTable();
    qListStateManager.saveStateToServer();
    setStatus(`Added cue ${cue.number}`);
  };

  document.getElementById('qlist-duplicate-cue').onclick = () => {
    const sel = getSelectedCueId(); if (!sel) return;
    const cue = qListManager.duplicateCue(sel);
    renderTable();
    qListStateManager.saveStateToServer();
    if (cue) setStatus(`Duplicated cue ${cue.number}`);
  };

  document.getElementById('qlist-delete-cue').onclick = () => {
    const sel = getSelectedCueId(); if (!sel) return;
    qListManager.deleteCue(sel);
    renderTable();
    qListStateManager.saveStateToServer();
    setStatus('Deleted cue');
  };

  document.getElementById('qlist-prev').onclick = () => { qListManager.previousCue(); };
  document.getElementById('qlist-next').onclick = () => { qListManager.nextCue(); };
  document.getElementById('qlist-go').onclick = () => {
    const cue = qListManager.getCurrentCue() || qListManager.cues[0];
    if (cue) {
      qListTimingManager.executeCueWithTiming(cue);
      setStatus(`Executing cue ${cue.number}`);
    }
  };

  document.getElementById('qlist-export').onclick = () => {
    const data = qListManager.exportCueList();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = (nameInput.value||'ionxe-cuelist') + '.json'; a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById('qlist-import').onclick = () => document.getElementById('qlist-import-file').click();
  document.getElementById('qlist-import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (qListManager.importCueList(data)) { renderTable(); qListStateManager.saveStateToServer(); setStatus('Imported cue list'); }
    } catch { setStatus('Import failed'); }
  });

  // Inline edit handling
  tableBody.addEventListener('focusout', (e) => {
    const cell = e.target; if (!cell.dataset.field) return;
    const tr = cell.closest('tr'); const id = tr.dataset.id;
    const field = cell.dataset.field; const value = cell.textContent.trim();
    const cue = qListManager.cues.find(c => c.id === id); if (!cue) return;
    
    switch (field) {
      case 'label': cue.label = value; break;
      case 'description': cue.description = value; break;
      case 'fadeIn': cue.timing.fadeIn = parseInt(value)||0; break;
      case 'fadeOut': cue.timing.fadeOut = parseInt(value)||0; break;
      case 'delay': cue.timing.delay = parseInt(value)||0; break;
      case 'follow': cue.timing.follow = parseInt(value)||0; break;
    }
    cue.updatedAt = new Date().toISOString();
    qListManager.notifyCueListUpdated();
    qListStateManager.saveStateToServer();
  });

  // Row selection
  tableBody.addEventListener('click', (e) => {
    const tr = e.target.closest('tr'); if (!tr) return;
    tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
    tr.classList.add('selected');
  });

  function getSelectedCueId() {
    const tr = tableBody.querySelector('tr.selected');
    return tr ? tr.dataset.id : null;
  }

  // Drag and Drop functionality
  let draggedElement = null;
  let dropIndicator = null;

  tableBody.addEventListener('dragstart', (e) => {
    draggedElement = e.target.closest('tr');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', draggedElement.outerHTML);
    draggedElement.classList.add('dragging');
  });

  tableBody.addEventListener('dragend', (e) => {
    if (draggedElement) {
      draggedElement.classList.remove('dragging');
      draggedElement = null;
    }
    if (dropIndicator) {
      dropIndicator.remove();
      dropIndicator = null;
    }
  });

  tableBody.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = getDragAfterElement(tableBody, e.clientY);
    if (dropIndicator) {
      dropIndicator.remove();
    }
    
    dropIndicator = document.createElement('div');
    dropIndicator.className = 'drop-indicator';
    dropIndicator.style.height = '2px';
    dropIndicator.style.background = '#2e7dd7';
    dropIndicator.style.margin = '0';
    
    if (afterElement == null) {
      tableBody.appendChild(dropIndicator);
    } else {
      tableBody.insertBefore(dropIndicator, afterElement);
    }
  });

  tableBody.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!draggedElement) return;
    
    const afterElement = getDragAfterElement(tableBody, e.clientY);
    const draggedId = draggedElement.dataset.id;
    const afterId = afterElement ? afterElement.dataset.id : null;
    
    // Reorder cues
    reorderCues(draggedId, afterId);
    
    if (dropIndicator) {
      dropIndicator.remove();
      dropIndicator = null;
    }
  });

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('tr:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function reorderCues(draggedId, afterId) {
    const draggedIndex = qListManager.cues.findIndex(c => c.id === draggedId);
    const afterIndex = afterId ? qListManager.cues.findIndex(c => c.id === afterId) : -1;
    
    if (draggedIndex === -1) return;
    
    const [draggedCue] = qListManager.cues.splice(draggedIndex, 1);
    
    if (afterIndex === -1) {
      qListManager.cues.push(draggedCue);
    } else {
      const insertIndex = afterIndex > draggedIndex ? afterIndex - 1 : afterIndex;
      qListManager.cues.splice(insertIndex, 0, draggedCue);
    }
    
    // Update cue numbers
    qListManager.cues.forEach((cue, index) => {
      cue.number = index + 1;
    });
    
    // Update current cue index
    if (qListManager.currentCueIndex === draggedIndex) {
      qListManager.currentCueIndex = afterIndex === -1 ? qListManager.cues.length - 1 : 
        (afterIndex > draggedIndex ? afterIndex - 1 : afterIndex);
    } else if (qListManager.currentCueIndex > draggedIndex && qListManager.currentCueIndex <= afterIndex) {
      qListManager.currentCueIndex--;
    } else if (qListManager.currentCueIndex < draggedIndex && qListManager.currentCueIndex >= afterIndex) {
      qListManager.currentCueIndex++;
    }
    
    renderTable();
    qListManager.notifyCueListUpdated();
    qListStateManager.saveStateToServer();
    setStatus('Cues reordered');
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Only handle shortcuts when Q List tab is active
    if (!document.getElementById('view-qlist').classList.contains('active')) return;
    
    switch (e.key) {
      case 'ArrowUp':
        if (e.ctrlKey) {
          e.preventDefault();
          qListManager.previousCue();
          setStatus('Previous cue');
        }
        break;
      case 'ArrowDown':
        if (e.ctrlKey) {
          e.preventDefault();
          qListManager.nextCue();
          setStatus('Next cue');
        }
        break;
      case ' ':
        e.preventDefault();
        if (qListManager.isPlaying) {
          qListManager.pause();
          setStatus('Paused');
        } else {
          qListManager.play();
          setStatus('Playing');
        }
        break;
      case 'Enter':
        if (e.ctrlKey) {
          e.preventDefault();
          const cue = qListManager.getCurrentCue() || qListManager.cues[0];
          if (cue) {
            qListTimingManager.executeCueWithTiming(cue);
            setStatus(`Executing cue ${cue.number}`);
          }
        }
        break;
      case 'n':
        if (e.ctrlKey) {
          e.preventDefault();
          const cue = qListManager.addCue({ label: 'New Cue', description: '', levels: new Uint8Array(faderValues) });
          renderTable();
          qListStateManager.saveStateToServer();
          setStatus(`Added cue ${cue.number}`);
        }
        break;
      case 'Delete':
        if (e.ctrlKey) {
          e.preventDefault();
          const sel = getSelectedCueId();
          if (sel) {
            qListManager.deleteCue(sel);
            renderTable();
            qListStateManager.saveStateToServer();
            setStatus('Deleted cue');
          }
        }
        break;
    }
  });

  // React to state changes
  qListManager.onCueChanged = () => renderTable();
  qListManager.onCueListUpdated = () => renderTable();

  // Enhanced UI functionality
  function initializeEnhancedUI() {
    // Control tabs functionality
    const controlTabs = document.querySelectorAll('.control-tab');
    const controlPanels = document.querySelectorAll('.control-panel');
    
    controlTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // Update tab states
        controlTabs.forEach(t => t.classList.remove('active'));
        controlPanels.forEach(p => p.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${targetTab}-panel`).classList.add('active');
      });
    });

    // Curve preview functionality
    const curveSelect = document.getElementById('qlist-timing-curve');
    const curvePreview = document.getElementById('curve-preview');
    
    if (curveSelect && curvePreview) {
      curveSelect.addEventListener('change', updateCurvePreview);
      updateCurvePreview();
    }

    // Easing preview functionality
    const fadeInEasing = document.getElementById('qlist-fade-in-easing');
    const fadeOutEasing = document.getElementById('qlist-fade-out-easing');
    const fadeInPreview = document.getElementById('fade-in-preview');
    const fadeOutPreview = document.getElementById('fade-out-preview');
    
    if (fadeInEasing && fadeInPreview) {
      fadeInEasing.addEventListener('change', () => updateEasingPreview(fadeInPreview, fadeInEasing.value));
      updateEasingPreview(fadeInPreview, fadeInEasing.value);
    }
    
    if (fadeOutEasing && fadeOutPreview) {
      fadeOutEasing.addEventListener('change', () => updateEasingPreview(fadeOutPreview, fadeOutEasing.value));
      updateEasingPreview(fadeOutPreview, fadeOutEasing.value);
    }

    // Effect buttons functionality
    const effectButtons = document.querySelectorAll('.effect-btn');
    effectButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const effectType = btn.id.replace('qlist-add-', '').replace('-effect', '');
        addEffectToSelectedCue(effectType);
      });
    });

    // Search functionality
    const searchInput = document.getElementById('qlist-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterCues(e.target.value);
      });
    }

    // Column sorting functionality
    const sortButtons = document.querySelectorAll('.col-sort');
    sortButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const sortField = btn.dataset.sort;
        sortCues(sortField);
      });
    });

    // Animation speed control
    const animationSpeed = document.getElementById('qlist-animation-speed');
    const animationSpeedValue = document.getElementById('animation-speed-value');
    if (animationSpeed && animationSpeedValue) {
      animationSpeed.addEventListener('input', (e) => {
        animationSpeedValue.textContent = `${e.target.value}x`;
        updateAnimationSpeed(parseFloat(e.target.value));
      });
    }
  }

  function updateCurvePreview() {
    const curveSelect = document.getElementById('qlist-timing-curve');
    const curvePreview = document.getElementById('curve-preview');
    if (!curveSelect || !curvePreview) return;
    
    const curveType = curveSelect.value;
    curvePreview.innerHTML = '';
    
    // Create SVG curve preview
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 100 60');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#007bff');
    path.setAttribute('stroke-width', '2');
    
    let pathData = '';
    switch (curveType) {
      case 'instant':
        pathData = 'M 0,30 L 100,30';
        break;
      case 'quick-snap':
        pathData = 'M 0,30 Q 20,10 40,30 Q 60,50 80,30 L 100,30';
        break;
      case 'smooth':
        pathData = 'M 0,30 Q 25,10 50,30 Q 75,50 100,30';
        break;
      case 'gentle':
        pathData = 'M 0,30 Q 30,20 50,30 Q 70,40 100,30';
        break;
      case 'dramatic':
        pathData = 'M 0,30 Q 20,5 40,30 Q 60,55 80,30 L 100,30';
        break;
      case 'crossfade':
        pathData = 'M 0,30 Q 25,10 50,30 Q 75,50 100,30';
        break;
      case 'blackout':
        pathData = 'M 0,30 L 50,30 L 50,10 L 100,10';
        break;
      case 'fade-up':
        pathData = 'M 0,50 Q 25,40 50,30 Q 75,20 100,10';
        break;
      case 'fade-down':
        pathData = 'M 0,10 Q 25,20 50,30 Q 75,40 100,50';
        break;
    }
    
    path.setAttribute('d', pathData);
    svg.appendChild(path);
    curvePreview.appendChild(svg);
  }

  function updateEasingPreview(previewEl, easingType) {
    if (!previewEl) return;
    
    previewEl.innerHTML = '';
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 100 40');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#28a745');
    path.setAttribute('stroke-width', '2');
    
    let pathData = '';
    switch (easingType) {
      case 'linear':
        pathData = 'M 0,30 L 100,10';
        break;
      case 'ease-in':
        pathData = 'M 0,30 Q 25,30 50,20 Q 75,15 100,10';
        break;
      case 'ease-out':
        pathData = 'M 0,30 Q 25,25 50,20 Q 75,10 100,10';
        break;
      case 'ease-in-out':
        pathData = 'M 0,30 Q 25,30 50,20 Q 75,10 100,10';
        break;
      case 'lighting-smooth':
        pathData = 'M 0,30 C 20,30 30,20 50,20 C 70,20 80,10 100,10';
        break;
      case 'lighting-snap':
        pathData = 'M 0,30 L 20,30 L 20,10 L 100,10';
        break;
      case 'lighting-fade':
        pathData = 'M 0,30 Q 30,25 50,20 Q 70,15 100,10';
        break;
      case 'lighting-bounce':
        pathData = 'M 0,30 Q 20,20 40,25 Q 60,15 80,20 Q 90,10 100,10';
        break;
    }
    
    path.setAttribute('d', pathData);
    svg.appendChild(path);
    previewEl.appendChild(svg);
  }

  function addEffectToSelectedCue(effectType) {
    const selectedCue = getSelectedCue();
    if (!selectedCue) {
      setStatus('No cue selected');
      return;
    }
    
    if (!selectedCue.effects) selectedCue.effects = [];
    
    const effect = {
      id: Date.now().toString(),
      type: effectType,
      name: effectType.charAt(0).toUpperCase() + effectType.slice(1),
      parameters: {}
    };
    
    selectedCue.effects.push(effect);
    renderTable();
    qListStateManager.saveStateToServer();
    setStatus(`Added ${effect.name} effect to cue ${selectedCue.number}`);
  }

  function filterCues(searchTerm) {
    const rows = document.querySelectorAll('.qlist-cue-row');
    rows.forEach(row => {
      const label = row.querySelector('.qlist-cue-label').textContent.toLowerCase();
      const description = row.querySelector('.qlist-cue-description').textContent.toLowerCase();
      const search = searchTerm.toLowerCase();
      
      if (label.includes(search) || description.includes(search)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  }

  function sortCues(field) {
    qListManager.cues.sort((a, b) => {
      let aVal, bVal;
      
      switch (field) {
        case 'number':
          aVal = a.number;
          bVal = b.number;
          break;
        case 'label':
          aVal = a.label.toLowerCase();
          bVal = b.label.toLowerCase();
          break;
        case 'description':
          aVal = (a.description || '').toLowerCase();
          bVal = (b.description || '').toLowerCase();
          break;
        case 'fadeIn':
          aVal = a.timing.fadeIn || 0;
          bVal = b.timing.fadeIn || 0;
          break;
        case 'fadeOut':
          aVal = a.timing.fadeOut || 0;
          bVal = b.timing.fadeOut || 0;
          break;
        case 'follow':
          aVal = a.timing.follow || 0;
          bVal = b.timing.follow || 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
    
    renderTable();
    qListStateManager.saveStateToServer();
    setStatus(`Sorted by ${field}`);
  }

  function updateAnimationSpeed(speed) {
    // Update CSS custom property for animation speed
    document.documentElement.style.setProperty('--animation-speed', speed);
  }

  function getSelectedCue() {
    const selectedRow = document.querySelector('.qlist-cue-row.selected');
    if (!selectedRow) return null;
    
    const cueId = selectedRow.dataset.id;
    return qListManager.cues.find(c => c.id === cueId);
  }

  // Global functions for button onclick handlers
  window.editCue = function(cueId) {
    const cue = qListManager.cues.find(c => c.id === cueId);
    if (cue) {
      // Focus on the label field for editing
      const row = document.querySelector(`[data-id="${cueId}"]`);
      const labelField = row.querySelector('.qlist-cue-label');
      labelField.focus();
      labelField.select();
    }
  };

  window.duplicateCue = function(cueId) {
    const cue = qListManager.duplicateCue(cueId);
    if (cue) {
      renderTable();
      qListStateManager.saveStateToServer();
      setStatus(`Duplicated cue ${cue.number}`);
    }
  };

  window.moveCueUp = function(cueId) {
    const index = qListManager.cues.findIndex(c => c.id === cueId);
    if (index > 0) {
      const cue = qListManager.cues.splice(index, 1)[0];
      qListManager.cues.splice(index - 1, 0, cue);
      
      // Update cue numbers
      qListManager.cues.forEach((c, i) => c.number = i + 1);
      
      renderTable();
      qListStateManager.saveStateToServer();
      setStatus(`Moved cue ${cue.number} up`);
    }
  };

  window.moveCueDown = function(cueId) {
    const index = qListManager.cues.findIndex(c => c.id === cueId);
    if (index < qListManager.cues.length - 1) {
      const cue = qListManager.cues.splice(index, 1)[0];
      qListManager.cues.splice(index + 1, 0, cue);
      
      // Update cue numbers
      qListManager.cues.forEach((c, i) => c.number = i + 1);
      
      renderTable();
      qListStateManager.saveStateToServer();
      setStatus(`Moved cue ${cue.number} down`);
    }
  };

  window.deleteCue = function(cueId) {
    qListManager.deleteCue(cueId);
    renderTable();
    qListStateManager.saveStateToServer();
    setStatus('Deleted cue');
  };

  // Initialize
  nameInput.value = qListManager.cueListName;
  renderTable();
  initializeEnhancedUI();
})();


