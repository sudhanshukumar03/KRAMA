import { after, before, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { groundSources } from '../services/rag/sources';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://unit:unit@127.0.0.1:1/krama_unit_test';
let service: typeof import('../services/krama-ai.service').kramaAiService;
let ai: typeof import('../services/ai.service').aiService;
let database: typeof import('../prisma').prisma;
before(async () => {
  ({ prisma: database } = await import('../prisma'));
  ({ aiService: ai } = await import('../services/ai.service'));
  ({ kramaAiService: service } = await import('../services/krama-ai.service'));
});
after(async () => {
  mock.restoreAll(); await database.$disconnect();
  const pool = (globalThis as typeof globalThis & { pool?: { end(): Promise<void> } }).pool;
  await pool?.end();
});

test('global AI cannot publish provider-invented Brain citations without retrieved sources', async () => {
  const previousKey = process.env.GEMINI_API_KEY; process.env.GEMINI_API_KEY = '';
  const original = { goal: database.goal, project: database.project, task: database.task };
  Object.assign(database, { goal: { findMany: async () => [{ title: 'Paused learning', metadata: { status: 'PAUSED' } }] }, project: { findMany: async () => [] }, task: { findMany: async () => [] } });
  let calls = 0;
  let prompt = '';
  const completeStub = mock.method(ai, 'complete', async params => {
    if (++calls === 1) return 'general';
    prompt = params.prompt;
    return JSON.stringify({ type: 'direct', answer: 'A generated response', sources: [{ pageId: 'invented-document', title: 'Invented evidence' }] });
  });
  try {
    const result = await service.askKrama('A unit question', 'unit-workspace', 'unit-user');
    assert.deepEqual(result.sources, []);
    assert.equal(calls, 2);
    assert.match(prompt, /Paused learning \| Status: PAUSED/);
  } finally {
    Object.assign(database, original);
    completeStub.mock.restore();
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey;
  }
});

test('source grounding canonicalizes, deduplicates and bounds retrieved evidence', () => {
  const retrieved = Array.from({ length: 5 }, (_, index) => ({ pageId: `page-${index}`, title: `Saved title ${index}`, chunkId: `chunk-${index}` }));
  retrieved.splice(1, 0, { ...retrieved[0]!, chunkId: 'second-chunk' });
  assert.deepEqual(groundSources([{ pageId: 'page-0', title: 'Invented title' }, { pageId: 'page-0', title: 'Duplicate' }], retrieved), [retrieved[0]]);
  assert.deepEqual(groundSources([{ pageId: 'foreign-page', title: 'Unavailable' }], retrieved), [retrieved[0], retrieved[2], retrieved[3]]);
  assert.deepEqual(groundSources([{ pageId: 'page-0', title: 'Wrong chunk', chunkId: 'unknown' }], []), []);
  assert.equal(groundSources(retrieved, retrieved).length, 3);
});
