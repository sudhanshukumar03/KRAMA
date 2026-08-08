import type { Request, Response } from 'express';
import { prisma } from '../prisma';

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;
    if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });

    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Fetch aggregates in parallel
    const [
      workspace,
      projects,
      tasks,
      habits,
      pages,
      dailyLogs,
      focusSessions,
      activityLogs,
      goals
    ] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: workspaceId } }),
      prisma.project.findMany({ where: { workspaceId, deletedAt: null }, orderBy: { updatedAt: 'desc' } }),
      prisma.task.findMany({ where: { workspaceId, deletedAt: null }, orderBy: { updatedAt: 'desc' } }),
      prisma.habit.findMany({ where: { workspaceId, deletedAt: null }, orderBy: { updatedAt: 'desc' }, include: { completions: true } }),
      prisma.page.findMany({ where: { workspaceId, deletedAt: null }, orderBy: { updatedAt: 'desc' } }),
      prisma.dailyLog.findMany({ where: { workspaceId, deletedAt: null }, orderBy: { date: 'desc' }, take: 14 }),
      prisma.focusSession.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } }),
      prisma.activityLog.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.goal.findMany({ where: { workspaceId, deletedAt: null } })
    ]);

    // Onboarding Calculation
    const hasWorkspace = !!workspace;
    const hasProject = projects.length > 0;
    const hasTask = tasks.length > 0;
    const hasHabit = habits.length > 0;
    const hasNote = pages.length > 0;
    const hasGoal = goals.length > 0;
    const hasFocusSession = focusSessions.length > 0;
    const hasCompletedPomodoro = focusSessions.some(fs => fs.completed);

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
    const canUnlockAi = tasks.length >= 15 && focusSessions.length >= 8 && dailyLogs.length >= 5;

    res.status(200).json({
      greeting,
      onboarding: {
        completed: completedSteps,
        total: onboardingSteps.length,
        steps: onboardingSteps
      },
      workspace,
      stats: {
        totalProjects: projects.length,
        totalTasks: tasks.length,
        totalHabits: habits.length,
        totalNotes: pages.length
      },
      today: {
        tasks: tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString()),
        focusSessions: focusSessions.filter(fs => new Date(fs.startTime).toDateString() === new Date().toDateString())
      },
      habits, // optionally return subset or all
      projects: projects.map(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id);
        const completed = projectTasks.filter(t => t.status === 'DONE').length;
        const progress = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0;
        return { ...p, progress };
      }),
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
