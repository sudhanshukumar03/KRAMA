import type { ProjectStatus, ProjectWithRelations } from '../../types/schema';
import { projectStatus, projectMetadata } from '../../lib/utils';
import { FolderKanban, Target, Trash2, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { BaseButton } from '../ui/BaseButton';
import { IconPicker } from '../ui/IconPicker';
import { useModalA11y } from '../../hooks/useModalA11y';

interface ProjectFormValues {
  name: string;
  problemStatement: string;
  status: ProjectStatus;
  targetDate: string;
  icon: string;
  goalId: string;
}

type ProjectFormData = Omit<ProjectFormValues, 'goalId'> & { goalId: string | null; version?: number };
type ProjectFormGoal = { id: string; title: string; type: string; progress?: number };

interface ProjectCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
  isSubmitting: boolean;
  goals?: ProjectFormGoal[];
}

interface ProjectEditModalProps extends ProjectCreateModalProps {
  initialData: ProjectWithRelations;
}

interface ProjectFormProps extends ProjectCreateModalProps {
  values: ProjectFormValues;
  onChange: (patch: Partial<ProjectFormValues>) => void;
  isEditing?: boolean;
  hasVersionChanged?: boolean;
}

/** Share the layout while each modal owns its draft and edit-version snapshot. */
function ProjectForm({
  open, onClose, onSubmit, isSubmitting, goals = [], values, onChange,
  isEditing = false, hasVersionChanged = false,
}: ProjectFormProps) {
  const dismiss = () => { if (!isSubmitting) onClose(); };
  const modalRef = useModalA11y(open, dismiss);
  if (!open) return null;

  const headingId = isEditing ? 'edit-project-title' : 'new-project-title';
  const fieldClass = 'krama-input w-full min-w-0 h-11 px-3 text-base sm:text-sm';
  const labelClass = 'block text-sm font-medium text-primary mb-2';
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !values.name.trim()) return;
    onSubmit({
      ...values,
      name: values.name.trim(),
      problemStatement: values.problemStatement.trim(),
      goalId: values.goalId || null,
    });
  };

  return (
    <div
      onClick={dismiss}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4 font-sans motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby="project-form-description"
        onClick={event => event.stopPropagation()}
        className="krama-dialog flex flex-col w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden text-left motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent-subtle text-accent-fg">
              <FolderKanban aria-hidden="true" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id={headingId} className="text-base font-semibold tracking-tight text-primary sm:text-lg">
                {isEditing ? 'Edit Initiative Settings' : 'New Project'}
              </h2>
              <p id="project-form-description" className="mt-1 text-sm text-secondary">
                {isEditing ? 'Update scope, goal and timeline.' : 'Define the work, goal and timeline.'}
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            disabled={isSubmitting}
            aria-label={isEditing ? 'Close project settings' : 'Close new project'}
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-secondary hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 transition-colors cursor-pointer"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="flex min-h-0 flex-1 flex-col">
          {/* Scroll the fields without moving the heading or save controls. */}
          <div data-project-form-body className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
            {hasVersionChanged && (
              <p role="alert" className="mb-5 rounded-xl border border-warning-border bg-warning-bg p-3 text-sm leading-relaxed text-warning-fg">
                This project changed elsewhere. Your draft is preserved. Close and reopen the editor to load the latest values before saving.
              </p>
            )}
            <div className="space-y-5">
              <div>
                <label htmlFor="initiative-name" className={labelClass}>
                  Initiative name <span className="text-danger-fg">*</span>
                </label>
                <div className="flex items-start gap-3">
                  <IconPicker
                    value={values.icon}
                    onChange={icon => onChange({ icon })}
                    triggerClassName="w-11 h-11 px-0 py-0"
                    popoverClassName="left-0 right-auto sm:left-0 sm:right-auto max-w-[calc(100vw-4rem)] max-h-60 motion-reduce:animate-none"
                  />
                  <input
                    id="initiative-name"
                    name="name"
                    type="text"
                    aria-label="Initiative Name"
                    value={values.name}
                    onChange={event => onChange({ name: event.target.value })}
                    placeholder="e.g. Launch the Krama workspace"
                    required
                    className={fieldClass + ' flex-1'}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="initiative-scope" className={labelClass + ' flex flex-wrap items-center justify-between gap-2'}>
                  <span>Problem statement / technical scope</span>
                  <span className="text-xs font-normal text-secondary">Optional</span>
                </label>
                <textarea
                  id="initiative-scope"
                  name="problemStatement"
                  aria-label="Problem Statement / Technical Scope"
                  value={values.problemStatement}
                  onChange={event => onChange({ problemStatement: event.target.value })}
                  placeholder="What are you building, and what should it achieve?"
                  rows={4}
                  className="krama-input block w-full min-w-0 min-h-28 resize-y px-3 py-3 text-base sm:text-sm leading-relaxed"
                />
              </div>
            </div>

            <section aria-labelledby="initiative-alignment-heading" className="mt-6 border-t border-border pt-5">
              <h3 id="initiative-alignment-heading" className="text-sm font-semibold text-primary">Goal &amp; timeline</h3>
              <div className="mt-4">
                <label htmlFor="initiative-goal" className={labelClass + ' flex items-center justify-between gap-2'}>
                  <span className="flex items-center gap-2">
                    <Target aria-hidden="true" className="h-4 w-4 text-accent-fg" /> Linked goal
                  </span>
                  <span className="text-xs font-normal text-secondary">Optional</span>
                </label>
                <select
                  id="initiative-goal"
                  name="goalId"
                  aria-label={isEditing ? 'Strategic OKR / Linked Goal' : 'Linked Strategic Goal / OKR'}
                  value={values.goalId}
                  onChange={event => onChange({ goalId: event.target.value })}
                  className={fieldClass + ' cursor-pointer'}
                >
                  <option value="">None (Standalone Initiative)</option>
                  {goals.map(goal => (
                    <option key={goal.id} value={goal.id}>
                      {goal.title} ({goal.type}{goal.progress != null ? ' · ' + goal.progress + '%' : ''})
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-secondary">Connect this initiative to the outcome it supports.</p>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <label htmlFor="initiative-status" className={labelClass}>Status</label>
                  <select
                    id="initiative-status"
                    name="status"
                    aria-label="Status"
                    value={values.status}
                    onChange={event => onChange({ status: projectStatus(event.target.value) })}
                    className={fieldClass + ' cursor-pointer'}
                  >
                    <option value="idea">Idea / Discovery</option>
                    <option value="active">Active Execution</option>
                    <option value="paused">Paused</option>
                    <option value="shipped">Shipped / Live</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <label htmlFor="initiative-target-date" className={labelClass}>Target date</label>
                  <input
                    id="initiative-target-date"
                    name="targetDate"
                    type="date"
                    aria-label="Target Date"
                    value={values.targetDate}
                    onChange={event => onChange({ targetDate: event.target.value })}
                    className={fieldClass}
                  />
                </div>
              </div>
            </section>
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-border bg-surface px-4 py-4 sm:px-6">
            <BaseButton type="button" variant="secondary" onClick={dismiss} disabled={isSubmitting} className="max-sm:flex-1 max-sm:px-3">
              Cancel
            </BaseButton>
            <BaseButton type="submit" disabled={isSubmitting || !values.name.trim()} isLoading={isSubmitting} className="max-sm:flex-1 max-sm:px-3">
              {isSubmitting ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Initiative' : 'Launch Initiative')}
            </BaseButton>
          </footer>
        </form>
      </div>
    </div>
  );
}

export function ProjectCreateModal(props: ProjectCreateModalProps) {
  const [values, setValues] = useState<ProjectFormValues>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 60);
    return {
      name: '', problemStatement: '', status: 'active', goalId: '', icon: 'FolderKanban',
      targetDate: date.toISOString().split('T')[0],
    };
  });
  return <ProjectForm {...props} values={values} onChange={patch => setValues(previous => ({ ...previous, ...patch }))} />;
}

