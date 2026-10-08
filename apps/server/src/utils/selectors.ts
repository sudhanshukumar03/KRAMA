import { Prisma } from '@prisma/client';

export const userAuthSelect = {
  id: true,
  name: true,
  email: true,
  metadata: true,
  memberships: {
    where: { workspace: { deletedAt: null } },
    select: {
      workspaceId: true,
      role: true,
      workspace: {
        select: { id: true, name: true, productivityScore: true },
      },
    },
  },
} satisfies Prisma.UserSelect;
