import { prisma } from '../prisma';

function dateKeyToUtcNoon(key: string): Date {
  return new Date(`${key}T12:00:00.000Z`);
}

async function main() {
  console.log('Starting migration for HabitCompletion date and offSchedule...');

  // Get all HabitCompletions
  const completions = await prisma.habitCompletion.findMany({
    orderBy: { completedAt: 'asc' } // Earliest first so we keep the first one
  });
  console.log(`Found ${completions.length} completions to process.`);

  const duplicates = new Map<string, string[]>(); // key -> array of ids

  // Process and update
  for (const c of completions) {
    // Adjust completedAt by +05:30 to extract the correct local date in IST
    const istTime = new Date(c.completedAt.getTime() + 5.5 * 60 * 60 * 1000);
    const localDay = istTime.toISOString().substring(0, 10);
    const noonDate = dateKeyToUtcNoon(localDay);

    const dupKey = `${c.habitId}_${c.userId}_${localDay}`;
    if (!duplicates.has(dupKey)) {
      duplicates.set(dupKey, []);
    }
    duplicates.get(dupKey)!.push(c.id);

    // Update the record if date isn't set yet (or we can just blindly update)
    await prisma.habitCompletion.update({
      where: { id: c.id },
      data: {
        date: noonDate,
        offSchedule: false,
      },
    });
  }

  // Deduplicate
  let deletedCount = 0;
  for (const [key, ids] of duplicates.entries()) {
    if (ids.length > 1) {
      // Keep the first one, delete the rest
      const idsToDelete = ids.slice(1);
      const res = await prisma.habitCompletion.deleteMany({
        where: { id: { in: idsToDelete } },
      });
      deletedCount += res.count;
      console.log(`Deduplicated ${key}: deleted ${res.count} records.`);
    }
  }

  console.log(`Migration complete. Updated ${completions.length} records. Deleted ${deletedCount} duplicate records.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
