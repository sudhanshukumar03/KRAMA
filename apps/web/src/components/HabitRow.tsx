import { Check, Flame } from 'lucide-react';
import { ConfirmDeleteButton } from './ui/ConfirmDeleteButton';
import { cn } from '../lib/utils';
import { useHabitCompletion } from '../hooks/useHabitCompletion';

interface HabitRowProps {
  habit: any;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: () => void;
}

/**
 * Extracted so useHabitCompletion is called once per row instance (legal),
 * instead of once per .map() iteration inside the parent (illegal — violates
 * the Rules of Hooks, since hook-call count would vary with array length).
 * Used by both Goals.tsx's Habits Overview panel and HabitTracker.tsx so
 * completion-status logic has exactly one implementation.
 */
export function HabitRow({ habit, onToggle, onDelete, onNavigate }: HabitRowProps) {
  const { isCompletedToday } = useHabitCompletion(habit);

  return (
    <div className="py-3 px-4 flex items-center justify-between hover:bg-surface-hover transition-colors duration-100 group">
      <div className="flex items-center gap-3 min-w-0 pr-2">
        {/*
          IMPORTANT: habit.service.ts#logHabitCompletion throws "Habit already
          logged for today" if called again the same day — there is no confirmed
          uncomplete/delete-completion endpoint. Disabling once completed is the
          only behavior consistent with the backend as currently shown. If an
          uncomplete endpoint is later confirmed to exist, this needs to become
          a real toggle (onUncomplete handler) instead of a disabled state.
        */}
        <button
          type="button"
          data-testid="habit-checkbox"
          disabled={isCompletedToday}
          onClick={(e) => {
            e.stopPropagation();
            if (isCompletedToday) return;
            onToggle(habit.id);
          }}
          className={cn(
            'w-5 h-5 rounded flex items-center justify-center border transition-all duration-150 shrink-0',
            isCompletedToday
              ? 'bg-[#2563EB] border-[#2563EB] text-white cursor-default'
              : 'border-[#D1D5DB] bg-surface group-hover:border-[#9CA3AF] cursor-pointer'
          )}
        >
          {isCompletedToday && <Check className="w-3 h-3 stroke-[2.5]" />}
        </button>
        <div className="min-w-0" onClick={onNavigate} style={{ cursor: 'pointer' }}>
          <div
            className={cn(
              'font-medium text-body leading-tight truncate transition-colors',
              isCompletedToday ? 'line-through text-muted' : 'text-primary group-hover:text-[#EA580C]'
            )}
          >
            {habit.name}
          </div>
          <div className="text-[10px] text-secondary font-mono uppercase tracking-[0.02em] mt-0.5">
            {habit.category || 'Daily'} • {habit.expectedDurationMinutes || 15}m
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="text-caption font-mono font-bold flex items-center gap-1 text-[#C2410C] bg-[#FFF7ED] px-2 py-0.5 rounded border border-[#FFEDD5] cursor-pointer"
          onClick={onNavigate}
        >
          <Flame className="w-3.5 h-3.5 text-[#EA580C] stroke-[2]" /> {habit.streak}d
        </div>
        <ConfirmDeleteButton
          onConfirm={(e) => {
            e.stopPropagation();
            onDelete(habit.id);
          }}
          className="opacity-0 group-hover:opacity-100"
          iconClassName="w-3.5 h-3.5"
        />
      </div>
    </div>
  );
}
