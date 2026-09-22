import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, X, Plus } from 'lucide-react';
import { api } from '../../../api/client';
import { DOCUMENT_TEMPLATES } from '../../../lib/documentTemplates';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

export interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: { parentId?: string; parentTitle?: string } | null;
  projects: any[];
  spaces: any[];
  activeWorkspaceId: string;
  onSuccess: (newPageId: string) => void;
}

export function CreateDocumentModal({
  isOpen,
  onClose,
  target,
  projects,
  spaces,
  activeWorkspaceId,
  onSuccess,
}: CreateDocumentModalProps) {
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('SPEC');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('blank');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDocumentType('SPEC');
      setSelectedTemplateId('blank');
      setSelectedProjectId('');
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error('Please enter a document name');
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      let defaultSpaceId = spaces[0]?.id;
      if (!defaultSpaceId && spaces.length === 0) {
        try {
          const createdSpace = await api.spaces.create({ name: 'General' });
          defaultSpaceId = createdSpace.id;
          queryClient.invalidateQueries({ queryKey: ['spaces'] });
        } catch {
          // Server will fallback to auto-provisioning
        }
      }

      const template = DOCUMENT_TEMPLATES.find(t => t.id === selectedTemplateId);
      const contentJson = template && template.id !== 'blank' ? template.contentJson : undefined;

      const newPage = await api.documents.create({
        title: cleanTitle,
        workspaceId: activeWorkspaceId || undefined,
        spaceId: defaultSpaceId,
        parentId: target?.parentId || undefined,
        projectId: selectedProjectId || undefined,
        documentType: documentType || 'SPEC',
        contentJson: contentJson || undefined,
        blocks: [],
      });

      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
      toast.success(`Created document "${cleanTitle}"`);
      onClose();
      if (newPage?.id) {
        onSuccess(newPage.id);
      }
    } catch (err: any) {
      toast.error('Failed to create document: ' + (err?.response?.data?.message || err?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent-subtle border border-accent/20 text-accent-fg flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 stroke-[1.75]" />
            </div>
            <div>
              <h3 className="font-bold text-primary text-body leading-tight">
                {target?.parentTitle ? 'New Sub-document' : 'Create New Document'}
              </h3>
              {target?.parentTitle && (
                <p className="text-[11px] font-mono text-secondary truncate max-w-[260px]">
                  Inside: <span className="text-primary font-medium">{target.parentTitle}</span>
                </p>
              )}
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreate} className="p-5 space-y-4">
          <div>
            <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5 tracking-wider">
              Document Name <span className="text-accent-fg">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. System Architecture Spec, API Contract..."
              className="w-full p-2.5 rounded-xl border border-border bg-surface text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 font-sans text-body transition-all"
              autoFocus
            />
          </div>

          {/* Engineering Template Selector */}
          <div>
            <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5 tracking-wider">
              Template
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedTemplateId('blank')}
                className={cn(
                  "py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer text-center border truncate",
                  selectedTemplateId === 'blank'
                    ? "bg-accent text-on-accent border-accent shadow-xs"
                    : "bg-surface hover:bg-surface-hover text-secondary border-border"
                )}
                title="Blank document without starter sections"
              >
                Blank
              </button>
              {DOCUMENT_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => {
                    setSelectedTemplateId(tmpl.id);
                    const docType = tmpl.documentType || (tmpl as any).defaultDocType;
                    if (docType) {
                      setDocumentType(docType);
                    }
                  }}
                  className={cn(
                    "py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer text-center border truncate",
                    selectedTemplateId === tmpl.id
                      ? "bg-accent text-on-accent border-accent shadow-xs"
                      : "bg-surface hover:bg-surface-hover text-secondary border-border"
                  )}
                  title={tmpl.description}
                >
                  {tmpl.label || (tmpl as any).name}
                </button>
              ))}
            </div>
          </div>

          {/* Document Type Selector */}
          <div>
            <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5 tracking-wider">
              Document Type
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'SPEC', label: 'SPEC' },
                { id: 'RFC', label: 'RFC' },
                { id: 'GENERAL', label: 'GENERAL' },
                { id: 'MEETING', label: 'MEETING' },
                { id: 'IDEA', label: 'IDEA' },
                { id: 'NOTE', label: 'NOTE' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDocumentType(t.id)}
                  className={cn(
                    "py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer text-center border",
                    documentType === t.id
                      ? "bg-accent text-on-accent border-accent shadow-xs"
                      : "bg-surface hover:bg-surface-hover text-secondary border-border"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Project Link */}
          {projects.length > 0 && (
            <div>
              <label className="block font-bold text-secondary font-mono uppercase text-[11px] mb-1.5 tracking-wider">
                Link to Project (Optional)
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full p-2 rounded-xl border border-border bg-surface text-primary outline-none focus:border-accent font-sans text-caption"
              >
                <option value="">No Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted flex items-center gap-1">
              <kbd className="bg-surface-hover px-1.5 py-0.5 rounded border border-border text-[10px]">Enter ↵</kbd> to create
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-border text-caption font-medium hover:bg-surface-hover transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className={cn(
                  "px-4 py-2 rounded-xl text-caption font-bold flex items-center gap-1.5 transition-all shadow-xs",
                  title.trim() && !isSubmitting
                    ? "bg-accent hover:opacity-90 text-on-accent cursor-pointer"
                    : "bg-accent/40 text-on-accent/60 cursor-not-allowed"
                )}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2]" />
                <span>{isSubmitting ? 'Creating...' : 'Create Document'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
