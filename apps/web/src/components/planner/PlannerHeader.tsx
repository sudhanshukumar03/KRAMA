import { ChevronLeft, ChevronRight, Globe, ArrowLeft, LayoutTemplate } from 'lucide-react';
import React from 'react';

interface Props {
  mode: 'plan' | 'calendar' | 'day';
  onModeChange: (mode: 'plan' | 'calendar' | 'day') => void;
  title: string;
  subtitle: string;
  weekRangeLabel?: string;
  onNavigate: (dir: 'prev' | 'next' | 'today') => void;
  calendarView?: 'month' | 'week' | 'list';
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
    <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 py-1">
      {/* LEFT: Title & Mode Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-primary">
          <LayoutTemplate className="w-5 h-5 text-accent" strokeWidth={2.2} />
          <h1 className="text-lg font-bold tracking-tight">Planner</h1>
        </div>

        {/* TABS (Segmented Pill Switcher with WEEK, SCHEDULE, MONTH) */}
        <div className="flex items-center p-0.5 rounded-lg bg-surface border border-border shadow-2xs">
          <button
            type="button"
            onClick={() => onModeChange('plan')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              mode === 'plan'
                ? 'bg-accent text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface-hover'
            }`}
          >
            WEEK
          </button>
          <button
            type="button"
            onClick={() => onModeChange('day')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              mode === 'day'
                ? 'bg-accent text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface-hover'
            }`}
          >
            SCHEDULE
          </button>
          <button
            type="button"
            onClick={() => onModeChange('calendar')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              mode === 'calendar'
                ? 'bg-accent text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface-hover'
            }`}
          >
            MONTH
          </button>
        </div>
      </div>

      {/* CENTER: Date Navigation */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onNavigate('today')}
          className="flex items-center gap-1 px-2.5 py-1 border border-border rounded-lg text-xs font-bold text-primary hover:bg-surface-hover transition-colors shadow-sm cursor-pointer"
        >
          <ArrowLeft size={12} className="text-secondary" /> Today
        </button>
        
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onNavigate('prev')}
            className="p-1 bg-surface border border-border rounded-md text-secondary hover:bg-surface-hover hover:text-primary transition-colors shadow-sm cursor-pointer"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => onNavigate('next')}
            className="p-1 bg-surface border border-border rounded-md text-secondary hover:bg-surface-hover hover:text-primary transition-colors shadow-sm cursor-pointer"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="flex items-center gap-2 ml-1">
          <span className="text-sm font-bold text-primary">{title}</span>
          {mode === 'plan' && (
            <span className="px-2 py-0.5 bg-surface border border-border text-secondary shadow-sm text-[10px] font-bold rounded-md">
              {weekRangeLabel || subtitle}
            </span>
          )}
        </div>
      </div>

      {/* RIGHT CONTROLS */}
      <div className="flex items-center gap-2">
        <div 
          onClick={onLocationClick}
          className="flex items-center gap-1 px-2.5 py-1 bg-surface hover:bg-surface-hover border border-border rounded-lg text-[11px] font-bold text-primary transition-colors cursor-pointer shadow-sm"
        >
          <span>{countryRegion}</span>
          <Globe size={13} className="text-secondary" />
        </div>
        
        {mode === 'calendar' && (
          <label className="flex items-center gap-1.5 px-2.5 py-1 bg-surface hover:bg-surface-hover border border-border rounded-lg text-[11px] font-bold text-primary cursor-pointer transition-colors shadow-sm">
            <input
              type="checkbox"
              checked={localOnly}
              onChange={(e) => onLocalOnlyChange && onLocalOnlyChange(e.target.checked)}
              className="rounded border-border text-accent focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span title="Filter to official public holidays, hiding observances and optional days">Public holidays only</span>
          </label>
        )}

        {rightSlot}
      </div>
    </div>
  );
}
