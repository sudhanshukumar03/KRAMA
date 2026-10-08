import { prisma, runInTransaction } from '../prisma';
import { taskService } from './task.service';
import { Prisma, DocumentType, TaskPriority, TaskStatus } from '@prisma/client';
import { extractMarkdown, extractPlainText, calculateCounts } from '../utils/tiptap';
import { documentLinkExists, reconcileDocumentLinks, queueDocumentEmbedding } from './documentContent.service';

export class DocumentService {
  /**
   * Tree utility: fetch full path up to root to determine depth.
   */
  static async getDepth(documentId: string): Promise<number> {
    let currentId: string | null = documentId;
    let depth = 1;
    while (currentId && depth < 10) {
      const doc: { parentId: string | null } | null = await prisma.document.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
      if (!doc || !doc.parentId) break;
      depth++;
      currentId = doc.parentId;
    }
    return depth;
  }

  /**
   * Cycle detection: is targetParent a descendant of documentId?
   */
  static async isDescendant(documentId: string, potentialDescendantId: string): Promise<boolean> {
    if (documentId === potentialDescendantId) return true;
    let currentId: string | null = potentialDescendantId;
    let iterations = 0;
    while (currentId && iterations < 10) {
      const doc: { parentId: string | null } | null = await prisma.document.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
      if (!doc || !doc.parentId) return false;
      if (doc.parentId === documentId) return true;
      currentId = doc.parentId;
      iterations++;
    }
    return false;
  }

  static async createDocument(data: {
    spaceId: string;
    folderId?: string;
    parentId?: string;
    projectId?: string;
    title: string;
    subtitle?: string;
    statusBadges?: string[];
    contentJson?: Prisma.InputJsonValue;
    contentMarkdown?: string;
    createdById: string;
    documentType?: DocumentType;
  }) {
    if (data.parentId) {
      const depth = await this.getDepth(data.parentId);
      if (depth >= 3) {
        throw new Error('Nesting limit reached. Max depth is 3.');
      }
    }

    const contentJson = (data.contentJson || { type: "doc", content: [{ type: "paragraph" }] }) as Prisma.InputJsonValue;
    const plainText = extractPlainText(contentJson);
    const contentMarkdown = data.contentMarkdown || extractMarkdown(contentJson);
    const { wordCount, charCount } = calculateCounts(plainText);

    const doc = await prisma.$transaction(async tx => {
      const space = await tx.space.findFirst({ where: { id: data.spaceId, deletedAt: null, workspace: { deletedAt: null } } });
      if (!space) throw new Error('Space not found');
      if (data.parentId) {
        const parent = await tx.document.findFirst({
          where: { id: data.parentId, deletedAt: null },
          select: { spaceId: true },
        });
        if (!parent) throw new Error('Parent document not found or has been deleted');
        if (parent.spaceId !== space.id) throw new Error('Parent document must belong to the same active space');
      }
      const created = await tx.document.create({
      data: {
        spaceId: data.spaceId,
        folderId: data.folderId || null,
        parentId: data.parentId || null,
        projectId: data.projectId || null,
        title: data.title,
        subtitle: data.subtitle || null,
        statusBadges: data.statusBadges || [],
        contentJson,
        contentMarkdown,
        wordCount,
        charCount,
        createdById: data.createdById,
        lastEditedById: data.createdById,
        documentType: data.documentType || 'GENERAL',
      },
      });
      await reconcileDocumentLinks(tx, created.id, space.workspaceId, null, contentJson, data.createdById);
      return created;
    });
    queueDocumentEmbedding(doc).catch(console.error);
    return doc;
  }

