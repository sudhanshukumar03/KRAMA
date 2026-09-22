import { useState, useEffect } from 'react';
import { FolderInput, X } from 'lucide-react';
import { api } from '../../../api/client';
import type { DocumentWithRelations } from '../../../types/schema';
import { BaseButton } from '../../ui/BaseButton';
import { getDocDepth, getSubtreeDepth, isDescendantOf } from '../helpers';
import { toast } from 'sonner';

export interface MoveDocumentModalProps {
  doc: DocumentWithRelations | null;
  pages: DocumentWithRelations[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MoveDocumentModal({
  doc,
  pages,
  isOpen,
  onClose,
  onSuccess
}: MoveDocumentModalProps) {
  const [targetParentId, setTargetParentId] = useState<string>('ROOT');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (doc) {
      setTargetParentId(doc.parentId || 'ROOT');
    }
  }, [doc, isOpen]);

  if (!isOpen || !doc) return null;

  const subtreeDepth = getSubtreeDepth(doc.id, pages);

  const candidateParents = pages.filter(p => {
    if (p.id === doc.id) return false;
    if (isDescendantOf(doc.id, p.id, pages)) return false;
    return true;
  });

  const handleMove = async () => {
    setIsSubmitting(true);
    try {
      const newParentId = targetParentId === 'ROOT' ? null : targetParentId;
      await api.documents.move(doc.id, { targetParentId: newParentId });
      toast.success(`Moved "${doc.title}" successfully`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to move document: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <FolderInput className="w-4 h-4 text-accent-fg" />
            <span className="font-bold text-primary text-body">Move Document</span>
          </div>
          <button onClick={onClose} className="p-1 text-muted hover:text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 font-sans text-caption">
          <p className="text-secondary text-[13px]">
            Choose a new parent for <strong className="text-primary">{doc.title}</strong> (subtree height: {subtreeDepth}):
          </p>

          <div>
            <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5">Target Parent</label>
            <select
              value={targetParentId}
              onChange={(e) => setTargetParentId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-surface text-primary outline-none focus:border-accent font-mono text-caption"
            >
              <option value="ROOT">📁 Root (Top-Level Document)</option>
              {candidateParents.map(p => {
                const parentDepth = getDocDepth(p.id, pages);
                const wouldExceed = parentDepth + subtreeDepth > 3;
                return (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={wouldExceed}
                  >
                    {'— '.repeat(parentDepth - 1)}{p.title} (Depth {parentDepth}){wouldExceed ? ' - [Exceeds Max Depth 3]' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <BaseButton variant="secondary" onClick={onClose} className="text-caption py-1.5">
              Cancel
            </BaseButton>
            <BaseButton disabled={isSubmitting} onClick={handleMove} className="text-caption py-1.5">
              {isSubmitting ? 'Moving...' : 'Move Document'}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  );
}
