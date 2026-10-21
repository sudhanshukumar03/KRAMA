import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { bugFixture } from '../fixtures/current-bug-fixture';

test.beforeEach(async ({ context }) => {
  // A public visitor has no refresh cookie; the landing page must remain usable.
  await context.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 401, json: { message: 'No active session' } }));
});

test('public page fits phone, tablet and desktop sizes in both themes with usable targets and real media', async ({ page }, testInfo) => {
  const runtime: string[] = [], failedResponses: string[] = [];
  page.on('pageerror', error => runtime.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !/\b401\b/.test(message.text())) runtime.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400 && !(response.url().includes('/api/v1/auth/refresh') && response.status() === 401)) failedResponses.push(`${response.status()} ${response.url()}`); });
  const measurements = [];
  for (const width of [320, 390, 768, 1440, 1920]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Make room for focus, planning and habits.' })).toBeVisible();
    if ((await page.locator('html').evaluate(node => node.classList.contains('dark'))) !== (theme === 'dark')) await page.getByRole('button', { name: `Switch to ${theme} mode` }).click();
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.landing-preview-panel img').evaluate((image: HTMLImageElement) => image.decode());
    for (const name of ['Planner', 'Brain', 'Focus', 'Today']) {
      await page.getByRole('tab', { name, exact: true }).click();
      await page.locator('.landing-preview-panel img').evaluate((image: HTMLImageElement) => image.decode());
    }
    const metrics = await page.evaluate(() => {
      const controls = Array.from(document.querySelectorAll<HTMLElement>('.krama-landing a[href], .krama-landing button, .krama-landing summary, .krama-landing [tabindex="0"]')).filter(node => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(node).visibility !== 'hidden';
      }).map(node => { const rect = node.getBoundingClientRect(); return { name: node.getAttribute('aria-label') || node.textContent?.trim(), width: rect.width, height: rect.height }; });
      const product = document.querySelector('.landing-product')!.getBoundingClientRect();
      const preview = document.querySelector('.landing-preview-panel')!.getBoundingClientRect();
      const readingText = Array.from(document.querySelectorAll('.landing-hero-copy > p, .landing-workflow-list p, .landing-knowledge-copy > p, .landing-project-copy > p, .landing-faq-list details > p'));
      const headingScale = parseFloat(getComputedStyle(document.querySelector('h1')!).fontSize) / parseFloat(getComputedStyle(document.querySelector('.landing-workflow h2')!).fontSize);
      return { viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth, productTop: product.top + scrollY, previewRatio: preview.width / preview.height, desktopTypography: matchMedia('(min-width: 768px)').matches, headingScale, minimumReadingSize: Math.min(...readingText.map(node => parseFloat(getComputedStyle(node).fontSize))), minimumWidth: Math.min(...controls.map(node => node.width)), minimumHeight: Math.min(...controls.map(node => node.height)), offenders: controls.filter(node => node.width < 43.9 || node.height < 43.9) };
    });
    measurements.push({ width, theme, ...metrics });
    expect.soft(metrics.documentWidth, `${width} ${theme} overflow`).toBeLessThanOrEqual(width);
    expect.soft(metrics.offenders, `${width} ${theme} small targets`).toEqual([]);
    expect.soft(metrics.minimumReadingSize, `${width} ${theme} reading text`).toBeGreaterThanOrEqual(16);
    await page.locator('.landing-knowledge-preview').scrollIntoViewIfNeeded();
    // WebKit can switch <picture> sources after lazy-load visibility changes.
    // Wait for the selected responsive asset to finish, including theme changes.
    await expect.poll(() => page.locator('.landing-knowledge-preview img').evaluate((image: HTMLImageElement, expected) => image.complete && image.naturalWidth > 0 && image.currentSrc.endsWith(expected), `brain-detail-${width <= 600 ? 'mobile' : 'desktop'}-${theme}.png`)).toBe(true);
    await expect(page.getByRole('figure', { name: 'Example: a goal connected to a project and its tasks' })).toContainText('Portfolio refresh');
    if (width === 1440) expect.soft(metrics.productTop, 'product preview starts within the first screen').toBeLessThan(550);
    if (width >= 768) expect.soft(metrics.previewRatio, 'desktop preview preserves the full product image').toBeCloseTo(1.6, 1);
    if (metrics.desktopTypography) expect.soft(metrics.headingScale, 'hero and section headings have distinct hierarchy').toBeGreaterThanOrEqual(1.6);
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*\bdark\b)/);
    if (testInfo.project.name === 'chromium') {
      if (width === 1440 || width === 390) {
        await page.locator('#intro').scrollIntoViewIfNeeded();
        await expect(page.locator('#intro video')).toHaveAttribute('poster', /poster\.jpg$/);
        await page.locator('#intro video').evaluate(async (video: HTMLVideoElement) => { const poster = new Image(); poster.src = video.poster; await poster.decode(); });
        await page.locator('.landing-knowledge').screenshot({ path: `.audit/landing/screenshots/knowledge-${width}-${theme}.png`, style: '.landing-header { visibility: hidden !important; }' });
        await page.locator('.landing-project-story').screenshot({ path: `.audit/landing/screenshots/project-${width}-${theme}.png`, style: '.landing-header { visibility: hidden !important; }' });
      }
      await page.screenshot({ path: `.audit/landing/screenshots/final-${width}-${theme}.png`, fullPage: true });
      if (width === 1440 || width === 1920 || width === 390) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: `.audit/landing/screenshots/hero-${width}-${theme}.png` }); }
    }
  }
  mkdirSync('.audit/landing/measurements', { recursive: true });
  writeFileSync(`.audit/landing/measurements/${testInfo.project.name}.json`, JSON.stringify({ measurements, runtime, failedResponses }, null, 2));
  expect(runtime).toEqual([]);
  expect(failedResponses).toEqual([]);
});

