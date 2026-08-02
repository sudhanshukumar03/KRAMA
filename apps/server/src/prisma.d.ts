import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare const runInTransaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
//# sourceMappingURL=prisma.d.ts.map
