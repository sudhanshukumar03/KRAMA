import { test, expect } from '@playwright/test';
import { DocumentSaveQueue } from '../../apps/web/src/lib/documentSaveQueue';

test('structure changes serialize with edits and advance the revision before the next save', async () => {
  const writes: string[] = [];
  let release!: () => void;
  let began!: () => void;
  const moving = new Promise<void>(resolve => { began = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const queue = new DocumentSaveQueue('doc', { content: 'initial', title: 'Title', revision: 'v0' }, {
    update: async () => { throw new Error('Unexpected title change'); },
    updateContent: async (_id, content, revision) => {
      writes.push(`body:${content}:${revision}`);
      return { updatedAt: content === 'before move' ? 'v1' : 'v3' };
    },
  }, 'test-structure');
  queue.setContent('before move');
  const move = queue.updateStructure(async revision => {
    expect(revision).toBe('v1'); writes.push('move'); began(); await gate;
    return { updatedAt: 'v2' };
  });
  await moving;
  queue.setContent('while moving');
  const save = queue.flush();
  release(); await move; await save;
  expect(writes).toEqual(['body:before move:v0', 'move', 'body:while moving:v2']);
  expect(queue.state).toBe('saved'); expect(queue.revision).toBe('v3');
  expect(queue.content).toBe('while moving'); queue.dispose();
});

test('a genuine structure conflict preserves the draft and blocks later writes', async () => {
  let writes = 0;
  const queue = new DocumentSaveQueue('doc', { content: 'draft', title: 'Title', revision: 'v0' }, {
    update: async () => { writes++; return { updatedAt: 'v1' }; },
    updateContent: async () => { writes++; return { updatedAt: 'v1' }; },
  }, 'test-conflict');
  await expect(queue.updateStructure(async () => { throw Object.assign(new Error('Changed elsewhere'), { status: 409 }); })).rejects.toThrow('Changed elsewhere');
  queue.setContent('retained after conflict');
  await expect(queue.flush()).rejects.toThrow('Resolve the document conflict');
  expect(queue.content).toBe('retained after conflict'); expect(queue.state).toBe('conflict');
  expect(queue.revision).toBe('v0'); expect(writes).toBe(0); queue.dispose();
});