test('keyboard preview selection, reduced motion, FAQ, and theme persistence work', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('krama-theme', 'light'));
  await page.goto('/');
  await page.getByRole('tab', { name: 'Today', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Planner', exact: true })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toHaveAccessibleName('Planner');
  await expect(page.locator('.landing-preview-caption')).toContainText('Give your work a place in the week.');
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Focus', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Today', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: 'Focus', exact: true })).toBeFocused();
  await page.keyboard.press('Home');
  expect(await page.locator('.landing-preview-panel picture').evaluate(node => getComputedStyle(node).animationName)).toBe('none');
  const question = page.locator('summary').filter({ hasText: 'Does Focus open in a separate tab?' });
  await question.focus(); await page.keyboard.press('Enter');
  await expect(question.locator('..')).toHaveAttribute('open', '');
  await expect(question.locator('..').locator('p')).toContainText('the timer opens in a new tab');
  await page.keyboard.press('Space');
  await expect(question.locator('..')).not.toHaveAttribute('open');
  await page.getByRole('button', { name: 'Switch to dark mode' }).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveClass(/dark/);
  expect(await page.evaluate(() => localStorage.getItem('krama-theme'))).toBe('dark');
  await expect(page.locator('.landing-preview-panel img')).toHaveAttribute('src', /dark\.png$/);
  await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeFocused();
  expect(await page.getByRole('button', { name: 'Switch to light mode' }).evaluate(node => getComputedStyle(node).outlineStyle)).toBe('solid');
});

test('mobile disclosure supports keyboard, Escape focus return, and section navigation', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Find the thought you need', exact: true })).toBeVisible();
  const trigger = page.getByRole('button', { name: /^(Open|Close) navigation$/ });
  await trigger.focus(); await page.keyboard.press('Enter');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Workspace' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeHidden();
  await page.keyboard.press('Enter');
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'How it works' }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeHidden();
  await expect(page.locator('#how-it-works')).toBeFocused();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Make room for focus, planning and habits.' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});

