import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { aiLimiter } from '../middlewares/rateLimit.middleware';
import * as documentController from '../controllers/document.controller';
import { prisma } from '../prisma';

const router = Router();

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

// Workspace param helper for routes with /workspaces/:id
const ensureWorkspaceParamId = (req: any, res: any, next: any) => {
  if (req.params.id) {
    req.workspaceId = req.params.id;
    if (req.body) req.body.workspaceId = req.params.id;
    req.headers['x-workspace-id'] = req.params.id;
  }
  next();
};

// GET /spaces/:spaceId/documents
router.get('/spaces/:spaceId/documents', requireAuth, ensureWorkspaceId, documentController.getDocuments);
router.post('/spaces/:spaceId/documents', requireAuth, ensureWorkspaceId, documentController.createDocument);

router.get('/documents', requireAuth, ensureWorkspaceId, documentController.getWorkspaceDocuments);
router.post('/documents', requireAuth, ensureWorkspaceId, documentController.createWorkspaceDocument);
router.post('/documents/import', requireAuth, ensureWorkspaceId, documentController.importDocumentSpec);

// Document specific routes
router.get('/documents/:id', requireAuth, ensureWorkspaceId, documentController.getDocumentById);
router.patch('/documents/:id', requireAuth, ensureWorkspaceId, documentController.updateDocumentMetadata);
router.patch('/documents/:id/content', requireAuth, ensureWorkspaceId, documentController.updateDocumentContent);
router.get('/documents/:id/versions', requireAuth, ensureWorkspaceId, documentController.getVersions);
router.post('/documents/:id/versions', requireAuth, ensureWorkspaceId, documentController.createVersion);
router.get('/documents/:id/versions/:versionId', requireAuth, ensureWorkspaceId, documentController.getVersion);
router.post('/documents/:id/versions/:versionId/restore', requireAuth, ensureWorkspaceId, documentController.restoreVersion);
router.post('/documents/:id/move', requireAuth, ensureWorkspaceId, documentController.moveDocument);
router.post('/documents/:id/duplicate', requireAuth, ensureWorkspaceId, documentController.duplicateDocument);
router.post('/documents/:id/favorite', requireAuth, ensureWorkspaceId, documentController.toggleFavorite);
router.delete('/documents/:id', requireAuth, ensureWorkspaceId, documentController.deleteDocument);
router.post('/documents/:id/restore', requireAuth, ensureWorkspaceId, documentController.restoreDocument);

// Tags & Links
router.get('/workspaces/:id/tags', requireAuth, ensureWorkspaceParamId, documentController.getWorkspaceTags);
router.post('/documents/:id/tags', requireAuth, ensureWorkspaceId, documentController.addDocumentTag);
router.delete('/documents/:id/tags/:tagId', requireAuth, ensureWorkspaceId, documentController.removeDocumentTag);
router.get('/documents/:id/links', requireAuth, ensureWorkspaceId, documentController.getDocumentLinks);
router.post('/documents/:id/links', requireAuth, ensureWorkspaceId, documentController.addDocumentLink);
router.delete('/links/:linkId', requireAuth, ensureWorkspaceId, documentController.removeLink);
router.post('/documents/:id/tasks', requireAuth, ensureWorkspaceId, documentController.createTaskFromDocument);


// Search & Export
router.get('/workspaces/:id/search', requireAuth, ensureWorkspaceParamId, documentController.searchDocuments);
router.get('/documents/:id/export', requireAuth, ensureWorkspaceId, documentController.exportDocument);

// AI (Rate limited via aiLimiter, workspaceId populated)
router.post('/documents/:id/ai/ask', requireAuth, ensureWorkspaceId, aiLimiter, documentController.aiAsk);
router.post('/documents/:id/ai/compose', requireAuth, ensureWorkspaceId, aiLimiter, documentController.aiCompose);

// Graph
router.get('/workspaces/:id/graph', requireAuth, ensureWorkspaceParamId, documentController.getWorkspaceGraph);

export default router;
