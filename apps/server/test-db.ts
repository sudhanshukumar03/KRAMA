import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.habit.findMany({ include: { completions: true } }).then(h => console.log(JSON.stringify(h, null, 2))).finally(() => prisma.$disconnect());
