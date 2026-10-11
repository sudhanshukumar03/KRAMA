import type { Request, Response } from 'express';
import { reportingClock, shiftDay, validDayKey } from '../services/reportingTime';
import { habitService } from '../services/habit.service';
import { prisma } from '../prisma';

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const workspaceId =
      (req as any).workspaceId ||
      (req.headers['x-workspace-id'] as string) ||
      (req.query.workspaceId as string);
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const clock = reportingClock(user, req.headers['x-timezone'] as string | undefined, (req.headers['x-timezone-offset'] || req.query.tzOffset) as string | undefined);
    const dateKey = typeof req.query.date === 'string' ? req.query.date : clock.dateKey(new Date());
    if (!validDayKey(dateKey)) return res.status(400).json({ message: 'Invalid date' });
    // Task dates are calendar keys; focus startTime is a real instant.
    const startOfToday = new Date(`${dateKey}T00:00:00.000Z`);
    const endOfToday = new Date(`${dateKey}T23:59:59.999Z`);
    const focusStart = clock.dayStart(dateKey);
    const focusEnd = clock.dayStart(shiftDay(dateKey, 1));

    const [
      workspace,
      projects,
      projectCount,
      tasksCount,
      todayTasks,
      habits,
      habitCount,
      noteCount,
      focusSessions,
      focusSessionsCount,
      focusSessionsCompletedCount,
      todayFocusSessions,
      activityLogs,
      goalsCount,
      goals,
      todayFocusStats
    ] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: workspaceId } }),
      prisma.project.findMany({ where: { workspaceId, deletedAt: null }, orderBy: { updatedAt: 'desc' }, take: 10 }),
      prisma.project.count({ where: { workspaceId, deletedAt: null } }),
      prisma.task.count({ where: { workspaceId, deletedAt: null } }),
      prisma.task.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          status: { not: 'CANCELED' },
          OR: [
            { scheduledDate: { gte: startOfToday, lte: endOfToday } },
            { dueDate: { gte: startOfToday, lte: endOfToday } },
            // Overdue tasks that are not yet completed
            {
              status: { not: 'DONE' },
              OR: [
                { scheduledDate: { lt: startOfToday } },
                { dueDate: { lt: startOfToday } },
              ],
            },
          ],
        },
        orderBy: [
          { dueDate: 'asc' },
          { updatedAt: 'desc' },
        ],
        take: 50,
      }),
      habitService.listHabits(workspaceId, userId),
  prisma.habit.count({ where: { workspaceId, deletedAt: null } }),
  prisma.document.count({
    where: {
      space: { workspaceId, deletedAt: null },
      deletedAt: null
    }
  }),
  prisma.focusSession.findMany({ where: { workspaceId, userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
  prisma.focusSession.count({ where: { workspaceId, userId } }),
  prisma.focusSession.count({ where: { workspaceId, userId, completed: true } }),
  prisma.focusSession.findMany({ where: { workspaceId, userId, startTime: { gte: focusStart, lt: focusEnd }, completed: true, type: { in: ['pomodoro', 'custom'] } }, take: 20 }),
  prisma.activityLog.findMany({ where: { workspaceId, userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
  prisma.goal.count({ where: { workspaceId, deletedAt: null } }),
  prisma.goal.findMany({ where: { workspaceId, deletedAt: null, parentGoalId: null }, select: { id: true, title: true, progress: true, targetDate: true, metadata: true }, orderBy: { updatedAt: 'desc' }, take: 3 }),
  prisma.focusSession.aggregate({ where: { workspaceId, userId, completed: true, type: { in: ['pomodoro', 'custom'] }, startTime: { gte: focusStart, lt: focusEnd } }, _sum: { duration: true } })
    ]);

// Project progress calculation (fetch stats for the 10 projects we loaded)
const projectIds = projects.map(p => p.id);
let projectsWithProgress = projects.map(p => ({ ...p, progress: 0 }));

if (projectIds.length > 0) {
  const projectTasksCount = await prisma.task.groupBy({
    by: ['projectId', 'status'],
    where: { workspaceId, projectId: { in: projectIds }, deletedAt: null, status: { not: 'CANCELED' } },
    _count: true
  });

  projectsWithProgress = projects.map(p => {
    const pTasks = projectTasksCount.filter(pt => pt.projectId === p.id);
    const total = pTasks.reduce((sum, pt) => sum + pt._count, 0);
    const completed = pTasks.find(pt => pt.status === 'DONE')?._count || 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { ...p, progress };
  });
}

// Onboarding Calculation
const hasWorkspace = !!workspace;
const hasProject = projectCount > 0;
const hasTask = tasksCount > 0;
const hasHabit = habitCount > 0;
const hasNote = noteCount > 0;
const hasGoal = goalsCount > 0;
const hasFocusSession = focusSessionsCount > 0;
const hasCompletedPomodoro = focusSessionsCompletedCount > 0;

const onboardingSteps = [
  { id: 'workspace', title: 'Create Workspace', completed: hasWorkspace },
  { id: 'goal', title: 'Create Goal', completed: hasGoal },
  { id: 'project', title: 'Create Project', completed: hasProject },
  { id: 'task', title: 'Create Task', completed: hasTask },
  { id: 'note', title: 'Create Note', completed: hasNote },
  { id: 'habit', title: 'Create Habit', completed: hasHabit },
  { id: 'focus_session', title: 'Start First Focus Session', completed: hasFocusSession },
  { id: 'complete_pomodoro', title: 'Complete First Pomodoro', completed: hasCompletedPomodoro },
];

const completedSteps = onboardingSteps.filter(s => s.completed).length;

const greeting = `Welcome back, ${user?.name?.split(' ')[0] || 'there'}.`;

// AI Insights Threshold
const canUnlockAi = tasksCount >= 15 && focusSessionsCount >= 8;

res.status(200).json({
  greeting,
  onboarding: {
    completed: completedSteps,
    total: onboardingSteps.length,
    steps: onboardingSteps
  },
  workspace,
  stats: {
    totalProjects: projectCount,
    totalTasks: tasksCount,
    totalHabits: habitCount,
    totalNotes: noteCount,
    totalGoals: goalsCount
  },
  today: {
    tasks: todayTasks,
    overdueTaskIds: todayTasks.filter(task => task.status !== 'DONE' && ((task.dueDate && task.dueDate < startOfToday) || (task.scheduledDate && task.scheduledDate < startOfToday))).map(task => task.id),
    focusMinutes: (todayFocusStats._sum.duration || 0) / 60,
    focusSessions: todayFocusSessions
  },
  habits,
  goals,
  dateKey,
  projects: projectsWithProgress,
  focus: {
    sessions: focusSessions,
  },
  activity: activityLogs,
  features: {
    aiInsights: canUnlockAi,
    dashboardLayout: false, // Phase 3
    achievements: false, // Phase 3
    knowledgeGraph: true,
    quickCapture: true,
    pomodoro: true
  }
});

  } catch (error) {
  if ((error as Error).message?.startsWith('Invalid ')) return res.status(400).json({ message: (error as Error).message });
  console.error('Error fetching dashboard data:', error);
  res.status(500).json({ message: 'Internal server error' });
}
};
