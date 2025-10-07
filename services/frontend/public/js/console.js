// Console-specific functionality
document.getElementById('get-frame').onclick = async () => {
  const r = await apiFetch('/api/v1/dimmers/frame');
  const b = new Uint8Array(await r.arrayBuffer());
  document.getElementById('frame-len').textContent = '' + b.length + ' bytes';
};

document.getElementById('random-lut').onclick = async () => {
  const lut = new Uint8Array(256);
  crypto.getRandomValues(lut);
  const r = await apiFetch('/api/v1/dimmers/lut', { method: 'PUT', body: lut });
  alert('lut status: ' + r.status);
};

// Command Center
document.getElementById('cmd-send').onclick = async () => {
  const input = document.getElementById('cmd-input');
  const out = document.getElementById('cmd-output');
  const bytes = new TextEncoder().encode(input.value);
  const r = await fetch(base + '/api/v1/shell', { method: 'POST', body: bytes });
  out.textContent += `\n>> ${input.value}\nstatus ${r.status}`;
  input.value = '';
};
