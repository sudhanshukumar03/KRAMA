import { ChevronLeft, ChevronRight, Globe, ArrowLeft, LayoutTemplate } from 'lucide-react';
import React from 'react';

interface Props {
  mode: 'plan' | 'calendar' | 'day';
  onModeChange: (mode: 'plan' | 'calendar') => void;
  title: string;
  subtitle: string;
  weekRangeLabel?: string;
  onNavigate: (dir: 'prev' | 'next' | 'today') => void;
  syncStatus: {
    provider?: string | null;
    status?: string;
    lastSyncedAt?: string | null;
  } | null;
  calendarView?: 'month' | 'week' | 'list';
  
  localOnly?: boolean;
  onLocalOnlyChange?: (val: boolean) => void;
  countryRegion?: string;
  rightSlot?: React.ReactNode;
  isGoogleConnected?: boolean;
  onDisconnectGoogle?: () => void;
  onSyncGoogle?: () => void;
  isSyncingGoogle?: boolean;
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

        {/* TABS (Segmented Pill Switcher) */}
        <div className="flex items-center p-0.5 rounded-lg bg-surface border border-border">
          <button
            type="button"
            onClick={() => onModeChange('plan')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
              mode === 'plan'
                ? 'bg-accent text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface-hover'
            }`}
          >
            PLAN
          </button>
          <button
            type="button"
            onClick={() => onModeChange('calendar')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
              mode === 'calendar'
                ? 'bg-accent text-white shadow-sm'
                : 'text-secondary hover:text-primary hover:bg-surface-hover'
            }`}
          >
            CALENDAR
          </button>
        </div>
      </div>

      {/* CENTER: Date Navigation */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onNavigate('today')}
          className="flex items-center gap-1 px-2.5 py-1 border border-border rounded-lg text-xs font-bold text-primary hover:bg-surface-hover transition-colors shadow-sm"
        >
          <ArrowLeft size={12} className="text-secondary" /> Today
        </button>
        
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onNavigate('prev')}
            className="p-1 bg-surface border border-border rounded-md text-secondary hover:bg-surface-hover hover:text-primary transition-colors shadow-sm"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => onNavigate('next')}
            className="p-1 bg-surface border border-border rounded-md text-secondary hover:bg-surface-hover hover:text-primary transition-colors shadow-sm"
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
        <button 
          onClick={() => {
            const event = new CustomEvent('oauth-google-sync');
            window.dispatchEvent(event);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-surface hover:bg-surface-hover border border-border rounded-lg text-[11px] font-bold text-accent transition-colors shadow-sm"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"></path></svg>
          <span>Sync</span>
        </button>
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
            Local only
          </label>
        )}

        {rightSlot}
      </div>
    </div>
  );
}
