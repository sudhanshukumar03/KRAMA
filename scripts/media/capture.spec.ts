import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { designFixture } from './example-workspace';

const root = 'test-results/workflow-film';
const title = 'Write the case study opening';
const settle = async (page: Page) => { await page.waitForLoadState('networkidle'); await page.evaluate(() => document.fonts.ready); };

test('record a real capture → plan → Focus journey with isolated example data', async ({ browser }) => {
  mkdirSync(root, { recursive: true });
  const manifests = [];
  for (const theme of ['light', 'dark']) for (const device of ['desktop', 'mobile']) {
    if (process.env.KRAMA_MEDIA_VARIANT && process.env.KRAMA_MEDIA_VARIANT !== `${device}-${theme}`) continue;
    const viewport = device === 'desktop' ? { width: 1280, height: 720 } : { width: 480, height: 640 };
    const context = await browser.newContext({ viewport, recordVideo: { dir: `${root}/raw`, size: viewport }, timezoneId: 'Asia/Kolkata', reducedMotion: 'reduce' });
    const state = await designFixture(context);
    await context.addInitScript(value => { localStorage.setItem('krama-theme', value); localStorage.setItem('krama.sidebar.collapsed', 'false'); }, theme);
    const createdAt = Date.now();
    const page = await context.newPage();
    await page.clock.install({ time: new Date('2026-10-17T09:30:00Z') });
    await page.goto('/app/inbox'); await settle(page);
    const captureStart = (Date.now() - createdAt) / 1000;
    await page.waitForTimeout(550);
    await page.getByRole('button', { name: 'Capture something', exact: true }).click();
    const capture = page.getByRole('dialog', { name: 'Quick capture' });
    await capture.getByLabel('Title', { exact: true }).pressSequentially(title, { delay: 40 });
    await capture.getByLabel('Details', { exact: true }).pressSequentially('Tell the story behind the portfolio.', { delay: 20 });
    await page.waitForTimeout(350);
    await capture.getByRole('button', { name: 'Save to Inbox', exact: true }).click();
    await expect(capture).toBeHidden();
    await expect.poll(() => state.tasks.some(task => task.id === 'demo-captured-task')).toBe(true);
    await page.waitForTimeout(650);
    await page.getByRole('button', { name: `Schedule today: ${title}`, exact: true }).click();
    await expect.poll(() => state.tasks.find(task => task.id === 'demo-captured-task')?.metadata.inbox).toBe(false);
    await page.waitForTimeout(650);
    const captureEnd = (Date.now() - createdAt) / 1000;
    await page.goto(`/app/planner?mode=day&date=${state.date}`); await settle(page);
    const planStart = (Date.now() - createdAt) / 1000;
    await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: 'Add Time Block', exact: true }).click();
    const block = page.getByRole('dialog', { name: 'Add Time Block' });
    await block.getByLabel('Time block title', { exact: true }).pressSequentially('Write the case study', { delay: 35 });
    await block.getByLabel('Start time', { exact: true }).fill('16:00');
    await block.getByLabel('End time', { exact: true }).fill('16:25');
    await block.getByLabel('Task', { exact: true }).selectOption('demo-captured-task');
    await page.waitForTimeout(500);
    await block.getByRole('button', { name: 'Create Time Block', exact: true }).click();
    await expect(block).toBeHidden();
    await expect.poll(() => state.planner.timeBlocks.some(item => item.id === 'demo-new-block')).toBe(true);
    await page.waitForTimeout(800);
    const planEnd = (Date.now() - createdAt) / 1000;
    const focusCreatedAt = Date.now();
    const popup = context.waitForEvent('page');
    await page.getByRole('button', { name: title, exact: true }).click();
    const focus = await popup;
    const setup = focus.getByRole('dialog', { name: 'Plan your focus time' });
    await expect(setup).toBeVisible();
    await focus.evaluate(() => document.fonts.ready);
    const focusStart = (Date.now() - focusCreatedAt) / 1000;
    await focus.waitForTimeout(700);
    await setup.getByRole('button', { name: 'Use this plan' }).click();
    await focus.waitForTimeout(800);
    await focus.getByTitle('Click or press Enter to start', { exact: true }).click();
    await expect(focus).toHaveTitle(/24:5/, { timeout: 10000 });
    await focus.waitForTimeout(2500);
    const focusEnd = (Date.now() - focusCreatedAt) / 1000;
    const mainVideo = page.video()!; const focusVideo = focus.video()!;
    await page.screenshot({ path: `${root}/planner-${device}-${theme}.png` });
    await focus.screenshot({ path: `${root}/focus-${device}-${theme}.png` });
    await context.close();
    const clips = [{ path: await mainVideo.path(), start: captureStart, end: captureEnd, chapter: 'Capture' }, { path: await mainVideo.path(), start: planStart, end: planEnd, chapter: 'Plan' }, { path: await focusVideo.path(), start: focusStart, end: focusEnd, chapter: 'Focus' }];
    manifests.push({ theme, device, viewport, clips });
    writeFileSync(`${root}/${device}-${theme}.json`, JSON.stringify(manifests.at(-1), null, 2));
  }
});

test('capture richer real product previews from the same example project', async ({ browser }) => {
  if (process.env.KRAMA_MEDIA_VARIANT) test.skip();
  for (const theme of ['light', 'dark']) for (const [device, width] of [['desktop', 1440], ['mobile', 390]] as const) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', timezoneId: 'Asia/Kolkata' });
    await designFixture(context);
    await context.addInitScript(value => { localStorage.setItem('krama-theme', value); localStorage.setItem('krama.sidebar.collapsed', 'false'); }, theme);
    const page = await context.newPage(); await page.clock.setFixedTime(new Date('2026-10-17T09:30:00Z'));
    for (const [name, path] of [['dashboard', '/app/'], ['planner', '/app/planner?date=2026-10-17'], ['brain', '/app/brain?doc=design-doc-0'], ['focus', '/focus']]) {
      // Focus uses a single appearance in both workspace themes.
      if (name === 'focus' && theme === 'light') continue;
      await page.goto(path); await settle(page);
      await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
      await page.screenshot({ path: `apps/web/public/landing/${name}-${device}-${theme}.png`, animations: 'disabled' });
      if (name === 'brain') {
        const canvas = page.getByLabel('Document title', { exact: true }).locator('xpath=ancestor::div[contains(@class,"v4-card")]');
        await expect(canvas.locator('.tiptap')).toContainText('What I want to show');
        await canvas.screenshot({ path: `apps/web/public/landing/brain-detail-${device}-${theme}.png`, animations: 'disabled', style: '.krama-assistant-launcher { visibility: hidden !important; }' });
      }
    }
    await context.close();
  }
});
