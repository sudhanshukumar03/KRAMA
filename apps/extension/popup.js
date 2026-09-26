// KRAMA OS Companion — popup controller
// Handles auth, workspace selection, web clipping, and quick-task capture.

// API base defaults to production; overridable via chrome.storage (`krama_api_base`)
// so a dev build can point at http://localhost:3000/api/v1.
const DEFAULT_API_BASE = 'https://api.krama-os.com/api/v1';
let API_BASE = DEFAULT_API_BASE;

const $ = (id) => document.getElementById(id);

let accessToken = null;
let pageUrl = '';

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------
const store = {
  get: (keys) => chrome.storage.local.get(keys),
  set: (obj) => chrome.storage.local.set(obj),
  remove: (keys) => chrome.storage.local.remove(keys),
};

// Point at a dev server by setting `krama_api_base` in chrome.storage.local.
async function resolveApiBase() {
  try {
    const { krama_api_base } = await store.get('krama_api_base');
    if (krama_api_base) API_BASE = krama_api_base;
  } catch {
    // storage unavailable; keep the production default
  }
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function showMessage(el, text, type) {
  el.textContent = text;
  el.className = `message ${type}`;
}

function clearMessage(el) {
  el.textContent = '';
  el.className = 'message';
}

function setView(id) {
  document.querySelectorAll('#appView > .view').forEach((v) => v.classList.remove('active'));
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  $(id).classList.add('active');
  document.querySelector(`.tab[data-target="${id}"]`)?.classList.add('active');
}

// ---------------------------------------------------------------------------
// API layer (adds auth + workspace headers, refreshes once on 401)
// ---------------------------------------------------------------------------
async function apiFetch(path, { method = 'GET', body, workspaceId } = {}, allowRetry = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  if (workspaceId) headers['x-workspace-id'] = workspaceId;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body,
  });

  if (res.status === 401 && allowRetry && (await tryRefresh())) {
    return apiFetch(path, { method, body, workspaceId }, false);
  }
  return res;
}

async function tryRefresh() {
  try {
    // The httpOnly refresh cookie is SameSite=Strict and never sent from a
    // chrome-extension:// origin, so replay the stored refresh token in the body.
    const { krama_refresh } = await store.get('krama_refresh');
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(krama_refresh ? { refreshToken: krama_refresh } : {}),
    });
    if (!res.ok) return false;
    const data = await res.json();
    accessToken = data.accessToken;
    const next = { krama_access: accessToken };
    if (data.refreshToken) next.krama_refresh = data.refreshToken; // rotated token
    await store.set(next);
    return true;
  } catch {
    return false;
  }
}
// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
async function login() {
  const email = $('email').value.trim();
  const password = $('password').value;
  const msg = $('authMessage');
  if (!email || !password) {
    showMessage(msg, 'Enter your email and password.', 'error');
    return;
  }
  const btn = $('loginBtn');
  btn.disabled = true;
  clearMessage(msg);
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showMessage(msg, data.message || 'Login failed.', 'error');
      return;
    }
    const data = await res.json();
    accessToken = data.accessToken;
    const next = { krama_access: accessToken };
    if (data.refreshToken) next.krama_refresh = data.refreshToken;
    await store.set(next);
    await enterApp();
  } catch {
    showMessage(msg, 'Cannot reach KRAMA OS server.', 'error');
  } finally {
    btn.disabled = false;
  }
}

async function logout() {
  try {
    // The refresh cookie is SameSite=Strict and never sent from a
    // chrome-extension:// origin, so replay the stored token in the body,
    // otherwise the server never revokes the session.
    const { krama_refresh } = await store.get('krama_refresh');
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(krama_refresh ? { refreshToken: krama_refresh } : {}),
    });
  } catch {
    // best-effort; clear local state regardless
  }
  accessToken = null;
  await store.remove(['krama_access', 'krama_refresh', 'krama_last_workspace']);
  $('logoutBtn').classList.add('hidden');
  $('appView').classList.remove('active');
  $('authView').classList.add('active');
  $('password').value = '';
}

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------
async function loadWorkspaces() {
  const res = await apiFetch('/workspaces');
  if (!res.ok) return;
  const workspaces = await res.json();
  const { krama_last_workspace } = await store.get('krama_last_workspace');
  const options = workspaces
    .map((w) => `<option value="${w.id}">${w.name}</option>`)
    .join('');

  // Default the selection to the remembered workspace, else the first one — and
  // persist it, so the right-click clipper (which reads krama_last_workspace in
  // the background worker) works even before the user touches the dropdown.
  const validRemembered =
    krama_last_workspace && workspaces.some((w) => w.id === krama_last_workspace);
  const activeId = validRemembered ? krama_last_workspace : workspaces[0]?.id;

  for (const sel of [$('clipWorkspace'), $('taskWorkspace')]) {
    sel.innerHTML = options;
    if (activeId) sel.value = activeId;
  }

  if (!validRemembered && activeId) rememberWorkspace(activeId);
}