test('preview loading failure is recoverable and selection remains interruptible', async ({ page, context }) => {
  await context.route('**/landing/dashboard-*.png', route => route.abort());
  await page.goto('/');
  await expect(page.getByRole('alert')).toHaveText(/preview could not load/);
  await context.unroute('**/landing/dashboard-*.png');
  await page.getByRole('button', { name: 'Try again' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.landing-preview-panel img')).toBeVisible();
  await page.locator('.landing-preview-panel img').evaluate((image: HTMLImageElement) => image.decode());
  await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('tabpanel')).toBeFocused();
  await context.route('**/landing/planner-*.png', route => route.abort());
  await page.getByRole('tab', { name: 'Planner', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('tab', { name: 'Brain', exact: true }).click();
  await page.locator('.landing-preview-panel img').evaluate((image: HTMLImageElement) => image.decode());
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('tabpanel')).toHaveAccessibleName('Brain');
});

test('one persistent entry opens login and preserves account creation for visitors', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const entry = page.getByRole('link', { name: 'Open KRAMA', exact: true });
  for (const width of [320, 360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('.krama-landing a[href^="/app"]')).toHaveCount(1);
    await expect(page.locator('.krama-landing a[href="/signup"], .krama-landing a[href="/login"]')).toHaveCount(0);
    await page.locator('#questions').scrollIntoViewIfNeeded();
    await expect(entry).toBeInViewport();
    const bounds = await entry.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
  }
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Pause headline animation', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Explore the workspace', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#workspace$/);
  await expect(page.getByRole('region', { name: 'Explore KRAMA', exact: true })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Today', exact: true })).toBeInViewport();
  await entry.focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.getByRole('link', { name: 'Sign up', exact: true }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
});

test('signed-in visitors resume the workspace instead of being sent to signup', async ({ page, context }) => {
  await bugFixture(context);
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Open KRAMA', exact: true })).toBeVisible();
  await expect(page.locator('.krama-landing a[href^="/app"]')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Create your workspace', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Open KRAMA', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/app\/?$/);
  await expect(page.getByRole('heading', { name: /Good .*Reader/ })).toBeVisible();
});

test('system appearance changes update theme assets together with the page colors', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('krama-theme', 'system'));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('.landing-header .landing-brand-image')).toHaveAttribute('src', '/brand/krama-logo-dark.svg');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect(page.locator('.landing-header .landing-brand-image')).toHaveAttribute('src', '/brand/krama-logo-light.svg');
  await expect(page.locator('.landing-preview-panel img')).toHaveAttribute('src', '/landing/dashboard-desktop-light.png');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('.landing-header .landing-brand-image')).toHaveAttribute('src', '/brand/krama-logo-dark.svg');
});

