import { test as setup, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const userEmail = `e2e_${Date.now()}_${Math.random()}@krama.com`;
  const userPassword = 'password123';

  // 1. Signup (which also logs in)
  await page.goto('/signup');
  await page.fill('input[type="text"]', 'E2E Setup User');
  await page.fill('input[type="email"]', userEmail);
  await page.fill('input[type="password"]', userPassword);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/app/);

  // End of authentication steps.
  await page.context().storageState({ path: authFile });
});
