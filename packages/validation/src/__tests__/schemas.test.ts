import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  UpdateGoalSchema,
  UpdateHabitSchema,
  UpdatePageSchema,
  UpdateDailyLogSchema,
  UpdateTaskSchema,
  UpdateProjectSchema,
  UpdateSprintSchema,
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

  it('UpdatePageSchema: allows omitting version', () => {
    const parsed = UpdatePageSchema.parse({
      workspaceId: dummyWorkspace,
      title: 'Updated Engineering Doc',
    });
    assert.strictEqual(parsed.version, undefined);
    assert.strictEqual(parsed.title, 'Updated Engineering Doc');
  });

  it('UpdateDailyLogSchema: allows omitting version', () => {
    const parsed = UpdateDailyLogSchema.parse({
      workspaceId: dummyWorkspace,
      mood: 'PRODUCTIVE',
      deepWorkMinutes: 120,
    });
    assert.strictEqual(parsed.version, undefined);
    assert.strictEqual(parsed.deepWorkMinutes, 120);
  });

  it('UpdateTaskSchema: allows omitting version', () => {
    const parsed = UpdateTaskSchema.parse({
      workspaceId: dummyWorkspace,
      title: 'Updated Task Title',
    });
    assert.strictEqual(parsed.version, undefined);
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

  it('Amendment 3 - UpdateSprintSchema: version remains REQUIRED', () => {
    assert.throws(
      () => {
        UpdateSprintSchema.parse({
          workspaceId: dummyWorkspace,
          name: 'Sprint 10',
        });
      },
      (err: any) => {
        return err.name === 'ZodError';
      }
    );

    const valid = UpdateSprintSchema.parse({
      workspaceId: dummyWorkspace,
      name: 'Sprint 10',
      version: 1,
    });
    assert.strictEqual(valid.version, 1);
  });
});
