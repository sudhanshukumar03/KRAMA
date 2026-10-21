import { prisma, type TxClient } from '../prisma';
import { resolveUserTimeZone } from './habitStreak.service';

// Remember the active browser's validated calendar for background streak jobs.
// Merge in SQL so simultaneous timer/layout changes retain their metadata.
export async function rememberUserTimeZone(userId: string, requestedZone?: string, db: TxClient = prisma) {
  if (!requestedZone) return;
  const timeZone = resolveUserTimeZone(null, requestedZone);
  await db.$executeRaw`UPDATE "User" SET metadata = (CASE WHEN jsonb_typeof(metadata) = 'object' THEN metadata ELSE '{}'::jsonb END) || jsonb_build_object('timezone', ${timeZone}::text)
    WHERE id = ${userId} AND (metadata->>'timezone') IS DISTINCT FROM ${timeZone}`;
}
