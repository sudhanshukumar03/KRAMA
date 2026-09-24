import type { Request, Response } from 'express';
import { prisma } from '../prisma';

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Fetch aggregates in parallel
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [
      workspace,
      projects,
      projectCount,
      tasksCount,
      todayTasks,
      habits,
      habitCount,
      noteCount,
      dailyLogs,
      dailyLogCount,
      focusSessions,
      focusSessionsCount,
      focusSessionsCompletedCount,
      todayFocusSessions,
      activityLogs,
      goalsCount
    ] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: workspaceId } }),
      prisma.project.findMany({ where: { workspaceId, deletedAt: null }, orderBy: { updatedAt: 'desc' }, take: 10 }),
      prisma.project.count({ where: { workspaceId, deletedAt: null } }),
      prisma.task.count({ where: { workspaceId, deletedAt: null } }),
      prisma.task.findMany({ 
        where: { workspaceId, deletedAt: null, dueDate: { gte: startOfToday, lte: endOfToday } },
        orderBy: { updatedAt: 'desc' },
        take: 50
      }),
      prisma.habit.findMany({ where: { workspaceId, deletedAt: null }, orderBy: { updatedAt: 'desc' }, include: { completions: true }, take: 20 }),
      prisma.habit.count({ where: { workspaceId, deletedAt: null } }),
      prisma.document.count({ where: { space: { workspaceId }, deletedAt: null } }),
      prisma.dailyLog.findMany({ where: { workspaceId, deletedAt: null }, orderBy: { date: 'desc' }, take: 14 }),
      prisma.dailyLog.count({ where: { workspaceId, deletedAt: null } }),
      prisma.focusSession.findMany({ where: { workspaceId, userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.focusSession.count({ where: { workspaceId, userId: req.user!.id } }),
      prisma.focusSession.count({ where: { workspaceId, userId: req.user!.id, completed: true } }),
      prisma.focusSession.findMany({ where: { workspaceId, userId: req.user!.id, startTime: { gte: startOfToday, lte: endOfToday } }, take: 20 }),
      prisma.activityLog.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.goal.count({ where: { workspaceId, deletedAt: null } })
    ]);

    // Project progress calculation (fetch stats for the 10 projects we loaded)
    const projectIds = projects.map(p => p.id);
    const projectTasksCount = await prisma.task.groupBy({
      by: ['projectId', 'status'],
      where: { projectId: { in: projectIds }, deletedAt: null },
      _count: true
    });

    const projectsWithProgress = projects.map(p => {
      const pTasks = projectTasksCount.filter(pt => pt.projectId === p.id);
      const total = pTasks.reduce((sum, pt) => sum + pt._count, 0);
      const completed = pTasks.find(pt => pt.status === 'DONE')?._count || 0;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { ...p, progress };
    });

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

    // Time-aware Greeting
    const hour = new Date().getHours();
    let greetingWord = 'Good Evening';
    if (hour < 12) greetingWord = 'Good Morning';
    else if (hour < 18) greetingWord = 'Good Afternoon';
    
    const firstName = user?.name ? user.name.split(' ')[0] : 'there';
    const greeting = `${greetingWord}, ${firstName}. Let's make today meaningful.`;

    // AI Insights Threshold
    const canUnlockAi = tasksCount >= 15 && focusSessionsCount >= 8 && dailyLogCount >= 5;

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
        totalNotes: noteCount
      },
      today: {
        tasks: todayTasks,
        focusSessions: todayFocusSessions
      },
      habits, // optionally return subset or all
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
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
