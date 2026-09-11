// --- Configurable API Base ---
const DEV_API = 'http://localhost:3000/api/v1';
const PROD_API = 'https://api.krama-os.com/api/v1';

let API_BASE = DEV_API;

async function initApiBase() {
  const { apiBase } = await chrome.storage.local.get('apiBase');
  API_BASE = apiBase || DEV_API;
}

// DOM Elements
const authView = document.getElementById('authView');
const appView = document.getElementById('appView');
const logoutBtn = document.getElementById('logoutBtn');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const authMessage = document.getElementById('authMessage');

const clipWorkspace = document.getElementById('clipWorkspace');
const clipTitle = document.getElementById('clipTitle');
const clipText = document.getElementById('clipText');
const clipBtn = document.getElementById('clipBtn');
const clipMessage = document.getElementById('clipMessage');

const taskWorkspace = document.getElementById('taskWorkspace');
const taskTitle = document.getElementById('taskTitle');
const taskPriority = document.getElementById('taskPriority');
const taskBtn = document.getElementById('taskBtn');
const taskMessage = document.getElementById('taskMessage');

const tabs = document.querySelectorAll('.tab');
const views = {
  clipperView: document.getElementById('clipperView'),
  taskView: document.getElementById('taskView')
};

// State
let currentToken = null;
let currentRefreshToken = null;

// --- API Wrapper with Automatic JWT Refresh ---
async function apiFetch(endpoint, options = {}) {
  if (!options.headers) options.headers = {};
  if (currentToken) options.headers['Authorization'] = `Bearer ${currentToken}`;

  let res = await fetch(`${API_BASE}${endpoint}`, options);
  
  // 1 retry only (no loops)
  if (res.status === 401 && currentRefreshToken) {
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefreshToken })
      });
      
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        currentToken = data.accessToken;
        currentRefreshToken = data.refreshToken || currentRefreshToken;
        
        await chrome.storage.local.set({ 
          accessToken: currentToken,
          refreshToken: currentRefreshToken 
        });
        
        // Retry original request ONCE
        options.headers['Authorization'] = `Bearer ${currentToken}`;
        res = await fetch(`${API_BASE}${endpoint}`, options);
      } else {
        // Refresh failed, bail
        handleLogout();
      }
    } catch (e) {
      handleLogout();
    }
  } else if (res.status === 401) {
    handleLogout();
  }
  
  return res;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Init configurable API base
  await initApiBase();

  // Load BOTH tokens on startup
  const result = await chrome.storage.local.get(['accessToken', 'refreshToken']);
  if (result.accessToken) {
    currentToken = result.accessToken;
    currentRefreshToken = result.refreshToken || null;
    showApp();
  }

  // Setup tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      Object.values(views).forEach(v => v.classList.remove('active'));
      tab.classList.add('active');
      views[tab.dataset.target].classList.add('active');
    });
  });

  // Fetch page info for clipper
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      clipTitle.value = activeTab.title || '';
      const url = activeTab.url || '';
      clipText.value = url + '\n\n';

      // Try to get selected text from the page
      if (activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { action: 'getSelection' }, (response) => {
          if (chrome.runtime.lastError) return;
          if (response && response.selection) {
            clipText.value = url + '\n\n> ' + response.selection.replace(/\n/g, '\n> ') + '\n\n';
          }
        });
      }
    }
  } catch (e) {
    // Tab query failed — might be on a restricted page
    console.warn('Could not query active tab:', e);
  }
});

function showMessage(el, text, type) {
  el.textContent = text;
  el.className = 'message ' + type;
  setTimeout(() => {
    el.textContent = '';
    el.className = 'message';
  }, 3000);
}

loginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Input validation
  if (!email || !password) {
    return showMessage(authMessage, 'Email and password are required', 'error');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showMessage(authMessage, 'Please enter a valid email', 'error');
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Connecting...';
  
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    
    if (res.ok && data.accessToken) {
      await chrome.storage.local.set({ 
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      });
      currentToken = data.accessToken;
      currentRefreshToken = data.refreshToken;
      showApp();
    } else {
      showMessage(authMessage, data.message || 'Login failed', 'error');
    }
  } catch (err) {
    showMessage(authMessage, 'Network error. Is the backend running?', 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Connect to KRAMA OS';
  }
});

