// =============================================================================
// CAPACITY SUMMARY — KRAMA OS
// =============================================================================

import { CalendarDays, Clock3, Users, Timer, Coffee } from 'lucide-react';
import type { PlannerCapacity } from '../../types/planner';

function minutesToText(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h 00m`;
}

interface Props {
  capacity: PlannerCapacity;
}

export function CapacitySummary({ capacity }: Props) {
  const cards = [
    {
      label: 'Weekly Capacity',
      value: minutesToText(capacity.weeklyCapacityMinutes),
      icon: CalendarDays,
      color: '#1A73E8',
      subtitle: 'Edit Capacity ✏',
    },
    {
      label: 'Planned',
      value: minutesToText(capacity.occupiedMinutes),
      icon: Clock3,
      color: '#1A73E8',
      pct: capacity.weeklyCapacityMinutes > 0
        ? Math.round((capacity.occupiedMinutes / capacity.weeklyCapacityMinutes) * 100)
        : 0,
    },
    {
      label: 'Meetings',
      value: minutesToText(capacity.meetingMinutes),
      icon: Users,
      color: '#9334E6',
      pct: capacity.weeklyCapacityMinutes > 0
        ? Math.round((capacity.meetingMinutes / capacity.weeklyCapacityMinutes) * 100)
        : 0,
    },
    {
      label: 'Other',
      value: minutesToText(capacity.otherMinutes),
      icon: Timer,
      color: '#E37400',
      pct: capacity.weeklyCapacityMinutes > 0
        ? Math.round((capacity.otherMinutes / capacity.weeklyCapacityMinutes) * 100)
        : 0,
    },
    {
      label: 'Free Time',
      value: minutesToText(capacity.freeMinutes),
      icon: Coffee,
      color: '#1E8E3E',
      pct: capacity.weeklyCapacityMinutes > 0
        ? Math.round((capacity.freeMinutes / capacity.weeklyCapacityMinutes) * 100)
        : 0,
    },
  ];

  return (
    <div className="grid grid-cols-6 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2"
        >
          <div className="flex items-center gap-2">
            <card.icon size={16} style={{ color: card.color }} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {card.label}
            </span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-xl font-bold text-slate-900">{card.value}</span>
            {card.pct !== undefined && (
              <span className="text-xs font-bold text-slate-400">{card.pct}%</span>
            )}
          </div>
          {card.pct !== undefined && (
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(card.pct, 100)}%`, backgroundColor: card.color }}
              />
            </div>
          )}
          {card.subtitle && (
            <span className="text-[11px] font-medium cursor-pointer hover:underline" style={{ color: card.color }}>
              {card.subtitle}
            </span>
          )}
        </div>
      ))}

      {/* Completion */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2 justify-center">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Completion
        </span>
        <span className="text-2xl font-bold text-slate-900">{capacity.completionPercent}%</span>
        <span className="text-xs text-slate-400">This Week</span>
      </div>
    </div>
  );
}
