import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  UpdateGoalSchema,
  UpdateHabitSchema,
  UpdateTaskSchema,
  CreateTaskSchema,
  UpdateProjectSchema,
} from '../execution';
import { SignupSchema, ChangePasswordSchema } from '../auth';
import { UpdateDocumentMetadataSchema } from '../documents';

describe('Signup password byte limits', () => {
  const base = { email: 'person@example.com', name: 'Person' };

  it('accepts 71- and 72-byte ASCII passwords and rejects 73 bytes', () => {
    assert.equal(SignupSchema.safeParse({ ...base, password: 'a'.repeat(71) }).success, true);
    assert.equal(SignupSchema.safeParse({ ...base, password: 'a'.repeat(72) }).success, true);
    assert.equal(SignupSchema.safeParse({ ...base, password: 'a'.repeat(73) }).success, false);
  });

  it('measures UTF-8 bytes for multibyte passwords', () => {
    assert.equal(SignupSchema.safeParse({ ...base, password: '\u20ac'.repeat(24) }).success, true);
    const overLimit = SignupSchema.safeParse({ ...base, password: '\u20ac'.repeat(25) });
    assert.equal(overLimit.success, false);
    if (!overLimit.success) assert.match(overLimit.error.issues[0].message, /72 UTF-8 bytes/);
  });
});

describe('Document metadata request validation', () => {
  it('rejects wrong field types and malformed revision tokens before Prisma', () => {
    assert.equal(UpdateDocumentMetadataSchema.safeParse({ isFavorite: 'true' }).success, false);
    assert.equal(UpdateDocumentMetadataSchema.safeParse({ statusBadges: 'DRAFT' }).success, false);
    assert.equal(UpdateDocumentMetadataSchema.safeParse({ expectedUpdatedAt: 'not-a-date' }).success, false);
  });

  it('accepts typed metadata updates and nullable project removal', () => {
    assert.equal(UpdateDocumentMetadataSchema.safeParse({ title: '  Updated  ', projectId: null, expectedUpdatedAt: '2026-10-08T00:00:00.000Z' }).success, true);
  });
});

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

describe('Personal-account password changes', () => {
  it('allows a legacy long current password while requiring a bounded new password', () => {
    const input = { currentPassword: 'a'.repeat(80), newPassword: '\u20ac'.repeat(24) };
    assert.equal(ChangePasswordSchema.safeParse(input).success, true);
    assert.equal(ChangePasswordSchema.safeParse({ ...input, newPassword: '\u20ac'.repeat(25) }).success, false);
    assert.equal(ChangePasswordSchema.safeParse({ ...input, newPassword: 'short' }).success, false);
    assert.equal(ChangePasswordSchema.safeParse({ ...input, currentPassword: '' }).success, false);
  });
});