test('landing text and primary actions meet contrast requirements in both themes', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const report = [];
  for (const theme of ['light', 'dark']) {
    if ((await page.locator('html').evaluate(node => node.classList.contains('dark'))) !== (theme === 'dark')) await page.getByRole('button', { name: `Switch to ${theme} mode` }).click();
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*\bdark\b)/);
    const measurements = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      const pixel = () => Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
      const luminance = (rgb: number[]) => rgb.map(value => { const s = value / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
      const selectors = ['h1', 'h2', 'h3', '.landing-hero-copy > p', '.landing-hero-link', '.landing-desktop-nav a', '.landing-button', '.landing-preview-tabs [aria-selected="true"]', '.landing-preview-tabs [aria-selected="false"]', '.landing-preview-caption strong', '.landing-preview-caption p', '.landing-step-app', '.landing-workflow-task', '.landing-workflow-meta', '.landing-workflow-clock', '.landing-plan-hours', '.landing-plan-block .landing-workflow-task', '.landing-plan-block .landing-workflow-meta', '.landing-workflow-list p', '.landing-knowledge-copy h3', '.landing-knowledge-copy > p', '.landing-knowledge-preview figcaption', '.landing-project-copy h3', '.landing-project-copy > p', '.landing-example-goal p', '.landing-example-project h4', '.landing-example-task-label', '.landing-example-next-task p', '.landing-example-note p', '.landing-example-project li', '.landing-example-project small', '.landing-example-project-footer', '.landing-faq-list summary', '.landing-faq-list details > p', '.landing-footer p'];
      return selectors.map(selector => {
        const node = document.querySelector<HTMLElement>(`.krama-landing ${selector}`)!;
        const ancestors: HTMLElement[] = []; let ancestor: HTMLElement | null = node;
        while (ancestor) { ancestors.unshift(ancestor); ancestor = ancestor.parentElement; }
        ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1, 1);
        for (const element of ancestors) { ctx.fillStyle = getComputedStyle(element).backgroundColor; ctx.fillRect(0, 0, 1, 1); }
        const background = luminance(pixel());
        const style = getComputedStyle(node); ctx.fillStyle = style.color; ctx.fillRect(0, 0, 1, 1);
        const foreground = luminance(pixel());
        const ratio = (Math.max(background, foreground) + .05) / (Math.min(background, foreground) + .05);
        const accentOrAction = ['.landing-hero-link', '.landing-button', '.landing-preview-tabs [aria-selected="true"]'].includes(selector);
        return { selector, ratio, color: style.color, backgroundColor: style.backgroundColor, size: parseFloat(style.fontSize), weight: style.fontWeight, tracking: style.letterSpacing, transition: style.transition, animations: node.getAnimations().length, minimum: accentOrAction ? 4.5 : 7 };
      });
    });
    report.push({ theme, measurements });
    for (const measurement of measurements) expect.soft(measurement.ratio, `${theme} ${measurement.selector}`).toBeGreaterThanOrEqual(measurement.minimum);
  }
  mkdirSync('.audit/landing/measurements', { recursive: true });
  writeFileSync(`.audit/landing/measurements/${testInfo.project.name}-contrast.json`, JSON.stringify(report, null, 2));
});

test('headline cycles without layout shifts and supports keyboard pause, resume and offscreen suspension', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const topic = page.locator('.landing-hero-topic');
  await expect(topic).toHaveAttribute('data-running', 'true');
  const initial = await topic.boundingBox();
  const productTop = await page.locator('.landing-product').evaluate(node => node.getBoundingClientRect().top);
  for (const word of ['planning', 'habits', 'focus']) {
    await page.clock.fastForward(3300);
    await expect(topic).toHaveAttribute('data-topic', word);
    const box = await topic.boundingBox();
    expect(box!.width).toBeCloseTo(initial!.width, 1);
    expect(box!.height).toBeCloseTo(initial!.height, 1);
    expect(await page.locator('.landing-product').evaluate(node => node.getBoundingClientRect().top)).toBeCloseTo(productTop, 1);
  }
  await topic.focus(); await page.keyboard.press('Enter');
  await expect(topic).toHaveAccessibleName('Resume headline animation');
  await page.clock.fastForward(10000);
  await expect(topic).toHaveAttribute('data-topic', 'focus');
  await page.keyboard.press('Space');
  await expect(topic).toHaveAccessibleName('Pause headline animation');
  await page.clock.fastForward(3300);
  await expect(topic).toHaveAttribute('data-topic', 'planning');
  await page.locator('#questions').scrollIntoViewIfNeeded();
  await expect(topic).toHaveAttribute('data-running', 'false');
  const offscreenWord = await topic.getAttribute('data-topic');
  await page.clock.fastForward(10000);
  await expect(topic).toHaveAttribute('data-topic', offscreenWord!);
  await page.evaluate(() => scrollTo(0, 0));
  await expect(topic).toHaveAttribute('data-running', 'true');
  await page.clock.fastForward(3300);
  const resumedWord = ['focus', 'planning', 'habits'][(['focus', 'planning', 'habits'].indexOf(offscreenWord!) + 1) % 3];
  await expect(topic).toHaveAttribute('data-topic', resumedWord);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(topic).toHaveAttribute('data-running', 'false');
  await expect(topic).toHaveAccessibleName('Show next headline topic');
  expect(await page.locator('.landing-topic-leave').evaluate(node => getComputedStyle(node).opacity)).toBe('0');
  await page.clock.fastForward(10000);
  await expect(topic).toHaveAttribute('data-topic', resumedWord);
});

