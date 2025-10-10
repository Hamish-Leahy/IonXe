// Legacy compatibility - these will be replaced by the modular system
// This file now serves as a compatibility layer and initialization point

// Legacy compatibility functions
const faderRanges = [];
const faderBanks = [];

// These functions are now handled by the modular system
// Keeping them for backward compatibility
function renderFaders() {
  // This is now handled by IonXeFaders module
  if (window.ionxe && window.ionxe.core.getModule('faders')) {
    window.ionxe.core.getModule('faders').renderFaders();
  }
}

function renderBankView() {
  // This is now handled by IonXeFaders module
  if (window.ionxe && window.ionxe.core.getModule('faders')) {
    window.ionxe.core.getModule('faders').renderBankView();
  }
}

// Legacy compatibility - most functionality moved to modular system
// This file maintains backward compatibility for existing code

// Global variables for legacy compatibility
const base = '';
let authToken = localStorage.getItem('ionxe_token') || '';
const faderValues = new Uint8Array(512);
let page = 0;
let currentBank = 0;
let flushPending = false;
let polling = false;

// Legacy API function
async function apiFetch(path, init={}) {
  const headers = init.headers || {};
  if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
  init.headers = headers;
  return fetch(base + path, init);
}

// Legacy functions for backward compatibility
function applyGrandMaster(v) {
  if (window.ionxe && window.ionxe.state) {
    return window.ionxe.state.applyGrandMaster(v);
  }
  return v;
}

function scheduleFlush() {
  if (window.ionxe && window.ionxe.core.getModule('faders')) {
    window.ionxe.core.getModule('faders').scheduleFlush();
  }
}

// Legacy health check
document.getElementById('btn-health').onclick = async () => {
  if (window.ionxe && window.ionxe.core.getModule('faders')) {
    window.ionxe.core.getModule('faders').checkHealth();
  }
};

// Legacy frame and LUT functions
document.getElementById('get-frame').onclick = async () => {
  try {
    const r = await apiFetch('/api/v1/dimmers/frame');
    const b = new Uint8Array(await r.arrayBuffer());
    document.getElementById('frame-len').textContent = '' + b.length + ' bytes';
  } catch (error) {
    console.error('Frame fetch error:', error);
  }
};

document.getElementById('random-lut').onclick = async () => {
  try {
    const lut = new Uint8Array(256);
    crypto.getRandomValues(lut);
    const r = await apiFetch('/api/v1/dimmers/lut', { method: 'PUT', body: lut });
    alert('lut status: ' + r.status);
  } catch (error) {
    console.error('LUT error:', error);
  }
};

// Magic sheet functionality - moved to magic.js module
// This is now handled by the IonXeMagic module

// Grand master, paging, and polling - now handled by modular system
// These functions are maintained for backward compatibility

// Scenes API - moved to scenes.js module
// These functions are maintained for backward compatibility

// Export/Import scenes - moved to scenes.js module
// These functions are maintained for backward compatibility

// Command Center - moved to console.js module
// This function is maintained for backward compatibility

// File Manager - moved to files.js module
// These functions are maintained for backward compatibility

// Button functionality - moved to buttons.js module
// These functions are maintained for backward compatibility

// Macro system functions - moved to macros.js module
// These functions are maintained for backward compatibility


