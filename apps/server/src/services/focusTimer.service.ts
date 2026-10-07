import { prisma } from '../prisma';
import { calculateCapacity } from './capacity.service';
import { reportingClock, shiftDay } from './reportingTime';
import { localDayBoundsUtc } from './plannerTime';

export interface TimerPreferences {
  focusDuration?: number;     // default: 25 min
  shortBreak?: number;        // default: 5 min
  longBreak?: number;         // default: 15 min
  longBreakAfter?: number;    // default: 4 pomodoros
}

interface SessionSlot {
  index: number;
  type: 'pomodoro' | 'short_break' | 'long_break';
  durationMin: number;
  taskId: string | null;
  taskTitle: string | null;
  projectId: string | null;
  projectName: string | null;
  label: string;
  timeBlockId: string | null;

}

export interface FocusScheduleResult {
  mode: 'planner' | 'empty';
  plan: SessionSlot[];
  totalFocusMinutes: number;
  dailyCapMinutes: number;
  alreadyLoggedMinutes: number;
  remainingMinutes: number;
  taskBreakdown: { taskId: string; title: string; pomodoroCount: number }[];
  generatedAt: string;
}

export async function buildFocusSchedule(
  userId: string,
  workspaceId: string,
  userPrefs?: Partial<TimerPreferences>,
  requestedZone?: string,
  requestedOffset?: string
): Promise<FocusScheduleResult> {
  const prefs: Required<TimerPreferences> = {
    focusDuration: userPrefs?.focusDuration && userPrefs.focusDuration > 0 ? userPrefs.focusDuration : 25,
    shortBreak: userPrefs?.shortBreak && userPrefs.shortBreak > 0 ? userPrefs.shortBreak : 5,
    longBreak: userPrefs?.longBreak && userPrefs.longBreak > 0 ? userPrefs.longBreak : 15,
    longBreakAfter: userPrefs?.longBreakAfter && userPrefs.longBreakAfter > 0 ? userPrefs.longBreakAfter : 4,
  };

  // STEP 1: Load today's data.
  // "Today" is the user's LOCAL calendar day, not the server's — a server
  // deployed in another timezone would otherwise build the wrong day's
  // schedule. Resolve the user's timezone, derive their local date key, and
  // keep canonical UTC calendar bounds for task/block dates. Completed session
  // timestamps use local instant boundaries, matching Analytics.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { weeklyCapacityMinutes: true, metadata: true, countryCode: true }
  });
  const clock = reportingClock(user, requestedZone, requestedOffset);
  const localDateKey = clock.dateKey(new Date());
  const { start: startOfDay, end: endOfDay } = localDayBoundsUtc(localDateKey);

  const [timeBlocks, tasks, completedSessions, projects] = await Promise.all([
    prisma.timeBlock.findMany({
      where: { userId, workspaceId, date: { gte: startOfDay, lte: endOfDay } },
      orderBy: { startTime: 'asc' }
    }),
    prisma.task.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        status: { notIn: ['DONE', 'CANCELED'] },
        OR: [
          { scheduledDate: { gte: startOfDay, lte: endOfDay } },
          { dueDate: { gte: startOfDay, lte: endOfDay } },
          { timeBlocks: { some: { userId, workspaceId, date: { gte: startOfDay, lte: endOfDay } } } }
        ]
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }]
    }),
    prisma.focusSession.findMany({
      where: {
        userId,
        workspaceId,
        startTime: { gte: clock.dayStart(localDateKey), lt: clock.dayStart(shiftDay(localDateKey, 1)) },
        completed: true
      }
    }),
    prisma.project.findMany({
      where: { workspaceId, deletedAt: null },
      select: { id: true, name: true }
    })
  ]);

  const projectMap = new Map(projects.map(p => [p.id, p.name]));

  // STEP 2: Compute daily cap
  const dailyCapMinutes = Math.round((user?.weeklyCapacityMinutes ?? 2400) / 5);
  // calculateCapacity handles interval merging & meeting deduction
  const capacity = calculateCapacity(user?.weeklyCapacityMinutes ?? 2400, timeBlocks);
  const meetingMinutes = capacity.meetingMinutes;
  const effectiveDailyCapMinutes = Math.max(0, dailyCapMinutes - meetingMinutes);

  // Break/clock sessions must not consume the daily work cap.
  const alreadyLoggedMinutes = completedSessions
    .filter(s => s.type === 'pomodoro' || s.type === 'custom')
    .reduce((sum, s) => sum + s.duration, 0) / 60;
  const remainingMinutes = Math.max(0, effectiveDailyCapMinutes - alreadyLoggedMinutes);

  // STEP 3: Build work slots from TimeBlocks
  const focusBlockTypes = ['STUDY', 'WORK', 'HEALTH', 'ADMIN', 'OTHER'];
  const workBlocks = timeBlocks.filter(b => focusBlockTypes.includes(b.type));

  interface WorkSlot {
    blockId: string;
    durationMin: number;
    taskId: string | null;
    taskTitle: string | null;
    projectId: string | null;
    projectName: string | null;

  }

  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const workSlots: WorkSlot[] = [];

  for (const block of workBlocks) {
    const blockDuration = Math.max(1, Math.round(
      (new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000
    ));
    const linkedTask = block.taskId ? taskMap.get(block.taskId) : null;
    if (block.taskId && !linkedTask) continue;
    const candidateProject = block.projectId ?? linkedTask?.projectId ?? null;
    const projId = candidateProject && projectMap.has(candidateProject) ? candidateProject : null;
    workSlots.push({
      blockId: block.id,
      durationMin: blockDuration,
      taskId: linkedTask?.id ?? null,
      taskTitle: linkedTask?.title ?? block.title,
      projectId: projId,
      projectName: projId ? projectMap.get(projId) ?? null : null,

    });
  }

  // If no time blocks, create synthetic slots from high-priority tasks
  if (workSlots.length === 0 && workBlocks.length === 0 && tasks.length > 0) {
    for (const task of tasks.slice(0, 5)) {
      const estimate = task.estimateMinutes ?? prefs.focusDuration;
      const projId = task.projectId ?? null;
      workSlots.push({
        blockId: `synthetic-${task.id}`,
        durationMin: estimate,
        taskId: task.id,
        taskTitle: task.title,
        projectId: projId,
        projectName: projId ? projectMap.get(projId) ?? null : null,

      });
    }
  }

  if (workSlots.length === 0 || remainingMinutes <= 0) {
    return {
      mode: 'empty',
      plan: [],
      totalFocusMinutes: 0,
      dailyCapMinutes,
      alreadyLoggedMinutes,
      remainingMinutes,
      taskBreakdown: [],
      generatedAt: new Date().toISOString()
    };
  }

  // STEP 4: Expand each work slot into pomodoro + break cycles
  const plan: SessionSlot[] = [];
  let globalIndex = 0;
  let globalPomodoroCount = 0;
  const taskBreakdownMap = new Map<string, { taskId: string; title: string; pomodoroCount: number }>();

  for (let sIdx = 0; sIdx < workSlots.length; sIdx++) {
    const slot = workSlots[sIdx];
    if (!slot) continue;
    const effectiveDuration = slot.durationMin;
    if (effectiveDuration <= 0) continue;
    const pomodoroCount = Math.ceil(effectiveDuration / prefs.focusDuration);

    for (let p = 0; p < pomodoroCount; p++) {
      plan.push({
        index: globalIndex++,
        type: 'pomodoro',
        durationMin: Math.min(prefs.focusDuration, effectiveDuration - p * prefs.focusDuration),
        taskId: slot.taskId,
        taskTitle: slot.taskTitle,
        projectId: slot.projectId,
        projectName: slot.projectName,
        label: slot.taskTitle ? `${slot.taskTitle} (${p + 1}/${pomodoroCount})` : 'Focus',
        timeBlockId: slot.blockId.startsWith('synthetic') ? null : slot.blockId,

      });
      globalPomodoroCount++;

      // Check if this is the last pomodoro of the last work slot
      const isLastOfAll = sIdx === workSlots.length - 1 && p === pomodoroCount - 1;
      if (!isLastOfAll) {
        const isLongBreak = globalPomodoroCount % prefs.longBreakAfter === 0;
        plan.push({
          index: globalIndex++,
          type: isLongBreak ? 'long_break' : 'short_break',
          durationMin: isLongBreak ? prefs.longBreak : prefs.shortBreak,
          taskId: null,
          taskTitle: null,
          projectId: null,
          projectName: null,
          label: isLongBreak ? 'Long Break' : 'Short Break',
          timeBlockId: null
        });
      }
    }
  }

  // STEP 5: Enforce daily cap
  let plannedFocus = 0;
  const cappedPlan: SessionSlot[] = [];
  const maxAllowedFocus = remainingMinutes;

  for (const slot of plan) {
    if (slot.type === 'pomodoro') {
      const available = maxAllowedFocus - plannedFocus;
      if (available <= 0) break;
      slot.durationMin = Math.min(slot.durationMin, available);
      plannedFocus += slot.durationMin;
    }
    cappedPlan.push(slot);
  }

  // Remove trailing break if cappedPlan ends with a break
  while (cappedPlan.length > 0) {
    const lastSlot = cappedPlan[cappedPlan.length - 1];
    if (lastSlot && lastSlot.type !== 'pomodoro') {
      cappedPlan.pop();
    } else {
      break;
    }
  }

  // Re-index
  cappedPlan.forEach((s, idx) => { s.index = idx; });
  taskBreakdownMap.clear();
  for (const slot of cappedPlan) if (slot.type === 'pomodoro' && slot.taskId) {
    const entry = taskBreakdownMap.get(slot.taskId) || { taskId: slot.taskId, title: slot.taskTitle || 'Focus Session', pomodoroCount: 0 };
    entry.pomodoroCount++;
    taskBreakdownMap.set(slot.taskId, entry);
  }

  const result: FocusScheduleResult = {
    mode: 'planner',
    plan: cappedPlan,
    totalFocusMinutes: plannedFocus,
    dailyCapMinutes,
    alreadyLoggedMinutes,
    remainingMinutes,
    taskBreakdown: Array.from(taskBreakdownMap.values()),
    generatedAt: new Date().toISOString()
  };

  return result;
}
