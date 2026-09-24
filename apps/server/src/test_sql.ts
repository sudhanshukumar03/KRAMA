import { prisma } from './prisma';

async function main() {
  await prisma.task.updateMany({
    where: {
      OR: [
        { projectId: "dummy-project-id" },
        { sprint: { projectId: "dummy-project-id" } }
      ],
      deletedAt: null
    },
    data: {
      deletedAt: new Date()
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
