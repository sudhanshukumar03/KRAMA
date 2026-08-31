import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const tasks = await prisma.task.findMany({
  take: 1
});
console.log(JSON.stringify(tasks, null, 2));
await prisma.$disconnect();
