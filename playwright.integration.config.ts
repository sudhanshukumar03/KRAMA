import { defineConfig } from '@playwright/test';
import base from './playwright.config';
import { validateIntegrationTargets } from './apps/server/src/testing/testEnvironment';

// Start the API/workers separately using these dedicated test services.
// Listing tests is read-only and does not require running services.
if (!process.argv.includes('--list')) {
  validateIntegrationTargets({
    ...process.env,
    DATABASE_URL: process.env.KRAMA_PRIMARY_DATABASE_URL,
    REDIS_URL: process.env.KRAMA_PRIMARY_REDIS_URL,
  });
  if (process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL || process.env.REDIS_URL !== process.env.TEST_REDIS_URL) {
    throw new Error('E2E tests require DATABASE_URL=TEST_DATABASE_URL and REDIS_URL=TEST_REDIS_URL.');
  }
}

const apiTarget = new URL(process.env.KRAMA_API_TARGET || 'http://127.0.0.1:3000');
if (apiTarget.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(apiTarget.hostname) || apiTarget.username || apiTarget.password) {
  throw new Error('E2E API target must be a local HTTP server.');
}
process.env.KRAMA_API_TARGET = apiTarget.origin;

export default defineConfig({
  ...base,
  testMatch: '**/live/*.spec.ts',
  projects: [{ name: 'chromium', use: base.projects![1].use, testMatch: '**/live/*.spec.ts' }],
  timeout: 180000,
  retries: 0,
  use: {
    ...base.use,
    timezoneId: 'Asia/Kolkata',
    contextOptions: { reducedMotion: 'reduce' },
  },
  webServer: {
    ...base.webServer,
    env: { KRAMA_API_TARGET: apiTarget.origin },
  },
});
