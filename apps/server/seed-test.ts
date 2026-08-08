import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const workspace = await prisma.workspace.create({
    data: {
      name: "Default Workspace",
      settings: {}
    }
  });
  const project = await prisma.project.create({
    data: {
      name: "Test Project",
      description: "For e2e tests",
      status: "ACTIVE",
      workspaceId: workspace.id
    }
  });
  console.log("Created project", project.id);
  
  for(let i = 1; i <= 3; i++) {
    await prisma.issue.create({
      data: {
        title: `Test Task ${i}`,
        status: "TODO",
        priority: "MEDIUM",
        projectId: project.id,
        workspaceId: workspace.id,
        position: i * 1000
      }
    });
  }
}
main().catch(console.error);
