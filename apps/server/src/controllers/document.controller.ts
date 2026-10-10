import { getDocumentGraph } from '../services/documentGraph.service';
import { importDocumentSpecContent } from '../services/documentSpec.service';
import { sendBrainAiStream } from '../services/documentAi.service';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { UpdateDocumentMetadataSchema } from '@krama/validation';
import { Prisma } from '@prisma/client';

import { saveDocumentContent, queueDocumentEmbedding, snapshotDocument } from '../services/documentContent.service';
import { DocumentService } from '../services/document.service';
import { documentVersionQueue } from '../queues';
import { redisService } from '../services/redis.service';

function documentErrorResponse(error: unknown, defaultStatus = 400): { status: number; payload: { message: string; requestId?: string } } {
  const fields = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const message = typeof fields.message === 'string' ? fields.message : undefined;
  const databaseFailure = String(fields.name || '').startsWith('Prisma') ||
    /^(?:P\d{4}|[0-9A-Z]{5}|ECONN\w*|ETIMEDOUT|EHOST\w*)$/.test(String(fields.code || ''));
  const requestedStatus = Number(fields.statusCode || fields.status || (databaseFailure ? 500 : defaultStatus));
  const status = Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus < 600 ? requestedStatus : 500;
  if (status < 500) return { status, payload: { message: message || 'Unable to complete document operation' } };
  const requestId = randomUUID();
  console.error(`[Document operation] Unexpected failure ${requestId}`, error);
  return { status, payload: {
    message: process.env.NODE_ENV === 'development' ? (message || 'Internal server error') : 'Internal server error',
    requestId,
  } };
}

function handleDocumentError(res: Response, error: unknown, defaultStatus = 400) {
  const { status, payload } = documentErrorResponse(error, defaultStatus);
  return res.status(status).json(payload);
}

/**
 * Helper to ensure the target document belongs to the active workspace.
 */
const verifyDocWorkspace = async (docId: string, req: Request): Promise<{ ok: boolean; doc?: Prisma.DocumentGetPayload<{ include: { space: true } }> }> => {
  const workspaceId = req.workspaceId || (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
  const userId = req.user?.id;
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    include: { space: true }
  });
  if (!doc) return { ok: false };
  if (workspaceId && doc.space?.workspaceId !== workspaceId) {
    return { ok: false };
  }
  if (userId) {
    const isMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId: doc.space?.workspaceId, userId }
    });
    if (!isMember) return { ok: false };
  }
  return { ok: true, doc };
};


export const getWorkspaceDocuments = async (req: Request, res: Response) => {
  try {
    let workspaceId = req.workspaceId || req.body?.workspaceId || (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId && req.user?.id) {
      const member = await prisma.workspaceMember.findFirst({
        where: { userId: req.user.id }
      });
      if (member) workspaceId = member.workspaceId;
    }

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    const isDeleted = req.query.deleted === 'true';
    const spaceId = req.query.spaceId as string | undefined;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const rawLimit = Number(req.query.limit ?? 200);
    const pageSize = Number.isFinite(rawLimit) ? Math.max(1, Math.min(200, Math.floor(rawLimit))) : 200;

    const where: Prisma.DocumentWhereInput = {
      space: {
        workspaceId,
        ...(isDeleted ? {} : { deletedAt: null }),
        ...(spaceId && spaceId !== 'ALL' ? { id: spaceId } : {}),
      },
      deletedAt: isDeleted ? { not: null } : null,
      ...(cursor ? { id: { gt: cursor } } : {}),
    };

    const documents = await prisma.document.findMany({
      where,
      select: {
        id: true, spaceId: true, folderId: true, parentId: true, projectId: true,
        title: true, subtitle: true, icon: true, statusBadges: true, documentType: true,
        isFavorite: true, wordCount: true, charCount: true, deletedAt: true,
        createdById: true, lastEditedById: true, createdAt: true, updatedAt: true,
        tags: { include: { tag: true } },
      },
      orderBy: { id: 'asc' },
      take: pageSize + 1,
    });

    const hasMore = documents.length > pageSize;
    const items = hasMore ? documents.slice(0, pageSize) : documents;
    res.status(200).json({ items, nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null });
  } catch (error) {
    handleDocumentError(res, error, 500);
  }
};

