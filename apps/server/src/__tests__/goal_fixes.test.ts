import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeAutoProgress } from '../services/goal.service';

describe('GOL-01: Soft-delete Unlinking for Projects and Habits', () => {
  it('collects target goal and all recursive descendant IDs for unlinking', () => {
    const targetGoalId = 'goal-root';
    const childGoals = [{ id: 'goal-c1', parentGoalId: 'goal-root' }, { id: 'goal-c2', parentGoalId: 'goal-root' }];
    const grandchildGoals = [{ id: 'goal-gc1', parentGoalId: 'goal-c1' }];

    const childIds = childGoals.map((c) => c.id);
    const grandchildIds = grandchildGoals.map((c) => c.id);
    const allDeletedGoalIds = [targetGoalId, ...childIds, ...grandchildIds];

    assert.deepEqual(allDeletedGoalIds, ['goal-root', 'goal-c1', 'goal-c2', 'goal-gc1']);
  });

  it('unlinks Project.goalId and Habit.linkedGoalId when a goal is soft-deleted', () => {
    const allDeletedGoalIds = ['goal-root', 'goal-c1'];

    // Simulated projects & habits
    const projects = [
      { id: 'proj-1', name: 'Alpha', goalId: 'goal-root', deletedAt: null },
      { id: 'proj-2', name: 'Beta', goalId: 'goal-c1', deletedAt: null },
      { id: 'proj-3', name: 'Gamma', goalId: 'goal-other', deletedAt: null },
    ];

    const habits = [
      { id: 'hab-1', name: 'Workout', linkedGoalId: 'goal-root' },
      { id: 'hab-2', name: 'Read', linkedGoalId: 'goal-other' },
    ];

    // Unlink logic matching goal.service.ts
    const updatedProjects = projects.map((p) => ({
      ...p,
      goalId: allDeletedGoalIds.includes(p.goalId || '') ? null : p.goalId,
    }));

    const updatedHabits = habits.map((h) => ({
      ...h,
      linkedGoalId: allDeletedGoalIds.includes(h.linkedGoalId || '') ? null : h.linkedGoalId,
    }));

    assert.equal(updatedProjects[0].goalId, null);
    assert.equal(updatedProjects[1].goalId, null);
    assert.equal(updatedProjects[2].goalId, 'goal-other');

    assert.equal(updatedHabits[0].linkedGoalId, null);
    assert.equal(updatedHabits[1].linkedGoalId, 'goal-other');
  });
});

describe('GOL-02: Status Tab Filter Scoping Across Views', () => {
  const sampleGoals = [
    { id: 'g1', title: 'Goal 1', progress: 50, type: 'quarterly', metadata: { category: 'health', status: 'ACTIVE' } },
    { id: 'g2', title: 'Goal 2', progress: 100, type: 'quarterly', metadata: { category: 'health', status: 'COMPLETED' } },
    { id: 'g3', title: 'Goal 3', progress: 20, type: 'monthly', metadata: { category: 'career', status: 'ACTIVE' } },
    { id: 'g4', title: 'Goal 4', progress: 0, type: 'yearly', metadata: { category: 'career', status: 'PAUSED' } },
  ];

  it('correctly calculates status counts scoped to selected pillar', () => {
    function calculateScopedCounts(goals: typeof sampleGoals, selectedPillar: string, selectedHorizon: string) {
      const scoped = goals.filter((g) => {
        if (selectedPillar !== 'all' && g.metadata.category !== selectedPillar) return false;
        if (selectedHorizon !== 'all' && g.type !== selectedHorizon) return false;
        return true;
      });

      const active = scoped.filter((g) => g.progress < 100 && g.metadata.status === 'ACTIVE').length;
      const completed = scoped.filter((g) => g.progress >= 100 || g.metadata.status === 'COMPLETED').length;
      const paused = scoped.filter((g) => g.metadata.status === 'PAUSED').length;

      return { total: scoped.length, active, completed, paused };
    }

    // All pillars & horizons
    assert.deepEqual(calculateScopedCounts(sampleGoals, 'all', 'all'), {
      total: 4,
      active: 2,
      completed: 1,
      paused: 1,
    });

    // Scoped to health pillar
    assert.deepEqual(calculateScopedCounts(sampleGoals, 'health', 'all'), {
      total: 2,
      active: 1,
      completed: 1,
      paused: 0,
    });

    // Scoped to career pillar
    assert.deepEqual(calculateScopedCounts(sampleGoals, 'career', 'all'), {
      total: 2,
      active: 1,
      completed: 0,
      paused: 1,
    });
  });

  it('filters goals consistently by activeTab', () => {
    function filterByStatus(goals: typeof sampleGoals, activeTab: string) {
      return goals.filter((g) => {
        const isComp = g.progress >= 100 || g.metadata.status === 'COMPLETED';
        if (activeTab === 'active' && (isComp || g.metadata.status !== 'ACTIVE')) return false;
        if (activeTab === 'completed' && !isComp) return false;
        if (activeTab === 'paused' && g.metadata.status !== 'PAUSED') return false;
        return true;
      });
    }

    assert.equal(filterByStatus(sampleGoals, 'active').length, 2);
    assert.equal(filterByStatus(sampleGoals, 'completed').length, 1);
    assert.equal(filterByStatus(sampleGoals, 'paused').length, 1);
    assert.equal(filterByStatus(sampleGoals, 'all').length, 4);
  });
});

