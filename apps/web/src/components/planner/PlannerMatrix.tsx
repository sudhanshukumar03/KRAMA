// =============================================================================
// PLANNER MATRIX — KRAMA OS
// =============================================================================
// The core 7-day grid with: Holidays, Routines, Tasks, Schedule, Projects

import { format, isSameDay, parseISO } from 'date-fns';
import { Plus } from 'lucide-react';
import type { PlannerData } from '../../types/planner';

const BLOCK_COLORS: Record<string, string> = {
  MEETING:  'bg-violet-50 border-violet-200 text-violet-800',
  PERSONAL: 'bg-orange-50 border-orange-200 text-orange-800',
  STUDY:    'bg-blue-50 border-blue-200 text-blue-800',
  WORK:     'bg-slate-50 border-slate-200 text-slate-800',
  HEALTH:   'bg-emerald-50 border-emerald-200 text-emerald-800',
  ADMIN:    'bg-gray-50 border-gray-200 text-gray-800',
  OTHER:    'bg-neutral-50 border-neutral-200 text-neutral-800',
};

const LEGEND = [
  { label: 'Sync / Meeting', color: 'bg-violet-500' },
  { label: 'Personal',       color: 'bg-orange-500' },
  { label: 'Study',          color: 'bg-blue-500' },
  { label: 'Work',           color: 'bg-slate-500' },
  { label: 'Health',         color: 'bg-emerald-500' },
  { label: 'Other',          color: 'bg-neutral-500' },
  { label: 'Completed',      color: 'bg-green-500' },
  { label: 'Planned',        color: 'bg-blue-400' },
  { label: 'Holiday',        color: 'bg-pink-500' },
];

interface Props {
  data: PlannerData;
  days: Date[];
  occurrenceFor: (routineId: string, day: Date) => any;
  onToggleRoutine: (occ: any) => void;
  onAddTimeBlock: (day: Date) => void;
  onAddTask?: (day: Date) => void;
  onAddRoutine?: (day: Date) => void;
}

