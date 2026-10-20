import { FolderKanban, Check, Plus, X, ChevronDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import type { DocumentWithRelations, ProjectWithRelations, DocumentType } from '../../types/schema';
import type { DocumentSaveQueue } from '../../lib/documentSaveQueue';
import { IconPicker } from '../ui/IconPicker';
import { getTagColor } from './helpers';
import { LIFECYCLE_STATUSES, type useDocumentActions } from './hooks/useDocumentActions';

interface DocumentPropertiesProps {
  page: DocumentWithRelations;
  projects: ProjectWithRelations[];
  projectsAvailable: boolean;
  save: DocumentSaveQueue;
  actions: ReturnType<typeof useDocumentActions>;
  wordCount: number;
  readTimeMins: number;
}
export function DocumentProperties({ page, projects, projectsAvailable, save, actions, wordCount, readTimeMins }: DocumentPropertiesProps) {
  const queryClient = useQueryClient();
  const lifecycleStatus = page.statusBadges?.find(status => LIFECYCLE_STATUSES.has(status)) || 'DRAFT';
  const { newTagInput, setNewTagInput, isAddingTag, setIsAddingTag, handleLinkProject,
    handleDocumentTypeChange, handleStatusChange, handleAddTag, handleRemoveTag } = actions;
  return (
    <>
        {/* Properties & Telemetry Row: Icon, DocType, Non-wrapping Stats Pill, and Tags */}
        <details className="workspace-document-properties mb-3 border-b border-border">
          <summary className="min-h-11 flex flex-wrap items-center gap-2 cursor-pointer text-sm text-secondary hover:text-primary rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"><ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />Document properties <span className="text-xs ml-auto">{wordCount} words · {readTimeMins} min read</span></summary>
          <div className="flex flex-wrap items-center gap-3 py-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-accent-subtle border border-accent/20 text-accent-fg flex items-center justify-center shrink-0 shadow-2xs hover:bg-accent/20 transition-colors cursor-pointer">
              <IconPicker
                value={page.icon}
                onChange={(newIcon) => {
                  save.updateMetadata({ icon: newIcon })
                    .then(() => queryClient.invalidateQueries({ queryKey: ['documents'] }))
                    .catch(() => toast.error('Failed to update icon'));
                }}
                triggerClassName="border-none hover:border-none shadow-none bg-transparent hover:bg-transparent !p-0"
              />
            </div>

            {/* Project Linker */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-surface text-caption font-mono">
              <FolderKanban className="w-3.5 h-3.5 text-accent-fg shrink-0" />
              <select
                id="doc-linked-project"
                name="linkedProject"
                aria-label="Linked project"
                disabled={!projectsAvailable}
                value={page.projectId || page.linkedProjectId || ''}
                onChange={(e) => handleLinkProject(e.target.value || null)}
                className="bg-transparent text-primary text-caption font-medium outline-none cursor-pointer max-w-[110px] truncate pr-1"
                title="Link to project"
              >
                <option value="" className="bg-surface text-secondary">No Project</option>
                {(page.projectId || page.linkedProjectId) && !projects.some(project => project.id === (page.projectId || page.linkedProjectId)) && <option value={page.projectId || page.linkedProjectId || ''}>Linked project unavailable</option>}
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-surface text-primary">{p.name}</option>
                ))}
              </select>
            </div>

            {/* Document Type Picker */}
            <select
              id="doc-type-picker"
              name="docTypePicker"
              aria-label="Document type"
              value={page.documentType || 'GENERAL'}
              onChange={(e) => handleDocumentTypeChange(e.target.value as DocumentType)}
              className="bg-surface-hover text-secondary hover:text-primary px-2.5 py-1 rounded-lg border border-border text-caption font-mono font-bold outline-none cursor-pointer"
            >
              <option value="GENERAL">GENERAL</option>
              <option value="SPEC">SPEC</option>
              <option value="RFC">RFC</option>
              <option value="MEETING">MEETING</option>
              <option value="IDEA">IDEA</option>
              <option value="NOTE">NOTE</option>
            </select>

            {/* Document Lifecycle Status Badge Picker */}
            <select
              id="doc-status-picker"
              name="docStatusPicker"
              aria-label="Document lifecycle status"
              value={lifecycleStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={cn(
                "px-2 py-1 rounded-lg border text-caption font-mono font-bold outline-none cursor-pointer transition-colors",
                lifecycleStatus === 'DRAFT' && "bg-warning-bg text-warning-fg border-warning-border",
                lifecycleStatus === 'IN_REVIEW' && "bg-accent-subtle text-accent-fg border-accent/30",
                lifecycleStatus === 'ACCEPTED' && "bg-success-bg text-success-fg border-success-border",
                lifecycleStatus === 'DEPRECATED' && "bg-danger-bg text-danger-fg border-danger-border"
              )}
            >
              <option value="DRAFT" className="bg-surface text-warning-fg">DRAFT</option>
              <option value="IN_REVIEW" className="bg-surface text-accent-fg">IN_REVIEW</option>
              <option value="ACCEPTED" className="bg-surface text-success-fg">ACCEPTED</option>
              <option value="DEPRECATED" className="bg-surface text-danger-fg">DEPRECATED</option>
            </select>

          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {page.tags?.map((item) => {
              const tag = item.tag || item;
              const colorClass = getTagColor(tag.color);
              return (
                <span
                  key={tag.id}
                  className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-caption font-mono border", colorClass.bg, colorClass.text, colorClass.border)}
                >
                  <span>#{tag.name}</span>
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    aria-label={`Remove #${tag.name} tag`}
                    title={`Remove #${tag.name} tag`}
                    className="hover:opacity-75 focus:outline-none ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {isAddingTag ? (
              <div className="inline-flex items-center gap-1 bg-surface border border-border rounded-md px-2 py-0.5 text-caption font-mono">
                <span>#</span>
                <input
                  id="new-tag-input"
                  name="newTagInput"
                  aria-label="New tag name"
                  autoFocus
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTag();
                    if (e.key === 'Escape') setIsAddingTag(false);
                  }}
                  placeholder="tag name..."
                  className="bg-transparent border-none outline-none text-primary w-24 text-caption"
                />
                <button
                  onClick={handleAddTag}
                  aria-label="Save tag"
                  title="Save tag"
                  className="text-accent-fg hover:text-accent cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingTag(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-caption font-mono text-muted hover:text-primary hover:bg-surface-hover border border-dashed border-border"
              >
                <Plus className="w-3 h-3" />
                <span>Tag</span>
              </button>
            )}
          </div>
          </div>
        </details>

    </>
  );
}
