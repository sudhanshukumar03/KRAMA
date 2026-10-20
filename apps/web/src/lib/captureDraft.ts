export type CaptureMode = 'task' | 'note' | 'idea' | 'link';
export interface CaptureDraft { title: string; content: string }

export function captureDraftKey(userId: string, workspaceId: string, day?: string) {
  return `krama.capture.v1.${userId}.${workspaceId}.${day || 'inbox'}`;
}

function parseCaptureDrafts(raw: string | null): Partial<Record<CaptureMode, CaptureDraft>> {
  try {
    const value = JSON.parse(raw || '{}');
    const drafts: Partial<Record<CaptureMode, CaptureDraft>> = {};
    for (const mode of ['task', 'note', 'idea', 'link'] as const) {
      if (typeof value?.[mode]?.title === 'string' && typeof value?.[mode]?.content === 'string') drafts[mode] = value[mode];
    }
    return drafts;
  } catch { return {}; }
}

export function readCaptureDrafts(key: string): Partial<Record<CaptureMode, CaptureDraft>> {
  // A tab owns its working copy. The shared checkpoint can recover a draft in a
  // fresh tab, but another tab's later edits must not replace this tab's text.
  try { const own = sessionStorage.getItem(key); if (own !== null) return parseCaptureDrafts(own); } catch {}
  try { return parseCaptureDrafts(localStorage.getItem(key)); } catch { return {}; }
}

export function writeCaptureDraft(key: string, mode: CaptureMode, draft: CaptureDraft | null, expected?: CaptureDraft) {
  let persisted = true;
  const own = readCaptureDrafts(key);
  const previous = expected || own[mode];
  if (draft && (draft.title || draft.content)) own[mode] = draft;
  else delete own[mode];
  // An empty tab copy is deliberate: saving/discarding must not resurrect a
  // shared draft that belongs to another tab when this dialog opens again.
  try { sessionStorage.setItem(key, JSON.stringify(own)); } catch { persisted = false; }
  try {
    const drafts = parseCaptureDrafts(localStorage.getItem(key));
    if (draft && (draft.title || draft.content)) drafts[mode] = draft;
    else if (drafts[mode]?.title === previous?.title && drafts[mode]?.content === previous?.content) delete drafts[mode];
    if (Object.keys(drafts).length) localStorage.setItem(key, JSON.stringify(drafts));
    else localStorage.removeItem(key);
  } catch { persisted = false; }
  return persisted;
}
