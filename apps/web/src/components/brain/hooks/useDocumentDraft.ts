import { useState, useSyncExternalStore, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../api/client';
import type { DocumentWithRelations } from '../../../types/schema';
import { DocumentSaveQueue, acquireDocumentSaveQueue, retainDocumentSaveQueue } from '../../../lib/documentSaveQueue';

/** Body and metadata share a retained revision queue across editor remounts. */
export function useDocumentDraft(page: DocumentWithRelations) {
  const queryClient = useQueryClient();
  const { user, workspaceId } = useAuth();
  const draftKey = `krama:document-draft:v1:${user?.id}:${workspaceId}:${page.id}`;
  const [save] = useState(() => acquireDocumentSaveQueue(draftKey, () => new DocumentSaveQueue(page.id,
    { content: page.contentJson || { type: 'doc', content: [] }, title: page.title || '', revision: page.updatedAt },
    {
      update: async (id, metadata) => {
        const saved = await api.documents.update(id, metadata);
        queryClient.setQueryData<DocumentWithRelations>(['document', id], cached => cached ? { ...cached, ...saved } : saved);
        return saved;
      },
      updateContent: async (id, content, revision) => {
        const saved = await api.documents.updateContent(id, content, revision);
        // Publish only the acknowledged body; newer edits remain in the queue.
        // A remounted editor must not start from an old cached draft.
        queryClient.setQueryData<DocumentWithRelations>(['document', id], cached => cached ? {
          ...cached, ...saved, contentJson: content as DocumentWithRelations['contentJson'],
        } : cached);
        return saved;
      },
    }, draftKey, localStorage,
    () => {
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
      void queryClient.invalidateQueries({ queryKey: ['document', page.id] });
    })));
  const saveState = useSyncExternalStore(save.subscribe, save.getSnapshot);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (save.state !== 'saved') { event.preventDefault(); event.returnValue = ''; }
    };
    const release = retainDocumentSaveQueue(draftKey, save);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => { window.removeEventListener('beforeunload', onBeforeUnload); release(); };
  }, [save, draftKey]);

  return { save, saveState };
}
