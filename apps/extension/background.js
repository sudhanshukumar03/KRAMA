// KRAMA OS Companion — background service worker
// Adds a right-click "Save selection to KRAMA OS" action that clips the
// highlighted text into the last-used workspace without opening the popup.

// API base defaults to production; overridable via chrome.storage (`krama_api_base`)
// so a dev build can point at http://localhost:3000/api/v1.
const DEFAULT_API_BASE = 'https://api.krama-os.com/api/v1';
let API_BASE = DEFAULT_API_BASE;
const MENU_ID = 'krama-clip-selection';

async function resolveApiBase() {
  try {
    const { krama_api_base } = await chrome.storage.local.get('krama_api_base');
    if (krama_api_base) API_BASE = krama_api_base;
  } catch {
    // storage unavailable; keep the production default
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Save selection to KRAMA OS',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && info.selectionText) {
    saveSelection(info.selectionText, tab);
  }
});

function buildDocContent(text, url) {
  const content = [];
  if (text) {
    // Preserve paragraph breaks so multi-paragraph selections don't collapse
    // into a single TipTap block.
    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    for (const p of paragraphs) {
      content.push({ type: 'paragraph', content: [{ type: 'text', text: p }] });
    }
  }
  if (url) content.push({ type: 'paragraph', content: [{ type: 'text', text: `Source: ${url}` }] });
  if (content.length === 0) content.push({ type: 'paragraph' });
  return { type: 'doc', content };
}

function flashBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
}

// Access tokens expire after ~15 min. The popup can refresh interactively, but
// the right-click clipper runs headless — so replay the stored refresh token
// (the SameSite=Strict cookie is never sent from chrome-extension://) to mint a
// fresh access token. Returns the new token, or null on failure.
async function tryRefresh() {
  try {
    const { krama_refresh } = await chrome.storage.local.get('krama_refresh');
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(krama_refresh ? { refreshToken: krama_refresh } : {}),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.accessToken) return null;
    const next = { krama_access: data.accessToken };
    if (data.refreshToken) next.krama_refresh = data.refreshToken; // rotated token
    await chrome.storage.local.set(next);
    return data.accessToken;
  } catch {
    return null;
  }
}

async function postDocument(accessToken, workspaceId, title, text, url) {
  return fetch(`${API_BASE}/documents`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'x-workspace-id': workspaceId,
    },
    body: JSON.stringify({ title, contentJson: buildDocContent(text, url) }),
  });
}

async function saveSelection(text, tab) {
  await resolveApiBase();
  const { krama_access, krama_last_workspace } = await chrome.storage.local.get([
    'krama_access',
    'krama_last_workspace',
  ]);

  // Requires a prior sign-in + workspace choice made through the popup.
  if (!krama_access || !krama_last_workspace) {
    flashBadge('!', '#ef4444');
    return;
  }

  const title = (tab?.title || 'Clipped note').slice(0, 120);
  try {
    let res = await postDocument(krama_access, krama_last_workspace, title, text, tab?.url);

    // Access token likely expired: refresh once and retry before giving up.
    if (res.status === 401) {
      const fresh = await tryRefresh();
      if (fresh) {
        res = await postDocument(fresh, krama_last_workspace, title, text, tab?.url);
      }
    }

    flashBadge(res.ok ? '✓' : '!', res.ok ? '#10b981' : '#ef4444');
  } catch {
    flashBadge('!', '#ef4444');
  }
}
