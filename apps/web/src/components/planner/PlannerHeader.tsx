import { ChevronLeft, ChevronRight, Globe, RefreshCw, ChevronDown, ArrowLeft, LayoutTemplate } from 'lucide-react';
import React from 'react';

interface Props {
  mode: 'plan' | 'calendar';
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
  onCalendarViewChange?: (view: 'month' | 'week' | 'list') => void;
  localOnly?: boolean;
  onLocalOnlyChange?: (val: boolean) => void;
  countryRegion?: string;
  rightSlot?: React.ReactNode;
  isGoogleConnected?: boolean;
  onDisconnectGoogle?: () => void;
  onSyncGoogle?: () => void;
  isSyncingGoogle?: boolean;
}

export function PlannerHeader({
  mode,
  onModeChange,
  title,
  subtitle,
  weekRangeLabel,
  onNavigate,
  syncStatus,
  calendarView = 'month',
  onCalendarViewChange,
  localOnly = false,
  onLocalOnlyChange,
  countryRegion = 'IN India',
  rightSlot,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-slate-800 dark:text-slate-100">
        <LayoutTemplate className="w-7 h-7 text-slate-700 dark:text-slate-200" strokeWidth={2} />
        <h1 className="text-[28px] font-bold tracking-tight">Planner</h1>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* TABS */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onModeChange('plan')}
            className={"flex flex-col items-center justify-center w-36 py-2 rounded-xl transition-all border " + (mode === 'plan' ? 'bg-blue-50/50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400' : 'bg-white dark:bg-[#0F172A] border-slate-200 dark:border-[#334155] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1E293B]')}
          >
            <span className="text-[13px] font-bold">PLAN</span>
            <span className="text-[10px] font-medium opacity-70">Plan your week</span>
          </button>
          <button
            onClick={() => onModeChange('calendar')}
            className={"flex flex-col items-center justify-center w-36 py-2 rounded-xl transition-all border " + (mode === 'calendar' ? 'bg-blue-50/50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800/50 dark:text-blue-400' : 'bg-white dark:bg-[#0F172A] border-slate-200 dark:border-[#334155] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1E293B]')}
          >
            <span className="text-[13px] font-bold">CALENDAR</span>
            <span className="text-[10px] font-medium opacity-70">Holidays & Events</span>
          </button>
        </div>

        {/* DATE NAVIGATION */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('today')}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-[#334155] rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors shadow-sm"
          >
            <ArrowLeft size={14} className="text-slate-400 dark:text-slate-500" /> Today
          </button>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => onNavigate('prev')}
              className="p-1.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1E293B] hover:text-slate-800 dark:text-slate-100 transition-colors shadow-sm"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onNavigate('next')}
              className="p-1.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1E293B] hover:text-slate-800 dark:text-slate-100 transition-colors shadow-sm"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[16px] font-bold text-slate-800 dark:text-slate-100">{title}</span>
            {mode === 'plan' && (
              <span className="px-2 py-0.5 bg-slate-50 dark:bg-[#1E293B] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#334155] shadow-sm text-[11px] font-bold rounded-md">
                {weekRangeLabel || subtitle}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT CONTROLS */}
        <div className="flex items-center gap-3">
          <button 
              onClick={() => {
                const event = new CustomEvent('oauth-google-sync');
                window.dispatchEvent(event);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"></path></svg>
              <span>Sync Calendar</span>
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors cursor-pointer shadow-sm">
            <span>{countryRegion}</span>
            <Globe size={14} className="text-slate-400 dark:text-slate-500" />
          </div>
          
          {mode === 'calendar' && (
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors shadow-sm">
              <input
                type="checkbox"
                checked={localOnly}
                onChange={(e) => onLocalOnlyChange && onLocalOnlyChange(e.target.checked)}
                className="rounded border-slate-300 dark:border-[#475569] text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              Local only
            </label>
          )}

          {rightSlot}
        </div>

      </div>
    </div>
  );
}
