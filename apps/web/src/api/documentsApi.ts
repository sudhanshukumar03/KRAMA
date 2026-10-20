import type { JsonRequest, DocumentDownload, DocumentStream } from './request';
import type { IssueWithRelations, DocumentWithRelations, DocumentDetail, DocumentVersion, DocumentVersionSummary, DocumentMetadataInput, DocumentCreateInput, DocumentContentResult, DocumentSearchResult, DocumentGraph, Tag, EntityLink } from '../types/schema';

/** Domain contract behind the shared authenticated transport. */
export function createDocumentsApi(fetchApi: JsonRequest, downloadDocumentExport: DocumentDownload, streamDocumentAi: DocumentStream) {
  async function fetchDocumentPages(spaceId?: string, deleted = false) {
    const all: DocumentWithRelations[] = [];
    let cursor: string | null = null;
    do {
      const params = new URLSearchParams({ limit: '200' });
      if (spaceId && spaceId !== 'ALL') params.set('spaceId', spaceId);
      if (deleted) params.set('deleted', 'true');
      if (cursor) params.set('cursor', cursor);
      const page = await fetchApi<{ items: DocumentWithRelations[]; nextCursor: string | null }>(`/documents?${params.toString()}`);
      all.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return all;
  }
  return {
    list: (spaceId?: string) => fetchDocumentPages(spaceId, false),
    listDeleted: (spaceId?: string) => fetchDocumentPages(spaceId, true),
    get: (id: string) => fetchApi<DocumentDetail>(`/documents/${id}`),
    create: (data: DocumentCreateInput) => fetchApi<DocumentDetail>('/documents', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: DocumentMetadataInput) => fetchApi<DocumentDetail>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    updateContent: (id: string, contentJson: unknown, expectedUpdatedAt?: string) => fetchApi<DocumentContentResult>(`/documents/${id}/content`, { method: 'PATCH', body: JSON.stringify({ contentJson, expectedUpdatedAt }) }),
    delete: (id: string) => fetchApi<{ message: string }>(`/documents/${id}`, { method: 'DELETE' }),
    restore: async (id: string) => {
      await fetchApi<{ message: string }>(`/documents/${id}/restore`, { method: 'POST' });
      // Restore acknowledges the subtree operation; load the current root
      // before consumers reopen an editor from its detail cache.
      return fetchApi<DocumentDetail>(`/documents/${id}`);
    },
    purge: (id: string) => fetchApi<{ message: string }>(`/documents/${id}/permanent`, { method: 'DELETE' }),
    move: (id: string, data: { targetFolderId?: string | null; targetParentId?: string | null; expectedUpdatedAt?: string }) =>
      fetchApi<DocumentDetail>(`/documents/${id}/move`, { method: 'POST', body: JSON.stringify(data) }),
    duplicate: (id: string) => fetchApi<DocumentDetail>(`/documents/${id}/duplicate`, { method: 'POST' }),
    favorite: (id: string) => fetchApi<DocumentDetail>(`/documents/${id}/favorite`, { method: 'POST' }),
    importSpec: (data: { content: string; spaceId?: string; parentId?: string }) =>
      fetchApi<{ document: DocumentDetail; totalImported: number; message: string }>('/documents/import', { method: 'POST', body: JSON.stringify(data) }),
    getVersions: (id: string) => fetchApi<DocumentVersionSummary[]>(`/documents/${id}/versions`),
    createVersion: (id: string) => fetchApi<DocumentVersion>(`/documents/${id}/versions`, { method: 'POST' }),
    restoreVersion: (id: string, versionId: string) => fetchApi<DocumentDetail>(`/documents/${id}/versions/${versionId}/restore`, { method: 'POST' }),
    getTags: (workspaceId: string) => fetchApi<Tag[]>(`/workspaces/${workspaceId}/tags`),
    addTag: (id: string, tagName: string, color?: string) => fetchApi<Tag>(`/documents/${id}/tags`, { method: 'POST', body: JSON.stringify({ tagName, color }) }),
    removeTag: (id: string, tagId: string) => fetchApi<{ message: string }>(`/documents/${id}/tags/${tagId}`, { method: 'DELETE' }),
    getLinks: (id: string) => fetchApi<{ outgoing: EntityLink[]; incoming: EntityLink[] }>(`/documents/${id}/links`),
    addLink: (id: string, data: { targetType: string; targetId: string; linkType?: string }) => fetchApi<EntityLink>(`/documents/${id}/links`, { method: 'POST', body: JSON.stringify(data) }),
    removeLink: (linkId: string) => fetchApi<{ message: string }>(`/links/${linkId}`, { method: 'DELETE' }),
    createTask: (id: string, data: { title: string; priority?: string; status?: string; description?: string }) =>
      fetchApi<{ task: IssueWithRelations; link: EntityLink }>(`/documents/${id}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
    search: (workspaceId: string, q: string, filters?: { type?: string; projectId?: string; status?: string; tag?: string }, signal?: AbortSignal) => {
      const params = new URLSearchParams({ q });
      if (filters?.type && filters.type !== 'ALL') params.append('type', filters.type);
      if (filters?.projectId && filters.projectId !== 'ALL') params.append('projectId', filters.projectId);
      if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
      if (filters?.tag && filters.tag !== 'ALL') params.append('tag', filters.tag);
      return fetchApi<DocumentSearchResult[]>(`/workspaces/${workspaceId}/search?${params.toString()}`, { signal });
    },


    export: (id: string, format: 'md' | 'spec', filename?: string) => downloadDocumentExport(id, format, filename),
    getGraph: (workspaceId: string) => fetchApi<DocumentGraph>(`/workspaces/${workspaceId}/graph`),
    aiAsk: (id: string, question: string, onChunk: (text: string) => void, onDone: () => void, onError: (err: Error) => void, signal?: AbortSignal) =>
      streamDocumentAi(`/documents/${id}/ai/ask`, { question }, onChunk, onDone, onError, signal),
    aiCompose: (id: string, payload: { instruction: string; mode: 'write' | 'improve' | 'explain'; selection?: string }, onChunk: (text: string) => void, onDone: () => void, onError: (err: Error) => void, signal?: AbortSignal) =>
      streamDocumentAi(`/documents/${id}/ai/compose`, payload, onChunk, onDone, onError, signal),
    };
}
