import { GoalOverviewPanel } from './GoalOverviewPanel';
import { GoalSettingsPanel } from './GoalSettingsPanel';
import { GoalDetailHeader } from './GoalDetailHeader';
import { ErrorState } from '../ui/ErrorState';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import '../../styles/goal-detail.css';
import { Pencil, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

import { useGoalDetailModel } from './useGoalDetailModel';
import type { GoalDetailDrawerProps } from './goalDetail.types';

export function GoalDetailDrawer(props: GoalDetailDrawerProps) {
  const model = useGoalDetailModel(props);
  const { draftDirty, handleClose, dialogRef, draftVersion, activeTab, setActiveTab, isLoading, detailError, retryDetail, goalsError, retryGoals, habitsError, retryHabits, current } = model;
  const discardConfirmation = <ConfirmDialog open={!!model.discardAction} title="Discard unsaved changes?" description="Your changes to this goal have not been saved. Keep editing to preserve them, or discard them to continue." cancelLabel="Keep editing" confirmLabel="Discard changes" onCancel={model.cancelDiscard} onConfirm={model.discardAndContinue} />;
  if (isLoading || detailError) return (
    <>
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/40">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Goal details" inert={!!model.discardAction} className="relative w-full max-w-lg h-full bg-card p-6 overflow-y-auto">
        <button onClick={handleClose} aria-label="Close goal details">Close</button>
        {isLoading ? <p role="status">Loading goal details...</p> : <ErrorState title="Could not load goal details" onRetry={() => { void Promise.all([retryDetail(), retryGoals(), retryHabits()]); }} />}
      </div>
    </div>
    {discardConfirmation}
    </>
  );

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-150">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={handleClose} />
      <div
        ref={dialogRef} role="dialog" aria-modal="true" aria-label="Goal details" inert={!!model.discardAction}
        onClick={(e) => e.stopPropagation()}
        className="goal-detail-panel relative w-full max-w-lg h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {(goalsError || habitsError) && <ErrorState title="Some goal connections are unavailable" message="Your goal remains usable. Retry to refresh related goals or habits." onRetry={() => { if (goalsError) void retryGoals(); if (habitsError) void retryHabits(); }} />}
        {draftDirty && current.version !== draftVersion && <p role="alert" className="p-3 text-warning-fg">This goal changed elsewhere. Your draft is retained. Close and reopen to load the latest values before saving.</p>}
        {/* Drawer Header */}
        <GoalDetailHeader model={model} />

        {/* Tab switch bar */}
        <div role="tablist" aria-label="Goal details view" className="flex border-b border-border bg-surface px-6 gap-6">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cockpit'}
            aria-controls="cockpit-panel"
            id="tab-cockpit"
            onClick={() => setActiveTab('cockpit')}
            className={cn(
              'py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 -mb-[1px]',
              activeTab === 'cockpit'
                ? 'border-accent text-accent-fg'
                : 'border-transparent text-secondary hover:text-primary'
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'edit'}
            aria-controls="edit-panel"
            id="tab-edit"
            onClick={() => setActiveTab('edit')}
            className={cn(
              'py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 -mb-[1px]',
              activeTab === 'edit'
                ? 'border-accent text-accent-fg'
                : 'border-transparent text-secondary hover:text-primary'
            )}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Settings
          </button>
        </div>

        {/* Body content */}
        {activeTab === 'edit' ? (
          /* INLINE EDIT SETTINGS */
          <GoalSettingsPanel model={model} />
        ) : (
          /* COCKPIT TAB */
          <GoalOverviewPanel model={model} />
        )}

      </div>
      {discardConfirmation}
    </div>
  );
}
