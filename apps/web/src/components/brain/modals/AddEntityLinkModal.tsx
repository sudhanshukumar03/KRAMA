import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link2, X } from 'lucide-react';
import { api } from '../../../api/client';
import type { DocumentWithRelations } from '../../../types/schema';
import { BaseButton } from '../../ui/BaseButton';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

export interface AddEntityLinkModalProps {
  documentId: string;
  pages: DocumentWithRelations[];
  projects: any[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddEntityLinkModal({
  documentId,
  pages,
  projects,
  isOpen,
  onClose,
  onSuccess
}: AddEntityLinkModalProps) {
  const [targetType, setTargetType] = useState<'DOCUMENT' | 'PROJECT' | 'TASK'>('DOCUMENT');
  const [linkType, setLinkType] = useState<'REFERENCE' | 'RELATED'>('REFERENCE');
  const [targetId, setTargetId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch workspace tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.tasks.list(),
    enabled: isOpen
  });

  // Available documents excluding current
  const availableDocs = pages.filter(p => p.id !== documentId);

  useEffect(() => {
    if (targetType === 'DOCUMENT' && availableDocs[0]) setTargetId(availableDocs[0].id);
    else if (targetType === 'PROJECT' && projects[0]) setTargetId(projects[0].id);
    else if (targetType === 'TASK' && tasks[0]) setTargetId(tasks[0].id);
    else setTargetId('');
  }, [targetType, tasks, projects, availableDocs]);

  const handleCreate = async () => {
    if (!targetId) {
      toast.error('Please select an entity to link');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.documents.addLink(documentId, {
        targetType,
        targetId,
        linkType
      });
      toast.success('Bidirectional entity link created');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to link entity: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans">
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-primary text-body">Link Document</span>
          </div>
          <button onClick={onClose} className="p-1 text-muted hover:text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 font-sans text-caption">
          <div>
            <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5">Target Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTargetType('DOCUMENT')}
                className={cn("py-2 px-2.5 rounded-xl border text-center font-bold transition-all text-[12px]",
                  targetType === 'DOCUMENT'
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                    : "border-border hover:bg-surface-hover text-secondary"
                )}
              >
                Document
              </button>
              <button
                type="button"
                onClick={() => setTargetType('PROJECT')}
                className={cn("py-2 px-2.5 rounded-xl border text-center font-bold transition-all text-[12px]",
                  targetType === 'PROJECT'
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400"
                    : "border-border hover:bg-surface-hover text-secondary"
                )}
              >
                Project
              </button>
              <button
                type="button"
                onClick={() => setTargetType('TASK')}
                className={cn("py-2 px-2.5 rounded-xl border text-center font-bold transition-all text-[12px]",
                  targetType === 'TASK'
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                    : "border-border hover:bg-surface-hover text-secondary"
                )}
              >
                Task
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5">Relation Type</label>
            <select
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as any)}
              className="w-full p-2.5 rounded-xl border border-border bg-surface text-primary outline-none focus:border-blue-500 font-mono text-caption"
            >
              <option value="REFERENCE">REFERENCE (Grounded 1-hop AI context)</option>
              <option value="RELATED">RELATED (Topological relationship)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5">Select Target</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-surface text-primary outline-none focus:border-blue-500 font-mono text-caption"
            >
              {targetType === 'DOCUMENT' && availableDocs.map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
              {targetType === 'PROJECT' && projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              {targetType === 'TASK' && tasks.map((t: any) => (
                <option key={t.id} value={t.id}>{t.title} ({t.status || 'TODO'})</option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <BaseButton variant="secondary" onClick={onClose} className="text-caption py-1.5">
              Cancel
            </BaseButton>
            <BaseButton disabled={isSubmitting} onClick={handleCreate} className="text-caption py-1.5">
              {isSubmitting ? 'Linking...' : 'Create Link'}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  );
}
