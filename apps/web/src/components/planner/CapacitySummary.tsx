import { CalendarDays, Clock, Users, Coffee, CheckCircle2 } from 'lucide-react';

interface CapacityProps {
  weeklyCapacityMinutes: number;
  occupiedMinutes: number;
  meetingMinutes: number;
  otherMinutes: number;
  freeMinutes: number;
  taskCompletionPercent?: number;
  scheduledTaskCount?: number;
  completedTaskCount?: number;
}

interface Props {
  capacity: CapacityProps | null | undefined;
  onEdit?: () => void;
}

export function CapacitySummary({ capacity, onEdit }: Props) {
  if (!capacity) return null;

  const cards = [
    {
      label: 'Weekly Capacity',
      icon: CalendarDays,
      accentColor: 'text-cat-tasks',
      iconBg: 'bg-cat-tasks-bg border-cat-tasks/20',
      value: capacity.weeklyCapacityMinutes,
      percent: null,
      gradient: 'from-accent to-accent-hover',
    },
    {
      label: 'Planned',
      icon: Clock,
      accentColor: 'text-cat-timeblocks',
      iconBg: 'bg-cat-timeblocks-bg border-cat-timeblocks/20',
      value: capacity.occupiedMinutes,
      percent: capacity.weeklyCapacityMinutes > 0 ? Math.round((capacity.occupiedMinutes / capacity.weeklyCapacityMinutes) * 100) : 0,
      gradient: 'from-cat-timeblocks to-accent',
    },
    {
      label: 'Sync / Meetings',
      icon: Users,
      accentColor: 'text-cat-projects',
      iconBg: 'bg-cat-projects-bg border-cat-projects/20',
      value: capacity.meetingMinutes,
      percent: capacity.weeklyCapacityMinutes > 0 ? Math.round((capacity.meetingMinutes / capacity.weeklyCapacityMinutes) * 100) : 0,
      gradient: 'from-cat-projects to-accent',
    },
    {
      label: 'Other',
      icon: Clock,
      accentColor: 'text-warning-fg',
      iconBg: 'bg-warning-bg border-warning-border',
      value: capacity.otherMinutes,
      percent: capacity.weeklyCapacityMinutes > 0 ? Math.round((capacity.otherMinutes / capacity.weeklyCapacityMinutes) * 100) : 0,
      gradient: 'from-warning-fg to-warning-fg/70',
    },
    {
      label: 'Free Time',
      icon: Coffee,
      accentColor: 'text-success-fg',
      iconBg: 'bg-success-bg border-success-border',
      value: capacity.freeMinutes,
      percent: capacity.weeklyCapacityMinutes > 0 ? Math.round((capacity.freeMinutes / capacity.weeklyCapacityMinutes) * 100) : 0,
      gradient: 'from-success-fg to-success-fg/70',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 shrink-0">
      {cards.map((card) => (
        <div
          key={card.label}
          className="group relative krama-card p-3 flex flex-col justify-between gap-2 shadow-sm transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${card.iconBg} shrink-0`}>
                <card.icon size={11} className={card.accentColor} />
              </div>
              <span className="text-[10px] font-semibold text-secondary truncate tracking-tight">{card.label}</span>
            </div>
            {card.label === 'Weekly Capacity' && onEdit && (
              <button 
                onClick={(e) => { e.preventDefault(); onEdit(); }} 
                className="text-[9px] font-semibold text-accent hover:text-accent-fg bg-accent/10 hover:bg-accent/20 px-1.5 py-0.5 rounded transition-colors shrink-0"
              >
                Edit
              </button>
            )}
            {card.percent !== null && (
              <span className="text-[10px] font-bold text-muted tabular-nums shrink-0">
                {card.percent}%
              </span>
            )}
          </div>
          
          <div className="flex items-baseline justify-between mt-0.5">
            <span className="text-xs font-bold text-primary tabular-nums tracking-tight font-mono">
              {formatMinutes(card.value)}
            </span>
          </div>

          <div className="w-full bg-border/40 rounded-full h-1 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${card.gradient} transition-all duration-300`}
              style={{ width: `${card.percent ?? 100}%` }}
            />
          </div>
        </div>
      ))}
      
      {/* Completion */}
      <div className="group relative bg-surface/70 hover:bg-surface/90 border border-border/80 hover:border-border rounded-xl p-3 flex flex-col justify-between gap-2 shadow-sm transition-all duration-200 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-md flex items-center justify-center border bg-success-bg border-success-border text-success-fg shrink-0">
              <CheckCircle2 size={11} />
            </div>
            <span className="text-[10px] font-semibold text-secondary truncate tracking-tight">Completion</span>
          </div>
          <span className="text-[9px] font-semibold text-muted bg-surface-hover px-1.5 py-0.5 rounded">This Week</span>
        </div>
        <div className="flex items-baseline justify-between mt-0.5">
          <span className="text-xs font-black text-primary tabular-nums font-mono">
            {capacity.taskCompletionPercent ?? 0}%
          </span>
          {typeof capacity.scheduledTaskCount === 'number' && capacity.scheduledTaskCount > 0 && (
            <span className="text-[10px] font-semibold text-muted tabular-nums font-mono">
              {capacity.completedTaskCount ?? 0}/{capacity.scheduledTaskCount}
            </span>
          )}
        </div>
        <div className="w-full bg-border/40 rounded-full h-1 overflow-hidden">
          <div
            className="h-full rounded-full bg-success-fg transition-all duration-300"
            style={{ width: `${Math.min(100, capacity.taskCompletionPercent ?? 0)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h 00m`;
  return `0h ${m}m`;
}
