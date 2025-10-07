// Color and intensity controls
function parseList(input) {
  const s = (input||'').trim();
  if (!s) return [];
  const parts = s.split(',');
  const out = [];
  for (const p of parts) {
    if (p.includes('-')) {
      const [a,b] = p.split('-').map(x=>parseInt(x,10));
      if (!isNaN(a) && !isNaN(b)) { for (let i=a;i<=b;i++) out.push(i); }
    } else {
      const n = parseInt(p,10); if (!isNaN(n)) out.push(n);
    }
  }
  return out;
}

document.getElementById('color-apply').onclick = async () => {
  const hex = document.getElementById('color-picker').value || '#ffffff';
  const r = parseInt(hex.slice(1,3), 16) & 0xff;
  const g = parseInt(hex.slice(3,5), 16) & 0xff;
  const b = parseInt(hex.slice(5,7), 16) & 0xff;
  const bases = parseList(document.getElementById('color-bases').value).map(x=>Math.max(0, x-1));
  const payload = { model: 'rgb', rgb: [r,g,b], bases };
  await apiFetch('/api/v1/color', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
};

document.getElementById('intens-apply').onclick = async () => {
  const chans = parseList(document.getElementById('intens-chans').value).map(x=>Math.max(0, x-1));
  const value = Math.max(0, Math.min(255, parseInt(document.getElementById('intens-value').value||'0',10)));
  const payload = { channels: chans, value };
  await apiFetch('/api/v1/intensity', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
};
