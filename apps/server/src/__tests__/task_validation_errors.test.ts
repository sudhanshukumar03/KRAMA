import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { CreateTaskSchema } from '@krama/validation';
import { handleControllerError } from '../utils/errors';
function response(error: unknown) {
 let status = 0, body: any; const res: any = { status(code: number) { status = code; return this; }, json(value: any) { body = value; return this; } }; handleControllerError(res, error); return { status, body };
}
test('shared task validation errors are recognized across schema-library versions', () => {
 const result = CreateTaskSchema.safeParse({ workspaceId: '00000000-0000-4000-8000-000000000000', title: 'Task', parentTaskId: 'invalid' }); assert.equal(result.success, false); if (result.success) return;
 const actual = response(result.error); assert.equal(actual.status, 400); assert.equal(actual.body.code, 'VALIDATION_FAILED'); assert.equal(actual.body.errors[0].path[0], 'parentTaskId');
});
test('native server validation and task conflicts retain their response codes', () => {
 const result = z.string().min(1).safeParse(''); assert.equal(result.success, false); if (result.success) return;
 assert.equal(response(result.error).status, 400); assert.equal(response(new Error('Conflict: version mismatch')).status, 409);
});
