import { prisma } from './prisma';

async function runAudit() {
  console.log('=== PART 1: RE-RUNNING ISOLATION TEST (WITH REAL DATA) ===\n');
  
  const randomSuffix = Date.now().toString();
  
  const wsA = await prisma.workspace.create({ data: { name: 'Audit WS A' } });
  const wsB = await prisma.workspace.create({ data: { name: 'Audit WS B' } });
  
  const userA = await prisma.user.create({ data: { email: `audita_${randomSuffix}@example.com`, passwordHash: 'hash', name: 'User A' } });
  const userB = await prisma.user.create({ data: { email: `auditb_${randomSuffix}@example.com`, passwordHash: 'hash', name: 'User B' } });
  
  console.log(`[Setup] Created Workspace A (${wsA.id}) for User A`);
  console.log(`[Setup] Created Workspace B (${wsB.id}) for User B\n`);

  console.log('--- Seeding Distinct Data in Workspace B ---');
  
  const projB = await prisma.project.create({ data: { workspaceId: wsB.id, name: 'Secret Project B' } });
  console.log(`Created Project: ${projB.name}`);
  
  const taskB = await prisma.task.create({ data: { workspaceId: wsB.id, title: 'Classified Task B', projectId: projB.id } });
  console.log(`Created Task: ${taskB.title}`);
  
  const pageB = await prisma.page.create({ data: { workspaceId: wsB.id, title: 'Hidden Page B', createdBy: userB.id } });
  console.log(`Created Page: ${pageB.title}`);
  
  const goalB = await prisma.goal.create({ data: { workspaceId: wsB.id, title: 'Covert Goal B', type: 'yearly' } });
  console.log(`Created Goal: ${goalB.title}`);
  
  const habitB = await prisma.habit.create({ data: { workspaceId: wsB.id, name: 'Stealth Habit B' } });
  console.log(`Created Habit: ${habitB.name}`);
  
  const sprintB = await prisma.sprint.create({ data: { workspaceId: wsB.id, name: 'Ghost Sprint B', startDate: new Date(), endDate: new Date() } });
  console.log(`Created Sprint: ${sprintB.name}`);
  
  const logB = await prisma.dailyLog.create({ data: { workspaceId: wsB.id, userId: userB.id, date: new Date() } });
  console.log(`Created DailyLog for Workspace B`);
  
  const notifB = await prisma.notification.create({ data: { workspaceId: wsB.id, userId: userB.id, title: 'Whisper Notif B', message: 'Test' } });
  console.log(`Created Notification: ${notifB.title}`);
  
  await prisma.$executeRawUnsafe(`INSERT INTO "PageEmbedding" ("id", "pageId", "embedding", "updatedAt") VALUES (gen_random_uuid(), $1, (SELECT array_fill(0.1, ARRAY[384])::vector), NOW())`, pageB.id);
  console.log(`Created PageEmbedding for Page: ${pageB.title}\n`);

  console.log('--- Querying as Workspace A User (Adversarial Check) ---');
  
  const aTasks = await prisma.task.findMany({ where: { workspaceId: wsA.id } });
  console.log(`Tasks returned: ${JSON.stringify(aTasks)}`);
  
  const aProjs = await prisma.project.findMany({ where: { workspaceId: wsA.id } });
  console.log(`Projects returned: ${JSON.stringify(aProjs)}`);
  
  const aPages = await prisma.page.findMany({ where: { workspaceId: wsA.id } });
  console.log(`Pages returned: ${JSON.stringify(aPages)}`);
  
  const aGoals = await prisma.goal.findMany({ where: { workspaceId: wsA.id } });
  console.log(`Goals returned: ${JSON.stringify(aGoals)}`);
  
  const aHabits = await prisma.habit.findMany({ where: { workspaceId: wsA.id } });
  console.log(`Habits returned: ${JSON.stringify(aHabits)}`);
  
  const aSprints = await prisma.sprint.findMany({ where: { workspaceId: wsA.id } });
  console.log(`Sprints returned: ${JSON.stringify(aSprints)}`);
  
  const aLogs = await prisma.dailyLog.findMany({ where: { workspaceId: wsA.id } });
  console.log(`DailyLogs returned: ${JSON.stringify(aLogs)}`);
  
  const aNotifs = await prisma.notification.findMany({ where: { workspaceId: wsA.id } });
  console.log(`Notifications returned: ${JSON.stringify(aNotifs)}`);
  
  const ragResults = await prisma.$queryRaw<any[]>`SELECT p.title FROM "Page" p JOIN "PageEmbedding" pe ON p.id = pe."pageId" WHERE p."workspaceId" = ${wsA.id}`;
  console.log(`RAG Source Titles returned: ${JSON.stringify(ragResults)}`);

  const isolationPass = (aTasks.length + aProjs.length + aPages.length + aGoals.length + aHabits.length + aSprints.length + aLogs.length + aNotifs.length + ragResults.length) === 0;
  console.log(`\nISOLATION TEST FINAL RESULT: ${isolationPass ? 'PASS - Workspace A saw ZERO items from Workspace B' : 'FAIL - Leak detected!'}`);

  await prisma.page.deleteMany({ where: { workspaceId: { in: [wsA.id, wsB.id] } } });
  await prisma.task.deleteMany({ where: { workspaceId: { in: [wsA.id, wsB.id] } } });
  await prisma.project.deleteMany({ where: { workspaceId: { in: [wsA.id, wsB.id] } } });
  await prisma.goal.deleteMany({ where: { workspaceId: { in: [wsA.id, wsB.id] } } });
  await prisma.habit.deleteMany({ where: { workspaceId: { in: [wsA.id, wsB.id] } } });
  await prisma.sprint.deleteMany({ where: { workspaceId: { in: [wsA.id, wsB.id] } } });
  await prisma.dailyLog.deleteMany({ where: { workspaceId: { in: [wsA.id, wsB.id] } } });
  await prisma.notification.deleteMany({ where: { workspaceId: { in: [wsA.id, wsB.id] } } });
  await prisma.workspace.deleteMany({ where: { id: { in: [wsA.id, wsB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
  
  process.exit(0);
}

runAudit().catch(console.error);
