import { test, mock } from 'node:test';
import express from 'express';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { CreateTaskSchema } from '@krama/validation';
import { AppError, handleControllerError } from '../utils/errors';
import { logger } from '../utils/logger';
function response(error: unknown) {
 let status = 0, body: any; const res: any = { status(code: number) { status = code; return this; }, json(value: any) { body = value; return this; } }; handleControllerError(res, error); return { status, body };
}

test('recognized error metadata is serializable and invalid operational statuses fall back safely', () => {
 const circular: Record<string, unknown> = {}; circular.self = circular;
 for (const error of [
  { code: 'P2002', meta: { target: circular } },
  { code: 'P2003', meta: { field_name: circular } },
  { name: 'ZodError', issues: [{ code: 'custom', path: ['title'], message: 'Choose a title.', input: circular }] },
 ]) assert.doesNotThrow(() => JSON.stringify(response(error).body));
 for (const status of [NaN, Infinity, 200, 700, 400.5]) {
  const actual = response(new AppError('Internal invalid status', status));
  assert.equal(actual.status, 500);
  assert.equal(actual.body.message, 'Internal server error');
 }
});
test('shared task validation errors are recognized across schema-library versions', () => {
 const result = CreateTaskSchema.safeParse({ workspaceId: '00000000-0000-4000-8000-000000000000', title: 'Task', parentTaskId: 'invalid' }); assert.equal(result.success, false); if (result.success) return;
 const actual = response(result.error); assert.equal(actual.status, 400); assert.equal(actual.body.code, 'VALIDATION_FAILED'); assert.equal(actual.body.errors[0].path[0], 'parentTaskId');
});
test('native server validation and task conflicts retain their response codes', () => {
 const result = z.string().min(1).safeParse(''); assert.equal(result.success, false); if (result.success) return;
 assert.equal(response(result.error).status, 400); assert.equal(response(new Error('Conflict: version mismatch')).status, 409);
});

test('unknown thrown values cannot crash the HTTP error boundary', () => {
 const circular: Record<string, unknown> = {}; circular.self = circular;
 for (const error of [null, undefined, 17, false, { message: 17 }, { message: { detail: 'not a string' } }, circular]) {
  let actual: ReturnType<typeof response> | undefined;
  assert.doesNotThrow(() => { actual = response(error); });
  assert.equal(actual?.status, 500);
  assert.equal(actual?.body.code, 'INTERNAL_SERVER_ERROR');
  assert.equal(actual?.body.message, 'Internal server error');
 }
});

test('operational HTTP errors and Prisma conflicts retain compatible payloads', () => {
 const invalid = response({ statusCode: 422, code: 'INVALID_TASK_LINK', message: 'Choose an active project.' });
 assert.equal(invalid.status, 422); assert.equal(invalid.body.code, 'INVALID_TASK_LINK');
 const unique = response({ code: 'P2002', meta: { target: ['workspaceId','name'] } });
 assert.equal(unique.status,409); assert.deepEqual(unique.body.target,['workspaceId','name']);
 const foreign = response({ code: 'P2003', meta: { field_name: 'projectId' } });
 assert.equal(foreign.status,400); assert.equal(foreign.body.field,'projectId');
});

test('an internal missing-file failure is not exposed as a public resource 404', () => {
 const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
 try {
  const actual = response(new Error('Credential file not found at C:\\private\\provider-config.json'));
  assert.equal(actual.status, 500);
  assert.equal(actual.body.message, 'Internal server error');
  assert.doesNotMatch(JSON.stringify(actual.body), /private|provider-config/);
  assert.equal(response(new Error('Task not found')).status, 404);
 } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});

test('a non-operational AppError is hidden behind the production error boundary', () => {
 const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
 try {
  const actual = response(new AppError('Internal adapter secret', 503, 'PRIVATE_ADAPTER', false));
  assert.equal(actual.status, 503);
  assert.equal(actual.body.message, 'Internal server error');
  assert.equal(actual.body.code, 'INTERNAL_SERVER_ERROR');
  assert.match(actual.body.requestId, /^[0-9a-f-]{36}$/);
  assert.equal(response(new AppError('Task not found', 404, 'P2025', false)).status, 500);
 } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});

test('production error diagnostics retain request IDs without logging raw adapter inputs', () => {
 const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
 const logged: unknown[] = [];
 const stub = mock.method(logger, 'error', (message, metadata) => { logged.push({ message, metadata }); });
 try {
  const actual = response(new Error('private-note-body postgres://private-password'));
  assert.match(JSON.stringify(logged), new RegExp(actual.body.requestId));
  assert.doesNotMatch(JSON.stringify(logged), /private-note-body|private-password/);
 } finally { stub.mock.restore(); if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});


test('production HTTP failures hide details for every 5xx status and include a request ID', async () => {
 const previous = process.env.NODE_ENV;
 process.env.NODE_ENV = 'production';
 const app = express();
 app.get('/failure', (_req, res) => handleControllerError(res, Object.assign(new Error('SELECT secret_column FROM private_schema; postgres://password'), { statusCode: 503, code: 'DB_INTERNAL_DETAIL' })));
 const server = app.listen(0, '127.0.0.1');
 await once(server, 'listening');
 try {
  const port = (server.address() as { port: number }).port;
  const reply = await fetch(`http://127.0.0.1:${port}/failure`);
  assert.equal(reply.status, 503);
  const payload = await reply.json() as any;
  assert.equal(payload.message, 'Internal server error');
  assert.equal(payload.code, 'INTERNAL_SERVER_ERROR');
  assert.match(payload.requestId, /^[0-9a-f-]{36}$/);
  assert.doesNotMatch(JSON.stringify(payload), /private_schema|secret_column|password|DB_INTERNAL_DETAIL/);
 } finally {
  await new Promise<void>(resolve => server.close(() => resolve()));
  if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
 }
});
