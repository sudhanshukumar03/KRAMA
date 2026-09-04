const API_BASE = 'http://localhost:3000/api/v1';

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
        document.getElementById('logoutBtn').click();
      }
    } catch (e) {
      document.getElementById('logoutBtn').click();
    }
  } else if (res.status === 401) {
    document.getElementById('logoutBtn').click();
  }
  
  return res;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
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
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    clipTitle.value = tab.title || '';
    const url = tab.url;
    clipText.value = url + '\n\n';

    chrome.tabs.sendMessage(tab.id, { action: 'getSelection' }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response && response.selection) {
        clipText.value = url + '\n\n> ' + response.selection.replace(/\n/g, '\n> ') + '\n\n';
      }
    });
  });
});

function showMessage(el, text, type) {
  el.textContent = text;
  el.className = 'message ' + type;
  setTimeout(() => {
    el.className = 'message hidden';
  }, 3000);
}

loginBtn.addEventListener('click', async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
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
    showMessage(authMessage, 'Network error. Backend might be down.', 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Connect to KRAMA OS';
  }
});

logoutBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove(['accessToken', 'refreshToken']);
  currentRefreshToken = null;
  currentToken = null;
  authView.classList.add('active');
  appView.classList.remove('active');
  logoutBtn.classList.add('hidden');
});

async function showApp() {
  authView.classList.remove('active');
  appView.classList.add('active');
  logoutBtn.classList.remove('hidden');
  
  // Load workspaces using apiFetch (auto-refresh enabled)
  try {
    const res = await apiFetch('/workspaces');
    if (!res || !res.ok) return; // 401s handled by apiFetch -> logout
    
    const workspaces = await res.json();
    clipWorkspace.innerHTML = '';
    taskWorkspace.innerHTML = '';
    workspaces.forEach(w => {
      clipWorkspace.add(new Option(w.name, w.id));
      taskWorkspace.add(new Option(w.name, w.id));
    });
  } catch(e) {
    console.error(e);
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
  if (!taskTitle.value) return showMessage(taskMessage, 'Task title required', 'error');
  
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
        title: taskTitle.value,
        priority: taskPriority.value,
        status: 'TODO'
      })
    });
    
    if (res && res.ok) {
      showMessage(taskMessage, 'Added to Kanban!', 'success');
      taskTitle.value = '';
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
