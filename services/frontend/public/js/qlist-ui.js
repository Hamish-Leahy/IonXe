// Q List UI

(function(){
  const tableBody = document.querySelector('#qlist-table tbody');
  const nameInput = document.getElementById('qlist-name');
  const statusEl = document.getElementById('qlist-status');

  function renderTable() {
    tableBody.innerHTML = '';
    qListManager.cues.forEach((cue) => {
      const tr = document.createElement('tr');
      if (cue.state.isActive) tr.classList.add('active');
      tr.dataset.id = cue.id;
      tr.innerHTML = `
        <td>${cue.number}</td>
        <td contenteditable="true" data-field="label">${cue.label}</td>
        <td contenteditable="true" data-field="description">${cue.description}</td>
        <td contenteditable="true" data-field="fadeIn">${cue.timing.fadeIn}</td>
        <td contenteditable="true" data-field="fadeOut">${cue.timing.fadeOut}</td>
        <td contenteditable="true" data-field="delay">${cue.timing.delay}</td>
        <td contenteditable="true" data-field="follow">${cue.timing.follow}</td>
        <td><progress max="100" value="${cue.state.progress}"></progress></td>
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

  // React to state changes
  qListManager.onCueChanged = () => renderTable();
  qListManager.onCueListUpdated = () => renderTable();

  // Initialize
  nameInput.value = qListManager.cueListName;
  renderTable();
})();


