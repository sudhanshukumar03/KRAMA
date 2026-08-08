import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const habits = await prisma.habit.findMany({ where: { name: 'Verify UI Code' }, include: { logs: true } });
  console.log(JSON.stringify(habits, null, 2));
}
run();
