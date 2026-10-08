import { test, expect } from '@playwright/test';

test.describe('Grounded AI Assist Verification', () => {
  const userPassword = 'password123';
  const userEmail = `ai_test_${Date.now()}@krama.com`;

  test('Grounded AI Assist answers questions and composes text via Gemini', async ({ page }) => {
    // 1. Signup to land on Dashboard
    await page.goto('/signup');
    await page.fill('input[type="text"]', 'AI Tester');
    await page.fill('input[type="email"]', userEmail);
    await page.fill('input[type="password"]', userPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/app/);

    // 2. Navigate to Brain Workspace
    await page.goto('/app/brain');
    await page.waitForLoadState('networkidle');

    // 3. Ensure a document exists or create one
    const createNewSpecBtn = page.locator('button:has-text("Create New Spec")').first();
    if (await createNewSpecBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createNewSpecBtn.click();
    } else {
      const addDocBtn = page.locator('button:has-text("Add Document")').first();
      await addDocBtn.click();
    }

    const createDocInput = page.getByPlaceholder('e.g. System Architecture Spec, API Contract...');
    await expect(createDocInput).toBeVisible({ timeout: 5000 });
    await createDocInput.fill('KRAMA Architecture Specification');
    await page.locator('button:has-text("Create Document")').click();

    // 4. Wait for document editor and click AI Assist button
    const aiAssistBtn = page.locator('button:has-text("AI Assist")').first();
    await expect(aiAssistBtn).toBeVisible({ timeout: 10000 });
    await aiAssistBtn.click();

    // 5. Verify Grounded AI Assist drawer opens
    await expect(page.locator('text=Grounded AI Assist').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Ask Notes")').first()).toBeVisible();

    // 6. Test Ask Notes
    const questionInput = page.locator('input[placeholder="Ask anything about this spec..."]');
    await expect(questionInput).toBeVisible();
    await questionInput.fill('What is this specification? Reply in one short sentence.');
    await questionInput.press('Enter');

    // Verify response arrives and NO error toast is shown
    await expect(page.locator('text=AI Q&A failed')).not.toBeVisible({ timeout: 3000 });
    
    // Wait for the AI output container to appear
    const outputContainer = page.locator('.whitespace-pre-wrap').first();
    await expect(outputContainer).toBeVisible({ timeout: 20000 });

    // Wait until stream text length > 10
    await expect.poll(async () => {
      const text = await outputContainer.textContent();
      return text ? text.length : 0;
    }, { timeout: 20000 }).toBeGreaterThan(10);

    const outputText = await outputContainer.textContent();
    console.log('AI Ask Output (full):', outputText);

    // Screenshot working Ask Notes
    await page.screenshot({ path: 'e2e/ai-assist-ask-working.png' });

    // 7. Test Compose & Refine tab
    await page.locator('button:has-text("Compose & Refine")').click();
    const instructionInput = page.locator('textarea[placeholder*="e.g. Outline deployment"]');
    await expect(instructionInput).toBeVisible();
    await instructionInput.fill('Write a 2-bullet summary for an executive review.');

    const generateBtn = page.locator('button:has-text("Generate with AI")');
    await generateBtn.click();

    // Verify no compose failure toast
    await expect(page.locator('text=AI Compose failed')).not.toBeVisible({ timeout: 3000 });

    // Wait for compose output text to stream
    const composeContainers = page.locator('.whitespace-pre-wrap');
    await expect(composeContainers.first()).toBeVisible({ timeout: 20000 });

    await expect.poll(async () => {
      const text = await composeContainers.first().textContent();
      return text ? text.length : 0;
    }, { timeout: 25000 }).toBeGreaterThan(10);

    const composeText = await composeContainers.first().textContent();
    console.log('AI Compose Output (full):', composeText);

    // Screenshot working Compose & Refine
    await page.screenshot({ path: 'e2e/ai-assist-compose-working.png' });
  });
});
