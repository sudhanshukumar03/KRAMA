import { prisma } from '../prisma';

export const LOCAL_USER_ID = '00000000-0000-4000-8000-000000000001';
export const LOCAL_WORKSPACE_ID = '00000000-0000-4000-8000-000000000002';

export async function ensureLocalUser() {
  try {
    let user = await prisma.user.findUnique({ where: { id: LOCAL_USER_ID } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: LOCAL_USER_ID,
          email: 'local2@krama.os',
          name: 'Local User',
          passwordHash: 'none',
          emailVerifiedAt: new Date(),
        }
      });
      console.log('[Bootstrap] Created default Local User');
    }

    let workspace = await prisma.workspace.findUnique({ where: { id: LOCAL_WORKSPACE_ID } });
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          id: LOCAL_WORKSPACE_ID,
          name: 'Local Workspace',
          createdBy: LOCAL_USER_ID,
        }
      });
      
      await prisma.workspaceMember.create({
        data: {
          userId: LOCAL_USER_ID,
          workspaceId: LOCAL_WORKSPACE_ID,
          role: 'OWNER'
        }
      });
      console.log('[Bootstrap] Created default Local Workspace');
    }
  } catch (error) {
    console.error('[Bootstrap] Failed to ensure local user/workspace:', error);
  }
}