export const createWorkspaceDocument = async (req: Request, res: Response) => {
  try {
    let workspaceId = req.workspaceId || req.body?.workspaceId || (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId && req.user?.id) {
      const member = await prisma.workspaceMember.findFirst({
        where: { userId: req.user.id }
      });
      if (member) workspaceId = member.workspaceId;
    }

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    const { title, folderId, parentId, projectId, documentType, spaceId, contentJson } = req.body;
    const userId = req.user?.id || 'system';

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // If parentId is provided, inherit the parent document's spaceId to preserve tree consistency
    let targetSpaceId = spaceId;
    if (parentId) {
      const parentDoc = await prisma.document.findFirst({
        where: { id: parentId, deletedAt: null },
        select: { spaceId: true, space: { select: { workspaceId: true } } }
      });
      if (!parentDoc) {
        return res.status(400).json({ message: 'Parent document not found or has been deleted' });
      }
      if (parentDoc.space?.workspaceId !== workspaceId) {
        return res.status(403).json({ message: 'Parent document belongs to a different workspace' });
      }
      targetSpaceId = parentDoc.spaceId;
    }

    if (projectId) {
      const proj = await prisma.project.findFirst({
        where: { id: projectId, workspaceId, deletedAt: null }
      });
      if (!proj) {
        return res.status(400).json({ message: 'Target project must belong to the active workspace' });
      }
    }

    if (targetSpaceId) {
      const exists = await prisma.space.findFirst({ where: { id: targetSpaceId, workspaceId, deletedAt: null } });
      if (!exists) targetSpaceId = undefined;
    }
    if (!targetSpaceId) {
      let space = await prisma.space.findFirst({
        where: { workspaceId, deletedAt: null }
      });
      if (!space) {
        space = await prisma.space.create({
          data: {
            name: 'General',
            workspaceId,
          }
        });
      }
      targetSpaceId = space.id;
    }

    const doc = await DocumentService.createDocument({
      spaceId: targetSpaceId,
      folderId,
      parentId,
      projectId,
      title,
      createdById: userId,
      documentType,
      contentJson,
    });

    res.status(201).json(doc);
  } catch (error) {
    handleDocumentError(res, error);
  }
};

export const getDocumentById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { ok, doc } = await verifyDocWorkspace(id, req);
    if (!ok || !doc || doc.deletedAt) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const document = await prisma.document.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } }
    });

    res.status(200).json(document);
  } catch (error) {
    handleDocumentError(res, error, 500);
  }
};


export const updateDocumentMetadata = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { ok, doc } = await verifyDocWorkspace(id, req);
    if (!ok || !doc || doc.deletedAt) return res.status(404).json({ message: 'Document not found' });

    const metadata = UpdateDocumentMetadataSchema.parse(req.body);
    const { title, subtitle, statusBadges, documentType, isFavorite, icon, projectId, linkedProjectId, expectedUpdatedAt } = metadata;
    const project = projectId !== undefined ? projectId : linkedProjectId;

    if (project) {
      const proj = await prisma.project.findFirst({
        where: { id: project, workspaceId: doc.space?.workspaceId, deletedAt: null }
      });
      if (!proj) {
        return res.status(400).json({ message: 'Target project must belong to the active workspace' });
      }
    }

    const data = {
      title, subtitle, statusBadges, documentType, isFavorite, icon,
      ...(project !== undefined ? { projectId: project } : {})
    };
    let updated;
    if (expectedUpdatedAt) {
      // Return the revision from this exact write, not a subsequent read that
      // could observe another writer's newer revision.
      const rows = await prisma.document.updateManyAndReturn({
        where: { id, updatedAt: new Date(expectedUpdatedAt), deletedAt: null }, data,
      });
      if (!rows.length) return res.status(409).json({ message: 'Document was modified elsewhere. Your draft has not been saved.' });
      updated = rows[0]!;
    } else {
      updated = await prisma.document.update({ where: { id }, data });
    }

    res.status(200).json(updated);
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError' && 'issues' in error && Array.isArray(error.issues)) {
      return res.status(400).json({ message: error.issues[0]?.message || 'Invalid document metadata', errors: error.issues });
    }
    return handleDocumentError(res, error, 500);
  }
};

export const moveDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Document ID is required' });
    }
    const { ok } = await verifyDocWorkspace(id, req);
    if (!ok) return res.status(404).json({ message: 'Document not found' });

    const { targetFolderId, targetParentId } = req.body;

    const doc = await DocumentService.moveDocument(id, targetFolderId, targetParentId);
    res.status(200).json(doc);
  } catch (error) {
    handleDocumentError(res, error);
  }
};

