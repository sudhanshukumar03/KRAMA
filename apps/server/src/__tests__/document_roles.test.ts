import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../prisma';
import { requireWorkspaceRole } from '../middlewares/rbac.middleware';

describe('Tier 1: Document RBAC & Role Checking', () => {
  let workspace: any;
  let ownerUser: any;
  let memberUser: any;
  let viewerUser: any;
  let outsiderUser: any;

  before(async () => {
    // Setup test users
    const timestamp = Date.now();
    ownerUser = await prisma.user.create({
      data: { email: `owner-${timestamp}@example.com`, passwordHash: 'dummy' },
    });
    memberUser = await prisma.user.create({
      data: { email: `member-${timestamp}@example.com`, passwordHash: 'dummy' },
    });
    viewerUser = await prisma.user.create({
      data: { email: `viewer-${timestamp}@example.com`, passwordHash: 'dummy' },
    });
    outsiderUser = await prisma.user.create({
      data: { email: `outsider-${timestamp}@example.com`, passwordHash: 'dummy' },
    });

    workspace = await prisma.workspace.create({
      data: {
        name: `RBAC Test Workspace ${timestamp}`,
        createdBy: ownerUser.id,
        members: {
          create: [
            { userId: ownerUser.id, role: 'OWNER' },
            { userId: memberUser.id, role: 'MEMBER' },
            { userId: viewerUser.id, role: 'VIEWER' },
          ],
        },
      },
    });
  });

  after(async () => {
    if (workspace) {
      await prisma.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
      await prisma.workspace.delete({ where: { id: workspace.id } });
    }
    const userIds = [ownerUser?.id, memberUser?.id, viewerUser?.id, outsiderUser?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  function createMockContext(userId: string, workspaceId: string) {
    let statusCode = 200;
    let responseBody: any = null;
    let nextCalled = false;

    const req: any = {
      user: { id: userId },
      headers: { 'x-workspace-id': workspaceId },
      body: {},
      query: {},
      params: {},
    };

    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        responseBody = data;
        return this;
      },
    };

    const next = () => {
      nextCalled = true;
    };

    return {
      req,
      res,
      next,
      getResult: () => ({ statusCode, responseBody, nextCalled }),
    };
  }

  it('allows VIEWER to access VIEWER-level routes (e.g. read documents)', async () => {
    const ctx = createMockContext(viewerUser.id, workspace.id);
    const middleware = requireWorkspaceRole('VIEWER');
    await middleware(ctx.req, ctx.res, ctx.next);

    const result = ctx.getResult();
    assert.equal(result.nextCalled, true, 'Next should be called for VIEWER on VIEWER route');
    assert.equal(ctx.req.workspaceId, workspace.id, 'workspaceId should be set on req');
  });

  it('blocks VIEWER from accessing MEMBER-level mutating routes with 403 Forbidden', async () => {
    const ctx = createMockContext(viewerUser.id, workspace.id);
    const middleware = requireWorkspaceRole('MEMBER');
    await middleware(ctx.req, ctx.res, ctx.next);

    const result = ctx.getResult();
    assert.equal(result.nextCalled, false, 'Next should NOT be called for VIEWER on MEMBER route');
    assert.equal(result.statusCode, 403, 'Should return HTTP 403 Forbidden');
    assert.deepEqual(result.responseBody, { message: 'Forbidden' });
  });

  it('allows MEMBER to access MEMBER-level mutating routes (e.g. create, update, delete document)', async () => {
    const ctx = createMockContext(memberUser.id, workspace.id);
    const middleware = requireWorkspaceRole('MEMBER');
    await middleware(ctx.req, ctx.res, ctx.next);

    const result = ctx.getResult();
    assert.equal(result.nextCalled, true, 'Next should be called for MEMBER on MEMBER route');
    assert.equal(ctx.req.workspaceId, workspace.id);
  });

  it('blocks non-members (outsiders) with 403 Forbidden on both VIEWER and MEMBER routes', async () => {
    const ctxViewerRoute = createMockContext(outsiderUser.id, workspace.id);
    await requireWorkspaceRole('VIEWER')(ctxViewerRoute.req, ctxViewerRoute.res, ctxViewerRoute.next);
    assert.equal(ctxViewerRoute.getResult().statusCode, 403);
    assert.equal(ctxViewerRoute.getResult().nextCalled, false);

    const ctxMemberRoute = createMockContext(outsiderUser.id, workspace.id);
    await requireWorkspaceRole('MEMBER')(ctxMemberRoute.req, ctxMemberRoute.res, ctxMemberRoute.next);
    assert.equal(ctxMemberRoute.getResult().statusCode, 403);
    assert.equal(ctxMemberRoute.getResult().nextCalled, false);
  });
});
