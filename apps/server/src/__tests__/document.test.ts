import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../prisma';
import { DocumentService } from '../services/document.service';

describe('Brain Workspace - Step 1: Tree + CRUD', () => {
  let workspace: any;
  let user: any;
  let space: any;

  before(async () => {
    user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `test-doc-${Date.now()}@example.com`,
          passwordHash: 'dummyhash',
        },
      });
    }

    workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: { name: 'Test Doc Workspace', createdBy: user.id },
      });
    }

    space = await prisma.space.create({
      data: { name: 'Test Space', workspaceId: workspace.id },
    });
  });

  after(async () => {
    if (space) {
      await prisma.space.delete({ where: { id: space.id } }).catch(() => {});
    }
    await prisma.$disconnect().catch(() => {});
    await (globalThis as any).pool?.end?.().catch(() => {});
    try {
      const { redisService } = await import('../services/redis.service');
      await redisService.client.quit().catch(() => {});
    } catch {}
    try {
      const { connection } = await import('../lib/redis');
      await connection.quit().catch(() => {});
    } catch {}
  });

  it('Creating a 4th nesting level returns an error', async () => {
    const doc1 = await DocumentService.createDocument({
      spaceId: space.id,
      title: 'Level 1',
      createdById: user.id,
    });
    
    const doc2 = await DocumentService.createDocument({
      spaceId: space.id,
      parentId: doc1.id,
      title: 'Level 2',
      createdById: user.id,
    });

    const doc3 = await DocumentService.createDocument({
      spaceId: space.id,
      parentId: doc2.id,
      title: 'Level 3',
      createdById: user.id,
    });

    await assert.rejects(
      async () => {
        await DocumentService.createDocument({
          spaceId: space.id,
          parentId: doc3.id,
          title: 'Level 4',
          createdById: user.id,
        });
      },
      (err: Error) => {
        assert(err.message.includes('Nesting limit reached'), 'Should reject 4th level');
        return true;
      }
    );
  });

  it('Moving a document under its own descendant is rejected as a cycle', async () => {
    const parent = await DocumentService.createDocument({
      spaceId: space.id,
      title: 'Parent',
      createdById: user.id,
    });

    const child = await DocumentService.createDocument({
      spaceId: space.id,
      parentId: parent.id,
      title: 'Child',
      createdById: user.id,
    });

    await assert.rejects(
      async () => {
        await DocumentService.moveDocument(parent.id, undefined, child.id);
      },
      (err: Error) => {
        assert(err.message.includes('Cycle detected'), 'Should reject cycle');
        return true;
      }
    );
  });

  it('Deleting a parent moves its whole subtree to Trash and restores it intact', async () => {
    const parent = await DocumentService.createDocument({
      spaceId: space.id,
      title: 'Trash Parent',
      createdById: user.id,
    });

    const child = await DocumentService.createDocument({
      spaceId: space.id,
      parentId: parent.id,
      title: 'Trash Child',
      createdById: user.id,
    });

    // Deep delete
    await DocumentService.deepDelete(parent.id);

    // Verify both are deleted
    const deletedParent = await prisma.document.findUnique({ where: { id: parent.id } });
    const deletedChild = await prisma.document.findUnique({ where: { id: child.id } });
    
    assert(deletedParent?.deletedAt !== null, 'Parent should be deleted');
    assert(deletedChild?.deletedAt !== null, 'Child should be deleted');

    // Deep restore
    await DocumentService.deepRestore(parent.id);

    // Verify both are restored
    const restoredParent = await prisma.document.findUnique({ where: { id: parent.id } });
    const restoredChild = await prisma.document.findUnique({ where: { id: child.id } });

    assert(restoredParent?.deletedAt === null, 'Parent should be restored');
    assert(restoredChild?.deletedAt === null, 'Child should be restored');
  });

  it('Duplicating a document subtree clones the node and its children', async () => {
    const parent = await DocumentService.createDocument({
      spaceId: space.id,
      title: 'Original Node',
      createdById: user.id,
    });

    const _child = await DocumentService.createDocument({
      spaceId: space.id,
      parentId: parent.id,
      title: 'Original Child',
      createdById: user.id,
    });

    const duplicatedParentId = await DocumentService.duplicateSubtree(parent.id, user.id);
    const duplicatedParent = await prisma.document.findUnique({
      where: { id: duplicatedParentId },
      include: { children: true }
    });

    assert(duplicatedParent, 'Duplicated parent should exist');
    assert.strictEqual(duplicatedParent.title, 'Original Node (Copy)');
    assert.strictEqual(duplicatedParent.children.length, 1);
    assert.strictEqual(duplicatedParent.children[0].title, 'Original Child (Copy)');
  });

  it('Moving document to root clears parentId', async () => {
    const parent = await DocumentService.createDocument({
      spaceId: space.id,
      title: 'Parent Root',
      createdById: user.id,
    });

    const child = await DocumentService.createDocument({
      spaceId: space.id,
      parentId: parent.id,
      title: 'Child To Move',
      createdById: user.id,
    });

    const moved = await DocumentService.moveDocument(child.id, undefined, undefined);
    assert.strictEqual(moved.parentId, null, 'Moved document should have null parentId');
  });

  it('Extracts entity links from TipTap ProseMirror document marks', () => {
    const { extractEntityLinks } = require('../utils/tiptap');
    const mockJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Check this out: ',
            },
            {
              type: 'text',
              text: 'Sub Spec',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: '/brain?doc=doc-abc-123',
                    'data-doc-id': 'doc-abc-123',
                  },
                },
              ],
            },
            {
              type: 'text',
              text: ' and task ',
            },
            {
              type: 'text',
              text: '@Task 42',
              marks: [
                {
                  type: 'mention',
                  attrs: {
                    'data-entity-type': 'TASK',
                    'data-entity-id': 'task-xyz-789',
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const links = extractEntityLinks(mockJson);
    assert.strictEqual(links.length, 2, 'Should extract two entity links');
    assert.deepStrictEqual(links[0], { targetType: 'DOCUMENT', targetId: 'doc-abc-123' });
    assert.deepStrictEqual(links[1], { targetType: 'TASK', targetId: 'task-xyz-789' });
  });

  it('Soft delete separates active documents from trash and allows cascading purge', async () => {
    const parent = await DocumentService.createDocument({
      spaceId: space.id,
      title: 'To Be Purged Parent',
      createdById: user.id,
    });

    const child = await DocumentService.createDocument({
      spaceId: space.id,
      parentId: parent.id,
      title: 'To Be Purged Child',
      createdById: user.id,
    });

    // Soft delete parent and child
    await DocumentService.deepDelete(parent.id);

    // Active documents in space should not include them
    const activeDocs = await prisma.document.findMany({
      where: { spaceId: space.id, deletedAt: null },
    });
    assert(!activeDocs.some(d => d.id === parent.id || d.id === child.id), 'Soft-deleted docs should not appear in active list');

    // Deleted documents in space should include them
    const trashDocs = await prisma.document.findMany({
      where: { spaceId: space.id, deletedAt: { not: null } },
    });
    assert(trashDocs.some(d => d.id === parent.id), 'Trash list should include parent');
    assert(trashDocs.some(d => d.id === child.id), 'Trash list should include child');

    // Perform hard cascading purge
    await prisma.$transaction(async (tx) => {
      const collectIds = async (docId: string): Promise<string[]> => {
        const children = await tx.document.findMany({ where: { parentId: docId }, select: { id: true } });
        let ids = [docId];
        for (const c of children) {
          const childIds = await collectIds(c.id);
          ids = ids.concat(childIds);
        }
        return ids;
      };

      const allIds = await collectIds(parent.id);
      for (const id of allIds.reverse()) {
        await tx.document.delete({ where: { id } }).catch(() => {});
      }
    });

    const purgedParent = await prisma.document.findUnique({ where: { id: parent.id } });
    const purgedChild = await prisma.document.findUnique({ where: { id: child.id } });
    assert.strictEqual(purgedParent, null, 'Parent should be permanently purged');
    assert.strictEqual(purgedChild, null, 'Child should be permanently purged');
  });
});