export const duplicateDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Document ID is required' });
    }
    const { ok } = await verifyDocWorkspace(id, req);
    if (!ok) return res.status(404).json({ message: 'Document not found' });

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const duplicatedId = await DocumentService.duplicateSubtree(id, userId as string);
    const duplicated = await prisma.document.findUnique({ where: { id: duplicatedId } });
    
    res.status(201).json(duplicated);
  } catch (error) {
    handleDocumentError(res, error);
  }
};

export const toggleFavorite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Document ID is required' });
    }
    const { ok, doc } = await verifyDocWorkspace(id, req);
    if (!ok || !doc) return res.status(404).json({ message: 'Not found' });

    const updated = await prisma.document.update({
      where: { id },
      data: { isFavorite: !doc.isFavorite }
    });

    res.status(200).json(updated);
  } catch (error) {
    handleDocumentError(res, error);
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Document ID is required' });
    }
    const { ok } = await verifyDocWorkspace(id, req);
    if (!ok) return res.status(404).json({ message: 'Document not found' });

    await DocumentService.deepDelete(id);
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error) {
    handleDocumentError(res, error, 500);
  }
};

export const restoreDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Document ID is required' });
    }
    const { ok } = await verifyDocWorkspace(id, req);
    if (!ok) return res.status(404).json({ message: 'Document not found' });

    await DocumentService.deepRestore(id);
    res.status(200).json({ message: 'Restored successfully' });
  } catch (error) {
    handleDocumentError(res, error, 500);
  }
};

export const purgeDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Document ID is required' });
    }
    const { ok } = await verifyDocWorkspace(id, req);
    if (!ok) return res.status(404).json({ message: 'Document not found' });

    // Hard delete document and all its relations recursively
    await prisma.$transaction(async (tx) => {
      const collectIds = async (docId: string): Promise<string[]> => {
        const children = await tx.document.findMany({ where: { parentId: docId }, select: { id: true } });
        let ids = [docId];
        for (const child of children) {
          const childIds = await collectIds(child.id);
          ids = ids.concat(childIds);
        }
        return ids;
      };

      const allIds = await collectIds(id);

      await tx.knowledgeChunk.deleteMany({ where: { documentId: { in: allIds } } });
      await tx.documentVersion.deleteMany({ where: { documentId: { in: allIds } } });
      await tx.entityLink.deleteMany({
        where: {
          OR: [
            { sourceType: 'DOCUMENT', sourceId: { in: allIds } },
            { targetType: 'DOCUMENT', targetId: { in: allIds } }
          ]
        }
      });
      await tx.documentTag.deleteMany({ where: { documentId: { in: allIds } } });

      for (const docId of allIds.reverse()) {
        await tx.document.delete({ where: { id: docId } }).catch(() => {});
      }
    });

    res.status(200).json({ message: 'Permanently deleted' });
  } catch (error) {
    handleDocumentError(res, error, 500);
  }
};

export const updateDocumentContent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Document ID is required' });
    }
    const { ok } = await verifyDocWorkspace(id, req);
    if (!ok) return res.status(404).json({ message: 'Document not found' });

    const { contentJson, expectedUpdatedAt } = req.body;
    const userId = req.user?.id || 'system';

    const updated = await saveDocumentContent(id, contentJson, userId, expectedUpdatedAt);
    const { wordCount, charCount } = updated;
    queueDocumentEmbedding(updated).catch(console.error);

    // Handle autosave versioning: 50 mutations or 5 min idle (safe against Redis errors)
    try {
      const mutations = await redisService.incr(`doc:${id}:mutations`);
      const idleKey = `doc:${id}:idle-job`;
      const pendingJobId = await redisService.get(idleKey);
      const idleJobId = `idle-snapshot-${id}-${randomUUID()}`;
      
      if (mutations >= 50) {
        await documentVersionQueue.add('snapshot', {
          documentId: id,
          userId,
          contentJson
        });
        await redisService.del(`doc:${id}:mutations`);
        
        // Clear any pending idle snapshot since we just took one
        const pendingIdleJob = pendingJobId ? await documentVersionQueue.getJob(pendingJobId) : null;
        if (pendingIdleJob) {
          await pendingIdleJob.remove();
        }
      } else {
        // Debounce a 5-minute idle snapshot
        const pendingIdleJob = pendingJobId ? await documentVersionQueue.getJob(pendingJobId) : null;
        if (pendingIdleJob) {
          await pendingIdleJob.remove().catch(() => {});
        }
        await documentVersionQueue.add('snapshot', {
          documentId: id,
          userId,
          contentJson
        }, {
          jobId: idleJobId,
          delay: 5 * 60 * 1000 // 5 minutes
        });
        await redisService.set(idleKey, idleJobId, 10 * 60);
      }
    } catch (redisErr) {
      console.warn('[updateDocumentContent] Redis versioning skipped:', redisErr);
    }

    res.status(200).json({
      updatedAt: updated?.updatedAt,
      wordCount,
      charCount
    });
  } catch (error) {
    handleDocumentError(res, error);
  }
};