test('headline topics fit phones and both themes with reduced motion and a stable accessible heading', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const topic = page.locator('.landing-hero-topic');
  const colors = [];
  for (const width of [320, 390, 768, 1440]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 900 });
    if ((await page.locator('html').evaluate(node => node.classList.contains('dark'))) !== (theme === 'dark')) await page.getByRole('button', { name: `Switch to ${theme} mode` }).click();
    const dimensions = [];
    const backgrounds = new Set<string>();
    for (const word of ['focus', 'planning', 'habits']) {
      while ((await topic.getAttribute('data-topic')) !== word) await topic.click();
      await expect(page.getByRole('heading', { name: 'Make room for focus, planning and habits.' })).toBeVisible();
      expect(await topic.evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
      const box = (await topic.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
      dimensions.push(box.width);
      const palette = await topic.evaluate(node => {
        const word = node.querySelector('.landing-topic-word:not(.landing-topic-leave)')!;
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d')!;
        const pixel = () => Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
        const lum = (rgb: number[]) => rgb.map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((n, v, i) => n + v * [.2126, .7152, .0722][i], 0);
        const chain: Element[] = []; let parent: Element | null = word;
        while (parent) { chain.unshift(parent); parent = parent.parentElement; }
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1, 1);
        for (const element of chain) { ctx.fillStyle = getComputedStyle(element).backgroundColor; ctx.fillRect(0, 0, 1, 1); }
        const back = lum(pixel()), ink = getComputedStyle(word).color;
        ctx.fillStyle = ink; ctx.fillRect(0, 0, 1, 1); const front = lum(pixel());
        return { ink, iconInk: getComputedStyle(word.querySelector('svg')!).color, background: getComputedStyle(node).backgroundColor, ratio: (Math.max(front, back) + .05) / (Math.min(front, back) + .05) };
      });
      expect(palette.ratio, `${word} ${theme} contrast`).toBeGreaterThanOrEqual(4.5);
      expect(palette.ink).toBe('rgb(0, 0, 0)');
      backgrounds.add(palette.background); colors.push({ width, theme, word, ...palette });
      if (testInfo.project.name === 'chromium' && (width === 390 || width === 1440)) {
        await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); scrollTo(0, 0); });
        await page.screenshot({ path: `.audit/hero-topics/${width}-${theme}-${word}.png` });
        await topic.screenshot({ path: `.audit/hero-topics/${width}-${theme}-${word}-pill.png` });
      }
    }
    expect(Math.max(...dimensions) - Math.min(...dimensions)).toBeLessThan(.1);
    expect(backgrounds.size).toBe(3);
  }
  mkdirSync('.audit/hero-topics', { recursive: true });
  writeFileSync(`.audit/hero-topics/colors-${testInfo.project.name}.json`, JSON.stringify(colors, null, 2));
});

test('headline pill reserves the same width while fallback fonts change', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const topic = page.locator('.landing-hero-topic');
  await expect(topic).toBeVisible();
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions: number[] = [];
    for (const family of ['Arial, sans-serif', 'system-ui', 'Inter, sans-serif']) {
      await topic.evaluate((node, font) => { (node as HTMLElement).style.fontFamily = font; }, family);
      for (const word of ['focus', 'planning', 'habits']) {
        while ((await topic.getAttribute('data-topic')) !== word) await topic.click();
        const box = (await topic.boundingBox())!;
        dimensions.push(box.width);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(await topic.locator('.landing-topic-word').evaluate(node => node.scrollWidth)).toBeLessThanOrEqual(box.width);
      }
    }
    expect(Math.max(...dimensions) - Math.min(...dimensions)).toBeLessThan(.1);
  }
});

