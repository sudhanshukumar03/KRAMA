// =============================================================================
// PLANNER HEADER - KRAMA OS
// =============================================================================

import { ChevronLeft, ChevronRight, Globe, RefreshCw, ChevronDown } from 'lucide-react';

interface Props {
  mode: 'plan' | 'calendar';
  onModeChange: (mode: 'plan' | 'calendar') => void;
  title: string;
  subtitle: string;
  onNavigate: (dir: 'prev' | 'next' | 'today') => void;
  syncStatus: {
    provider?: string | null;
    status?: string;
    lastSyncedAt?: string | null;
  } | null;
  // Calendar specific props
  calendarView?: 'month' | 'week' | 'list';
  onCalendarViewChange?: (view: 'month' | 'week' | 'list') => void;
  localOnly?: boolean;
  onLocalOnlyChange?: (val: boolean) => void;
  countryRegion?: string;
}

export function PlannerHeader({
  mode,
  onModeChange,
  title,
  subtitle,
  onNavigate,
  syncStatus,
  calendarView = 'month',
  onCalendarViewChange,
  localOnly = false,
  onLocalOnlyChange,
  countryRegion = 'IN India',
}: Props) {
  const syncLabel = syncStatus?.lastSyncedAt
    ? `Synced ${getTimeAgo(syncStatus.lastSyncedAt)}`
    : syncStatus?.status === 'SYNCING'
    ? 'Syncing...'
    : 'Local only';

  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-4">
      {/* TABS ROW */}
      <div className="flex items-center">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => onModeChange('plan')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[13px] font-bold transition-all ${
              mode === 'plan'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            PLAN
          </button>
          <button
            onClick={() => onModeChange('calendar')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[13px] font-bold transition-all ${
              mode === 'calendar'
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            CALENDAR
          </button>
        </div>
      </div>

      {/* TOOLBAR ROW */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        {/* LEFT CONTROLS */}
        <div className="flex items-center gap-4">
          {mode === 'plan' ? (
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
              Week View
              <ChevronDown size={14} className="text-slate-400" />
            </button>
          ) : (
            <>
              <select
                value={calendarView}
                onChange={(event) => onCalendarViewChange?.(event.target.value as 'month' | 'week' | 'list')}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <option value="month">Month View</option>
                <option value="week">Week View</option>
                <option value="list">List View</option>
              </select>
              {/* Secondary Sub-Tabs for Calendar mode, exactly like mockup */}
              <div className="flex items-center gap-4 border-l border-slate-200 pl-4 ml-1">
                <span className="text-[13px] font-bold text-green-700 border-b-2 border-green-600 pb-0.5 cursor-pointer">CALENDAR</span>
                <span className="text-[13px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer pb-0.5">HOLIDAYS</span>
              </div>
            </>
          )}

          <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
            <button
              onClick={() => onNavigate('prev')}
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onNavigate('next')}
              className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3 ml-2">
            <span className="text-[15px] font-bold text-slate-800">{title}</span>
            {mode === 'plan' && (
              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded-md">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT CONTROLS */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
            <span>{countryRegion}</span>
            <Globe size={14} className="text-slate-400 ml-1" />
          </div>

          {mode === 'calendar' ? (
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
              <input
                type="checkbox"
                checked={localOnly}
                onChange={(e) => onLocalOnlyChange && onLocalOnlyChange(e.target.checked)}
                className="rounded border-slate-300 text-green-600 focus:ring-green-500 w-3.5 h-3.5"
              />
              Local only
              <RefreshCw size={12} className="text-slate-400 ml-0.5" />
            </label>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-500 shadow-sm">
              <RefreshCw
                size={12}
                className={syncStatus?.status === 'SYNCING' ? 'animate-spin text-blue-500' : 'text-slate-400'}
              />
              {syncLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  return Math.floor(hours / 24) + "d ago";
}