function handleLogout() {
  chrome.storage.local.remove(['accessToken', 'refreshToken']);
  currentRefreshToken = null;
  currentToken = null;
  authView.classList.add('active');
  appView.classList.remove('active');
  logoutBtn.classList.add('hidden');
}

logoutBtn.addEventListener('click', handleLogout);

async function showApp() {
  authView.classList.remove('active');
  appView.classList.add('active');
  logoutBtn.classList.remove('hidden');
  
  // Show loading state
  clipWorkspace.innerHTML = '<option disabled>Loading...</option>';
  taskWorkspace.innerHTML = '<option disabled>Loading...</option>';

  // Load workspaces using apiFetch (auto-refresh enabled)
  try {
    const res = await apiFetch('/workspaces');
    if (!res || !res.ok) return; // 401s handled by apiFetch -> logout
    
    const workspaces = await res.json();
    clipWorkspace.innerHTML = '';
    taskWorkspace.innerHTML = '';

    if (workspaces.length === 0) {
      clipWorkspace.add(new Option('No workspaces found', ''));
      taskWorkspace.add(new Option('No workspaces found', ''));
      return;
    }

    workspaces.forEach(w => {
      clipWorkspace.add(new Option(w.name, w.id));
      taskWorkspace.add(new Option(w.name, w.id));
    });
  } catch(e) {
    clipWorkspace.innerHTML = '<option disabled>Failed to load</option>';
    taskWorkspace.innerHTML = '<option disabled>Failed to load</option>';
    console.error('Failed to load workspaces:', e);
  }
}

clipBtn.addEventListener('click', async () => {
  const workspaceId = clipWorkspace.value;
  if (!workspaceId) return showMessage(clipMessage, 'No workspace selected', 'error');
  
  clipBtn.disabled = true;
  clipBtn.textContent = 'Saving...';
  
  try {
    // Uses apiFetch wrapper
    const res = await apiFetch('/pages', {
      method: 'POST',
      headers: { 
        'x-workspace-id': workspaceId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: clipTitle.value || 'Clipped Note',
        content: clipText.value
      })
    });
    
    if (res && res.ok) {
      showMessage(clipMessage, 'Saved to Brain Workspace!', 'success');
      setTimeout(() => window.close(), 1500);
    } else {
      showMessage(clipMessage, 'Failed to save', 'error');
    }
  } catch(e) {
    showMessage(clipMessage, 'Network error', 'error');
  } finally {
    clipBtn.disabled = false;
    clipBtn.textContent = 'Save to Brain Workspace';
  }
});

taskBtn.addEventListener('click', async () => {
  const workspaceId = taskWorkspace.value;
  if (!workspaceId) return showMessage(taskMessage, 'No workspace selected', 'error');
  if (!taskTitle.value.trim()) return showMessage(taskMessage, 'Task title required', 'error');
  
  taskBtn.disabled = true;
  taskBtn.textContent = 'Adding...';
  
  try {
    // Uses apiFetch wrapper
    const res = await apiFetch('/tasks', {
      method: 'POST',
      headers: { 
        'x-workspace-id': workspaceId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: taskTitle.value.trim(),
        priority: taskPriority.value,
        status: 'TODO'
      })
    });
    
    if (res && res.ok) {
      showMessage(taskMessage, 'Added to Kanban!', 'success');
      taskTitle.value = '';
      setTimeout(() => window.close(), 1500);
    } else {
      showMessage(taskMessage, 'Failed to add task', 'error');
    }
  } catch(e) {
    showMessage(taskMessage, 'Network error', 'error');
  } finally {
    taskBtn.disabled = false;
    taskBtn.textContent = 'Add to Kanban';
  }
});
