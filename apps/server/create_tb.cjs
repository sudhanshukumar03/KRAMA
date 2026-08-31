const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) return console.log('No user found');
  
  const tb = await prisma.timeBlock.create({
    data: {
      userId: user.id,
      title: 'Deep Work Session',
      date: new Date('2026-08-31T00:00:00.000Z'),
      startTime: new Date('2026-08-31T09:00:00.000Z'),
      endTime: new Date('2026-08-31T11:00:00.000Z'),
      type: 'WORK'
    }
  });
  console.log('Created:', tb.id);
}
main().catch(console.error).finally(() => prisma.$disconnect());
