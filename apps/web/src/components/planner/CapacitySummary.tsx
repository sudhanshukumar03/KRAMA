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
    <section className="planner-capacity" aria-label="Weekly capacity and progress">
      {cards.map(card => <div key={card.label} className="planner-capacity-cell">
        <div className="planner-capacity-label">
          <card.icon size={15} className={card.accentColor} aria-hidden="true" />
          <span>{card.label}</span>
        </div>
        <div className="planner-capacity-value">
          <strong>{formatMinutes(card.value)}</strong>
          {card.percent !== null && <span>{card.percent}%</span>}
        </div>
        {card.label === 'Weekly Capacity' && onEdit && <button type="button" onClick={onEdit} className="planner-capacity-edit">Edit</button>}
        <progress className="krama-progress" max={100} value={Math.min(100, Math.max(0, card.percent ?? 100))} aria-label={`${card.label} percentage`} />
      </div>)}
      <div className="planner-capacity-cell">
        <div className="planner-capacity-label"><CheckCircle2 size={15} aria-hidden="true" /><span>Completion</span></div>
        <div className="planner-capacity-value"><strong>{capacity.taskCompletionPercent ?? 0}%</strong></div>
        <span className="planner-capacity-context">{typeof capacity.scheduledTaskCount === 'number' && capacity.scheduledTaskCount > 0 ? `${capacity.completedTaskCount ?? 0}/${capacity.scheduledTaskCount} tasks` : 'This week'}</span>
        <progress className="krama-progress" max={100} value={Math.min(100, capacity.taskCompletionPercent ?? 0)} aria-label="Weekly task completion" />
      </div>
    </section>
  );
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h 00m`;
  return `0h ${m}m`;
}
