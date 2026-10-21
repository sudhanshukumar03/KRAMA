import { Calendar, ChevronRight, X, Star, Pencil } from 'lucide-react';
import { resolveIcon } from '../../lib/iconResolver';
import { ConfirmDeleteButton } from '../ui/ConfirmDeleteButton';
import { cn } from '../../lib/utils';
import type { GoalStatus } from './goalConstants';
import type { GoalDetailModel } from './useGoalDetailModel';

const statuses: { value: GoalStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' }, { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' }, { value: 'CANCELED', label: 'Canceled' },
];

export function GoalDetailHeader({ model }: { model: GoalDetailModel }) {
  const { handleClose, handleSelectGoal, activeTab, setActiveTab, current, metadata, isAuto, isPinned, pillar, parentGoal, statusChangeMutation, togglePinMutation, handleDeleteGoalFromDrawer } = model;
  const Icon = resolveIcon(current.icon || 'Goal');
  const status = statuses.find(option => option.value === metadata.status)?.value || 'ACTIVE';
  return (
    <header className="goal-detail-header">
      <div className="goal-detail-header-toolbar">
        <div className="goal-detail-identity">
          <span className="goal-detail-icon"><Icon size={20} aria-hidden="true" /></span>
          <select aria-label="Goal status" aria-busy={statusChangeMutation.isPending} disabled={statusChangeMutation.isPending} value={status} onChange={event => statusChangeMutation.mutate(event.target.value as GoalStatus)}>
            {statuses.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className="goal-detail-actions">
          <button type="button" onClick={() => togglePinMutation.mutate()} disabled={togglePinMutation.isPending} aria-pressed={isPinned} aria-label={isPinned ? 'Unpin from Spotlight' : 'Pin to Spotlight'} className={cn('goal-icon-action',isPinned && 'text-warning-fg')}><Star size={18} aria-hidden="true" fill={isPinned ? 'currentColor' : 'none'} /></button>
          <button type="button" onClick={() => setActiveTab(activeTab === 'edit' ? 'cockpit' : 'edit')} aria-label={activeTab === 'edit' ? 'View overview' : 'Edit Settings'} className="goal-icon-action"><Pencil size={18} aria-hidden="true" /></button>
          <ConfirmDeleteButton onConfirm={handleDeleteGoalFromDrawer} className="goal-icon-action" iconClassName="w-[18px] h-[18px]" />
          <button type="button" onClick={handleClose} aria-label="Close goal details" className="goal-icon-action"><X size={18} aria-hidden="true" /></button>
        </div>
      </div>
      {parentGoal && <button type="button" onClick={() => handleSelectGoal(parentGoal)} aria-label={`Open parent goal: ${parentGoal.title}`} className="goal-parent-link"><ChevronRight size={16} className="rotate-180" aria-hidden="true" /><span>{parentGoal.title}</span></button>}
      <h2 className="goal-detail-title">{current.title}</h2>
      <div className="goal-detail-context">
        {metadata.category && metadata.category !== 'all' && <span>{pillar.label}</span>}
        {isAuto && <span>Automatic progress</span>}
        {current.targetDate && <span><Calendar size={14} aria-hidden="true" />{new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'}).format(new Date(current.targetDate))}</span>}
      </div>
    </header>
  );
}
