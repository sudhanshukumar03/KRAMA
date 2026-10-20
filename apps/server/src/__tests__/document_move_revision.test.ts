import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { updateDocumentMove } from '../lib/documentMoveRevision';

describe('Atomic revision checks for document moves', () => {
  it('updates only the current non-deleted revision in the guarded write', async () => {
    let write: any;
    const data = { parentId: 'parent', spaceId: 'space', folderId: null };
    await updateDocumentMove({ update: async () => { throw new Error('Must use a guarded write'); }, updateMany: async (args: any) => { write = args; return { count: 1 }; } } as any, 'doc', data, '2026-10-17T12:00:00.000Z');
    assert.deepEqual(write, { where: { id: 'doc', updatedAt: new Date('2026-10-17T12:00:00.000Z'), deletedAt: null }, data });
  });
  it('returns conflict when the revision was changed, removed or deleted', async () => {
    await assert.rejects(() => updateDocumentMove({ updateMany: async () => ({ count: 0 }) } as any, 'doc', { parentId: null }, '2026-10-17T12:00:00.000Z'), (error: any) => error.status === 409);
  });
  it('keeps the existing operation available for clients without revision support', async () => {
    let write: any;
    await updateDocumentMove({ update: async (args: any) => { write = args; } } as any, 'doc', { parentId: null });
    assert.deepEqual(write, { where: { id: 'doc' }, data: { parentId: null } });
  });
});