export const getVersions = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { ok } = await verifyDocWorkspace(id, req);
    if (!ok) return res.status(404).json({ message: 'Document not found' });

    const versions = await prisma.documentVersion.findMany({
      where: { documentId: id },
      select: { id: true, versionNumber: true, createdAt: true, editedById: true },
      orderBy: { versionNumber: 'desc' }
    });
    res.status(200).json(versions);
  } catch (error) {
    handleDocumentError(res, error);
  }
};

// Manual user save — always creates a snapshot and resets mutation counter
export const createVersion = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { ok, doc } = await verifyDocWorkspace(id, req);
    if (!ok || !doc) return res.status(404).json({ message: 'Document not found' });

    const userId = req.user?.id || 'system';

    const version = await prisma.$transaction(tx => snapshotDocument(tx, id, userId));
    // The successful response means the row is persisted, even if Redis is down.
    redisService.del(`doc:${id}:mutations`).catch(() => {});
    res.status(201).json(version);
  } catch (error) {
    handleDocumentError(res, error);
  }
};

export const getVersion = async (req: Request, res: Response) => {
  try {
    const { id, versionId } = req.params as { id: string; versionId: string };
    const { ok } = await verifyDocWorkspace(id, req);
    if (!ok) return res.status(404).json({ message: 'Document not found' });

    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId }
    });
    if (!version || version.documentId !== id) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.status(200).json(version);
  } catch (error) {
    handleDocumentError(res, error);
  }
};

export const restoreVersion = async (req: Request, res: Response) => {
  try {
    const { id, versionId } = req.params as { id: string; versionId: string };
    const { ok, doc: currentDoc } = await verifyDocWorkspace(id, req);
    if (!ok || !currentDoc) return res.status(404).json({ message: 'Document not found' });

    const userId = req.user?.id || 'system';
    
    const versionToRestore = await prisma.documentVersion.findUnique({
      where: { id: versionId }
    });

    if (!versionToRestore || versionToRestore.documentId !== id) {
      return res.status(404).json({ message: 'Version not found' });
    }

    const updated = await saveDocumentContent(id, versionToRestore.contentJson, userId, currentDoc.updatedAt.toISOString(), true);
    queueDocumentEmbedding(updated).catch(console.error);

    res.status(200).json(updated);
  } catch (error) {
    handleDocumentError(res, error);
  }
};

export const getWorkspaceTags = async (req: Request, res: Response) => {
  try {
    let id: string | undefined = req.params.id as string; // workspaceId
    const userId = req.user?.id;
    if (!id || id === 'undefined' || id === 'null') {
      id = req.workspaceId;
    }
    if (!id && userId) {
      const member = await prisma.workspaceMember.findFirst({
        where: { userId }
      });
      if (member) id = member.workspaceId;
    }

    if (!id) return res.status(400).json({ message: 'Workspace ID required' });

    const isMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId: id, userId }
    });
    if (!isMember) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const tags = await prisma.tag.findMany({
      where: { workspaceId: id },
      orderBy: { name: 'asc' }
    });
    res.status(200).json(tags);
  } catch (error) {
    handleDocumentError(res, error);
  }
};

