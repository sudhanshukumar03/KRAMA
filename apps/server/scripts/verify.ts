import { PrismaClient } from '@prisma/client';
import { GoalService } from '../src/services/goal.service';
import { HabitService } from '../src/services/habit.service';

const prisma = new PrismaClient();
const goalService = new GoalService();
const habitService = new HabitService();

async function main() {
  console.log("--- KRAMA OS Verification ---");

  // 1. Create a dummy workspace and user (if not exists)
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { name: 'Test User', email: 'test@example.com', passwordHash: 'dummy', id: 'test-user-' + Date.now() }
    });
  }

  let workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: { name: 'Test Workspace', createdBy: 'system' }
    });
  }

  // 2. Test Goal Progress Snapshot
  console.log("\n1. Testing Goal Progress Snapshot...");
  const goal = await prisma.goal.create({
    data: {
      title: 'Snapshot Test Goal',
      type: 'quarterly',
      progress: 0,
      workspaceId: workspace.id,
      createdBy: user.id,
      updatedBy: user.id
    }
  });
  console.log(`Created Goal: ${goal.id} with progress ${goal.progress}`);

  console.log(`Updating Goal progress to 50% via GoalService...`);
  await goalService.updateGoal(goal.id, workspace.id, { progress: 50, version: goal.version }, user.id);

  const snapshots = await prisma.goalProgressSnapshot.findMany({
    where: { goalId: goal.id }
  });
  console.log(`Found ${snapshots.length} snapshot(s) for Goal ${goal.id}:`);
  console.log(snapshots);


  // 3. Test Habit Streak Increment
  console.log("\n2. Testing Habit Streak Increment...");
  const habit = await prisma.habit.create({
    data: {
      name: 'Test Streak Habit',
      workspaceId: workspace.id,
      streak: 0,
      createdBy: user.id,
      updatedBy: user.id
    }
  });
  console.log(`Created Habit: ${habit.id} with initial streak ${habit.streak}`);

  console.log(`Completing Habit via HabitService (simulating UI click)...`);
  await habitService.logHabitCompletion(habit.id, workspace.id, user.id);
  
  const updatedHabit = await prisma.habit.findUnique({ where: { id: habit.id }});
  console.log(`Habit Streak is now: ${updatedHabit?.streak}`);

  console.log(`Completing Habit again (already completed today should not increment again, wait logHabitCompletion actually creates a completion and increments)...`);
  await habitService.logHabitCompletion(habit.id, workspace.id, user.id);
  const untoggledHabit = await prisma.habit.findUnique({ where: { id: habit.id }});
  console.log(`Habit Streak is now (after second log): ${untoggledHabit?.streak}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
