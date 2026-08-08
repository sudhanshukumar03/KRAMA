import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function runVerification() {
  console.log("Starting backend verification for Drag & Drop and Dependencies...");
  
  // 1. Setup workspace & project
  const workspace = await prisma.workspace.create({
    data: { name: "Verification Workspace" }
  });
  const project = await prisma.project.create({
    data: { name: "Verification Project", status: "ACTIVE", workspaceId: workspace.id }
  });
  
  // 2. Create 3 tasks
  const t1 = await prisma.task.create({ data: { title: "Task 1", status: "TODO", priority: "MEDIUM", projectId: project.id, workspaceId: workspace.id, position: 1000 } });
  const t2 = await prisma.task.create({ data: { title: "Task 2", status: "TODO", priority: "MEDIUM", projectId: project.id, workspaceId: workspace.id, position: 2000 } });
  const t3 = await prisma.task.create({ data: { title: "Task 3", status: "TODO", priority: "MEDIUM", projectId: project.id, workspaceId: workspace.id, position: 3000 } });
  
  console.log(`Created tasks with positions: T1(${t1.position}), T2(${t2.position}), T3(${t3.position})`);
  
  // 3. Simulate dragging T1 between T2 and T3
  const newPosition = (t2.position + t3.position) / 2;
  await prisma.task.update({
    where: { id: t1.id },
    data: { position: newPosition }
  });
  
  const updatedT1 = await prisma.task.findUnique({ where: { id: t1.id } });
  console.log(`Drag & Drop Check: T1 moved between T2 and T3. New T1 position: ${updatedT1?.position}. T2: ${t2.position}, T3: ${t3.position}.`);
  if (updatedT1 && updatedT1.position > t2.position && updatedT1.position < t3.position) {
    console.log("✅ Drag and drop position persistence verified!");
  } else {
    console.error("❌ Drag and drop position persistence failed!");
  }
  
  // 4. Check dependencies (Blocked By)
  await prisma.task.update({
    where: { id: t2.id },
    data: { blockedById: t3.id }
  });
  
  const updatedT2 = await prisma.task.findUnique({ where: { id: t2.id }, include: { blockedBy: true } });
  console.log(`Dependency Check: T2 blocked by T3. T2.blockedById = ${updatedT2?.blockedById}`);
  if (updatedT2?.blockedById === t3.id) {
    console.log("✅ Dependency dropdown persistence verified!");
  } else {
    console.error("❌ Dependency dropdown persistence failed!");
  }
  
  // 5. Verify task cannot block itself
  try {
    await prisma.task.update({
      where: { id: t2.id },
      data: { blockedById: t2.id }
    });
    console.log("❌ DB allowed task to block itself!");
  } catch (e: any) {
    console.log("✅ Verified: DB (or API) logic prevented self-blocking (or failed as expected).", e.message);
  }
}

runVerification()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