  static async moveDocument(id: string, targetFolderId?: string, targetParentId?: string) {
    const moving = await prisma.document.findUnique({
      where: { id },
      select: { spaceId: true, space: { select: { workspaceId: true } }, deletedAt: true },
    });
    if (!moving || moving.deletedAt) throw new Error('Document not found');

    let resolvedSpaceId: string | undefined;

    if (targetParentId) {
      const isCycle = await this.isDescendant(id, targetParentId);
      if (isCycle) throw new Error('Cycle detected: cannot move document under its own descendant.');

      const depth = await this.getDepth(targetParentId);
      if (depth >= 3) throw new Error('Nesting limit reached. Max depth is 3.');

      const maxSubtreeDepth = await this.getMaxSubtreeDepth(id);
      if (depth + maxSubtreeDepth > 3) {
         throw new Error(`Moving this document would exceed max depth 3 for its descendants.`);
      }

      // The parent must live in the same workspace, and the child adopts the
      // parent's space so the tree can't end up straddling two spaces (parent in
      // space A, child left in space B). Without this the move silently produced
      // an inconsistent hierarchy and let a document be reparented across
      // workspaces via a crafted targetParentId.
      const parent = await prisma.document.findUnique({
        where: { id: targetParentId },
        select: { spaceId: true, space: { select: { workspaceId: true } }, deletedAt: true },
      });
      if (!parent || parent.deletedAt) throw new Error('Target parent document not found');
      if (parent.space?.workspaceId !== moving.space?.workspaceId) {
        throw new Error('Cannot move a document under a parent in a different workspace.');
      }
      resolvedSpaceId = parent.spaceId;
    }

    // Resolve the folder without clobbering it: callers that only reparent
    // (send targetParentId, not targetFolderId) previously had folderId wiped to
    // null on every move. When no folder is specified, inherit the new parent's
    // folder so a child stays in the same folder tree; only a true root move
    // (no parent, no folder) unfiles the document.
    let resolvedFolderId: string | null;
    if (targetFolderId !== undefined) {
      resolvedFolderId = targetFolderId || null;
    } else if (targetParentId) {
      const parent = await prisma.document.findUnique({
        where: { id: targetParentId },
        select: { folderId: true },
      });
      resolvedFolderId = parent?.folderId ?? null;
    } else {
      resolvedFolderId = null;
    }

    return prisma.document.update({
      where: { id },
      data: {
        folderId: resolvedFolderId,
        parentId: targetParentId || null,
        ...(resolvedSpaceId ? { spaceId: resolvedSpaceId } : {}),
      },
    });
  }
  
  static async getMaxSubtreeDepth(id: string): Promise<number> {
    const children = await prisma.document.findMany({ where: { parentId: id, deletedAt: null }});
    if (children.length === 0) return 1;
    let max = 1;
    for (const child of children) {
      const childDepth = await this.getMaxSubtreeDepth(child.id);
      if (childDepth + 1 > max) max = childDepth + 1;
    }
    return max;
  }

  static async deepDelete(id: string, deletedAt: Date = new Date(), externalTx?: Prisma.TransactionClient) {
    const run = async (tx: Prisma.TransactionClient) => {
      const doc = await tx.document.findUnique({ where: { id }});
      if (!doc || doc.deletedAt) return;
      
      await tx.document.update({
        where: { id },
        data: { deletedAt }
      });

      // Purge embeddings for the soft-deleted document. The FK cascade only fires
      // on a hard row delete, so without this a soft-deleted doc's chunks linger
      // and can still be retrieved by grounded AI / RAG. They're regenerated from
      // content on the next edit after a restore.
      await tx.knowledgeChunk.deleteMany({ where: { documentId: id } });

      const children = await tx.document.findMany({ where: { parentId: id, deletedAt: null }});
      for (const child of children) {
        await this.deepDelete(child.id, deletedAt, tx);
      }
    };

    if (externalTx) {
      await run(externalTx);
    } else {
      await prisma.$transaction(run);
    }
  }

  static async deepRestore(id: string, externalTx?: Prisma.TransactionClient) {
    const restoredIds: string[] = [];
    const run = async (tx: Prisma.TransactionClient) => {
      const doc = await tx.document.findUnique({ where: { id }});
      if (!doc || !doc.deletedAt) return;
      
      const deletedAt = doc.deletedAt;
      await this.deepRestoreNode(id, deletedAt, tx, restoredIds);
    };

    if (externalTx) {
      await run(externalTx);
    } else {
      await prisma.$transaction(run);
    }

    // Automatically re-dispatch embedding jobs for restored documents so they
    // immediately reappear in hybrid vector/RAG search without requiring manual edits
    if (restoredIds.length > 0) {
      try {
        const docs = await prisma.document.findMany({
          where: { id: { in: restoredIds }, deletedAt: null },
          select: { id: true, contentMarkdown: true }
        });
        for (const doc of docs) {
          queueDocumentEmbedding(doc).catch(console.error);
        }
      } catch (err) {
        console.error('[DocumentService] Failed to dispatch re-embedding for restored docs:', err);
      }
    }
  }

  static async deepRestoreNode(id: string, deletedAt: Date, tx: Prisma.TransactionClient, restoredIds?: string[]) {
    await tx.document.update({
      where: { id },
      data: { deletedAt: null }
    });
    if (restoredIds) {
      restoredIds.push(id);
    }

    const children = await tx.document.findMany({ where: { parentId: id, deletedAt }});
    for (const child of children) {
      await this.deepRestoreNode(child.id, deletedAt, tx, restoredIds);
    }
  }

