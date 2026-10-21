import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api/client';

/** Reference reads and editor-generated link events share the current document ID. */
export function useDocumentLinks(documentId: string) {
  // Fetch links for current document
  const { data: linksData, refetch: refetchLinks } = useQuery({
    queryKey: ['document-links', documentId],
    queryFn: () => api.documents.getLinks(documentId),
    enabled: !!documentId
  });

  // Listen for auto-link events from WikiLinks or @Mentions
  useEffect(() => {
    const handleEntityLinked = async (e: Event) => {
      const { targetType, targetId } = (e as CustomEvent<{ targetType?: string; targetId?: string }>).detail || {};
      if (targetType && targetId && documentId) {
        try {
          await api.documents.addLink(documentId, { targetType, targetId, linkType: 'REFERENCE' });
          refetchLinks();
        } catch {
          // Link may already exist
        }
      }
    };
    window.addEventListener('krama:entity-linked', handleEntityLinked);
    return () => window.removeEventListener('krama:entity-linked', handleEntityLinked);
  }, [documentId, refetchLinks]);

  return { linksData, refetchLinks };
}