export const addDocumentTag = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string; // documentId
    const { ok, doc } = await verifyDocWorkspace(id, req);
    if (!ok || !doc) return res.status(404).json({ message: 'Document not found' });

    const { tagName, color } = req.body;
    const workspaceId = doc.space?.workspaceId;
    if (!workspaceId) return res.status(400).json({ message: 'Workspace ID missing' });

    const normalizedName = tagName.toLowerCase().trim();

    let tag = await prisma.tag.findFirst({
      where: {
        workspaceId,
        name: { equals: normalizedName, mode: 'insensitive' }
      }
    });

    if (!tag) {
      tag = await prisma.tag.create({
        data: {
          workspaceId,
          name: normalizedName,
          color
        }
      });
    }

    await prisma.documentTag.upsert({
      where: { documentId_tagId: { documentId: id, tagId: tag.id } },
      create: { documentId: id, tagId: tag.id },
      update: {}
    });

    res.status(200).json(tag);
  } catch (error) {
    handleDocumentError(res, error);
  }
};

export const removeDocumentTag = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { ok } = await verifyDocWorkspace(id, req);
    if (!ok) return res.status(404).json({ message: 'Document not found' });

    const tagId = req.params.tagId as string;
    await prisma.documentTag.delete({
      where: { documentId_tagId: { documentId: id, tagId } }
    });
    res.status(200).json({ message: 'Removed' });
  } catch (error) {
    handleDocumentError(res, error);
  }
};

export const getDocumentLinks = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { ok } = await verifyDocWorkspace(id, req);
    if (!ok) return res.status(404).json({ message: 'Document not found' });

    const outgoing = await prisma.entityLink.findMany({
      where: { sourceType: 'DOCUMENT', sourceId: id }
    });
    const incoming = await prisma.entityLink.findMany({
      where: { targetType: 'DOCUMENT', targetId: id }
    });
    res.status(200).json({ outgoing, incoming });
  } catch (error) {
    handleDocumentError(res, error);
  }
};

export const addDocumentLink = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { ok, doc } = await verifyDocWorkspace(id, req);
    if (!ok || !doc) return res.status(404).json({ message: 'Document not found' });

    const { targetType, targetId, linkType } = req.body;
    const userId = req.user?.id || 'system';

    if (!targetId || !['DOCUMENT', 'PROJECT', 'TASK'].includes(targetType)) {
      return res.status(400).json({ message: 'A valid targetType (DOCUMENT | PROJECT | TASK) and targetId are required' });
    }

    // Every link target must live in the same workspace as the source document.
    // Previously only DOCUMENT targets were checked, so a document could be linked
    // to a project/task from another workspace (or to a non-existent id), leaking
    // cross-workspace references into the graph and backlinks.
    const workspaceId = doc.space?.workspaceId;
    if (targetType === 'DOCUMENT') {
      const targetCheck = await verifyDocWorkspace(targetId, req);
      if (!targetCheck.ok) {
        return res.status(400).json({ message: 'Target document must belong to the active workspace' });
      }
    } else if (targetType === 'PROJECT') {
      const project = await prisma.project.findUnique({ where: { id: targetId }, select: { workspaceId: true, deletedAt: true } });
      if (!project || project.deletedAt || project.workspaceId !== workspaceId) {
        return res.status(400).json({ message: 'Target project must belong to the active workspace' });
      }
    } else if (targetType === 'TASK') {
      const task = await prisma.task.findUnique({ where: { id: targetId }, select: { workspaceId: true, deletedAt: true } });
      if (!task || task.deletedAt || task.workspaceId !== workspaceId) {
        return res.status(400).json({ message: 'Target task must belong to the active workspace' });
      }
    }

    const existing = await prisma.entityLink.findFirst({
      where: {
        sourceType: 'DOCUMENT',
        sourceId: id,
        targetType,
        targetId,
        linkType: linkType || 'REFERENCE',
      }
    });
    if (existing) return res.status(200).json(existing);

    const link = await prisma.entityLink.create({
      data: {
        sourceType: 'DOCUMENT',
        sourceId: id,
        targetType,
        targetId,
        linkType: linkType || 'REFERENCE',
        createdById: userId,
      }
    });
    res.status(201).json(link);
  } catch (error) {
    handleDocumentError(res, error);
  }
};

