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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-primary text-secondary">
        <LayoutTemplate className="w-7 h-7 text-primary text-secondary" strokeWidth={2} />
        <h1 className="text-[28px] font-bold tracking-tight">Planner</h1>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* TABS */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onModeChange('plan')}
            className={"flex flex-col items-center justify-center w-36 py-2 rounded-xl transition-all border " + (mode === 'plan' ? 'bg-blue-50/50 border-blue-100 text-accent ' : 'bg-surface bg-surface-hover border-border border-border text-muted hover:bg-slate-50 ')}
          >
            <span className="text-[13px] font-bold">PLAN</span>
            <span className="text-[10px] font-medium opacity-70">Plan your week</span>
          </button>
          <button
            onClick={() => onModeChange('calendar')}
            className={"flex flex-col items-center justify-center w-36 py-2 rounded-xl transition-all border " + (mode === 'calendar' ? 'bg-blue-50/50 border-blue-100 text-accent ' : 'bg-surface bg-surface-hover border-border border-border text-muted hover:bg-slate-50 ')}
          >
            <span className="text-[13px] font-bold">CALENDAR</span>
            <span className="text-[10px] font-medium opacity-70">Holidays & Events</span>
          </button>
        </div>

 {/* DATE NAVIGATION */}
 <div className="flex items-center gap-4">
 <button 
 onClick={() => onNavigate('today')}
 className="flex items-center gap-1.5 px-3 py-1.5 border border-border border-border rounded-lg text-xs font-bold text-primary text-secondary hover:bg-slate-50 transition-colors shadow-sm"
 >
 <ArrowLeft size={14} className="text-muted " /> Today
 </button>
 
 <div className="flex items-center gap-1">
 <button
 onClick={() => onNavigate('prev')}
 className="p-1.5 bg-surface bg-surface-hover border border-border border-border rounded-lg text-muted hover:bg-slate-50 hover:text-primary text-secondary transition-colors shadow-sm"
 >
 <ChevronLeft size={16} />
 </button>
 <button
 onClick={() => onNavigate('next')}
 className="p-1.5 bg-surface bg-surface-hover border border-border border-border rounded-lg text-muted hover:bg-slate-50 hover:text-primary text-secondary transition-colors shadow-sm"
 >
 <ChevronRight size={16} />
 </button>
 </div>

 <div className="flex items-center gap-3">
 <span className="text-[16px] font-bold text-primary text-secondary">{title}</span>
 {mode === 'plan' && (
 <span className="px-2 py-0.5 bg-slate-50 bg-surface-hover text-muted border border-border border-border shadow-sm text-[11px] font-bold rounded-md">
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
 className="flex items-center gap-1.5 px-3 py-1.5 bg-surface bg-surface-hover border border-border border-border rounded-lg text-[11px] font-bold text-accent hover:bg-slate-50 transition-colors shadow-sm"
 >
 <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"></path></svg>
 <span>Sync Calendar</span>
 </button>
 <div 
 onClick={onLocationClick}
 className="flex items-center gap-1.5 px-3 py-1.5 bg-surface bg-surface-hover border border-border border-border rounded-lg text-[11px] font-bold text-primary hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
 >
 <span>{countryRegion}</span>
 <Globe size={14} className="text-muted " />
 </div>
 
 {mode === 'calendar' && (
 <label className="flex items-center gap-1.5 px-3 py-1.5 bg-surface bg-surface-hover border border-border border-border rounded-lg text-[11px] font-bold text-primary cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
 <input
 type="checkbox"
 checked={localOnly}
 onChange={(e) => onLocalOnlyChange && onLocalOnlyChange(e.target.checked)}
 className="rounded border-border border-border text-accent focus:ring-blue-500 w-3.5 h-3.5"
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
