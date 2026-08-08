import { test } from '@playwright/test';

test('Capture Dashboard', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER_ERROR:', err.message));
  await page.goto('http://localhost:5173/app');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'C:/Users/sksin/.gemini/antigravity/brain/8e1f5d8e-f1f4-4b09-b83e-db272bf4e796/dashboard_screenshot.png', fullPage: true });
});