import { prisma } from '../prisma';
import { Document, Prisma } from '@prisma/client';
import { extractMarkdown, extractPlainText, calculateCounts } from '../utils/tiptap';

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
    contentJson?: any;
    contentMarkdown?: string;
    createdById: string;
    documentType?: any;
  }) {
    if (data.parentId) {
      const depth = await this.getDepth(data.parentId);
      if (depth >= 3) {
        throw new Error('Nesting limit reached. Max depth is 3.');
      }
    }

    const contentJson = data.contentJson || { type: "doc", content: [{ type: "paragraph" }] };
    const plainText = extractPlainText(contentJson);
    const contentMarkdown = data.contentMarkdown || extractMarkdown(contentJson);
    const { wordCount, charCount } = calculateCounts(plainText);

    return prisma.document.create({
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
  }

  static async moveDocument(id: string, targetFolderId?: string, targetParentId?: string) {
    if (targetParentId) {
      const isCycle = await this.isDescendant(id, targetParentId);
      if (isCycle) throw new Error('Cycle detected: cannot move document under its own descendant.');

      const depth = await this.getDepth(targetParentId);
      if (depth >= 3) throw new Error('Nesting limit reached. Max depth is 3.');
      
      const maxSubtreeDepth = await this.getMaxSubtreeDepth(id);
      if (depth + maxSubtreeDepth > 3) {
         throw new Error(`Moving this document would exceed max depth 3 for its descendants.`);
      }
    }

    return prisma.document.update({
      where: { id },
      data: {
        folderId: targetFolderId || null,
        parentId: targetParentId || null,
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

  static async deepDelete(id: string, deletedAt: Date = new Date(), externalTx?: any) {
    const run = async (tx: any) => {
      const doc = await tx.document.findUnique({ where: { id }});
      if (!doc || doc.deletedAt) return;
      
      await tx.document.update({
        where: { id },
        data: { deletedAt }
      });

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

  static async deepRestore(id: string, externalTx?: any) {
    const run = async (tx: any) => {
      const doc = await tx.document.findUnique({ where: { id }});
      if (!doc || !doc.deletedAt) return;
      
      const deletedAt = doc.deletedAt;
      await this.deepRestoreNode(id, deletedAt, tx);
    };

    if (externalTx) {
      await run(externalTx);
    } else {
      await prisma.$transaction(run);
    }
  }

  static async deepRestoreNode(id: string, deletedAt: Date, tx: any) {
    await tx.document.update({
      where: { id },
      data: { deletedAt: null }
    });

    const children = await tx.document.findMany({ where: { parentId: id, deletedAt }});
    for (const child of children) {
      await this.deepRestoreNode(child.id, deletedAt, tx);
    }
  }

  static async duplicateSubtree(id: string, createdById: string, newParentId: string | null = null, externalTx?: any): Promise<string> {
    if (!externalTx) {
      const originalDoc = await prisma.document.findUnique({ where: { id }, select: { parentId: true } });
      if (!originalDoc) throw new Error("Document not found");
      const targetParentId = newParentId !== null ? newParentId : originalDoc.parentId;
      if (targetParentId) {
        const parentDepth = await this.getDepth(targetParentId);
        const subtreeDepth = await this.getMaxSubtreeDepth(id);
        if (parentDepth + subtreeDepth > 3) {
          throw new Error(`Cannot duplicate: would exceed maximum nesting depth of 3.`);
        }
      }
    }

    const run = async (tx: any): Promise<string> => {
      const original = await tx.document.findUnique({ 
        where: { id },
        include: { tags: true }
      });
      if (!original) throw new Error("Document not found");

      const duplicated = await tx.document.create({
        data: {
          spaceId: original.spaceId,
          folderId: original.folderId,
          parentId: newParentId !== null ? newParentId : original.parentId,
          projectId: original.projectId,
          title: original.title + ' (Copy)',
          subtitle: original.subtitle,
          icon: original.icon,
          contentJson: original.contentJson as any,
          contentMarkdown: original.contentMarkdown,
          statusBadges: original.statusBadges,
          documentType: original.documentType,
          createdById,
          lastEditedById: createdById,
          tags: {
            create: original.tags.map((t: any) => ({ tagId: t.tagId }))
          }
        }
      });

      // Copy outgoing links
      const outgoingLinks = await tx.entityLink.findMany({
        where: { sourceType: 'DOCUMENT', sourceId: id }
      });
      if (outgoingLinks.length > 0) {
        await tx.entityLink.createMany({
          data: outgoingLinks.map((l: any) => ({
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
        await this.duplicateSubtree(child.id, createdById, duplicated.id, tx);
      }

      return duplicated.id;
    };

    if (externalTx) {
      return run(externalTx);
    } else {
      return prisma.$transaction(run);
    }
  }

  static async createTaskFromDocument(
    documentId: string,
    workspaceId: string,
    userId: string,
    data: {
      title: string;
      priority?: any;
      status?: any;
      description?: string;
    }
  ) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { space: true }
    });
    if (!document) throw new Error("Document not found");

    const resolvedWorkspaceId = workspaceId || document.space?.workspaceId;
    if (!resolvedWorkspaceId) throw new Error("Workspace ID is required to create a task");

    return prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title: data.title.trim(),
          description: data.description || `Created from document "${document.title}"`,
          priority: data.priority || 'MEDIUM',
          status: data.status || 'TODO',
          workspaceId: resolvedWorkspaceId,
          projectId: document.projectId || null,
          createdBy: userId,
        }
      });

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