  static async duplicateSubtree(id: string, createdById: string, newParentId: string | null = null, externalTx?: Prisma.TransactionClient, duplicatedIds: string[] = []): Promise<string> {
    if (!externalTx) {
      const originalDoc = await prisma.document.findUnique({ where: { id }, select: { parentId: true, deletedAt: true } });
      if (!originalDoc || originalDoc.deletedAt) throw new Error("Document not found");
      const targetParentId = newParentId !== null ? newParentId : originalDoc.parentId;
      if (targetParentId) {
        const parentDepth = await this.getDepth(targetParentId);
        const subtreeDepth = await this.getMaxSubtreeDepth(id);
        if (parentDepth + subtreeDepth > 3) {
          throw new Error(`Cannot duplicate: would exceed maximum nesting depth of 3.`);
        }
      }
    }

    const run = async (tx: Prisma.TransactionClient): Promise<string> => {
      const original = await tx.document.findUnique({ 
        where: { id },
        include: { tags: true }
      });
      if (!original || original.deletedAt) throw new Error("Document not found");

      const space = await tx.space.findFirst({ where: { id: original.spaceId, deletedAt: null, workspace: { deletedAt: null } } });
      if (!space) throw new Error('Space not found');
      const duplicated = await tx.document.create({
        data: {
          spaceId: original.spaceId,
          folderId: original.folderId,
          parentId: newParentId !== null ? newParentId : original.parentId,
          projectId: original.projectId,
          title: original.title + ' (Copy)',
          subtitle: original.subtitle,
          icon: original.icon,
          contentJson: (original.contentJson ?? {}) as Prisma.InputJsonValue,
          contentMarkdown: original.contentMarkdown,
          wordCount: original.wordCount,
          charCount: original.charCount,
          statusBadges: original.statusBadges,
          documentType: original.documentType,
          createdById,
          lastEditedById: createdById,
          tags: {
            create: original.tags.map((t) => ({ tagId: t.tagId }))
          }
        }
      });

      duplicatedIds.push(duplicated.id);
      await reconcileDocumentLinks(tx, duplicated.id, space.workspaceId, null, original.contentJson, createdById);
      // Copy outgoing links
      const outgoingLinks = await tx.entityLink.findMany({
        where: { sourceType: 'DOCUMENT', sourceId: id }
      });
      const allowedLinks = [];
      for (const link of outgoingLinks) if (await documentLinkExists(tx, space.workspaceId, link)) allowedLinks.push(link);
      if (allowedLinks.length > 0) {
        await tx.entityLink.createMany({
          skipDuplicates: true,
          data: allowedLinks.map((l) => ({
            sourceType: 'DOCUMENT',
            sourceId: duplicated.id,
            targetType: l.targetType,
            targetId: l.targetId,
            linkType: l.linkType,
            createdById
          }))
        });
      }

      // Recursively duplicate children
      const children = await tx.document.findMany({ where: { parentId: id, deletedAt: null }});
      for (const child of children) {
        await this.duplicateSubtree(child.id, createdById, duplicated.id, tx, duplicatedIds);
      }

      return duplicated.id;
    };

    if (externalTx) {
      return run(externalTx);
    } else {
      const duplicatedId = await prisma.$transaction(run);
      const docs = await prisma.document.findMany({ where: { id: { in: duplicatedIds }, deletedAt: null } });
      for (const doc of docs) queueDocumentEmbedding(doc).catch(console.error);
      return duplicatedId;
    }
  }

  static async createTaskFromDocument(
    documentId: string,
    workspaceId: string,
    userId: string,
    data: {
      title: string;
      priority?: TaskPriority;
      status?: TaskStatus;
      description?: string;
    }
  ) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { space: true }
    });
    if (!document || document.deletedAt) throw new Error("Document not found");

    const resolvedWorkspaceId = workspaceId || document.space?.workspaceId;
    if (!resolvedWorkspaceId) throw new Error("Workspace ID is required to create a task");

    if (document.space?.workspaceId !== resolvedWorkspaceId) throw new Error('Document not found');
    return runInTransaction(async (tx, publishAfterCommit) => {
      const task = await taskService.createTaskWithinTransaction(tx, publishAfterCommit, {
        title: data.title.trim(),
        description: data.description || `Created from document "${document.title}"`,
        priority: data.priority || 'MEDIUM', status: data.status || 'TODO',
        workspaceId: resolvedWorkspaceId, projectId: document.projectId || null,
      }, userId);

      const link = await tx.entityLink.create({
        data: {
          sourceType: 'DOCUMENT',
          sourceId: document.id,
          targetType: 'TASK',
          targetId: task.id,
          linkType: 'REFERENCE',
          createdById: userId,
        }
      });

      return { task, link };
    });
  }
}

