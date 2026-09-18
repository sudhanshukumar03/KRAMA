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
      await prisma.space.delete({ where: { id: space.id } });
    }
    await prisma.$disconnect();
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

    const child = await DocumentService.createDocument({
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
});
