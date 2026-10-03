import { ChevronLeft, ChevronRight, Globe, ArrowLeft, LayoutTemplate, Calendar, Clock, CalendarDays } from 'lucide-react';
import React from 'react';
import { cn } from '../../lib/utils';

interface Props {
  mode: 'plan' | 'calendar' | 'day';
  onModeChange: (mode: 'plan' | 'calendar' | 'day') => void;
  title: string;
  subtitle: string;
  weekRangeLabel?: string;
  onNavigate: (dir: 'prev' | 'next' | 'today') => void;
  localOnly?: boolean;
  onLocalOnlyChange?: (val: boolean) => void;
  countryRegion?: string;
  rightSlot?: React.ReactNode;
  onLocationClick?: () => void;
}

export function PlannerHeader({
  mode,
  onModeChange,
  title,
  subtitle,
  weekRangeLabel,
  onNavigate,
  localOnly = false,
  onLocalOnlyChange,
  countryRegion = 'IN India',
  rightSlot,
  onLocationClick,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 py-2.5 px-4 bg-card border border-border/80 rounded-2xl shadow-xs transition-all mb-4">
      {/* LEFT: Title & Mode Switcher */}
      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-2 text-primary">
          <div className="w-8 h-8 rounded-xl bg-accent-subtle text-accent-fg border border-accent/20 flex items-center justify-center shadow-2xs">
            <LayoutTemplate className="w-4 h-4 stroke-[2]" />
          </div>
          <h1 className="text-[18px] font-semibold tracking-tight font-sans">Planner</h1>
        </div>

        {/* TABS (Segmented Pill Switcher with WEEK, SCHEDULE, MONTH) */}
        <div className="flex items-center p-1 rounded-xl bg-surface border border-border/80 shadow-2xs">
          <button
            type="button"
            onClick={() => onModeChange('plan')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              mode === 'plan'
                ? 'bg-accent text-on-accent shadow-xs'
                : 'text-secondary hover:text-primary hover:bg-surface-hover'
            )}
          >
            <CalendarDays className="w-3.5 h-3.5 stroke-[2]" />
            <span>WEEK</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange('day')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              mode === 'day'
                ? 'bg-accent text-on-accent shadow-xs'
                : 'text-secondary hover:text-primary hover:bg-surface-hover'
            )}
          >
            <Clock className="w-3.5 h-3.5 stroke-[2]" />
            <span>SCHEDULE</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange('calendar')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              mode === 'calendar'
                ? 'bg-accent text-on-accent shadow-xs'
                : 'text-secondary hover:text-primary hover:bg-surface-hover'
            )}
          >
            <Calendar className="w-3.5 h-3.5 stroke-[2]" />
            <span>MONTH</span>
          </button>
        </div>
      </div>

      {/* CENTER: Date Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('today')}
          className="flex items-center gap-1 px-3 py-1.5 border border-border/80 rounded-xl text-xs font-mono font-semibold text-primary hover:bg-surface-hover hover:border-accent/40 transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
        >
          <ArrowLeft size={12} className="text-secondary" /> Today
        </button>

        <div className="flex items-center p-0.5 rounded-xl border border-border/80 bg-surface shadow-2xs">
          <button
            onClick={() => onNavigate('prev')}
            className="p-1 rounded-lg text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
            title="Previous"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => onNavigate('next')}
            className="p-1 rounded-lg text-secondary hover:bg-surface-hover hover:text-primary transition-colors cursor-pointer"
            title="Next"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="flex items-center gap-2 ml-1">
          <span className="text-[18px] font-bold text-primary font-mono tracking-tight tabular-nums">{weekRangeLabel || title}</span>
          {mode === 'plan' && (
            <span className="px-2.5 py-0.5 bg-surface border border-border/80 text-secondary shadow-2xs text-[10px] font-mono font-semibold rounded-full">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* RIGHT CONTROLS */}
      <div className="flex items-center gap-2">
        <div
          onClick={onLocationClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border/80 hover:border-accent/40 rounded-xl text-xs font-mono font-semibold text-primary transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
          title="Change location holidays"
        >
          <span>{countryRegion}</span>
          <Globe size={13} className="text-secondary" />
        </div>

        {mode === 'calendar' && (
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border/80 rounded-xl text-xs font-mono text-primary cursor-pointer transition-colors shadow-2xs">
            <input
              type="checkbox"
              checked={localOnly}
              onChange={(e) => onLocalOnlyChange && onLocalOnlyChange(e.target.checked)}
              className="rounded border-border text-accent focus:ring-accent w-3.5 h-3.5 accent-accent"
            />
            <span title="Filter to official public holidays, hiding observances and optional days">
              Public holidays only
            </span>
          </label>
        )}

        {rightSlot}
      </div>
    </div>
  );
}