export const removeLink = async (req: Request, res: Response) => {
  try {
    const linkId = req.params.linkId as string;
    const link = await prisma.entityLink.findUnique({ where: { id: linkId } });
    if (!link) return res.status(404).json({ message: 'Link not found' });

    if (link.sourceType === 'DOCUMENT') {
      const { ok } = await verifyDocWorkspace(link.sourceId, req);
      if (!ok) return res.status(403).json({ message: 'Forbidden' });
    } else if (link.targetType === 'DOCUMENT') {
      const { ok } = await verifyDocWorkspace(link.targetId, req);
      if (!ok) return res.status(403).json({ message: 'Forbidden' });
    }

    await prisma.entityLink.delete({ where: { id: linkId } });
    res.status(200).json({ message: 'Removed' });
  } catch (error) {
    handleDocumentError(res, error);
  }
};

export const createTaskFromDocument = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { ok } = await verifyDocWorkspace(id, req);
    if (!ok) return res.status(404).json({ message: 'Document not found' });

    const { title, priority, status, description } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    const userId = req.user?.id || 'system';
    const workspaceId = req.workspaceId || req.body.workspaceId;

    const result = await DocumentService.createTaskFromDocument(
      id,
      workspaceId,
      userId,
      {
        title: title.trim(),
        priority,
        status,
        description,
      }
    );

    res.status(201).json(result);
  } catch (error) {
    handleDocumentError(res, error);
  }
};

export const searchDocuments = async (req: Request, res: Response) => {
  try {
    let id: string | undefined = req.params.id as string; // workspaceId
    const userId = req.user?.id;
    if (!id || id === 'undefined' || id === 'null') {
      id = req.workspaceId;
    }
    if (!id && userId) {
      const member = await prisma.workspaceMember.findFirst({
        where: { userId }
      });
      if (member) id = member.workspaceId;
    }

    if (!id) return res.status(400).json({ message: 'Workspace ID required' });

    const isMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId: id, userId }
    });
    if (!isMember) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { q, type, projectId, status, tag } = req.query;
    if (!q) return res.status(200).json([]);

    const queryStr = String(q).trim();

    const typeFilter = type && type !== 'ALL' 
      ? Prisma.sql`AND d."documentType"::text = ${String(type)}` 
      : Prisma.empty;
    const projectFilter = projectId && projectId !== 'ALL' 
      ? Prisma.sql`AND d."projectId" = ${String(projectId)}` 
      : Prisma.empty;
    const statusFilter = status && status !== 'ALL' 
      ? Prisma.sql`AND ${String(status)} = ANY(d."statusBadges")` 
      : Prisma.empty;
    const tagFilter = tag && tag !== 'ALL'
      ? Prisma.sql`AND EXISTS (
          SELECT 1 FROM "DocumentTag" dt
          JOIN "Tag" t ON dt."tagId" = t.id
          WHERE dt."documentId" = d.id AND t.name ILIKE ${String(tag).trim()}
        )`
      : Prisma.empty;

    // The `searchVector` column is populated via document_search_vector_trigger and
    // indexed with GIN (Document_searchVector_gin_idx). We match directly against
    // searchVector @@ plainto_tsquery, and OR in a title ILIKE so short/partial
    // words (e.g. "arch" → "architecture") that produce no lexemes still match.
    const likePattern = `%${queryStr}%`;
    const results = await prisma.$queryRaw`
      SELECT d.id, d.title, d.subtitle, d.icon, d."documentType", d."statusBadges", d."projectId", d."updatedAt",
             ts_headline('english', d."contentMarkdown", plainto_tsquery('english', ${queryStr}), 'MaxFragments=1, MaxWords=20') as snippet
      FROM "Document" d
      JOIN "Space" s ON d."spaceId" = s.id
      WHERE s."workspaceId" = ${id}
        AND s."deletedAt" IS NULL
        AND d."deletedAt" IS NULL
        AND (
          (d."searchVector" IS NOT NULL AND d."searchVector" @@ plainto_tsquery('english', ${queryStr}))
          OR d.title ILIKE ${likePattern}
        )
        ${typeFilter}
        ${projectFilter}
        ${statusFilter}
        ${tagFilter}
      ORDER BY ts_rank(
                 coalesce(d."searchVector", to_tsvector('english', coalesce(d.title, ''))),
                 plainto_tsquery('english', ${queryStr})
               ) DESC
      LIMIT 25;
    `;

    res.status(200).json(results);
  } catch (error) {
    handleDocumentError(res, error);
  }
};


