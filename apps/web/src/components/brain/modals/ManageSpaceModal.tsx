import React, { useState, useEffect } from 'react';
import { FolderPlus, Settings2, Trash2, X, AlertTriangle } from 'lucide-react';
import { api } from '../../../api/client';
import { BaseButton } from '../../ui/BaseButton';
import { IconPicker } from '../../ui/IconPicker';
import { useModalA11y } from '../../../hooks/useModalA11y';
import { toast } from 'sonner';

export interface ManageSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  space?: { id: string; name: string; icon?: string | null } | null;
  onSuccess: (spaceId?: string) => void;
}

export function ManageSpaceModal({
  isOpen,
  onClose,
  mode,
  space,
  onSuccess,
}: ManageSpaceModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const modalRef = useModalA11y(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setName(mode === 'edit' && space ? space.name : '');
      setIcon(mode === 'edit' && space ? (space.icon || null) : null);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, mode, space]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Space name cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const created = await api.spaces.create({ name: trimmed, icon: icon || undefined });
        toast.success(`Space "${created.name}" created`);
        onSuccess(created.id);
        onClose();
      } else if (mode === 'edit' && space) {
        const updated = await api.spaces.update(space.id, { name: trimmed, icon: icon ?? null });
        toast.success(`Space updated to "${updated.name}"`);
        onSuccess(updated.id);
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save space');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!space) return;
    setIsDeleting(true);
    try {
      await api.spaces.delete(space.id);
      toast.success(`Space "${space.name}" deleted`);
      onSuccess('ALL');
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete space');
    } finally {
      setIsDeleting(false);
    }
  };

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
        aria-labelledby="manage-space-title"
        className="krama-dialog w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans"
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            {mode === 'create' ? (
              <FolderPlus className="w-4 h-4 text-accent-fg" />
            ) : (
              <Settings2 className="w-4 h-4 text-accent-fg" />
            )}
            <span id="manage-space-title" className="font-bold text-primary text-body">
              {mode === 'create' ? 'Create Knowledge Space' : `Manage Space: ${space?.name || ''}`}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-primary rounded-lg hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 font-sans text-caption">
          <div>
            <label className="block font-bold text-secondary font-mono uppercase text-caption mb-1.5">
              Space Icon & Name
            </label>
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                <IconPicker
                  value={icon}
                  onChange={setIcon}
                  triggerClassName="w-10 h-10 shrink-0"
                />
                {icon && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIcon(null);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-surface border border-border text-muted hover:text-danger-fg hover:border-danger/40 flex items-center justify-center text-badge shadow-2xs transition-colors cursor-pointer"
                    title="Remove custom icon"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Architecture, RFCs, Engineering, Product"
                maxLength={100}
                className="flex-1 p-2.5 rounded-xl border border-border bg-canvas text-primary outline-none focus:border-accent text-body"
              />
            </div>
            <p className="text-muted text-caption mt-1 font-mono">
              Spaces organize related documents, specifications, and project assets.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <BaseButton
              type="button"
              variant="secondary"
              onClick={onClose}
              className="text-caption py-1.5"
            >
              Cancel
            </BaseButton>
            <BaseButton
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="text-caption py-1.5"
            >
              {isSubmitting
                ? mode === 'create' ? 'Creating...' : 'Saving...'
                : mode === 'create' ? 'Create Space' : 'Save Changes'}
            </BaseButton>
          </div>

          {/* Danger Zone (Edit Mode only) */}
          {mode === 'edit' && space && (
            <div className="pt-4 mt-4 border-t border-border/80">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-danger text-[12px] block">Danger Zone</span>
                  <span className="text-muted text-caption block">
                    Delete this space and archive all its contained documents.
                  </span>
                </div>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 text-danger hover:text-danger-fg hover:bg-danger-bg px-2.5 py-1.5 rounded-lg border border-danger/30 text-caption font-mono font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Space</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2 py-1 text-caption text-muted hover:text-primary rounded-lg border border-border"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleDelete}
                      className="flex items-center gap-1.5 bg-danger text-white hover:bg-danger/90 px-2.5 py-1 rounded-lg text-caption font-mono font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                  </div>
                )}
              </div>
              {showDeleteConfirm && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-danger-bg/40 border border-danger/30 flex items-start gap-2 text-danger text-caption leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Are you sure? This will archive all documents and subdocuments inside "{space.name}".
                  </span>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
