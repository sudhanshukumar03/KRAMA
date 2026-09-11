// =============================================================================
// IDEMPOTENT DATE NORMALIZER — KRAMA OS (Task 0 & PR1)
// =============================================================================
// Re-anchors legacy dates to canonical UTC noon (T12:00:00.000Z) per Amendment A:
// - Skip rows already at UTC 12:00:00Z.
// - Band 1 (>= 18:00Z, e.g. 18:30Z IST midnight): shift +1 day, snap to 12:00:00Z.
// - Band 2 (< 12:00Z, e.g. 00:00Z UTC midnight): keep day, snap to 12:00:00Z.
// - Band 3 (12:00Z-17:59Z): quarantine & leave alone (log only).
//
// NOTE: HabitCompletion is strictly EXCLUDED per Amendment B (completedAt is a true instant).
//
// Usage:
//   npx tsx src/scripts/normalize-dates.ts [--dry-run]

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma';
import { normalizeDateInstant, type NormalizationResult } from '@krama/validation';

const isDryRun = process.argv.includes('--dry-run');
const logFilePath = path.join(__dirname, 'migration_audit.log');

interface AuditEntry {
  timestamp: string;
  table: string;
  id: string;
  column: string;
  oldValue: string;
  newValue: string;
  action: string;
  dryRun: boolean;
}

function logAudit(entry: AuditEntry) {
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(logFilePath, line, 'utf8');
}

async function normalizeTableColumn(
  tableName: 'timeBlock' | 'task' | 'milestone',
  columnName: string,
  records: Array<{ id: string; [key: string]: any }>
) {
  let alreadyCanonical = 0;
  let updatedBand1 = 0;
  let updatedBand2 = 0;
  let quarantinedBand3 = 0;

  for (const record of records) {
    const rawVal = record[columnName];
    if (!rawVal) continue;

    const res: NormalizationResult = normalizeDateInstant(rawVal);

    if (res.action === 'SKIPPED_ALREADY_CANONICAL') {
      alreadyCanonical++;
      continue;
    }

    if (res.action === 'QUARANTINE_LOG_ONLY') {
      quarantinedBand3++;
      console.warn(`[QUARANTINE] ${tableName}.${columnName} id=${record.id} raw=${rawVal.toISOString()} is in 12:00Z-17:59Z band. Leaving untouched.`);
      logAudit({
        timestamp: new Date().toISOString(),
        table: tableName,
        id: record.id,
        column: columnName,
        oldValue: rawVal.toISOString(),
        newValue: rawVal.toISOString(),
        action: 'QUARANTINE_LOG_ONLY',
        dryRun: isDryRun,
      });
      continue;
    }

    if (res.changed) {
      if (res.action === 'SHIFT_FORWARD_SNAP_NOON') updatedBand1++;
      if (res.action === 'SNAP_NOON_SAME_DAY') updatedBand2++;

      logAudit({
        timestamp: new Date().toISOString(),
        table: tableName,
        id: record.id,
        column: columnName,
        oldValue: rawVal.toISOString(),
        newValue: res.normalized.toISOString(),
        action: res.action,
        dryRun: isDryRun,
      });

      if (!isDryRun) {
        if (tableName === 'timeBlock') {
          await prisma.timeBlock.update({
            where: { id: record.id },
            data: { [columnName]: res.normalized },
          });
        } else if (tableName === 'task') {
          await prisma.task.update({
            where: { id: record.id },
            data: { [columnName]: res.normalized },
          });
        } else if (tableName === 'milestone') {
          await prisma.milestone.update({
            where: { id: record.id },
            data: { [columnName]: res.normalized },
          });
        }
      }
    }
  }

  return {
    total: records.length,
    alreadyCanonical,
    updatedBand1,
    updatedBand2,
    quarantinedBand3,
  };
}

async function main() {
  console.log(`=======================================================`);
  console.log(`KRAMA OS Date Normalizer (Task 0 & PR1)`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (no writes)' : 'LIVE (writing to database)'}`);
  console.log(`Audit log: ${logFilePath}`);
  console.log(`=======================================================\n`);

  // 1. TimeBlock.date
  console.log(`Querying TimeBlock records...`);
  const timeBlocks = await prisma.timeBlock.findMany({
    select: { id: true, date: true },
  });
  const tbStats = await normalizeTableColumn('timeBlock', 'date', timeBlocks);

  // 2. Task.scheduledDate & Task.dueDate
  console.log(`Querying Task records...`);
  const tasks = await prisma.task.findMany({
    select: { id: true, scheduledDate: true, dueDate: true },
  });
  const taskSchedStats = await normalizeTableColumn('task', 'scheduledDate', tasks.filter(t => t.scheduledDate !== null));
  const taskDueStats = await normalizeTableColumn('task', 'dueDate', tasks.filter(t => t.dueDate !== null));

  // 3. Milestone.date
  console.log(`Querying Milestone records...`);
  const milestones = await prisma.milestone.findMany({
    select: { id: true, date: true },
  });
  const msStats = await normalizeTableColumn('milestone', 'date', milestones);

  console.log(`\n================== SUMMARY ==================`);
  console.table([
    { Target: 'TimeBlock.date', ...tbStats },
    { Target: 'Task.scheduledDate', ...taskSchedStats },
    { Target: 'Task.dueDate', ...taskDueStats },
    { Target: 'Milestone.date', ...msStats },
  ]);
  console.log(`Audit log saved to: ${logFilePath}`);
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
