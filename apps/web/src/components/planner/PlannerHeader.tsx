// =============================================================================
// PLANNER HEADER — KRAMA OS
// =============================================================================

import { ChevronLeft, ChevronRight, Globe, RefreshCw } from 'lucide-react';

interface Props {
  mode: 'plan' | 'calendar';
  onModeChange: (mode: 'plan' | 'calendar') => void;
  weekRangeLabel: string;
  weekNumber: number;
  onNavigate: (dir: 'prev' | 'next' | 'today') => void;
  syncStatus: {
    provider?: string | null;
    status?: string;
    lastSyncedAt?: string | null;
  } | null;
}

export function PlannerHeader({
  mode,
  onModeChange,
  weekRangeLabel,
  weekNumber,
  onNavigate,
  syncStatus,
}: Props) {
  const syncLabel = syncStatus?.lastSyncedAt
    ? `Synced ${getTimeAgo(syncStatus.lastSyncedAt)}`
    : syncStatus?.status === 'SYNCING'
      ? 'Syncing...'
      : 'Not synced';

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {/* Left: Mode + Navigation */}
      <div className="flex items-center gap-3">
        {/* Plan / Calendar toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
          <button
            onClick={() => onModeChange('plan')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'plan'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex flex-col items-center">
              <span>PLAN</span>
              <span className="text-[10px] font-normal opacity-70">Plan your week</span>
            </div>
          </button>
          <button
            onClick={() => onModeChange('calendar')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'calendar'
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex flex-col items-center">
              <span>CALENDAR</span>
              <span className="text-[10px] font-normal opacity-70">Holidays & Events</span>
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-slate-200 hidden sm:block" />

        {/* Navigation */}
        <button
          onClick={() => onNavigate('today')}
          className="px-4 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Today
        </button>

        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => onNavigate('prev')}
            className="p-2 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => onNavigate('next')}
            className="p-2 hover:bg-slate-50 transition-colors border-l border-slate-200"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <span className="text-sm font-semibold text-slate-800">{weekRangeLabel}</span>
        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200">
          Week {weekNumber}
        </span>
      </div>

      {/* Right: Location + Sync */}
      <div className="flex items-center gap-4">
        {/* Location */}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="text-base">🇮🇳</span>
          <span className="font-medium">India • Bihar</span>
          <Globe size={14} className="text-slate-400" />
        </div>

        {/* Sync Status */}
        {syncStatus && (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${
                syncStatus.status === 'SYNC_ERROR' ? 'bg-red-500' :
                syncStatus.status === 'SYNCING' ? 'bg-yellow-500 animate-pulse' :
                'bg-green-500'
              }`} />
              <span className="text-slate-500 font-medium">
                {syncStatus.provider || 'Google'}
              </span>
            </div>
            <span className="text-slate-400">{syncLabel}</span>
            <button className="p-1 hover:bg-slate-100 rounded transition-colors">
              <RefreshCw size={12} className="text-slate-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
