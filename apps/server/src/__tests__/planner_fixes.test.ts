import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Native date utilities to avoid third-party dependencies in server test environment
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

describe('PLN-01: Soft-deleted Project Milestones Guarding Logic', () => {
  it('identifies soft-deleted projects and returns 404', () => {
    function validateProjectForMilestone(project: { workspaceId: string; deletedAt: Date | null } | null) {
      if (!project || project.deletedAt) {
        return { status: 404, message: 'Project not found' };
      }
      return { status: 200, message: 'OK' };
    }

    // Active project
    assert.deepEqual(
      validateProjectForMilestone({ workspaceId: 'ws-1', deletedAt: null }),
      { status: 200, message: 'OK' }
    );

    // Non-existent project
    assert.deepEqual(
      validateProjectForMilestone(null),
      { status: 404, message: 'Project not found' }
    );

    // Soft-deleted project
    assert.deepEqual(
      validateProjectForMilestone({ workspaceId: 'ws-1', deletedAt: new Date() }),
      { status: 404, message: 'Project not found' }
    );
  });

  it('filters out milestones whose parent project is soft-deleted or outside workspace', () => {
    const milestones = [
      { id: 'm-1', title: 'Beta launch', project: { id: 'p-1', workspaceId: 'ws-1', deletedAt: null } },
      { id: 'm-2', title: 'Deleted milestone', project: { id: 'p-2', workspaceId: 'ws-1', deletedAt: new Date() } },
      { id: 'm-3', title: 'Other ws milestone', project: { id: 'p-3', workspaceId: 'ws-2', deletedAt: null } },
    ];

    const currentWorkspaceId = 'ws-1';
    const activeMilestones = milestones.filter(
      (m) => m.project.workspaceId === currentWorkspaceId && m.project.deletedAt === null
    );

    assert.equal(activeMilestones.length, 1);
    assert.equal(activeMilestones[0].id, 'm-1');
  });

  it('blocks updating milestones on soft-deleted projects', () => {
    function findMilestoneForUpdate(
      milestone: { id: string; userId: string; project: { deletedAt: Date | null } },
      userId: string
    ) {
      if (milestone.userId !== userId || milestone.project.deletedAt !== null) {
        return null;
      }
      return milestone;
    }

    const activeMilestone = { id: 'm-1', userId: 'u-1', project: { deletedAt: null } };
    const deletedProjectMilestone = { id: 'm-2', userId: 'u-1', project: { deletedAt: new Date() } };

    assert.ok(findMilestoneForUpdate(activeMilestone, 'u-1'));
    assert.equal(findMilestoneForUpdate(deletedProjectMilestone, 'u-1'), null);
  });
});

describe('PLN-02: Strategic Goal Deadlines Bucketing per Day', () => {
  it('accurately buckets goal deadlines into matching day columns', () => {
    const goalDeadlines = [
      { id: 'g-1', title: 'Reach 100 users', targetDate: '2026-09-29T00:00:00.000Z', progress: 45 },
      { id: 'g-2', title: 'Deploy V2', targetDate: '2026-09-30T00:00:00.000Z', progress: 100 },
      { id: 'g-3', title: 'Untargeted goal', targetDate: null, progress: 10 },
      { id: 'g-4', title: 'Future goal', targetDate: '2026-10-15T00:00:00.000Z', progress: 0 },
    ];

    const day1DateStr = '2026-09-29';
    const day2DateStr = '2026-09-30';

    const day1Deadlines = goalDeadlines.filter(
      (g) => (g.targetDate ? new Date(g.targetDate).toISOString().startsWith(day1DateStr) : false)
    );
    const day2Deadlines = goalDeadlines.filter(
      (g) => (g.targetDate ? new Date(g.targetDate).toISOString().startsWith(day2DateStr) : false)
    );

    assert.equal(day1Deadlines.length, 1);
    assert.equal(day1Deadlines[0].id, 'g-1');
    assert.equal(day1Deadlines[0].progress, 45);

    assert.equal(day2Deadlines.length, 1);
    assert.equal(day2Deadlines[0].id, 'g-2');
    assert.equal(day2Deadlines[0].progress, 100);
  });

  it('matches day boundary comparison for deadlines', () => {
    const targetDate = new Date('2026-09-29T14:30:00.000Z');
    const day = new Date('2026-09-29T00:00:00.000Z');

    assert.equal(isSameDay(targetDate, day), true);

    const nextDay = addDays(day, 1);
    assert.equal(isSameDay(targetDate, nextDay), false);
  });
});

describe('PLN-03: Day Navigation URL Query Params Synchronization', () => {
  it('correctly calculates next, previous, and today target dates', () => {
    const baseDay = new Date(2026, 8, 29); // 2026-09-29 local

    const next = addDays(baseDay, 1);
    const prev = addDays(baseDay, -1);

    assert.equal(formatYmd(next), '2026-09-30');
    assert.equal(formatYmd(prev), '2026-09-28');
  });

  it('generates exact URL query param payloads', () => {
    function computeSearchParams(mode: string, day: Date) {
      if (mode === 'plan') return {};
      if (mode === 'day') return { mode: 'day', date: formatYmd(day) };
      return { mode };
    }

    const testDay = new Date(2026, 8, 29);
    assert.deepEqual(computeSearchParams('plan', testDay), {});
    assert.deepEqual(computeSearchParams('calendar', testDay), { mode: 'calendar' });
    assert.deepEqual(computeSearchParams('day', testDay), { mode: 'day', date: '2026-09-29' });
  });
});

describe('PLN-04: TimeBlock Task and Project Soft-Delete Guarding', () => {
  it('rejects linking time blocks to soft-deleted tasks or projects', () => {
    function verifyBlockLinksSync(
      workspaceId: string,
      task?: { workspaceId: string; deletedAt: Date | null } | null,
      project?: { workspaceId: string; deletedAt: Date | null } | null
    ) {
      if (task !== undefined) {
        if (!task || task.deletedAt) return { status: 404, message: 'Linked task not found' };
        if (workspaceId && task.workspaceId !== workspaceId) {
          return { status: 403, message: 'Forbidden: task belongs to another workspace' };
        }
      }
      if (project !== undefined) {
        if (!project || project.deletedAt) return { status: 404, message: 'Linked project not found' };
        if (workspaceId && project.workspaceId !== workspaceId) {
          return { status: 403, message: 'Forbidden: project belongs to another workspace' };
        }
      }
      return { ok: true };
    }

    // Active task and project
    assert.deepEqual(
      verifyBlockLinksSync('ws-1', { workspaceId: 'ws-1', deletedAt: null }, { workspaceId: 'ws-1', deletedAt: null }),
      { ok: true }
    );

    // Soft-deleted task
    assert.deepEqual(
      verifyBlockLinksSync('ws-1', { workspaceId: 'ws-1', deletedAt: new Date() }, { workspaceId: 'ws-1', deletedAt: null }),
      { status: 404, message: 'Linked task not found' }
    );

    // Soft-deleted project
    assert.deepEqual(
      verifyBlockLinksSync('ws-1', { workspaceId: 'ws-1', deletedAt: null }, { workspaceId: 'ws-1', deletedAt: new Date() }),
      { status: 404, message: 'Linked project not found' }
    );
  });
});
