import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  UpdateGoalSchema,
  UpdateHabitSchema,
  UpdateTaskSchema,
  CreateTaskSchema,
  UpdateProjectSchema,
} from '../execution';

describe('Validation Schema Concurrency Rules (P0)', () => {
  const dummyWorkspace = 'a0000000-0000-0000-0000-000000000001';

  it('UpdateGoalSchema: allows omitting version', () => {
    const parsed = UpdateGoalSchema.parse({
      workspaceId: dummyWorkspace,
      progress: 50,
    });
    assert.strictEqual(parsed.version, undefined);
    assert.strictEqual(parsed.progress, 50);
  });

  it('UpdateGoalSchema: accepts version when provided', () => {
    const parsed = UpdateGoalSchema.parse({
      workspaceId: dummyWorkspace,
      progress: 75,
      version: 2,
    });
    assert.strictEqual(parsed.version, 2);
  });

  it('UpdateHabitSchema: allows omitting version', () => {
    const parsed = UpdateHabitSchema.parse({
      workspaceId: dummyWorkspace,
      name: 'Morning Deep Work',
    });
    assert.strictEqual(parsed.version, undefined);
    assert.strictEqual(parsed.name, 'Morning Deep Work');
  });

  it('UpdateTaskSchema: allows omitting version', () => {
    const parsed = UpdateTaskSchema.parse({
      workspaceId: dummyWorkspace,
      title: 'Updated Task Title',
    });
    assert.strictEqual(parsed.version, undefined);
  });

  it('bounds task estimates so a single task cannot request an unbounded schedule', () => {
    const base = { workspaceId: dummyWorkspace, title: 'Estimate bound' };
    assert.equal(CreateTaskSchema.safeParse({ ...base, estimateMinutes: 10080 }).success, true);
    assert.equal(CreateTaskSchema.safeParse({ ...base, estimateMinutes: 10081 }).success, false);
    assert.equal(UpdateTaskSchema.safeParse({ workspaceId: dummyWorkspace, estimateMinutes: 10081 }).success, false);
  });

  it('Amendment 3 - UpdateProjectSchema: version remains REQUIRED', () => {
    assert.throws(
      () => {
        UpdateProjectSchema.parse({
          workspaceId: dummyWorkspace,
          name: 'Renamed Project',
        });
      },
      (err: any) => {
        return err.name === 'ZodError';
      }
    );

    const valid = UpdateProjectSchema.parse({
      workspaceId: dummyWorkspace,
      name: 'Renamed Project',
      version: 1,
    });
    assert.strictEqual(valid.version, 1);
  });
});
