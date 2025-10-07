// File management functionality
async function listFiles() {
  const p = document.getElementById('files-path').value || '';
  const r = await apiFetch('/api/v1/fs/list?path=' + encodeURIComponent(p));
  const rows = await r.json();
  const tbody = document.querySelector('#files-table tbody');
  tbody.innerHTML = '';
  for (const row of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.name}</td><td>${row.kind}</td><td>${row.size}</td><td></td>`;
    const actions = tr.children[3];
    const btnOpen = document.createElement('button'); btnOpen.textContent = 'Open'; btnOpen.onclick = async () => {
      if (row.kind === 'dir') { document.getElementById('files-path').value = (p ? p + '/' : '') + row.name; listFiles(); return; }
      const rp = (p ? p + '/' : '') + row.name;
      const rr = await apiFetch('/api/v1/fs/read?path=' + encodeURIComponent(rp));
      const buf = new Uint8Array(await rr.arrayBuffer());
      document.getElementById('files-newname').value = row.name;
      document.getElementById('files-content').value = new TextDecoder().decode(buf);
    };
    const btnDel = document.createElement('button'); btnDel.textContent = 'Delete'; btnDel.onclick = async () => {
      const rp = (p ? p + '/' : '') + row.name;
      await apiFetch('/api/v1/fs/delete?path=' + encodeURIComponent(rp), { method: 'DELETE' });
      listFiles();
    };
    actions.appendChild(btnOpen); actions.appendChild(btnDel);
    tbody.appendChild(tr);
  }
}

document.getElementById('files-list').onclick = listFiles;

document.getElementById('files-mkdir').onclick = async () => {
  const p = document.getElementById('files-path').value || '';
  const name = prompt('Folder name'); if (!name) return;
  const rp = (p ? p + '/' : '') + name;
  await apiFetch('/api/v1/fs/mkdir?path=' + encodeURIComponent(rp), { method: 'POST' });
  listFiles();
};

document.getElementById('files-save').onclick = async () => {
  const p = document.getElementById('files-path').value || '';
  const name = document.getElementById('files-newname').value || 'new.txt';
  const content = document.getElementById('files-content').value || '';
  const rp = (p ? p + '/' : '') + name;
  await apiFetch('/api/v1/fs/write?path=' + encodeURIComponent(rp), { method: 'PUT', body: new TextEncoder().encode(content) });
  listFiles();
};