function rememberWorkspace(id) {
  if (id) store.set({ krama_last_workspace: id });
}

// ---------------------------------------------------------------------------
// Page context + content building
// ---------------------------------------------------------------------------
async function prefillClip() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    pageUrl = tab?.url || '';
    $('clipTitle').value = tab?.title || '';
    if (!tab?.id) return;
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => String(window.getSelection ? window.getSelection() : ''),
    });
    if (injection?.result) $('clipText').value = injection.result;
  } catch {
    // activeTab may be a restricted page (chrome://, store); ignore.
  }
}

function buildDocContent(text, url) {
  const content = [];
  if (text) {
    // Preserve paragraph breaks so multi-paragraph clips don't collapse into a
    // single TipTap block.
    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    for (const p of paragraphs) {
      content.push({ type: 'paragraph', content: [{ type: 'text', text: p }] });
    }
  }
  if (url) content.push({ type: 'paragraph', content: [{ type: 'text', text: `Source: ${url}` }] });
  if (content.length === 0) content.push({ type: 'paragraph' });
  return { type: 'doc', content };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
async function saveClip() {
  const workspaceId = $('clipWorkspace').value;
  const title = $('clipTitle').value.trim();
  const text = $('clipText').value.trim();
  const msg = $('clipMessage');
  if (!workspaceId) return showMessage(msg, 'Select a workspace.', 'error');
  if (!title) return showMessage(msg, 'Add a title.', 'error');

  const btn = $('clipBtn');
  btn.disabled = true;
  clearMessage(msg);
  try {
    const res = await apiFetch('/documents', {
      method: 'POST',
      workspaceId,
      body: JSON.stringify({ title, contentJson: buildDocContent(text, pageUrl) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showMessage(msg, data.message || 'Could not save.', 'error');
      return;
    }
    rememberWorkspace(workspaceId);
    showMessage(msg, 'Saved to your Brain Workspace.', 'success');
    $('clipText').value = '';
  } catch {
    showMessage(msg, 'Cannot reach KRAMA OS server.', 'error');
  } finally {
    btn.disabled = false;
  }
}

async function createTask() {
  const workspaceId = $('taskWorkspace').value;
  const title = $('taskTitle').value.trim();
  const priority = $('taskPriority').value;
  const msg = $('taskMessage');
  if (!workspaceId) return showMessage(msg, 'Select a workspace.', 'error');
  if (!title) return showMessage(msg, 'Add a task title.', 'error');

  const btn = $('taskBtn');
  btn.disabled = true;
  clearMessage(msg);
  try {
    const res = await apiFetch('/tasks', {
      method: 'POST',
      workspaceId,
      body: JSON.stringify({ title, priority }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showMessage(msg, data.message || 'Could not create task.', 'error');
      return;
    }
    rememberWorkspace(workspaceId);
    showMessage(msg, 'Added to your Kanban board.', 'success');
    $('taskTitle').value = '';
  } catch {
    showMessage(msg, 'Cannot reach KRAMA OS server.', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
async function enterApp() {
  $('authView').classList.remove('active');
  $('appView').classList.add('active');
  $('logoutBtn').classList.remove('hidden');
  setView('clipperView');
  await loadWorkspaces();
  await prefillClip();
}

function wireEvents() {
  $('loginBtn').addEventListener('click', login);
  $('password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') login();
  });
  $('logoutBtn').addEventListener('click', logout);
  $('clipBtn').addEventListener('click', saveClip);
  $('taskBtn').addEventListener('click', createTask);
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => setView(tab.dataset.target));
  });
  $('clipWorkspace').addEventListener('change', (e) => rememberWorkspace(e.target.value));
  $('taskWorkspace').addEventListener('change', (e) => rememberWorkspace(e.target.value));
}

async function init() {
  await resolveApiBase();
  wireEvents();
  const { krama_access } = await store.get('krama_access');
  accessToken = krama_access || null;
  if (accessToken) {
    const res = await apiFetch('/auth/me');
    if (res.ok) {
      await enterApp();
      return;
    }
    accessToken = null;
    await store.remove(['krama_access', 'krama_refresh']);
  }
}

document.addEventListener('DOMContentLoaded', init);

