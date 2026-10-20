import { TextField } from '../ui/TextField';
import { Zap } from 'lucide-react';
import { IconPicker } from '../ui/IconPicker';
import { BaseButton } from '../ui/BaseButton';
import { LIFE_PILLARS } from './goalConstants';
import { cn } from '../../lib/utils';
import type { GoalDetailModel } from './useGoalDetailModel';

export function GoalSettingsPanel({ model }: { model: GoalDetailModel }) {
  const { markDraftDirty, setActiveTab, editTitle, setEditTitle, editIcon, setEditIcon, editWhy, setEditWhy, editCategory, setEditCategory, editTargetDate, setEditTargetDate, editProgressMode, setEditProgressMode, childGoals, checkInMutation, inlineEditMutation } = model;
  return (
    <div id="edit-panel" role="tabpanel" aria-labelledby="tab-edit" className="goal-settings-panel flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
            <div className="flex gap-3">
              <div>
                <label className="block text-xs font-semibold text-secondary tracking-normal mb-1.5">
                  Icon
                </label>
                <IconPicker
                  value={editIcon}
                  onChange={(icon) => { markDraftDirty('settings'); setEditIcon(icon); }}
                  triggerClassName="w-10 h-10 px-0 py-0 rounded-xl"
                />
              </div>
              <div className="flex-1 min-w-0">
                <TextField label="Title" aria-label="Goal title" value={editTitle} maxLength={255} onChange={event => { markDraftDirty('settings'); setEditTitle(event.target.value); }} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary tracking-normal mb-1.5">
                Life Pillar
              </label>
              <div className="grid grid-cols-2 gap-2">
                {LIFE_PILLARS.filter((p) => p.id !== 'all').map((p) => {
                  const PillarIcon = p.icon;
                  const isSelected = editCategory === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { markDraftDirty('settings'); setEditCategory(p.id); }}
                      className={cn(
                        'px-3 py-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-colors text-left cursor-pointer group/pill shadow-2xs',
                        isSelected
                          ? 'bg-accent-subtle border-accent text-accent-fg font-semibold'
                          : 'bg-surface hover:bg-surface-hover border-border text-secondary hover:text-primary'
                      )}
                    >
                      <PillarIcon
                        className={cn(
                          'w-4 h-4 shrink-0 stroke-[1.75]',
                          isSelected ? 'text-accent-fg' : 'text-secondary group-hover/pill:text-primary'
                        )}
                      />
                      <span className="truncate">{p.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary tracking-normal mb-1.5">
                Why This Matters (Motivation)
              </label>
              <textarea
                aria-label="Why this matters"
                value={editWhy}
                onChange={(e) => { markDraftDirty('settings'); setEditWhy(e.target.value); }}
                rows={3}
                placeholder="What makes this goal worth working toward?"
                className="krama-input w-full p-3 text-sm text-primary placeholder:text-muted focus:border-accent resize-none rounded-xl"
              />
            </div>

            <TextField label="Target date" type="date" aria-label="Target date" value={editTargetDate} onChange={event => { markDraftDirty('settings'); setEditTargetDate(event.target.value); }} />

            <div className="pt-3 border-t border-border/60">
              <label className="block text-xs font-semibold text-secondary tracking-normal mb-2">
                Progress Mode
              </label>
              {childGoals.length > 0 && <p className="text-xs text-secondary mb-2">Progress is calculated from the weighted key results. Project-task progress applies to goals without key results.</p>}
              <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
                <label className="flex items-center gap-2 cursor-pointer text-secondary hover:text-primary">
                  <input
                    id="goal-progress-manual"
                    disabled={childGoals.length > 0}
                    aria-label="Manual progress"
                    type="radio"
                    name="editProgressMode"
                    value="manual"
                    checked={editProgressMode === 'manual'}
                    onChange={() => { markDraftDirty('settings'); setEditProgressMode('manual'); }}
                    className="accent-accent"
                  />
                  <span>Manual Progress</span>
                </label>
                <label
                  className="flex items-center gap-2 cursor-pointer text-secondary hover:text-primary"
                  title="Derives progress automatically from connected project tasks"
                >
                  <input
                    id="goal-progress-auto"
                    disabled={childGoals.length > 0}
                    aria-label="Auto progress from project tasks"
                    type="radio"
                    name="editProgressMode"
                    value="auto"
                    checked={editProgressMode === 'auto'}
                    onChange={() => { markDraftDirty('settings'); setEditProgressMode('auto'); }}
                    className="accent-accent"
                  />
                  <span className="flex items-center gap-1 text-accent-fg font-semibold">
                    <Zap className="w-3.5 h-3.5" /> Auto (from Project Tasks)
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end gap-2.5">
              <BaseButton variant="secondary" size="sm" onClick={() => setActiveTab('cockpit')}>
                Cancel
              </BaseButton>
              <BaseButton
                variant="primary"
                size="sm"
                onClick={() => inlineEditMutation.mutate()}
                disabled={inlineEditMutation.isPending || checkInMutation.isPending || !editTitle.trim()}
              >
                {inlineEditMutation.isPending ? 'Saving...' : 'Save Settings'}
              </BaseButton>
            </div>
          </div>
  );
}
