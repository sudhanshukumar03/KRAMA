import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = prisma;
export const runInTransaction = (fn) => {
    return prisma.$transaction(fn);
};
//# sourceMappingURL=prisma.js.map