import { test } from 'node:test';
import express from 'express';
import { once } from 'node:events';
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
