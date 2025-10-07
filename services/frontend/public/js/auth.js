// Authentication functionality
document.getElementById('auth-login').onclick = async () => {
  const username = document.getElementById('auth-username').value;
  const password = document.getElementById('auth-password').value;
  const r = await fetch(base + '/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) });
  const out = document.getElementById('auth-status');
  if (r.ok) { const j = await r.json(); authToken = j.token; localStorage.setItem('ionxe_token', authToken); out.textContent = 'Logged in'; }
  else { out.textContent = 'Login failed'; }
};
