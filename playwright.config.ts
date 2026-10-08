import { defineConfig, devices } from '@playwright/test';

// Default suite uses mocked APIs and starts only the frontend.
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/unit/*.spec.ts', '**/mocked/*.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4187',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'unit',
      testMatch: '**/unit/*.spec.ts',
    },
    {
      name: 'chromium',
      testMatch: '**/mocked/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm --filter client exec vite --host 127.0.0.1 --port 4187 --strictPort',
    url: 'http://127.0.0.1:4187',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
