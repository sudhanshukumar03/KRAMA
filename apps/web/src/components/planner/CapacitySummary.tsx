import { CalendarDays, Clock, Users, Coffee, } from 'lucide-react';
import type { } from '../../types/planner';

interface Props {
 capacity: any;
 onEdit?: () => void;
}

export function CapacitySummary({ capacity, onEdit }: Props) {
  const cards = [
    {
      label: 'Weekly Capacity',
      icon: CalendarDays,
      colorClass: 'text-accent-fg',
      value: capacity.weeklyCapacityMinutes,
      percent: null,
      barColor: 'bg-accent',
    },
    {
      label: 'Planned',
      icon: Clock,
      colorClass: 'text-accent-fg',
      value: capacity.occupiedMinutes,
      percent: capacity.weeklyCapacityMinutes > 0 ? Math.round((capacity.occupiedMinutes / capacity.weeklyCapacityMinutes) * 100) : 0,
      barColor: 'bg-accent',
    },
    {
      label: 'Sync / Meetings',
      icon: Users,
      colorClass: 'text-cat-routines',
      value: capacity.meetingMinutes,
      percent: capacity.weeklyCapacityMinutes > 0 ? Math.round((capacity.meetingMinutes / capacity.weeklyCapacityMinutes) * 100) : 0,
      barColor: 'bg-cat-routines-bg',
    },
    {
      label: 'Other',
      icon: Clock,
      colorClass: 'text-warning-fg',
      value: capacity.otherMinutes,
      percent: capacity.weeklyCapacityMinutes > 0 ? Math.round((capacity.otherMinutes / capacity.weeklyCapacityMinutes) * 100) : 0,
      barColor: 'bg-warning-bg',
    },
    {
      label: 'Free Time',
      icon: Coffee,
      colorClass: 'text-success-fg',
      value: capacity.freeMinutes,
      percent: capacity.weeklyCapacityMinutes > 0 ? Math.round((capacity.freeMinutes / capacity.weeklyCapacityMinutes) * 100) : 0,
      barColor: 'bg-success-bg',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 shrink-0">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-surface border border-border rounded-lg px-2.5 py-1.5 flex flex-col justify-between gap-1 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <card.icon size={12} className={`shrink-0 ${card.colorClass}`} />
              <span className="text-[10px] font-bold text-secondary truncate">{card.label}</span>
            </div>
            {card.label === 'Weekly Capacity' && onEdit && (
              <button onClick={(e) => { e.preventDefault(); onEdit(); }} className="text-[9px] font-bold text-accent hover:underline shrink-0">Edit</button>
            )}
            {card.percent !== null && (
              <span className="text-[9px] font-bold text-secondary shrink-0">
                {card.percent}%
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary">
              {formatMinutes(card.value)}
            </span>
          </div>

          <div className="w-full bg-surface-hover rounded-full h-1 overflow-hidden">
            <div
              className={`h-full rounded-full ${card.barColor}`}
              style={{ width: `${card.percent || 100}%` }}
            />
          </div>
        </div>
      ))}
      
      {/* Completion */}
      <div className="bg-surface border border-border rounded-lg px-2.5 py-1.5 flex flex-col justify-between gap-1 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-secondary truncate">Completion</span>
          <span className="text-[9px] font-bold text-secondary">This Week</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-primary">{capacity.completionPercent}%</span>
        </div>
        <div className="w-full bg-surface-hover rounded-full h-1 overflow-hidden">
          <div
            className="h-full rounded-full bg-success-fg"
            style={{ width: `${Math.min(100, capacity.completionPercent || 0)}%` }}
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
