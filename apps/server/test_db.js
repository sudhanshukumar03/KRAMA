import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const blocks = await prisma.timeBlock.findMany({
  orderBy: { createdAt: 'desc' },
  take: 1
});
console.log(JSON.stringify(blocks, null, 2));
await prisma.$disconnect();
