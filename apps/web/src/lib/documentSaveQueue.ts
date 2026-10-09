import type { DocumentMetadataInput } from '../types/schema';

export type SaveState = 'saved' | 'unsaved' | 'saving' | 'error' | 'conflict';
type Draft = { content: unknown; title: string; revision?: string };
type SaveApi = {
  update: (id: string, metadata: DocumentMetadataInput) => Promise<{ updatedAt?: string }>;
  updateContent: (id: string, content: unknown, revision?: string) => Promise<{ updatedAt?: string }>;
};

// One queue per mounted document: title/metadata and body writes must share
// the same revision and never race each other. Failed drafts survive remounts.
export class DocumentSaveQueue {
  state: SaveState = 'saved';
  content: unknown;
  title: string;
  revision?: string;
  recovered = false;
  private bodyDirty = false;
  private titleDirty = false;
  private generation = 0;
  private tail: Promise<unknown> = Promise.resolve();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private listeners = new Set<() => void>();
  constructor(private id: string, initial: Draft, private api: SaveApi, private key: string, private storage?: Storage, private onSaved?: () => void) {
    this.content = initial.content; this.title = initial.title; this.revision = initial.revision;
    try {
      const raw = storage?.getItem(key);
      if (raw) {
        const draft = JSON.parse(raw) as Draft;
        if (typeof draft.title === 'string' && draft.content && typeof draft.content === 'object' &&
          'type' in draft.content && draft.content.type === 'doc') {
          this.content = draft.content; this.title = draft.title; this.revision = draft.revision;
          this.bodyDirty = this.titleDirty = this.recovered = true; this.state = 'unsaved';
        }
      }
    } catch { /* Storage can be disabled or full; editing still works. */ }
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.state;
  whenIdle = () => this.tail;
  private emit(state: SaveState) { this.state = state; this.listeners.forEach(fn => fn()); }
  private persist() {
    try { this.storage?.setItem(this.key, JSON.stringify({ content: this.content, title: this.title, revision: this.revision })); } catch { /* Best effort draft storage. */ }
  }
  private schedule() {
    this.generation++; this.persist();
    if (this.state !== 'conflict') this.emit('unsaved');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = undefined; void this.flush().catch(() => {}); }, 500);
  }
  setContent(content: unknown) { this.content = content; this.bodyDirty = true; this.schedule(); }
  setTitle(title: string) { this.title = title; this.titleDirty = true; this.schedule(); }
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.tail.then(async () => {
      if (this.state === 'conflict') throw new Error('Resolve the document conflict before saving.');
      this.emit('saving');
      try { return await operation(); }
      catch (error) {
        const conflict = error && typeof error === 'object' && 'status' in error && error.status === 409;
        this.persist(); this.emit(conflict ? 'conflict' : 'error'); throw error;
      }
    });
    this.tail = next.catch(() => {});
    return next;
  }
  updateMetadata(metadata: DocumentMetadataInput) {
    return this.enqueue(async () => {
      const result = await this.api.update(this.id, { ...metadata, expectedUpdatedAt: this.revision });
      if (result?.updatedAt) this.revision = result.updatedAt;
      if (this.bodyDirty || this.titleDirty) { this.persist(); this.emit('unsaved'); }
      else this.emit('saved');
      this.onSaved?.(); return result;
    });
  }
  flush() {
    clearTimeout(this.timer); this.timer = undefined;
    return this.enqueue(async () => {
      const generation = this.generation;
      const title = this.title;
      const content = this.content;
      const saveTitle = this.titleDirty;
      const saveBody = this.bodyDirty;
      if (saveTitle) {
        const result = await this.api.update(this.id, { title, expectedUpdatedAt: this.revision });
        if (result?.updatedAt) this.revision = result.updatedAt;
        if (this.title === title) this.titleDirty = false;
      }
      if (saveBody) {
        const result = await this.api.updateContent(this.id, content, this.revision);
        if (result?.updatedAt) this.revision = result.updatedAt;
        if (generation === this.generation) this.bodyDirty = false;
      }
      if (!this.bodyDirty && !this.titleDirty) {
        try { this.storage?.removeItem(this.key); } catch { /* Best effort. */ }
        this.emit('saved');
      } else { this.persist(); this.emit('unsaved'); }
      if (saveTitle || saveBody) this.onSaved?.();
    });
  }
  async replaceFromServer(draft: Draft) {
    clearTimeout(this.timer); this.timer = undefined;
    await this.tail;
    this.content = draft.content; this.title = draft.title; this.revision = draft.revision;
    this.bodyDirty = this.titleDirty = false;
    try { this.storage?.removeItem(this.key); } catch { /* Best effort. */ }
    this.emit('saved');
  }
  dispose() { clearTimeout(this.timer); this.timer = undefined; if (this.bodyDirty || this.titleDirty) void this.flush().catch(() => {}); }
}

// Keep a departing editor's queue available while its final save is pending.
// Returning to that document must not start a second writer with a stale token.
const departing = new Map<string, { queue: DocumentSaveQueue; active: boolean }>();
export function acquireDocumentSaveQueue(key: string, create: () => DocumentSaveQueue) {
  return departing.get(key)?.queue || create();
}
export function retainDocumentSaveQueue(key: string, queue: DocumentSaveQueue) {
  departing.set(key, { queue, active: true });
  return () => {
    departing.set(key, { queue, active: false });
    queue.dispose();
    void queue.whenIdle().then(() => {
      const entry = departing.get(key);
      if (entry?.queue === queue && !entry.active && queue.state === 'saved') departing.delete(key);
    });
  };
}
