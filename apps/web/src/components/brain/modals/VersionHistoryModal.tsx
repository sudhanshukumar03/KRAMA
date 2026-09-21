import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { History, X } from 'lucide-react';
import { api } from '../../../api/client';
import { BaseButton } from '../../ui/BaseButton';
import { toast } from 'sonner';

export interface VersionHistoryModalProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess: (restoredContentJson?: any) => void;
}

export function VersionHistoryModal({
  documentId,
  isOpen,
  onClose,
  onRestoreSuccess
}: VersionHistoryModalProps) {
  const queryClient = useQueryClient();
  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: () => api.documents.getVersions(documentId),
    enabled: isOpen
  });

  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleManualSave = async () => {
    try {
      await api.documents.createVersion(documentId);
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] });
      toast.success('Snapshot created manually');
    } catch {
      toast.error('Failed to create version snapshot');
    }
  };

  const handleRestore = async (versionId: string) => {
    setRestoringId(versionId);
    try {
      const restoredDoc = await api.documents.restoreVersion(documentId, versionId);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] });
      toast.success('Restored document to selected snapshot');
      onRestoreSuccess(restoredDoc?.contentJson);
      onClose();
    } catch {
      toast.error('Failed to restore version snapshot');
    } finally {
      setRestoringId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-primary text-body">Version Snapshots</span>
          </div>
          <div className="flex items-center gap-2">
            <BaseButton onClick={handleManualSave} className="text-caption py-1 px-2.5">
              Snapshot Now
            </BaseButton>
            <button onClick={onClose} className="p-1 text-muted hover:text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto space-y-2">
          {isLoading && <div className="py-8 text-center text-muted font-mono text-caption">Loading snapshots...</div>}
          {!isLoading && versions.length === 0 && (
            <div className="py-8 text-center text-secondary font-mono text-caption">
              No version snapshots recorded yet. Auto-snapshots fire after 50 mutations or 5 minutes of idle writing.
            </div>
          )}

          {versions.map((v: any) => (
            <div
              key={v.id}
              className="p-3 rounded-xl border border-border/70 hover:border-blue-500/30 bg-surface-hover/50 flex items-center justify-between gap-3 transition-colors"
            >
              <div>
                <span className="font-bold font-mono text-primary text-caption block">
                  Version #{v.versionNumber}
                </span>
                <span className="text-[11px] text-secondary font-mono">
                  {new Date(v.createdAt).toLocaleString()}
                </span>
              </div>
              <BaseButton
                disabled={restoringId === v.id}
                onClick={() => handleRestore(v.id)}
                className="text-caption py-1 px-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20"
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
