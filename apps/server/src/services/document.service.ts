import { prisma } from '../prisma';
import { Document, Prisma } from '@prisma/client';

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

    return prisma.document.create({
      data: {
        spaceId: data.spaceId,
        folderId: data.folderId || null,
        parentId: data.parentId || null,
        projectId: data.projectId || null,
        title: data.title,
        subtitle: data.subtitle || null,
        statusBadges: data.statusBadges || [],
        contentJson: data.contentJson || { type: "doc", content: [{ type: "paragraph" }] },
        contentMarkdown: data.contentMarkdown || "",
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

  static async deepDelete(id: string, deletedAt: Date = new Date()) {
    const doc = await prisma.document.findUnique({ where: { id }});
    if (!doc || doc.deletedAt) return;
    
    await prisma.document.update({
      where: { id },
      data: { deletedAt }
    });

    const children = await prisma.document.findMany({ where: { parentId: id, deletedAt: null }});
    for (const child of children) {
      await this.deepDelete(child.id, deletedAt);
    }
  }

  static async deepRestore(id: string) {
    const doc = await prisma.document.findUnique({ where: { id }});
    if (!doc || !doc.deletedAt) return;
    
    const deletedAt = doc.deletedAt;
    await this.deepRestoreNode(id, deletedAt);
  }

  static async deepRestoreNode(id: string, deletedAt: Date) {
    await prisma.document.update({
      where: { id },
      data: { deletedAt: null }
    });

    const children = await prisma.document.findMany({ where: { parentId: id, deletedAt }});
    for (const child of children) {
      await this.deepRestoreNode(child.id, deletedAt);
    }
  }

  static async duplicateSubtree(id: string, createdById: string, newParentId: string | null = null): Promise<string> {
    const original = await prisma.document.findUnique({ 
      where: { id },
      include: { tags: true }
    });
    if (!original) throw new Error("Document not found");

    const duplicated = await prisma.document.create({
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
          create: original.tags.map(t => ({ tagId: t.tagId }))
        }
      }
    });

    // Copy outgoing links
    const outgoingLinks = await prisma.entityLink.findMany({
      where: { sourceType: 'DOCUMENT', sourceId: id }
    });
    if (outgoingLinks.length > 0) {
      await prisma.entityLink.createMany({
        data: outgoingLinks.map(l => ({
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
    const children = await prisma.document.findMany({ where: { parentId: id, deletedAt: null }});
    for (const child of children) {
      await this.duplicateSubtree(child.id, createdById, duplicated.id);
    }

    return duplicated.id;
  }
}
