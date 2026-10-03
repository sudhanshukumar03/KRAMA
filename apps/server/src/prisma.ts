import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { domainEventBus } from './events/eventBus';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

const connectionString = process.env.DATABASE_URL;
const pool =
  globalForPrisma.pool ??
  new pg.Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err);
});

const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

export type PostCommitPublisher = (type: string, payload: any) => void;

export type TxClient = Omit<Prisma.TransactionClient, '$transaction'>;

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
