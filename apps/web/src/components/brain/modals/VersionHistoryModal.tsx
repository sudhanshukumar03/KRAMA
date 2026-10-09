import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { History, X } from 'lucide-react';
import { api } from '../../../api/client';
import type { DocumentDetail } from '../../../types/schema';
import { BaseButton } from '../../ui/BaseButton';
import { useModalA11y } from '../../../hooks/useModalA11y';
import { toast } from 'sonner';

export interface VersionHistoryModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess: (restoredDoc?: DocumentDetail) => void | Promise<void>;
  beforeAction?: () => Promise<unknown>;
}

export function VersionHistoryModal({
  documentId,
  isOpen,
  onClose,
  onRestoreSuccess,
  beforeAction
}: VersionHistoryModalProps) {
  const queryClient = useQueryClient();
  const { data: versions = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: () => api.documents.getVersions(documentId),
    enabled: isOpen
  });

  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [isSavingSnapshot, setIsSavingSnapshot] = useState(false);

  const modalRef = useModalA11y(isOpen, onClose);

  const handleManualSave = async () => {
    setIsSavingSnapshot(true);
    try {
      await beforeAction?.();
      await api.documents.createVersion(documentId);
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] });
      toast.success('Snapshot created manually');
    } catch {
      toast.error('Failed to create version snapshot');
    } finally { setIsSavingSnapshot(false); }
  };

  const handleRestore = async (versionId: string) => {
    setRestoringId(versionId);
    try {
      await beforeAction?.();
      const restoredDoc = await api.documents.restoreVersion(documentId, versionId);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] });
      toast.success('Restored document to selected snapshot');
      await onRestoreSuccess(restoredDoc);
      onClose();
    } catch {
      toast.error('Failed to restore version snapshot');
    } finally {
      setRestoringId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-history-title"
        className="krama-dialog w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans"
      >
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-accent-fg" />
            <span id="version-history-title" className="font-bold text-primary text-body">Version Snapshots</span>
          </div>
          <div className="flex items-center gap-2">
            <BaseButton disabled={isSavingSnapshot || restoringId !== null} isLoading={isSavingSnapshot} onClick={handleManualSave} className="text-caption py-1 px-2.5">
              Snapshot Now
            </BaseButton>
            <button aria-label="Close version history" onClick={onClose} className="p-1 text-muted hover:text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto space-y-2">
          {isLoading && <div className="py-8 text-center text-muted font-mono text-caption">Loading snapshots...</div>}
          {!isLoading && !isError && versions.length === 0 && (
            <div className="py-8 text-center text-secondary font-mono text-caption">
              No version snapshots recorded yet. Auto-snapshots fire after 50 mutations or 5 minutes of idle writing.
            </div>
          )}

          {isError && <div role="alert" className="py-4 text-center text-secondary text-caption">
            Could not load version history. <BaseButton onClick={() => void refetch()}>Try again</BaseButton>
          </div>}

          {versions.map((v) => (
            <div
              key={v.id}
              className="p-3 rounded-xl border border-border/70 hover:border-accent/30 bg-surface-hover/50 flex items-center justify-between gap-3 transition-colors"
            >
              <div>
                <span className="font-bold font-mono text-primary text-caption block">
                  Version #{v.versionNumber}
                </span>
                <span className="text-caption text-secondary font-mono">
                  {new Date(v.createdAt).toLocaleString()}
                </span>
              </div>
              <BaseButton
                disabled={restoringId !== null || isSavingSnapshot}
                onClick={() => handleRestore(v.id)}
                className="text-caption py-1 px-2.5 bg-accent-subtle hover:bg-accent/20 text-accent-fg border border-accent/20"
              >
                {restoringId === v.id ? 'Restoring...' : 'Restore'}
              </BaseButton>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
