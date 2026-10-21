import type { BrowserContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { bugFixture } from '../../e2e/fixtures/current-bug-fixture';
const backup = JSON.parse(readFileSync('e2e/fixtures/personal-backup.json', 'utf8')).workspace;
// Synthetic, stateful media workspace. Every API request is intercepted; no user data is changed.
export async function designFixture(context: BrowserContext, empty = false) {
  await bugFixture(context);
  const date = '2026-10-17';
  const tasks = empty ? [] : ['Refine the portfolio case study', 'Read a chapter and capture notes', 'Plan next week’s priorities', 'Review the completed draft'].map((title, i) => ({
    ...backup.tasks[0], id: `design-task-${i}`, title, description: 'A clear next step for this week.', priority: i === 0 ? 'HIGH' : 'MEDIUM',
    status: ['IN_PROGRESS', 'TODO', 'BACKLOG', 'DONE'][i], metadata: { inbox: i === 2 }, position: (i + 1) * 1000,
    projectId: i === 0 || i === 3 ? 'design-project-0' : null, blockedById: null, parentTaskId: null,
    dueDate: `${date}T12:00:00Z`, scheduledDate: i === 2 ? null : `${date}T12:00:00Z`, estimateMinutes: 45,
  }));
  const goals = empty ? [] : ['Build a body of work I’m proud of', 'Make space for learning'].map((title, i) => ({
    ...backup.goals[0], id: `design-goal-${i}`, title, progress: i ? 35 : 60, type: 'quarterly', parentGoalId: null, childGoals: [], projects: [], habits: [],
    metadata: { category: i ? 'growth' : 'career', status: 'ACTIVE', progressMode: 'manual' }, targetDate: '2026-12-31T12:00:00Z', snapshots: [],
  }));
  const projects = empty ? [] : ['Portfolio refresh', 'Learning journal'].map((name, i) => ({
    ...backup.projects[0], id: `design-project-${i}`, name, problemStatement: i ? 'Turn useful ideas into notes I can return to.' : 'Bring my recent work together with a clear story and a considered presentation.',
    status: i ? 'idea' : 'active', goalId: `design-goal-${i}`, position: i + 1, metadata: {}, milestones: [], tasks: i ? [] : tasks.filter(t => t.projectId), _count: { tasks: i ? 0 : 2, documents: 1 },
  }));
  const habits = empty ? [] : ['Read for twenty minutes', 'Take a walk outside', 'Write a short daily reflection'].map((name, i) => ({
    ...backup.habits[0], id: `design-habit-${i}`, name, icon: ['BookOpen', 'Footprints', 'PenLine'][i], cadence: 'daily', streak: [8, 5, 3][i], bestStreak: 12,
    scheduledDays: [0, 1, 2, 3, 4, 5, 6], timeOfDay: ['morning', 'afternoon', 'evening'][i], metadata: { timeOfDay: ['morning', 'afternoon', 'evening'][i] },
    linkedGoalId: 'design-goal-1', completions: [], expectedDurationMinutes: 20, pinnedToPlanner: true,
  }));
  const documents = empty ? [] : ['Case study notes', 'Ideas for the weekend', 'Notes from this week’s reading'].map((title, i) => ({
    ...backup.spaces[0].documents[0], id: `design-doc-${i}`, title, spaceId: 'design-space', parentId: null, documentType: i === 1 ? 'IDEA' : 'NOTE',
    statusBadges: i === 1 ? ['Inbox'] : [], tags: [], projectId: i === 0 ? 'design-project-0' : null,
    contentJson: { type: 'doc', content: i === 0 ? [
      { type: 'paragraph', content: [{ type: 'text', text: 'A clear story of the decisions behind the work, from first sketch to finished experience.' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'What I want to show' }] },
      { type: 'bulletList', content: ['The problem and who it affects', 'The early ideas, and why the direction changed', 'The final experience and what I learned'].map(text => ({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })) },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Next writing session' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Write the opening of the case study. Choose three screens that explain the journey. Keep the language simple and specific.' }] },
      { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Show the thinking, not just the finished screens.' }] }] },
    ] : [{ type: 'paragraph', content: [{ type: 'text', text: i === 1 ? 'Visit the bookshop. Take a walk by the lake. Leave an afternoon open for something unexpected.' : 'Good work starts with a small, clear next step. Make room for reading before the day gets busy.' }] }] },
  }));
  const planner = { tasks, timeBlocks: empty ? [] : [{ id: 'design-block', title: 'Portfolio deep work', taskId: tasks[0].id, date: `${date}T12:00:00Z`, startTime: `${date}T09:00:00Z`, endTime: `${date}T10:30:00Z`, type: 'WORK' }],
    milestones: [], routines: habits, occurrences: [], days: [], projects, goalDeadlines: [], capacity: { weeklyCapacityMinutes: 2400, occupiedMinutes: empty ? 0 : 90, meetingMinutes: 0, otherMinutes: 0, freeMinutes: empty ? 2400 : 2310 }, config: { countryCode: 'IN', regionCode: 'KA' } };
  await context.route('**/api/v1/**', async (route, fallback) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');
    let data: unknown;
    const method = route.request().method();
    if (path === '/auth/me') data = { user: { id: 'review-user', name: 'Alex', email: 'alex@example.test', metadata: { focusLayout: 'sidebar' }, memberships: [{ workspaceId: 'review-workspace', role: 'OWNER', workspace: { id: 'review-workspace', name: 'Personal workspace' } }] } };
    else if (path === '/tasks') {
      if (method === 'POST') {
        const created = { ...tasks[0], id: 'demo-captured-task', version: 1, ...route.request().postDataJSON(), projectId: null, scheduledDate: null, dueDate: null, estimateMinutes: 25 };
        tasks.push(created); data = created;
      } else data = tasks.filter(task => !url.searchParams.has('status') || task.status === url.searchParams.get('status'));
    }
    else if (path.startsWith('/tasks/')) {
      const task = tasks.find(item => path === `/tasks/${item.id}`);
      if (!task) return route.fulfill({ status: 404, json: { message: 'Example task not found' } });
      if (method === 'PATCH') Object.assign(task, route.request().postDataJSON(), { version: task.version + 1 });
      data = task;
    }
    else if (path === '/goals' || path === '/goals/lite') data = goals;
    else if (path.startsWith('/goals/design-goal-')) data = goals.find(g => path.endsWith(g.id)) || [];
    else if (path === '/projects') data = projects;
    else if (path.startsWith('/projects/design-project-')) data = projects.find(p => path.endsWith(p.id)) || [];
    else if (path === '/habits') data = habits;
    else if (path === '/workspaces/summary') data = { openIssues: tasks.filter(task => !['DONE','CANCELED'].includes(task.status)).length,
      inbox: tasks.filter(task => task.metadata.inbox && !['DONE','CANCELED'].includes(task.status)).length + documents.filter(doc => doc.statusBadges.includes('Inbox')).length,
      projects: projects.filter(project => project.status === 'active').length, goals: goals.length, habits: habits.length, documents: documents.length };
    else if (path === '/search/recent') data = { results: [
      ...tasks.slice(0,6).map(task => ({ id: task.id, type: 'issue', title: task.title, url: `/app/board?task=${task.id}`, snippet: task.description })),
      ...documents.slice(0,6).map(doc => ({ id: doc.id, type: 'page', title: doc.title, url: `/app/brain?doc=${doc.id}`, snippet: '' })),
    ] };
    else if (path === '/spaces') data = [{ id: 'design-space', name: 'Personal notes', documents }];
    else if (path === '/documents') data = { items: url.searchParams.get('deleted') === 'true' ? [] : documents, nextCursor: null };
    else if (path.startsWith('/documents/design-doc-') && !path.endsWith('/links')) data = documents.find(d => path.endsWith(d.id));
    else if (path === '/dashboard') data = { dateKey: date, stats: { totalTasks: tasks.length, totalProjects: projects.length, totalHabits: habits.length, totalNotes: documents.length },
      today: { tasks: tasks.filter(t => t.scheduledDate), focusMinutes: empty ? 0 : 45, overdueTaskIds: [] }, projects, goals, habits, activity: [] };
    else if (path.startsWith('/dashboard/day-plan')) data = { date, taskIds: empty ? [] : [tasks[0].id, tasks[1].id], decisions: {}, revision: 1 };
    else if (path === '/planner/week') data = planner;
    else if (path === '/planner/time-blocks' && method === 'POST') {
      const input = route.request().postDataJSON();
      const day = input.date.slice(0, 10);
      const block = { id: 'demo-new-block', ...input, startTime: `${day}T${input.startTime}:00.000Z`, endTime: `${day}T${input.endTime}:00.000Z` };
      planner.timeBlocks.push(block); data = block;
    }
    else if (path === '/focus-sessions/schedule') data = { mode: 'empty', plan: [] };
    else if (path === '/focus-sessions') data = method === 'POST' ? { session: { id: 'demo-session' } } : [];
    else if (path === '/planner/milestones') data = { milestones: [], goalDeadlines: [] };
    else if (path === '/planner/holidays' || path === '/holidays') data = { holidays: [] };
    if (data === undefined) return route.fallback();
    return route.fulfill({ json: data });
  });
  return { tasks, projects, documents, planner, date };
}
