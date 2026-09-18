import { Router } from 'express';
import { requireAuth, requireWorkspaceRole } from '../middlewares/auth.middleware';
import { aiLimiter } from '../middlewares/rateLimit.middleware';
import * as documentController from '../controllers/document.controller';
import { prisma } from '../prisma';

const router = Router();

// We will mount this router at /api/v1 (or /api).
// Therefore, the path matches the prompt specs:
// GET /spaces/:spaceId/documents
router.get('/spaces/:spaceId/documents', requireAuth, documentController.getDocuments);
router.post('/spaces/:spaceId/documents', requireAuth, documentController.createDocument);

// Workspace-wide documents (requires x-workspace-id header)
const ensureWorkspaceId = async (req: any, res: any, next: any) => {
  let workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId || req.body?.workspaceId;
  if (!workspaceId && req.user?.id) {
    const member = await prisma.workspaceMember.findFirst({
      where: { userId: req.user.id }
    });
    if (member) workspaceId = member.workspaceId;
  }
  if (!req.body) req.body = {}; 
  if (workspaceId && !req.body.workspaceId) {
    req.body.workspaceId = workspaceId;
  }
  req.workspaceId = workspaceId;
  next();
};
router.get('/documents', requireAuth, ensureWorkspaceId, requireWorkspaceRole('VIEWER'), documentController.getWorkspaceDocuments);
router.post('/documents', requireAuth, ensureWorkspaceId, requireWorkspaceRole('MEMBER'), documentController.createWorkspaceDocument);
router.post('/documents/import', requireAuth, ensureWorkspaceId, requireWorkspaceRole('MEMBER'), documentController.importDocumentSpec);

// Document specific routes
router.get('/documents/:id', requireAuth, documentController.getDocumentById);
router.patch('/documents/:id', requireAuth, documentController.updateDocumentMetadata);
router.patch('/documents/:id/content', requireAuth, documentController.updateDocumentContent);
router.get('/documents/:id/versions', requireAuth, documentController.getVersions);
router.post('/documents/:id/versions', requireAuth, documentController.createVersion);
router.get('/documents/:id/versions/:versionId', requireAuth, documentController.getVersion);
router.post('/documents/:id/versions/:versionId/restore', requireAuth, documentController.restoreVersion);
router.post('/documents/:id/move', requireAuth, documentController.moveDocument);
router.post('/documents/:id/duplicate', requireAuth, documentController.duplicateDocument);
router.post('/documents/:id/favorite', requireAuth, documentController.toggleFavorite);
router.delete('/documents/:id', requireAuth, documentController.deleteDocument);
router.post('/documents/:id/restore', requireAuth, documentController.restoreDocument);

// Tags & Links
router.get('/workspaces/:id/tags', requireAuth, documentController.getWorkspaceTags);
router.post('/documents/:id/tags', requireAuth, documentController.addDocumentTag);
router.delete('/documents/:id/tags/:tagId', requireAuth, documentController.removeDocumentTag);
router.get('/documents/:id/links', requireAuth, documentController.getDocumentLinks);
router.post('/documents/:id/links', requireAuth, documentController.addDocumentLink);
router.delete('/links/:linkId', requireAuth, documentController.removeLink);

// Search & Export
router.get('/workspaces/:id/search', requireAuth, documentController.searchDocuments);
router.get('/documents/:id/export', requireAuth, documentController.exportDocument);

// AI (Rate limited via aiLimiter, workspaceId populated)
router.post('/documents/:id/ai/ask', requireAuth, ensureWorkspaceId, aiLimiter, documentController.aiAsk);
router.post('/documents/:id/ai/compose', requireAuth, ensureWorkspaceId, aiLimiter, documentController.aiCompose);

// Graph
router.get('/workspaces/:id/graph', requireAuth, documentController.getWorkspaceGraph);

export default router;
