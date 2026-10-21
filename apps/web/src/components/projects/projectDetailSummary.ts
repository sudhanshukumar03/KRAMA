import { differenceInCalendarDays } from 'date-fns';
import { parseLocalDate, projectMetadata } from '../../lib/utils';
import type { ProjectWithRelations, IssueWithRelations, DocumentWithRelations, GoalWithRelations } from '../../types/schema';

/** Pure task, deadline and relationship summary; rendering and mutations share these values. */
export function projectDetailSummary(project: ProjectWithRelations, issues: IssueWithRelations[], pages: DocumentWithRelations[], goals: GoalWithRelations[], iError: boolean, iLoading: boolean) {
  const projectMilestones = project.milestones || [];
  const tasksAvailable = !iError && !iLoading;
  const projectIssues = project.tasks || issues.filter(i => i.projectId === project.id);
  const projectDocs = pages.filter(p => p.linkedProjectId === project.id || p.projectId === project.id);
  const projectGoal = project.goal || (project.goalId ? goals.find(g => g.id === project.goalId) : null);

  const completedIssues = projectIssues.filter((i) => i.status === "DONE");
  const openIssues = projectIssues.filter((i) => i.status !== "DONE");
  const progressPct = projectIssues.length > 0 ? Math.round((completedIssues.length / projectIssues.length) * 100) : 0;

  // Calculate days since last update
  const daysSinceUpdate = Math.max(0, Math.floor((new Date().getTime() - new Date(project.updatedAt).getTime()) / (1000 * 3600 * 24)));

  // Real risk and deadline telemetry
  const urgentIssues = openIssues.filter((i) => i.priority === "URGENT" || i.priority === "HIGH");
  const projectTargetDate = project.targetDate || projectMetadata(project.metadata).targetDate;
  const targetDay = parseLocalDate(projectTargetDate);
  const daysRemaining = targetDay ? differenceInCalendarDays(targetDay, new Date()) : null;

  const isPastDue = daysRemaining !== null && daysRemaining < 0 && progressPct < 100;
  const isApproaching = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7 && progressPct < 80;
  const blockedIssues = openIssues.filter(issue => {
    const blocker = issues.find(task => task.id === issue.blockedById);
    return blocker && !blocker.deletedAt && !['DONE', 'CANCELED'].includes(blocker.status);
  });
  const hasBlockers = blockedIssues.length > 0;

  let riskStatus = 'ON TRACK';
  let riskBadgeClass = 'bg-success-bg text-success-fg border-success-border';
  let riskMessage = `${progressPct}% of tasks completed. No overdue deadline or blocked tasks detected.`;

  if (progressPct === 100) {
    riskStatus = 'DELIVERED & COMPLETE';
    riskBadgeClass = 'bg-success-bg text-success-fg border-success-border';
    riskMessage = 'All project tasks are complete.';
  } else if (isPastDue) {
    riskStatus = 'OVERDUE';
    riskBadgeClass = 'bg-danger-bg text-danger-fg border-danger-border';
    riskMessage = `The target date passed ${Math.abs(daysRemaining!)} days ago. ${openIssues.length} tasks remain.`;
  } else if (isApproaching) {
    riskStatus = 'HIGH RISK: APPROACHING DEADLINE';
    riskBadgeClass = 'bg-warning-bg text-warning-fg border-warning-border';
    riskMessage = `Target delivery date is in ${daysRemaining} days with ${progressPct}% completed. Requires acceleration of ${openIssues.length} remaining tickets.`;
  } else if (hasBlockers) {
    riskStatus = 'ATTENTION: BLOCKERS DETECTED';
    riskBadgeClass = 'bg-warning-bg text-warning-fg border-warning-border';
    riskMessage = `${blockedIssues.length} task(s) are waiting for another unfinished task. Open Tasks to review their dependencies.`;
  } else if (projectIssues.length === 0) {
    riskStatus = 'SCOPE DEFINITION PHASE';
    riskBadgeClass = 'bg-accent-subtle text-accent-fg border-accent/20';
    riskMessage = 'No execution tickets created yet. Add tickets to Kanban or link milestones to establish tracking.';
  }

  return { projectMilestones, tasksAvailable, projectIssues, projectDocs, projectGoal, completedIssues, openIssues,
    progressPct, daysSinceUpdate, urgentIssues, projectTargetDate, daysRemaining, isPastDue, isApproaching,
    blockedIssues, hasBlockers, riskStatus, riskBadgeClass, riskMessage };
}
