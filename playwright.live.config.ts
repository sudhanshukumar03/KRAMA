import { defineConfig } from '@playwright/test';
import base from './playwright.integration.config';
const mode = process.env.KRAMA_VERIFY_MODE || 'core';
const origin = process.env.KRAMA_LIVE_FRONTEND_URL || 'http://127.0.0.1:4189';
const frontend = new URL(origin);
if (frontend.protocol !== 'http:' || frontend.hostname !== '127.0.0.1' || frontend.username || frontend.password) throw new Error('Live frontend must be an isolated local HTTP origin.');
const selected = mode === 'ai' ? ['**/real-ai-workflows.spec.ts', '**/ai-assist.spec.ts']
 : mode === 'baseline' ? ['**/quality-baseline-live.spec.ts']
 : mode === 'scale' ? ['**/quality-scale-live.spec.ts']
 : mode === 'contracts' ? ['**/quality-data-contracts-live.spec.ts']
 : mode === 'mobile' ? ['**/mobile-keyboard-live.spec.ts', '**/focus-lifecycle-live.spec.ts', '**/accessibility-live.spec.ts'] : '**/live/*.spec.ts';
export default defineConfig({ ...base, testDir: './e2e/live', timeout: mode === 'scale' ? 300000 : ['ai','baseline'].includes(mode) ? 180000 : 45000,
  retries: 0, outputDir: `./test-results/live-${mode}`,
  reporter: [['list'], ['json', { outputFile: `test-results/live-${mode}.json` }]],
  projects: base.projects!.map(project => ({ ...project, testMatch: selected })),
  use: { ...base.use, baseURL: frontend.origin },
  webServer: { command: `corepack pnpm --filter client exec vite ${['baseline','scale'].includes(mode) ? 'preview ' : ''}--host 127.0.0.1 --port ${frontend.port} --strictPort`, url: frontend.origin,
    reuseExistingServer: false, timeout: 120000, env: { KRAMA_API_TARGET: process.env.KRAMA_API_TARGET! } },
});
