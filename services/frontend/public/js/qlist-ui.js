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

  // Initialize
  nameInput.value = qListManager.cueListName;
  renderTable();
})();


