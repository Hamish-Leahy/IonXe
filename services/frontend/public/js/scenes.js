// Scene management functionality
async function refreshScenes() {
  try {
    const r = await apiFetch('/api/v1/scenes');
    const scenes = await r.json();
    const sel = document.getElementById('scenes-list');
    sel.innerHTML = '';
    for (const s of scenes) {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.label || s.id;
      sel.appendChild(opt);
    }
  } catch {}
}

document.getElementById('refresh-scenes').onclick = refreshScenes;

document.getElementById('save-scene').onclick = async () => {
  const label = document.getElementById('scene-label').value || '';
  const payload = { id: '00000000-0000-0000-0000-000000000000', label, levels: Array.from(faderValues) };
  const r = await apiFetch('/api/v1/scenes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (r.ok) refreshScenes();
};

document.getElementById('recall-scene').onclick = async () => {
  const sel = document.getElementById('scenes-list');
  const id = sel.value; if (!id) return;
  const fade = Math.max(0, parseInt(document.getElementById('fade-ms').value||'0',10));
  const payload = { id, fade_ms: isNaN(fade) ? 0 : fade };
  const r = await apiFetch('/api/v1/recall_scene', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!r.ok) alert('recall failed: ' + r.status);
};

document.getElementById('delete-scene').onclick = async () => {
  const sel = document.getElementById('scenes-list');
  const id = sel.value; if (!id) return;
  await apiFetch('/api/v1/scenes/' + id, { method: 'DELETE' });
  refreshScenes();
};

// Export/Import scenes
document.getElementById('export-scenes').onclick = async () => {
  const r = await apiFetch('/api/v1/scenes');
  const scenes = await r.json();
  const blob = new Blob([JSON.stringify(scenes, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ionxe-scenes.json'; a.click();
  URL.revokeObjectURL(url);
};

document.getElementById('import-scenes').onclick = () => document.getElementById('import-file').click();

document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const text = await file.text();
    const scenes = JSON.parse(text);
    if (!Array.isArray(scenes)) throw new Error('invalid');
    for (const s of scenes) {
      if (!s.levels || !Array.isArray(s.levels)) continue;
      const payload = { id: s.id || '00000000-0000-0000-0000-000000000000', label: s.label || '', levels: s.levels.slice(0,512) };
      await apiFetch('/api/v1/scenes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    }
    refreshScenes();
  } catch (e) { alert('Import failed'); }
});

// Initialize scenes
refreshScenes();
