import { Prisma } from '@prisma/client';

export const userAuthSelect = {
  id: true,
  name: true,
  email: true,
  metadata: true,
  memberships: {
    select: {
      workspaceId: true,
      role: true
    }
  }
} satisfies Prisma.UserSelect;
