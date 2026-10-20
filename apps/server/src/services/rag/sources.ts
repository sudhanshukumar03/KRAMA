export interface RetrievedSource {
  pageId: string;
  title: string;
  chunkId?: string;
}

/** Model output may select retrieved evidence, but cannot mint IDs or titles. */
export function groundSources(proposed: readonly RetrievedSource[], retrieved: readonly RetrievedSource[]): RetrievedSource[] {
  const selected: RetrievedSource[] = [];
  const pages = new Set<string>();
  for (const source of proposed) {
    const canonical = retrieved.find(item => item.pageId === source.pageId && (!source.chunkId || item.chunkId === source.chunkId));
    if (canonical && !pages.has(canonical.pageId)) {
      selected.push(canonical); pages.add(canonical.pageId);
      if (selected.length === 3) break;
    }
  }
  if (selected.length) return selected;
  for (const source of retrieved) if (!pages.has(source.pageId)) {
    selected.push(source); pages.add(source.pageId);
    if (selected.length === 3) break;
  }
  return selected;
}
