export function validateIntegrationTargets(env: NodeJS.ProcessEnv) {
  if (!env.TEST_DATABASE_URL || !env.TEST_REDIS_URL) throw new Error('Integration tests require TEST_DATABASE_URL and TEST_REDIS_URL.');
  const database = new URL(env.TEST_DATABASE_URL);
  const redis = new URL(env.TEST_REDIS_URL);
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !/^\/[a-zA-Z0-9_]+_test$/.test(database.pathname)) {
    throw new Error('Test database name must end in _test.');
  }
  if (!['redis:', 'rediss:'].includes(redis.protocol) || !/^\/([1-9]|1[0-5])$/.test(redis.pathname)) {
    throw new Error('Test Redis must use a dedicated nonzero database (1–15).');
  }
  const sameDatabase = (left: URL, right: URL) => left.host === right.host && left.pathname === right.pathname;
  if (env.DATABASE_URL && sameDatabase(database, new URL(env.DATABASE_URL))) throw new Error('Test and application database must differ.');
  if (env.REDIS_URL && sameDatabase(redis, new URL(env.REDIS_URL))) throw new Error('Test and application Redis database must differ.');
  return { database, redis };
}

export function assertIntegrationEnvironment() {
  if (process.env.KRAMA_INTEGRATION_TEST !== '1' || !process.env.KRAMA_TEST_RUN_ID ||
      process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL || process.env.REDIS_URL !== process.env.TEST_REDIS_URL) {
    throw new Error('Use test:integration with dedicated test services; refusing workspace mutation.');
  }
  validateIntegrationTargets({ ...process.env, DATABASE_URL: process.env.KRAMA_PRIMARY_DATABASE_URL, REDIS_URL: process.env.KRAMA_PRIMARY_REDIS_URL });
}
