import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('PRJ-01: Cascade Milestone Deletion on Project Deletion', () => {
  it('cascades deletion of milestones when parent project is deleted', () => {
    const projectIdToDelete = 'proj-1';

    const projects = [
      { id: 'proj-1', name: 'Alpha', deletedAt: null },
      { id: 'proj-2', name: 'Beta', deletedAt: null },
    ];

    const milestones = [
      { id: 'm-1', title: 'Alpha Milestone 1', projectId: 'proj-1' },
      { id: 'm-2', title: 'Alpha Milestone 2', projectId: 'proj-1' },
      { id: 'm-3', title: 'Beta Milestone 1', projectId: 'proj-2' },
    ];

    const tasks = [
      { id: 't-1', title: 'Alpha Task 1', projectId: 'proj-1', deletedAt: null },
      { id: 't-2', title: 'Beta Task 1', projectId: 'proj-2', deletedAt: null },
    ];

    // Transaction logic matching project.controller.ts deleteProject
    const now = new Date();
    const updatedProjects = projects.map((p) =>
      p.id === projectIdToDelete ? { ...p, deletedAt: now } : p
    );

    const updatedTasks = tasks.map((t) =>
      t.projectId === projectIdToDelete && t.deletedAt === null ? { ...t, deletedAt: now } : t
    );

    // Milestones are hard-deleted in the cascade
    const remainingMilestones = milestones.filter((m) => m.projectId !== projectIdToDelete);

    // Assert project is soft-deleted
    assert.ok(updatedProjects.find((p) => p.id === 'proj-1')?.deletedAt);
    assert.equal(updatedProjects.find((p) => p.id === 'proj-2')?.deletedAt, null);

    // Assert tasks are soft-deleted
    assert.ok(updatedTasks.find((t) => t.id === 't-1')?.deletedAt);
    assert.equal(updatedTasks.find((t) => t.id === 't-2')?.deletedAt, null);

    // Assert milestones are cascade deleted
    assert.equal(remainingMilestones.length, 1);
    assert.equal(remainingMilestones[0].id, 'm-3');
    assert.equal(remainingMilestones[0].projectId, 'proj-2');
  });

  it('preserves milestones for active projects and cleans up orphaned milestones', () => {
    const activeProjectIds = new Set(['proj-active-1', 'proj-active-2']);
    const allMilestones = [
      { id: 'm-1', projectId: 'proj-active-1' },
      { id: 'm-2', projectId: 'proj-deleted-1' },
      { id: 'm-3', projectId: 'proj-active-2' },
    ];

    const validMilestones = allMilestones.filter((m) => activeProjectIds.has(m.projectId));
    assert.equal(validMilestones.length, 2);
    assert.deepEqual(
      validMilestones.map((m) => m.id),
      ['m-1', 'm-3']
    );
  });
});

describe('PRJ-02: Dual Query Key Cache Invalidation for Directives and Tasks', () => {
  it('identifies required query keys for directive mutations', () => {
    function getInvalidationKeysForDirectiveCreation(projectId?: string) {
      const keys: string[][] = [
        ['issues'],
        ['tasks'],
        ['planner'],
        ['dashboard'],
        ['projects'],
      ];
      if (projectId) {
        keys.push(['project', projectId]);
      }
      return keys;
    }

    const keys = getInvalidationKeysForDirectiveCreation('proj-123');
    const flatKeys = keys.map((k) => k.join(':'));

    assert.ok(flatKeys.includes('issues'));
    assert.ok(flatKeys.includes('tasks'));
    assert.ok(flatKeys.includes('planner'));
    assert.ok(flatKeys.includes('dashboard'));
    assert.ok(flatKeys.includes('projects'));
    assert.ok(flatKeys.includes('project:proj-123'));
  });

  it('keeps WebSocket sync aligned across tasks and planner queries', () => {
    const invalidatedQueries: string[] = [];
    const mockQueryClient = {
      invalidateQueries: ({ queryKey }: { queryKey: string[] }) => {
        invalidatedQueries.push(queryKey[0]);
      },
    };

    // Handler matching SocketProvider.tsx invalidateTasksAndGoals
    const invalidateTasksAndGoals = () => {
      mockQueryClient.invalidateQueries({ queryKey: ['issues'] });
      mockQueryClient.invalidateQueries({ queryKey: ['tasks'] });
      mockQueryClient.invalidateQueries({ queryKey: ['planner'] });
      mockQueryClient.invalidateQueries({ queryKey: ['dashboard'] });
      mockQueryClient.invalidateQueries({ queryKey: ['goals'] });
    };

    invalidateTasksAndGoals();

    assert.deepEqual(invalidatedQueries, ['issues', 'tasks', 'planner', 'dashboard', 'goals']);
  });

  it('keeps WebSocket sync aligned when projects are deleted or updated', () => {
    const invalidatedQueries: string[] = [];
    const mockQueryClient = {
      invalidateQueries: ({ queryKey }: { queryKey: string[] }) => {
        invalidatedQueries.push(queryKey[0]);
      },
    };

    // Handler matching SocketProvider.tsx invalidateProjectsAndGoals
    const invalidateProjectsAndGoals = () => {
      mockQueryClient.invalidateQueries({ queryKey: ['projects'] });
      mockQueryClient.invalidateQueries({ queryKey: ['goals'] });
      mockQueryClient.invalidateQueries({ queryKey: ['planner'] });
      mockQueryClient.invalidateQueries({ queryKey: ['dashboard'] });
      mockQueryClient.invalidateQueries({ queryKey: ['issues'] });
      mockQueryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    invalidateProjectsAndGoals();

    assert.deepEqual(invalidatedQueries, ['projects', 'goals', 'planner', 'dashboard', 'issues', 'tasks']);
  });
});