export const exportDocument = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { ok } = await verifyDocWorkspace(id, req);
    if (!ok) return res.status(404).json({ message: 'Document not found' });

    const { format } = req.query; // 'md' or 'spec'

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } }
    });

    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (format === 'md') {
      const safeFilename = encodeURIComponent((doc.title || 'document').replace(/[^\w\s.-]/g, '_').trim());
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.md"; filename*=UTF-8''${safeFilename}.md`);
      return res.status(200).send(doc.contentMarkdown);
    }

    if (format === 'spec') {
      const descendants = await prisma.document.findMany({
        where: { spaceId: doc.spaceId, deletedAt: null }
      });
      
      const buildTree = (parentId: string, depth: number): string => {
        const children = descendants.filter(d => d.parentId === parentId);
        let output = '';
        for (const child of children) {
          const heading = '#'.repeat(depth + 1);
          output += `\n${heading} ${child.title}\n\n${child.contentMarkdown}\n`;
          output += buildTree(child.id, depth + 1);
        }
        return output;
      };

      const treeMd = buildTree(doc.id, 1);
      
      const yamlFrontmatter = `---
title: ${doc.title}
subtitle: ${doc.subtitle || ''}
documentType: ${doc.documentType}
statusBadges: [${doc.statusBadges.join(', ')}]
tags: [${doc.tags.map((t) => t.tag.name).join(', ')}]
wordCount: ${doc.wordCount}
---

`;
      const specContent = yamlFrontmatter + doc.contentMarkdown + '\n' + treeMd;

      const safeFilename = encodeURIComponent((doc.title || 'document').replace(/[^\w\s.-]/g, '_').trim());
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}-spec.md"; filename*=UTF-8''${safeFilename}-spec.md`);
      return res.status(200).send(specContent);
    }

    res.status(400).json({ message: 'Unsupported format' });
  } catch (error) {
    handleDocumentError(res, error);
  }
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function annotateHeadingsWithAnchors(markdown: string): { annotatedMd: string; anchors: string[] } {
  const anchors: string[] = [];
  const lines = markdown.split('\n');
  const annotatedLines = lines.map(line => {
    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (match && match[1] && match[2]) {
      const headingLevel = match[1];
      const title = match[2].trim();
      const slug = slugify(title);
      if (slug) {
        anchors.push(`#${slug}`);
        return `${headingLevel} ${title} [#${slug}]`;
      }
    }
    return line;
  });
  return { annotatedMd: annotatedLines.join('\n'), anchors };
}