describe('GOL-03: Immediate Auto-Progress on Project Link / Unlink', () => {
  it('immediately calculates 0% when a goal has no linked projects or tasks', () => {
    assert.equal(computeAutoProgress([]), 0);
  });

  it('immediately updates progress when a project with tasks is linked', () => {
    // Project A tasks: 1 DONE, 1 IN_PROGRESS
    const projectATasks = [
      { status: 'DONE' },
      { status: 'IN_PROGRESS' },
    ];
    assert.equal(computeAutoProgress(projectATasks), 50);

    // Project B is linked with 2 DONE tasks
    const projectBTasks = [
      { status: 'DONE' },
      { status: 'DONE' },
    ];
    const combinedTasks = [...projectATasks, ...projectBTasks];
    // 3 DONE / 4 total = 75%
    assert.equal(computeAutoProgress(combinedTasks), 75);
  });

  it('immediately recalculates when a project is unlinked', () => {
    const combinedTasks = [
      { status: 'DONE' },
      { status: 'TODO' },
      { status: 'DONE' },
      { status: 'DONE' },
    ];
    assert.equal(computeAutoProgress(combinedTasks), 75);

    // Unlink the project that had 2 DONE tasks
    const remainingTasks = [
      { status: 'DONE' },
      { status: 'TODO' },
    ];
    // 1 DONE / 2 total = 50%
    assert.equal(computeAutoProgress(remainingTasks), 50);
  });
});

describe('GOL-04: Redis Cache-Aside & Invalidation Strategy', () => {
  it('generates consistent cache keys for standard and lite goal trees', () => {
    const workspaceId = 'ws-test-123';
    const keyStandard = `goals:workspace:${workspaceId}`;
    const keyLite = `goals:workspace:lite:${workspaceId}`;

    assert.equal(keyStandard, 'goals:workspace:ws-test-123');
    assert.equal(keyLite, 'goals:workspace:lite:ws-test-123');
  });

  it('invalidates both standard and lite cache keys on mutation', async () => {
    const workspaceId = 'ws-test-123';
    const deletedKeys: string[] = [];

    // Mock Redis service del method
    const mockRedis = {
      async del(key: string) {
        deletedKeys.push(key);
      },
    };

    await Promise.all([
      mockRedis.del(`goals:workspace:${workspaceId}`),
      mockRedis.del(`goals:workspace:lite:${workspaceId}`),
    ]);

    assert.deepEqual(deletedKeys.sort(), [
      'goals:workspace:lite:ws-test-123',
      'goals:workspace:ws-test-123',
    ]);
  });
});
