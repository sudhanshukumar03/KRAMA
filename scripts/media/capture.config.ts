import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: 'capture.spec.ts', workers: 1, retries: 0, timeout: 240_000,
  outputDir: '../../.audit/workflow-film/results', reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5173', video: 'off', timezoneId: 'Asia/Kolkata' },
});