export const aiAsk = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { question } = req.body;
    const { ok, doc } = await verifyDocWorkspace(id, req);
    if (!ok || !doc || doc.deletedAt || doc.space.deletedAt) return res.status(404).json({ message: 'Document not found' });

    // Fetch 1-hop reference links
    const outgoing = await prisma.entityLink.findMany({ where: { sourceType: 'DOCUMENT', sourceId: id, linkType: 'REFERENCE' }});
    const incoming = await prisma.entityLink.findMany({ where: { targetType: 'DOCUMENT', targetId: id, linkType: 'REFERENCE' }});
    const refIds = [...outgoing.filter(l => l.targetType === 'DOCUMENT').map(l => l.targetId), ...incoming.filter(l => l.sourceType === 'DOCUMENT').map(l => l.sourceId)];
    
    const references = await prisma.document.findMany({
      where: { id: { in: refIds }, deletedAt: null, space: { workspaceId: doc.space.workspaceId, deletedAt: null, workspace: { deletedAt: null } } },
      select: { title: true, contentMarkdown: true }
    });

    const primaryAnnotated = annotateHeadingsWithAnchors(doc.contentMarkdown || '');
    const allAnchors = [...primaryAnnotated.anchors];

    let contextText = `Primary Document: ${doc.title}\n\n${primaryAnnotated.annotatedMd}\n\n`;
    if (references.length > 0) {
      contextText += `--- REFERENCE DOCUMENTS ---\n\n`;
      for (const ref of references) {
        if (contextText.length > 30000 * 4) break; 
        const refAnnotated = annotateHeadingsWithAnchors(ref.contentMarkdown || '');
        allAnchors.push(...refAnnotated.anchors);
        contextText += `Title: ${ref.title}\n\n${refAnnotated.annotatedMd}\n\n`;
      }
    }

    const availableAnchorsList = allAnchors.length > 0 ? `Available section anchor citations: ${allAnchors.slice(0, 25).join(', ')}` : '';
    const systemPrompt = `You are an AI assistant grounded ONLY in the following knowledge base content:\n\n${contextText}\n\n${availableAnchorsList}\n\nAnswer the user's question accurately. When citing information, you MUST cite the specific document section using its anchor slug like [#section-title] where applicable.`;

    await sendBrainAiStream(res, systemPrompt, question);
  } catch (error) {
    if (!res.headersSent) {
      handleDocumentError(res, error, 500);
    } else {
      const { payload } = documentErrorResponse(error, 500);
      res.write(`data: ${JSON.stringify({ error: payload.message, requestId: payload.requestId })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
};

export const aiCompose = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { instruction, mode, selection } = req.body;
    const { ok, doc } = await verifyDocWorkspace(id, req);
    if (!ok || !doc) return res.status(404).json({ message: 'Document not found' });

    let systemPrompt = `You are a technical writer assisting with a document titled "${doc.title}". Provide content formatted in Markdown. Do not include markdown block backticks around your entire response.`;
    if (mode === 'write') systemPrompt += `\nTask: Continue or add new content based on this instruction: ${instruction}`;
    if (mode === 'improve') systemPrompt += `\nTask: Improve the selected text based on this instruction: ${instruction}`;
    if (mode === 'explain') systemPrompt += `\nTask: Explain the selected text based on this instruction: ${instruction}`;

    const userPrompt = selection ? `Selection: ${selection}\n\nInstruction: ${instruction}` : instruction;

    await sendBrainAiStream(res, systemPrompt, userPrompt);
  } catch (error) {
    if (!res.headersSent) {
      handleDocumentError(res, error, 500);
    } else {
      const { payload } = documentErrorResponse(error, 500);
      res.write(`data: ${JSON.stringify({ error: payload.message, requestId: payload.requestId })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
};

export const importDocumentSpec = async (req: Request, res: Response) => {
  try {
    let workspaceId = req.workspaceId || req.body?.workspaceId || (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId && req.user?.id) {
      const member = await prisma.workspaceMember.findFirst({
        where: { userId: req.user.id }
      });
      if (member) workspaceId = member.workspaceId;
    }

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    const { content, spaceId, parentId } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: 'Spec file content is required' });
    }

    const userId = req.user?.id || 'system';

    // Validate and resolve a parent before creating a space or any imported rows.
    // Parent-scoped lookup intentionally returns the same result for missing and foreign parents.
    let targetSpaceId = spaceId;
    if (parentId) {
      const parent = await prisma.document.findFirst({
        where: { id: parentId, deletedAt: null, space: { workspaceId, deletedAt: null } },
        select: { spaceId: true },
      });
      if (!parent) {
        return res.status(400).json({ message: 'Parent document was not found in the active workspace' });
      }
      targetSpaceId = parent.spaceId;
    }

    // Find or create default space
    if (targetSpaceId) {
      const exists = await prisma.space.findFirst({ where: { id: targetSpaceId, workspaceId, deletedAt: null } });
      if (!exists) targetSpaceId = undefined;
    }
    if (!targetSpaceId) {
      let space = await prisma.space.findFirst({ where: { workspaceId, deletedAt: null } });
      if (!space) {
        space = await prisma.space.create({ data: { name: 'General', workspaceId } });
      }
      targetSpaceId = space.id;
    }

    const imported = await importDocumentSpecContent(content, targetSpaceId, workspaceId, userId, parentId);
    res.status(201).json(imported);
  } catch (error) {
    handleDocumentError(res, error);
  }
};

export const getWorkspaceGraph = async (req: Request, res: Response) => {
  try {
    let id: string | undefined = req.params.id as string; // workspaceId
    const userId = req.user?.id;
    if (!id || id === 'undefined' || id === 'null') {
      id = req.workspaceId;
    }
    if (!id && userId) {
      const member = await prisma.workspaceMember.findFirst({
        where: { userId }
      });
      if (member) id = member.workspaceId;
    }

    if (!id) return res.status(400).json({ message: 'Workspace ID required' });

    const isMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId: id, userId }
    });
    if (!isMember) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const rootId = (req.query.rootId as string) || undefined;
    const maxDepth = Math.min(parseInt((req.query.depth as string) || '2', 10), 2);
    res.status(200).json(await getDocumentGraph(id, rootId, maxDepth));
  } catch (error) {
    handleDocumentError(res, error);
  }
};
