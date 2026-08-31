import React from 'react';
import { CalendarDays, Clock, Users, Coffee, CheckCircle2, MoreHorizontal } from 'lucide-react';
import type { CapacityData } from '../../types/planner';

interface Props {
  capacity: CapacityData;
}

export function CapacitySummary({ capacity }: Props) {
  const cards = [
    {
      label: 'Weekly Capacity',
      icon: CalendarDays,
      color: '#3b82f6',
      value: capacity.weeklyCapacityMinutes,
      percent: null,
      barColor: 'bg-blue-500',
    },
    {
      label: 'Planned',
      icon: Clock,
      color: '#3b82f6',
      value: capacity.occupiedMinutes,
      percent: capacity.weeklyCapacityMinutes > 0 ? Math.round((capacity.occupiedMinutes / capacity.weeklyCapacityMinutes) * 100) : 0,
      barColor: 'bg-blue-500',
    },
    {
      label: 'Sync / Meetings',
      icon: Users,
      color: '#a855f7',
      value: capacity.meetingMinutes,
      percent: capacity.weeklyCapacityMinutes > 0 ? Math.round((capacity.meetingMinutes / capacity.weeklyCapacityMinutes) * 100) : 0,
      barColor: 'bg-purple-500',
    },
    {
      label: 'Other',
      icon: Clock,
      color: '#f97316',
      value: capacity.otherMinutes,
      percent: capacity.weeklyCapacityMinutes > 0 ? Math.round((capacity.otherMinutes / capacity.weeklyCapacityMinutes) * 100) : 0,
      barColor: 'bg-orange-500',
    },
    {
      label: 'Free Time',
      icon: Coffee,
      color: '#10b981',
      value: capacity.freeMinutes,
      percent: capacity.weeklyCapacityMinutes > 0 ? Math.round((capacity.freeMinutes / capacity.weeklyCapacityMinutes) * 100) : 0,
      barColor: 'bg-emerald-500',
    },
  ];

  return (
    <div className="grid grid-cols-6 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-2xl p-4 flex flex-col gap-2 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: card.color + '10' }}>
                <card.icon size={14} style={{ color: card.color }} />
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{card.label}</span>
            </div>
            {card.label === 'Weekly Capacity' && (
              <a href="#" className="text-[10px] font-bold text-blue-500 hover:underline whitespace-nowrap">Edit</a>
            )}
          </div>
          
          <div className="flex items-end justify-between mt-2">
            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {formatMinutes(card.value)}
            </span>
            {card.percent !== null && (
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1">
                {card.percent}%
              </span>
            )}
          </div>

          <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
            <div
              className={`h-1 rounded-full ${card.barColor}`}
              style={{ width: `${card.percent || 100}%` }}
            />
          </div>
        </div>
      ))}
      
      {/* Completion */}
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-2xl p-4 flex flex-col justify-center gap-1 shadow-sm">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Completion</span>
        <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{capacity.completionPercent}%</span>
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-1">This Week</span>
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
