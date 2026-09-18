import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { DocumentService } from '../services/document.service';
import { extractMarkdown, extractPlainText, calculateCounts } from '../utils/tiptap';
import { documentVersionQueue, embeddingQueue } from '../queues';
import { redisService } from '../services/redis.service';
import Groq from 'groq-sdk';

export const getDocuments = async (req: Request, res: Response) => {
  try {
    const { spaceId } = req.params;
    const folderId = req.query.folderId as string | undefined;
    const parentId = req.query.parentId as string | undefined;
    const projectId = req.query.projectId as string | undefined;

    const where: any = { 
      spaceId,
      deletedAt: null 
    };

    if (folderId !== undefined) {
      where.folderId = folderId === 'null' ? null : folderId;
    }
    if (parentId !== undefined) {
      where.parentId = parentId === 'null' ? null : parentId;
    }
    if (projectId !== undefined) {
      where.projectId = projectId;
    }

    const documents = await prisma.document.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { updatedAt: 'desc' }
    });

    res.status(200).json(documents);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getWorkspaceDocuments = async (req: Request, res: Response) => {
  try {
    let workspaceId = (req as any).workspaceId || req.body?.workspaceId || (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId && (req as any).user?.id) {
      const member = await prisma.workspaceMember.findFirst({
        where: { userId: (req as any).user.id }
      });
      if (member) workspaceId = member.workspaceId;
    }

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    const documents = await prisma.document.findMany({
      where: {
        space: { workspaceId },
        deletedAt: null
      },
      include: { tags: { include: { tag: true } } },
      orderBy: { updatedAt: 'desc' }
    });

    res.status(200).json(documents);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createWorkspaceDocument = async (req: Request, res: Response) => {
  try {
    let workspaceId = (req as any).workspaceId || req.body?.workspaceId || (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId && (req as any).user?.id) {
      const member = await prisma.workspaceMember.findFirst({
        where: { userId: (req as any).user.id }
      });
      if (member) workspaceId = member.workspaceId;
    }

    if (!workspaceId) {
      return res.status(400).json({ message: 'Workspace ID is required' });
    }

    const { title, folderId, parentId, projectId, documentType, spaceId } = req.body;
    const userId = (req as any).user?.id || 'system';

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Determine target space: provided spaceId or the first default space in workspace
    let targetSpaceId = spaceId;
    if (targetSpaceId) {
      const exists = await prisma.space.findFirst({ where: { id: targetSpaceId, workspaceId } });
      if (!exists) targetSpaceId = undefined;
    }
    if (!targetSpaceId) {
      let space = await prisma.space.findFirst({
        where: { workspaceId }
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
    });

    if (doc.contentMarkdown) {
      embeddingQueue.add('embed-document', {
        documentId: doc.id,
        content: doc.contentMarkdown,
      }).catch(console.error);
    }

    res.status(201).json(doc);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getDocumentById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const document = await prisma.document.findUnique({
      where: { id, deletedAt: null },
      include: { tags: { include: { tag: true } } }
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.status(200).json(document);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createDocument = async (req: Request, res: Response) => {
  try {
    const { spaceId } = req.params;
    const { title, folderId, parentId, projectId, documentType } = req.body;
    const userId = (req as any).user?.id; // Assuming auth middleware sets req.user

    if (!spaceId || typeof spaceId !== 'string') {
      return res.status(400).json({ message: 'Space ID is required' });
    }

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const doc = await DocumentService.createDocument({
      spaceId,
      folderId,
      parentId,
      projectId,
      title,
      createdById: userId,
      documentType,
    });

    if (doc.contentMarkdown) {
      embeddingQueue.add('embed-document', {
        documentId: doc.id,
        content: doc.contentMarkdown,
      }).catch(console.error);
    }

    res.status(201).json(doc);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateDocumentMetadata = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, subtitle, statusBadges, documentType, isFavorite, icon, projectId, linkedProjectId } = req.body;
    const project = projectId !== undefined ? projectId : linkedProjectId;

    const updated = await prisma.document.update({
      where: { id },
      data: {
        title,
        subtitle,
        statusBadges,
        documentType,
        isFavorite,
        icon,
        ...(project !== undefined ? { projectId: project } : {})
      },
    });

    res.status(200).json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const moveDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Document ID is required' });
    }
    const { targetFolderId, targetParentId } = req.body;

    const doc = await DocumentService.moveDocument(id, targetFolderId, targetParentId);
    res.status(200).json(doc);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const duplicateDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Document ID is required' });
    }
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const duplicatedId = await DocumentService.duplicateSubtree(id, userId as string);
    const duplicated = await prisma.document.findUnique({ where: { id: duplicatedId } });
    
    res.status(201).json(duplicated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const toggleFavorite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Document ID is required' });
    }
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ message: 'Not found' });

    const updated = await prisma.document.update({
      where: { id },
      data: { isFavorite: !doc.isFavorite }
    });

    res.status(200).json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Document ID is required' });
    }
    await DocumentService.deepDelete(id);
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const restoreDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Document ID is required' });
    }
    await DocumentService.deepRestore(id);
    res.status(200).json({ message: 'Restored successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDocumentContent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Document ID is required' });
    }
    const { contentJson } = req.body;
    const userId = (req as any).user?.id || 'system';

    const plainText = extractPlainText(contentJson);
    const contentMarkdown = extractMarkdown(contentJson);
    const { wordCount, charCount } = calculateCounts(plainText);

    const updated = await prisma.document.update({
      where: { id },
      data: {
        contentJson,
        contentMarkdown,
        wordCount,
        charCount,
        lastEditedById: userId,
      }
    });

    if (contentMarkdown) {
      embeddingQueue.add('embed-document', {
        documentId: id,
        content: contentMarkdown,
      }, {
        jobId: `embed-doc-${id}`,
        delay: 2000,
      }).catch(console.error);
    }

    // Handle autosave versioning: 50 mutations or 5 min idle
    const mutations = await redisService.incr(`doc:${id}:mutations`);
    const idleJobId = `idle-snapshot-${id}`;
    
    if (mutations >= 50) {
      await documentVersionQueue.add('snapshot', {
        documentId: id,
        userId,
        contentJson
      });
      await redisService.del(`doc:${id}:mutations`);
      
      // Clear any pending idle snapshot since we just took one
      const pendingIdleJob = await documentVersionQueue.getJob(idleJobId);
      if (pendingIdleJob) {
        await pendingIdleJob.remove();
      }
    } else {
      // Debounce a 5-minute idle snapshot
      const pendingIdleJob = await documentVersionQueue.getJob(idleJobId);
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
    }

    res.status(200).json({ 
      updatedAt: updated.updatedAt, 
      wordCount, 
      charCount 
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getVersions = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const versions = await prisma.documentVersion.findMany({
      where: { documentId: id },
      select: { id: true, versionNumber: true, createdAt: true, editedById: true },
      orderBy: { versionNumber: 'desc' }
    });
    res.status(200).json(versions);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Manual user save — always creates a snapshot and resets mutation counter
export const createVersion = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id || 'system';

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // Cancel any pending idle snapshot
    const idleJobId = `idle-snapshot-${id}`;
    const pendingIdleJob = await documentVersionQueue.getJob(idleJobId);
    if (pendingIdleJob) {
      await pendingIdleJob.remove().catch(() => {});
    }

    // Create snapshot immediately via queue
    await documentVersionQueue.add('snapshot', {
      documentId: id,
      userId,
      contentJson: doc.contentJson
    });

    // Reset mutation counter
    await redisService.del(`doc:${id}:mutations`);

    res.status(201).json({ message: 'Version snapshot created' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getVersion = async (req: Request, res: Response) => {
  try {
    const { id, versionId } = req.params as { id: string; versionId: string };
    const version = await prisma.documentVersion.findUnique({
      where: { id: versionId }
    });
    if (!version || version.documentId !== id) {
      return res.status(404).json({ message: 'Not found' });
    }
    res.status(200).json(version);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const restoreVersion = async (req: Request, res: Response) => {
  try {
    const { id, versionId } = req.params as { id: string; versionId: string };
    const userId = (req as any).user?.id || 'system';
    
    const versionToRestore = await prisma.documentVersion.findUnique({
      where: { id: versionId }
    });

    if (!versionToRestore || versionToRestore.documentId !== id) {
      return res.status(404).json({ message: 'Version not found' });
    }

    const currentDoc = await prisma.document.findUnique({ where: { id }});
    if (!currentDoc) return res.status(404).json({ message: 'Document not found' });

    // Snapshot current state first
    await documentVersionQueue.add('snapshot', {
      documentId: id,
      userId,
      contentJson: currentDoc.contentJson
    });

    // Restore
    const plainText = extractPlainText(versionToRestore.contentJson);
    const contentMarkdown = extractMarkdown(versionToRestore.contentJson);
    const { wordCount, charCount } = calculateCounts(plainText);

    const updated = await prisma.document.update({
      where: { id },
      data: {
        contentJson: versionToRestore.contentJson as any,
        contentMarkdown,
        wordCount,
        charCount,
        lastEditedById: userId,
      }
    });

    res.status(200).json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getWorkspaceTags = async (req: Request, res: Response) => {
  try {
    let id = req.params.id as string; // workspaceId
    if (!id || id === 'undefined' || id === 'null') {
      const member = await prisma.workspaceMember.findFirst({
        where: { userId: (req as any).user?.id }
      });
      if (member) id = member.workspaceId;
    }
    const tags = await prisma.tag.findMany({
      where: { workspaceId: id },
      orderBy: { name: 'asc' }
    });
    res.status(200).json(tags);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const addDocumentTag = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string; // documentId
    const { tagName, color } = req.body;
    
    const doc = await prisma.document.findUnique({ where: { id }, include: { space: true } });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const workspaceId = doc.space.workspaceId;
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
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const removeDocumentTag = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const tagId = req.params.tagId as string;
    await prisma.documentTag.delete({
      where: { documentId_tagId: { documentId: id, tagId } }
    });
    res.status(200).json({ message: 'Removed' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getDocumentLinks = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const outgoing = await prisma.entityLink.findMany({
      where: { sourceType: 'DOCUMENT', sourceId: id }
    });
    const incoming = await prisma.entityLink.findMany({
      where: { targetType: 'DOCUMENT', targetId: id }
    });
    res.status(200).json({ outgoing, incoming });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const addDocumentLink = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { targetType, targetId, linkType } = req.body;
    const userId = (req as any).user?.id || 'system';

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
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const removeLink = async (req: Request, res: Response) => {
  try {
    const linkId = req.params.linkId as string;
    await prisma.entityLink.delete({ where: { id: linkId } });
    res.status(200).json({ message: 'Removed' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const searchDocuments = async (req: Request, res: Response) => {
  try {
    let id = req.params.id as string; // workspaceId
    if (!id || id === 'undefined' || id === 'null') {
      const member = await prisma.workspaceMember.findFirst({
        where: { userId: (req as any).user?.id }
      });
      if (member) id = member.workspaceId;
    }

    const { q } = req.query;
    if (!q) return res.status(200).json([]);

    const queryStr = String(q).trim();

    // Use raw query with plainto_tsquery for syntax-safe ranked search against tsvector
    const results = await prisma.$queryRaw`
      SELECT d.id, d.title, d.subtitle, d."documentType",
             ts_headline('english', d."contentMarkdown", plainto_tsquery('english', ${queryStr}), 'MaxFragments=1, MaxWords=20') as snippet
      FROM "Document" d
      JOIN "Space" s ON d."spaceId" = s.id
      WHERE s."workspaceId" = ${id}
        AND d."deletedAt" IS NULL
        AND d."searchVector" @@ plainto_tsquery('english', ${queryStr})
      ORDER BY ts_rank(d."searchVector", plainto_tsquery('english', ${queryStr})) DESC
      LIMIT 20;
    `;

    res.status(200).json(results);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const exportDocument = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { format } = req.query; // 'md' or 'spec'

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } }
    });

    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (format === 'md') {
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.title}.md"`);
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
tags: [${doc.tags.map((t: any) => t.tag.name).join(', ')}]
wordCount: ${doc.wordCount}
---

`;
      const specContent = yamlFrontmatter + doc.contentMarkdown + '\n' + treeMd;

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${doc.title}-spec.md"`);
      return res.status(200).send(specContent);
    }

    res.status(400).json({ message: 'Unsupported format' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
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
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // Fetch 1-hop reference links
    const outgoing = await prisma.entityLink.findMany({ where: { sourceType: 'DOCUMENT', sourceId: id, linkType: 'REFERENCE' }});
    const incoming = await prisma.entityLink.findMany({ where: { targetType: 'DOCUMENT', targetId: id, linkType: 'REFERENCE' }});
    const refIds = [...outgoing.map(l => l.targetId), ...incoming.map(l => l.sourceId)];
    
    const references = await prisma.document.findMany({
      where: { id: { in: refIds }, deletedAt: null },
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

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const availableAnchorsList = allAnchors.length > 0 ? `Available section anchor citations: ${allAnchors.slice(0, 25).join(', ')}` : '';
    const systemPrompt = `You are an AI assistant grounded ONLY in the following knowledge base content:\n\n${contextText}\n\n${availableAnchorsList}\n\nAnswer the user's question accurately. When citing information, you MUST cite the specific document section using its anchor slug like [#section-title] where applicable.`;

    const stream = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      stream: true
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    if (!res.headersSent) res.status(500).json({ message: error.message });
    else res.end();
  }
};

export const aiCompose = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { instruction, mode, selection } = req.body;
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    let systemPrompt = `You are a technical writer assisting with a document titled "${doc.title}". Provide content formatted in Markdown. Do not include markdown block backticks around your entire response.`;
    if (mode === 'write') systemPrompt += `\nTask: Continue or add new content based on this instruction: ${instruction}`;
    if (mode === 'improve') systemPrompt += `\nTask: Improve the selected text based on this instruction: ${instruction}`;
    if (mode === 'explain') systemPrompt += `\nTask: Explain the selected text based on this instruction: ${instruction}`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const stream = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: selection ? `Selection: ${selection}` : instruction }
      ],
      stream: true
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    if (!res.headersSent) res.status(500).json({ message: error.message });
    else res.end();
  }
};

export const importDocumentSpec = async (req: Request, res: Response) => {
  try {
    let workspaceId = (req as any).workspaceId || req.body?.workspaceId || (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);
    if (!workspaceId && (req as any).user?.id) {
      const member = await prisma.workspaceMember.findFirst({
        where: { userId: (req as any).user.id }
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

    const userId = (req as any).user?.id || 'system';

    // Find or create default space
    let targetSpaceId = spaceId;
    if (targetSpaceId) {
      const exists = await prisma.space.findFirst({ where: { id: targetSpaceId, workspaceId } });
      if (!exists) targetSpaceId = undefined;
    }
    if (!targetSpaceId) {
      let space = await prisma.space.findFirst({ where: { workspaceId } });
      if (!space) {
        space = await prisma.space.create({ data: { name: 'General', workspaceId } });
      }
      targetSpaceId = space.id;
    }

    // 1. Parse YAML frontmatter if present
    let rawContent = content;
    let title = 'Imported Specification';
    let subtitle = '';
    let documentType: any = 'SPEC';
    let statusBadges: string[] = ['LIVE SPECIFICATION'];
    let tagsList: string[] = [];

    const frontmatterMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (frontmatterMatch) {
      const fmText = frontmatterMatch[1] || '';
      rawContent = frontmatterMatch[2] || '';

      const titleMatch = fmText.match(/^title:\s*(.*)$/m);
      if (titleMatch && titleMatch[1]?.trim()) title = titleMatch[1].trim();

      const subtitleMatch = fmText.match(/^subtitle:\s*(.*)$/m);
      if (subtitleMatch && subtitleMatch[1]?.trim()) subtitle = subtitleMatch[1].trim();

      const typeMatch = fmText.match(/^documentType:\s*(.*)$/m);
      if (typeMatch && typeMatch[1]?.trim()) {
        const t = typeMatch[1].trim().toUpperCase();
        if (['SPEC', 'NOTE', 'MEETING', 'IDEA', 'RFC', 'GENERAL'].includes(t)) {
          documentType = t;
        }
      }

      const badgesMatch = fmText.match(/^statusBadges:\s*\[(.*?)\]/m);
      if (badgesMatch && badgesMatch[1]) {
        statusBadges = badgesMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
      }

      const tagsMatch = fmText.match(/^tags:\s*\[(.*?)\]/m);
      if (tagsMatch && tagsMatch[1]) {
        tagsList = tagsMatch[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
      }
    }

    // Helper to turn markdown into simple ProseMirror TipTap document
    const markdownToTipTapJson = (md: string) => {
      const paragraphs = md.split(/\n\s*\n/).filter(p => p.trim());
      const contentNodes: any[] = [];
      for (const p of paragraphs) {
        const trimmed = p.trim();
        if (trimmed.startsWith('# ')) {
          contentNodes.push({ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: trimmed.slice(2).trim() }] });
        } else if (trimmed.startsWith('## ')) {
          contentNodes.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: trimmed.slice(3).trim() }] });
        } else if (trimmed.startsWith('### ')) {
          contentNodes.push({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: trimmed.slice(4).trim() }] });
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const items = trimmed.split('\n').filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* '));
          contentNodes.push({
            type: 'bulletList',
            content: items.map(it => ({
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: it.replace(/^[-*]\s*/, '').trim() }] }]
            }))
          });
        } else if (trimmed.startsWith('```')) {
          contentNodes.push({
            type: 'codeBlock',
            content: [{ type: 'text', text: trimmed.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '') }]
          });
        } else {
          contentNodes.push({
            type: 'paragraph',
            content: [{ type: 'text', text: trimmed }]
          });
        }
      }
      return {
        type: 'doc',
        content: contentNodes.length > 0 ? contentNodes : [{ type: 'paragraph', content: [{ type: 'text', text: md }] }]
      };
    };

    // Split root markdown vs nested child headings (## Heading)
    const childSections = rawContent.split(/\n(?=##\s+)/);
    const rootBodyMd = childSections[0] || '';

    // Create root document
    const rootDoc = await DocumentService.createDocument({
      spaceId: targetSpaceId,
      parentId: parentId || undefined,
      title,
      subtitle: subtitle || undefined,
      documentType,
      statusBadges: statusBadges.length > 0 ? statusBadges : ['LIVE SPECIFICATION'],
      contentJson: markdownToTipTapJson(rootBodyMd),
      createdById: userId,
    });

    // Attach tags to rootDoc
    for (const tagName of tagsList) {
      let tag = await prisma.tag.findUnique({
        where: { workspaceId_name: { workspaceId, name: tagName.toLowerCase() } }
      });
      if (!tag) {
        tag = await prisma.tag.create({
          data: { workspaceId, name: tagName.toLowerCase() }
        });
      }
      await prisma.documentTag.upsert({
        where: { documentId_tagId: { documentId: rootDoc.id, tagId: tag.id } },
        create: { documentId: rootDoc.id, tagId: tag.id },
        update: {}
      });
    }

    // Process nested child sections (up to depth 2: ## Child, depth 3: ### Grandchild)
    let totalImported = 1;
    const rootDepth = await DocumentService.getDepth(rootDoc.id);

    if (rootDepth < 3) {
      for (let i = 1; i < childSections.length; i++) {
        const section = childSections[i] || '';
        const lines = section.split('\n');
        const headingLine = lines[0] || '';
        const childTitle = headingLine.replace(/^##\s+/, '').trim() || `Child Document ${i}`;

        // Grandchild sections inside this child section
        const grandchildSections = lines.slice(1).join('\n').split(/\n(?=###\s+)/);
        const childBodyMd = grandchildSections[0] || '';

        const childDoc = await DocumentService.createDocument({
          spaceId: targetSpaceId,
          parentId: rootDoc.id,
          title: childTitle,
          documentType: 'SPEC',
          statusBadges: ['SUB-SPEC'],
          contentJson: markdownToTipTapJson(childBodyMd),
          createdById: userId,
        });
        totalImported++;

        // Process grandchildren if depth allows
        const childDepth = rootDepth + 1;
        if (childDepth < 3) {
          for (let j = 1; j < grandchildSections.length; j++) {
            const gcSection = grandchildSections[j] || '';
            const gcLines = gcSection.split('\n');
            const gcHeading = gcLines[0] || '';
            const gcTitle = gcHeading.replace(/^###\s+/, '').trim() || `Grandchild Document ${j}`;
            const gcBodyMd = gcLines.slice(1).join('\n');

            await DocumentService.createDocument({
              spaceId: targetSpaceId,
              parentId: childDoc.id,
              title: gcTitle,
              documentType: 'SPEC',
              statusBadges: ['SUB-SPEC'],
              contentJson: markdownToTipTapJson(gcBodyMd),
              createdById: userId,
            });
            totalImported++;
          }
        }
      }
    }

    const fullRoot = await prisma.document.findUnique({
      where: { id: rootDoc.id },
      include: { tags: { include: { tag: true } } }
    });

    res.status(201).json({
      document: fullRoot,
      totalImported,
      message: `Successfully imported spec "${title}" with ${totalImported} documents.`
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getWorkspaceGraph = async (req: Request, res: Response) => {
  try {
    let id = req.params.id as string; // workspaceId
    if (!id || id === 'undefined' || id === 'null') {
      const member = await prisma.workspaceMember.findFirst({
        where: { userId: (req as any).user?.id }
      });
      if (member) id = member.workspaceId;
    }

    const rootId = (req.query.rootId as string) || undefined;
    const maxDepth = Math.min(parseInt((req.query.depth as string) || '2', 10), 2); // Depth capped at 2
    const maxNodesCap = 150; // Cap at 150 nodes

    let docIdsToInclude: Set<string> = new Set();

    if (rootId) {
      // BFS traversal starting from rootId up to maxDepth
      const visited = new Set<string>([rootId]);
      let currentQueue: string[] = [rootId];
      let currentDepth = 0;

      while (currentQueue.length > 0 && currentDepth <= maxDepth && visited.size < maxNodesCap) {
        const nextQueue: string[] = [];
        for (const currentId of currentQueue) {
          if (visited.size >= maxNodesCap) break;
          // Find connected entity links (outgoing & incoming for DOCUMENT)
          const links = await prisma.entityLink.findMany({
            where: {
              OR: [
                { sourceType: 'DOCUMENT', sourceId: currentId },
                { targetType: 'DOCUMENT', targetId: currentId }
              ]
            }
          });
          for (const l of links) {
            const neighborId = l.sourceId === currentId ? (l.targetType === 'DOCUMENT' ? l.targetId : null) : l.sourceId;
            if (neighborId && !visited.has(neighborId)) {
              visited.add(neighborId);
              nextQueue.push(neighborId);
              if (visited.size >= maxNodesCap) break;
            }
          }
        }
        currentQueue = nextQueue;
        currentDepth++;
      }
      docIdsToInclude = visited;
    } else {
      const docs = await prisma.document.findMany({
        where: {
          space: { workspaceId: id },
          deletedAt: null
        },
        take: maxNodesCap,
        select: { id: true }
      });
      docIdsToInclude = new Set(docs.map(d => d.id));
    }

    // Retrieve documents metadata
    const docs = await prisma.document.findMany({
      where: { id: { in: Array.from(docIdsToInclude) }, deletedAt: null },
      select: { id: true, title: true, documentType: true }
    });

    const docIds = docs.map(d => d.id);

    // Retrieve links connecting these documents
    const rawLinks = await prisma.entityLink.findMany({
      where: {
        OR: [
          { sourceType: 'DOCUMENT', sourceId: { in: docIds } },
          { targetType: 'DOCUMENT', targetId: { in: docIds } }
        ]
      }
    });

    // Gather external entities (PROJECT and TASK) linked to these documents
    const projectIds = new Set<string>();
    const taskIds = new Set<string>();
    for (const l of rawLinks) {
      if (l.targetType === 'PROJECT') projectIds.add(l.targetId);
      if (l.sourceType === 'PROJECT') projectIds.add(l.sourceId);
      if (l.targetType === 'TASK') taskIds.add(l.targetId);
      if (l.sourceType === 'TASK') taskIds.add(l.sourceId);
    }

    const projects = projectIds.size > 0 ? await prisma.project.findMany({
      where: { id: { in: Array.from(projectIds) } },
      select: { id: true, name: true }
    }) : [];

    const tasks = taskIds.size > 0 ? await prisma.task.findMany({
      where: { id: { in: Array.from(taskIds) } },
      select: { id: true, title: true }
    }) : [];

    // Construct nodes list
    const nodes: any[] = docs.map(d => ({
      id: d.id,
      title: d.title,
      type: 'DOCUMENT',
      documentType: d.documentType
    }));

    for (const p of projects) {
      if (nodes.length < maxNodesCap) {
        nodes.push({ id: p.id, title: p.name, type: 'PROJECT' });
      }
    }

    for (const t of tasks) {
      if (nodes.length < maxNodesCap) {
        nodes.push({ id: t.id, title: t.title, type: 'TASK' });
      }
    }

    const nodeIds = new Set(nodes.map(n => n.id));
    const links = rawLinks.filter(l => nodeIds.has(l.sourceId) && nodeIds.has(l.targetId));

    res.status(200).json({
      nodes: nodes.slice(0, maxNodesCap),
      links
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
