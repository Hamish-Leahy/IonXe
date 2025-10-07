// Macro recording and playback system
const macros = new Map();
let currentMacro = null;
let macroRecording = false;
let macroSteps = [];

function startMacroRecording() {
  macroRecording = true;
  macroSteps = [];
  buttonStates.recordMode = true;
  updateButtonStates();
  console.log('Macro recording started');
}

function stopMacroRecording() {
  macroRecording = false;
  buttonStates.recordMode = false;
  updateButtonStates();
  console.log('Macro recording stopped, steps:', macroSteps.length);
}

function recordMacroStep(action, parameters) {
  if (macroRecording) {
    macroSteps.push({
      action,
      parameters,
      timestamp: Date.now()
    });
  }
}

function showMacroPanel() {
  // Create macro panel if it doesn't exist
  let panel = document.getElementById('macro-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'macro-panel';
    panel.className = 'macro-panel';
    panel.innerHTML = `
      <div class="macro-header">
        <h3>Macro Control</h3>
        <button id="close-macro-panel">×</button>
      </div>
      <div class="macro-content">
        <div class="macro-list">
          <h4>Saved Macros</h4>
          <div id="macro-list"></div>
        </div>
        <div class="macro-controls">
          <input id="macro-name" placeholder="Macro name" />
          <button id="save-macro">Save Current</button>
          <button id="load-macro">Load Selected</button>
          <button id="delete-macro">Delete Selected</button>
          <button id="execute-macro">Execute Selected</button>
        </div>
        <div class="macro-steps">
          <h4>Current Steps (${macroSteps.length})</h4>
          <div id="macro-steps-list"></div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
    
    // Add event listeners
    document.getElementById('close-macro-panel').onclick = () => {
      hideMacroPanel();
    };
    document.getElementById('save-macro').onclick = saveCurrentMacro;
    document.getElementById('load-macro').onclick = loadSelectedMacro;
    document.getElementById('delete-macro').onclick = deleteSelectedMacro;
    document.getElementById('execute-macro').onclick = executeSelectedMacro;
  }
  
  panel.style.display = 'block';
  refreshMacroList();
  refreshMacroSteps();
}

function hideMacroPanel() {
  const panel = document.getElementById('macro-panel');
  if (panel) {
    panel.style.display = 'none';
  }
  buttonStates.macroMode = false;
  updateButtonStates();
}

function refreshMacroList() {
  const list = document.getElementById('macro-list');
  if (!list) return;
  
  list.innerHTML = '';
  for (const [id, macro] of macros) {
    const item = document.createElement('div');
    item.className = 'macro-item';
    item.innerHTML = `
      <input type="radio" name="selected-macro" value="${id}" />
      <span>${macro.label}</span>
      <small>(${macro.steps.length} steps)</small>
    `;
    list.appendChild(item);
  }
}

function refreshMacroSteps() {
  const list = document.getElementById('macro-steps-list');
  if (!list) return;
  
  list.innerHTML = '';
  macroSteps.forEach((step, index) => {
    const item = document.createElement('div');
    item.className = 'macro-step-item';
    item.innerHTML = `
      <span>${index + 1}. ${step.action}</span>
      <small>${JSON.stringify(step.parameters)}</small>
    `;
    list.appendChild(item);
  });
}

function saveCurrentMacro() {
  const name = document.getElementById('macro-name').value;
  if (!name || macroSteps.length === 0) {
    alert('Please enter a name and record some steps first');
    return;
  }
  
  const id = 'macro_' + Date.now();
  const macro = {
    id,
    label: name,
    steps: macroSteps.map(step => ({
      action: step.action,
      parameters: step.parameters,
      delay_ms: 0 // Could calculate from timestamps
    })),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  macros.set(id, macro);
  refreshMacroList();
  document.getElementById('macro-name').value = '';
  console.log('Macro saved:', macro);
}

function loadSelectedMacro() {
  const selected = document.querySelector('input[name="selected-macro"]:checked');
  if (!selected) {
    alert('Please select a macro to load');
    return;
  }
  
  const macro = macros.get(selected.value);
  if (macro) {
    macroSteps = macro.steps.map(step => ({
      action: step.action,
      parameters: step.parameters,
      timestamp: Date.now()
    }));
    refreshMacroSteps();
    console.log('Macro loaded:', macro.label);
  }
}

function deleteSelectedMacro() {
  const selected = document.querySelector('input[name="selected-macro"]:checked');
  if (!selected) {
    alert('Please select a macro to delete');
    return;
  }
  
  if (confirm('Are you sure you want to delete this macro?')) {
    macros.delete(selected.value);
    refreshMacroList();
    console.log('Macro deleted');
  }
}

async function executeSelectedMacro() {
  const selected = document.querySelector('input[name="selected-macro"]:checked');
  if (!selected) {
    alert('Please select a macro to execute');
    return;
  }
  
  const macro = macros.get(selected.value);
  if (!macro) return;
  
  console.log('Executing macro:', macro.label);
  
  for (const step of macro.steps) {
    await executeMacroStep(step);
    if (step.delay_ms > 0) {
      await new Promise(resolve => setTimeout(resolve, step.delay_ms));
    }
  }
  
  console.log('Macro execution completed');
}

async function executeMacroStep(step) {
  switch (step.action) {
    case 'set_intensity':
      if (step.parameters.channels && step.parameters.value !== undefined) {
        const channels = Array.isArray(step.parameters.channels) ? 
          step.parameters.channels : [step.parameters.channels];
        await apiFetch('/api/v1/intensity', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            channels: channels.map(c => c - 1), // Convert to 0-based
            value: step.parameters.value
          })
        });
      }
      break;
    case 'set_color':
      if (step.parameters.rgb && step.parameters.bases) {
        await apiFetch('/api/v1/color', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            model: 'rgb',
            rgb: step.parameters.rgb,
            bases: step.parameters.bases.map(b => b - 1) // Convert to 0-based
          })
        });
      }
      break;
    case 'recall_scene':
      if (step.parameters.scene_id) {
        await apiFetch('/api/v1/recall_scene', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: step.parameters.scene_id,
            fade_ms: step.parameters.fade_ms || 0
          })
        });
      }
      break;
    case 'delay':
      // Handled in the main execution loop
      break;
  }
}