function projectFormValues(project: ProjectWithRelations): ProjectFormValues {
  const targetDate = project.targetDate || projectMetadata(project.metadata).targetDate;
  return {
    name: project.name || '',
    problemStatement: project.problemStatement || '',
    status: projectStatus(project.status),
    goalId: project.goalId || '',
    icon: project.icon || 'FolderKanban',
    targetDate: targetDate ? new Date(targetDate).toISOString().split('T')[0] : '',
  };
}

export function ProjectEditModal({ initialData, onSubmit, ...props }: ProjectEditModalProps) {
  const [values, setValues] = useState<ProjectFormValues>(() => projectFormValues(initialData));
  const [initialVersion, setInitialVersion] = useState(initialData.version);
  const initialRef = useRef(initialData);
  initialRef.current = initialData;
  const initialId = initialData.id;

  useEffect(() => {
    if (props.open) {
      setValues(projectFormValues(initialRef.current));
      setInitialVersion(initialRef.current.version);
    }
  }, [props.open, initialId]);

  return (
    <ProjectForm
      {...props}
      isEditing
      values={values}
      onChange={patch => setValues(previous => ({ ...previous, ...patch }))}
      hasVersionChanged={initialData.version !== initialVersion}
      onSubmit={data => onSubmit({ ...data, version: initialVersion })}
    />
  );
}

interface DeleteInitiativeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  initiativeName: string;
}

export function DeleteInitiativeModal({
  open,
  onClose,
  onConfirm,
  isDeleting,
  initiativeName
}: DeleteInitiativeModalProps) {
  const modalRef = useModalA11y(open, () => { if (!isDeleting) onClose(); });
  if (!open) return null;

  return (
    <div
      onClick={() => { if (!isDeleting) onClose(); }}
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans"
    >
      <div
        ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="delete-project-title"
        onClick={e => e.stopPropagation()}
        className="bg-card border border-border-strong rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-150 max-h-[calc(100dvh-2rem)] overflow-y-auto text-left p-6 space-y-4"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-danger-bg text-danger-fg border border-danger-border flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div className="space-y-1">
            <h3 id="delete-project-title" className="text-section font-bold text-primary">Delete Initiative?</h3>
            <p className="text-caption text-secondary leading-relaxed">
              Are you sure you want to delete <strong className="text-primary font-mono font-bold">"{initiativeName}"</strong>? Its tasks and milestones will be hidden. You can restore them with Undo after deletion.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex justify-end gap-2.5">
          <BaseButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </BaseButton>
          <BaseButton
            type="button"
            variant="danger"
            size="sm"
            onClick={onConfirm}
            isLoading={isDeleting}
          >
            Delete Initiative
          </BaseButton>
        </div>
      </div>
    </div>
  );
}
