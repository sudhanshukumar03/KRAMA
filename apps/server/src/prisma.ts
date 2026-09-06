import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { domainEventBus } from './events/eventBus';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

export type PostCommitPublisher = (type: string, payload: any) => void;

export const runInTransaction = async <T>(
  fn: (tx: any, publishAfterCommit: PostCommitPublisher) => Promise<T>
): Promise<T> => {
  const postCommitQueue: Array<{ type: string; payload: any }> = [];
  const publishAfterCommit: PostCommitPublisher = (type, payload) => {
    postCommitQueue.push({ type, payload });
  };

  const result = await prisma.$transaction((tx) => fn(tx, publishAfterCommit));

  // Published strictly after the transaction has successfully committed
  for (const event of postCommitQueue) {
    domainEventBus.emitEvent(event.type, event.payload);
  }

  return result;
};
