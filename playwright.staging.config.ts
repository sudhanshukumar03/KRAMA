import { defineConfig } from '@playwright/test';
import base from './playwright.config';
import { validateIntegrationTargets } from './apps/server/src/testing/testEnvironment';
if (!process.argv.includes('--list')) {
  validateIntegrationTargets({ ...process.env, DATABASE_URL: process.env.KRAMA_PRIMARY_DATABASE_URL, REDIS_URL: process.env.KRAMA_PRIMARY_REDIS_URL });
  if (!/^krama-verify-[a-f0-9]{8}$/.test(process.env.KRAMA_STAGING_PROJECT || '')) throw new Error('Use the isolated test:staging runner.');
}
const origin = process.env.KRAMA_STAGING_URL || 'https://127.0.0.1:8443';
if (new URL(origin).protocol !== 'https:' || new URL(origin).hostname !== '127.0.0.1') throw new Error('Staging verification requires isolated local HTTPS.');
export default defineConfig({ ...base, testDir: './e2e', webServer: undefined, retries: 0, timeout: 90000,
  outputDir: './test-results/staging', reporter: [['list'], ['json', { outputFile: 'test-results/staging.json' }]],
  projects: [{ name: 'staging-chromium', use: base.projects![1].use,
    testMatch: ['**/staging/*.spec.ts','**/live/production-ingress-live.spec.ts','**/live/focus-lifecycle-live.spec.ts','**/live/mobile-keyboard-live.spec.ts','**/live/accessibility-live.spec.ts'] }],
  use: { ...base.use, baseURL: origin, ignoreHTTPSErrors: true, timezoneId: 'Asia/Kolkata', contextOptions: { reducedMotion: 'reduce' } },
});