function dateKey(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

export function PlannerMatrix({ data, days, occurrenceFor, onToggleRoutine, onAddTimeBlock, onAddTask, onAddRoutine }: Props) {
  const today = new Date();

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <div className="min-w-[1100px]">

            {/* ── DAY HEADERS ── */}
            <div className="grid grid-cols-[180px_repeat(7,minmax(130px,1fr))] bg-slate-50 border-b border-slate-200">
              <div className="p-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Categories
              </div>
              {days.map((day) => {
                const isToday = isSameDay(day, today);
                return (
                  <div key={dateKey(day)} className={`border-l border-slate-200 p-3 ${isToday ? 'bg-blue-50' : ''}`}>
                    <div className="text-[11px] font-bold uppercase text-slate-400">
                      {format(day, 'EEE')}
                    </div>
                    <div className="text-base font-semibold text-slate-800 mt-0.5">
                      {format(day, 'MMM d')}
                    </div>
                    {isToday && (
                      <span className="mt-1 inline-block rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        TODAY
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── ALL DAY / HOLIDAYS ── */}
            <MatrixRow label="All Day / Holidays">
          {days.map((day) => {
            const holidays = data.holidays.filter((h: any) => isSameDay(parseISO(h.date), day));
            return (
              <div key={dateKey(day)} className="border-l border-slate-200 p-1.5 min-h-[48px] flex flex-col gap-1">
                {holidays.map((h: any) => {
                  let bgClass = "bg-slate-50 border-slate-200 text-slate-600";
                  let typeText = h.type.replace("_", " ");
                  
                  if (h.isPublicHoliday) {
                    bgClass = "bg-pink-50 border-pink-200 text-pink-700 font-bold";
                    typeText = "Public Holiday";
                  } else if (h.type === "FESTIVAL") {
                    bgClass = "bg-orange-50 border-orange-200 text-orange-700";
                  } else if (h.isOptional) {
                    bgClass = "bg-white border-dashed border-slate-300 text-slate-500";
                  }
                  
                  return (
                    <div key={h.id} className={`rounded-lg border px-2 py-1.5 text-[11px] leading-tight ${bgClass}`} title={h.description}>
                      <div>{h.name}</div>
                      <div className="text-[9px] uppercase opacity-80 mt-0.5">{typeText}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </MatrixRow>

            {/* ── ROUTINES ── */}
            <MatrixRow label={`Routines`} subtitle={`${data.routines.length} routines`}>
              {days.map((day) => (
                <div key={dateKey(day)} className="border-l border-slate-200 p-2">
                  <div className="flex flex-col items-center gap-1.5">
                    {data.routines.map((routine) => {
                      const occ = occurrenceFor(routine.id, day);
                      return (
                        <button
                          key={routine.id}
                          disabled={!occ}
                          onClick={() => occ && onToggleRoutine(occ)}
                          title={routine.name}
                          className="transition-transform hover:scale-110 disabled:opacity-30"
                        >
                          <span className={`grid h-7 w-7 place-items-center rounded-full border text-xs font-bold ${
                            occ?.completed
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-slate-300 text-slate-400 hover:border-slate-400'
                          }`}>
                            {occ?.completed ? '✓' : '○'}
                          </span>
                        </button>
                      );
                    })}
                    {data.routines.length === 0 && !onAddRoutine && (
                      <span className="text-[10px] text-slate-300">—</span>
                    )}
                    {onAddRoutine && (
                      <button
                        onClick={() => onAddRoutine(day)}
                        className="mt-1 flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                        title="Add Routine"
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </MatrixRow>

            {/* ── TASKS ── */}
            <MatrixRow label="Tasks" subtitle={`${data.tasks.length} tasks`}>
              {days.map((day) => {
                const dayTasks = data.tasks.filter(
                  (t) => t.dueDate && isSameDay(parseISO(t.dueDate), day)
                );
                return (
                  <div key={dateKey(day)} className="border-l border-slate-200 p-2 min-h-[64px]">
                    <div className="space-y-1.5">
                      {dayTasks.map((task) => (
                        <div
                          key={task.id}
                          className={`rounded-lg px-2 py-1.5 text-[11px] font-medium border ${
                            task.completed
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 line-through'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}
                        >
                          {task.title}
                        </div>
                      ))}
                      {onAddTask && (
                        <button
                          onClick={() => onAddTask(day)}
                          className="flex w-full justify-center rounded-lg border border-dashed border-slate-300 py-1 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors mt-1"
                          title="Add Task"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </MatrixRow>

            {/* ── SCHEDULED TIME BLOCKS ── */}
            <MatrixRow label="Time Blocks" subtitle="Planned time">
              {days.map((day) => {
                const blocks = data.timeBlocks.filter((b) => isSameDay(parseISO(b.date), day));
                return (
                  <div key={dateKey(day)} className="border-l border-slate-200 p-2 min-h-[140px]">
                    <div className="space-y-1.5">
                      {blocks.map((block) => (
                        <div
                          key={block.id}
                          className={`rounded-lg border p-2 text-[11px] ${BLOCK_COLORS[block.type] || BLOCK_COLORS.OTHER}`}
                        >
                          <div className="font-semibold">{block.title}</div>
                          <div className="mt-0.5 opacity-70">
                            {safeTimeFormat(block.startTime)} — {safeTimeFormat(block.endTime)}
                          </div>
                          <div className="mt-0.5 text-[9px] uppercase tracking-wide opacity-50">
                            {block.type}
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => onAddTimeBlock(day)}
                        className="flex w-full justify-center rounded-lg border border-dashed border-slate-300 py-1.5 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </MatrixRow>

            {/* ── PROJECTS / MILESTONES ── */}
            <MatrixRow label="Projects / Milestones" subtitle={`${data.projects.length} projects`}>
              {days.map((day) => {
                const dayMilestones = data.milestones.filter(
                  (m) => isSameDay(parseISO(m.date), day)
                );
                return (
                  <div key={dateKey(day)} className="border-l border-slate-200 p-2 min-h-[48px]">
                    {dayMilestones.map((m) => (
                      <div key={m.id} className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1.5 text-[11px] font-medium text-emerald-700 mb-1">
                        ◆ {m.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </MatrixRow>
          </div>
        </div>
      </section>

      {/* ── LEGEND ── */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[11px] text-slate-500 mt-3">
        <div className="flex gap-4 flex-wrap">
          {LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${item.color}`} />
              {item.label}
            </span>
          ))}
        </div>
        <span className="font-mono font-medium">
          {data.capacity.completionPercent}% scheduled
        </span>
      </div>
    </>
  );
}

// ── Sub-components ──

function MatrixRow({ label, subtitle, children }: { label: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_repeat(7,minmax(130px,1fr))] border-t border-slate-200">
      <div className="p-3 flex flex-col justify-center">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        {subtitle && <span className="text-[10px] text-slate-400 mt-0.5">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function safeTimeFormat(timeStr: string): string {
  try {
    const d = parseISO(timeStr);
    return format(d, 'HH:mm');
  } catch {
    // If it's already "HH:mm" format
    return timeStr;
  }
}

