import { defineConfig, devices } from '@playwright/test';

// Normally tests a fresh production build through Vite preview. A loopback
// target also allows the same journeys to verify the Nginx production ingress.
const target = process.env.KRAMA_LANDING_BASE_URL;
if (target) {
  const url = new URL(target);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('KRAMA_LANDING_BASE_URL must be a local HTTP origin.');
  }
}

export default defineConfig({
  testDir: './e2e/mocked',
  testMatch: ['landing-page.spec.ts', 'landing-film.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 1,
  outputDir: 'test-results/landing',
  reporter: [['list'], ['json', { outputFile: 'test-results/landing-results.json' }]],
  use: {
    baseURL: target || 'http://127.0.0.1:4188',
    timezoneId: 'Asia/Kolkata',
    trace: 'retain-on-failure',
    video: 'off',
  },
  webServer: target ? undefined : {
    command: 'corepack pnpm --filter client exec vite preview --host 127.0.0.1 --port 4188 --strictPort',
    url: 'http://127.0.0.1:4188',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
