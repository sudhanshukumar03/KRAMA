import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test.beforeEach(async ({ context }) => {
  await context.route('**/api/v1/auth/refresh', route => route.fulfill({ status: 401, json: { message: 'No active session' } }));
});
const film = (page: Page) => page.getByRole('region', { name: 'A clearer way forward.' });
const media = (page: Page) => film(page).locator('video');
async function revealFilm(page: Page) {
  await media(page).evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect(film(page)).toBeVisible();
}
async function playing(page: Page) {
  await expect.poll(() => media(page).evaluate((v: HTMLVideoElement) => v.readyState >= 2 && !v.paused)).toBe(true);
}
function skipWindowsMedia(browserName: string) {
  test.skip(browserName === 'webkit' && process.platform === 'win32', 'Windows WebKit does not fetch/decode these movies; actual playback needs a real media backend.');
}

test('scroll starts a muted inline film, leaving pauses, returning resumes, and manual Pause persists', async ({ page, browserName }) => {
  skipWindowsMedia(browserName);
  const requests: string[] = [], errors: string[] = [];
  page.on('request', r => { if (r.url().includes('/landing/film/')) requests.push(r.url()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('tab', { name: 'Today', exact: true }).focus();
  await expect(page.getByRole('button', { name: /Watch intro/ })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(media(page)).not.toHaveAttribute('src');
  expect(requests).toEqual([]);
  await revealFilm(page); // No click or key press starts playback.
  await playing(page);
  await expect.poll(() => media(page).evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(.1);
  const metadata = await media(page).evaluate((v: HTMLVideoElement) => ({ width: v.videoWidth, height: v.videoHeight, duration: v.duration, rate: v.playbackRate, decoded: v.getVideoPlaybackQuality().totalVideoFrames, muted: v.muted, inline: v.hasAttribute('playsinline') }));
  expect(metadata).toMatchObject({ width: 1280, height: 720, muted: true, inline: true });
  expect(metadata.duration).toBeCloseTo(20, 1); expect(metadata.rate).toBe(1); expect(metadata.decoded).toBeGreaterThan(0);
  expect(metadata.duration / metadata.rate).toBeCloseTo(20, 1);
  const paceStart = await media(page).evaluate((v: HTMLVideoElement) => ({ time: v.currentTime, clock: performance.now() }));
  await expect.poll(async () => (await media(page).evaluate((v: HTMLVideoElement) => v.currentTime)) - paceStart.time).toBeGreaterThan(1.5);
  const paceEnd = await media(page).evaluate((v: HTMLVideoElement) => ({ time: v.currentTime, clock: performance.now() }));
  const measuredRate = (paceEnd.time - paceStart.time) / ((paceEnd.clock - paceStart.clock) / 1000);
  expect(measuredRate).toBeGreaterThan(.8);
  expect(measuredRate).toBeLessThan(1.2);
  mkdirSync('.audit/faster-intro', { recursive: true });
  writeFileSync(`.audit/faster-intro/pace-${browserName}.json`, JSON.stringify({ sourceDuration: metadata.duration, playbackRate: metadata.rate, presentationSeconds: metadata.duration / metadata.rate, measuredRate }, null, 2));
  await expect(page.getByRole('tab', { name: 'Today', exact: true })).toBeFocused();
  const before = await media(page).evaluate((v: HTMLVideoElement) => v.currentTime);
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(() => media(page).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await revealFilm(page); await playing(page);
  expect(await media(page).evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThanOrEqual(before);
  const pause = film(page).getByRole('button', { name: 'Pause video', exact: true });
  await pause.focus(); await page.keyboard.press('Enter');
  await expect.poll(() => media(page).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await page.evaluate(() => scrollTo(0, 0)); await revealFilm(page);
  await expect(film(page).getByRole('button', { name: 'Play video', exact: true })).toBeVisible();
  expect(await media(page).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await film(page).getByRole('button', { name: 'Play video', exact: true }).click(); await playing(page);
  expect(errors).toEqual([]);
});

test('clean inline film keeps keyboard pause and replay without a toolbar or transcript row', async ({ page, browserName }) => {
  skipWindowsMedia(browserName);
  await page.goto('/');
  await revealFilm(page); await playing(page);
  await expect(film(page).getByRole('slider')).toHaveCount(0);
  await expect(film(page).locator('.landing-film-controls, details')).toHaveCount(0);
  await expect(media(page)).not.toHaveAttribute('controls');
  await page.mouse.move(0, 0);
  await expect(film(page).locator('.landing-film-play > span')).toHaveCount(0);
  await film(page).getByRole('button', { name: 'Pause video', exact: true }).hover();
  await expect(film(page).locator('.landing-film-play > span')).toHaveCount(0);
  if (browserName === 'chromium') {
    await page.mouse.move(0, 0);
    await page.screenshot({ path: '.audit/landing-film/screenshots/playing-without-controls.png' });
  }
  const pause = film(page).getByRole('button', { name: 'Pause video', exact: true });
  await pause.focus();
  await expect(pause).toHaveCSS('box-shadow', /inset/);
  await page.keyboard.press('Space');
  await expect.poll(() => media(page).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await expect(film(page).getByRole('button', { name: 'Play video', exact: true })).toBeFocused();
  await media(page).evaluate((v: HTMLVideoElement) => { v.currentTime = v.duration - .3; });
  await page.keyboard.press('Enter');
  await expect(film(page).getByRole('button', { name: 'Replay video' })).toBeVisible();
  await page.evaluate(() => scrollTo(0, 0)); await revealFilm(page);
  expect(await media(page).evaluate((v: HTMLVideoElement) => v.ended)).toBe(true);
  await film(page).getByRole('button', { name: 'Replay video' }).click(); await playing(page);
  expect(await media(page).evaluate((v: HTMLVideoElement) => v.currentTime)).toBeLessThan(2);
  await expect(media(page)).toHaveAccessibleDescription(/25-minute time block.*same task/);
});

test('inline player fits all required sizes and themes, respects reduced motion and has 44px controls', async ({ page, browserName }, testInfo) => {
  const measurements = [];
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const viewports = [{ width: 320, height: 900 }, { width: 375, height: 812 }, { width: 390, height: 900 }, { width: 768, height: 900 }, { width: 1440, height: 900 }, { width: 844, height: 390 }];
  for (const { width, height } of viewports) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height }); await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    if ((await page.locator('html').evaluate(n => n.classList.contains('dark'))) !== (theme === 'dark')) await page.getByRole('button', { name: `Switch to ${theme} mode` }).click();
    await revealFilm(page);
    await expect(film(page).locator('.landing-film-header, #landing-film-description')).toHaveCount(0);
    await expect(media(page)).toHaveAttribute('aria-describedby', 'landing-film-transcript');
    await expect(media(page)).toHaveAttribute('poster', /poster\.jpg$/);
    await expect(media(page)).not.toHaveAttribute('src');
    expect(await media(page).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await expect(film(page).locator('.landing-film-controls, details')).toHaveCount(0);
    const metrics = await film(page).evaluate(section => {
      const box = section.getBoundingClientRect();
      const controls = Array.from(section.querySelectorAll<HTMLElement>('button, input, summary')).map(n => { const r = n.getBoundingClientRect(); return { name: n.getAttribute('aria-label') || n.textContent, width: r.width, height: r.height }; }).filter(n => n.width > 0 && n.height > 0);
      return { viewport: innerWidth, document: document.documentElement.scrollWidth, sectionWidth: box.width, sectionScroll: section.scrollWidth, inside: box.left >= 0 && box.right <= innerWidth, minimumWidth: Math.min(...controls.map(n => n.width)), minimumHeight: Math.min(...controls.map(n => n.height)), offenders: controls.filter(n => n.width < 43.9 || n.height < 43.9) };
    });
    measurements.push({ width, height, theme, ...metrics });
    expect.soft(metrics.document).toBeLessThanOrEqual(width); expect.soft(metrics.inside).toBe(true); expect.soft(metrics.sectionScroll).toBeLessThanOrEqual(metrics.sectionWidth); expect.soft(metrics.offenders).toEqual([]);
    await film(page).getByRole('button', { name: 'Play video', exact: true }).focus(); await page.keyboard.press('Enter');
    await expect.poll(() => media(page).evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(2);
    await expect(media(page)).toHaveAttribute('src', new RegExp(`-${width <= 600 ? 'portrait' : 'landscape'}${theme === 'light' ? '-light' : ''}\\.(mp4|webm)$`));
    if (!(browserName === 'webkit' && process.platform === 'win32')) expect(await media(page).evaluate((v: HTMLVideoElement) => v.videoWidth)).toBe(width <= 600 ? 720 : 1280);
    await media(page).evaluate((v: HTMLVideoElement) => v.pause());
    if (testInfo.project.name === 'chromium') await page.screenshot({ path: `.audit/landing-film/screenshots/inline-${width}-${theme}.png` });
  }
  mkdirSync('.audit/landing-film/measurements', { recursive: true });
  writeFileSync(`.audit/landing-film/measurements/inline-${testInfo.project.name}.json`, JSON.stringify(measurements, null, 2));
});

test('failed inline sources explain the workflow and recover with keyboard retry', async ({ page, context, browserName }) => {
  skipWindowsMedia(browserName);
  await context.route('**/landing/film/*.mp4', r => r.abort()); await context.route('**/landing/film/*.webm', r => r.abort());
  await page.goto('/'); await revealFilm(page);
  await expect(film(page).getByRole('alert')).toContainText('The introduction could not load.');
  await expect(film(page).getByRole('alert')).toContainText('Capture a thought, plan your work');
  await context.unroute('**/landing/film/*.mp4'); await context.unroute('**/landing/film/*.webm');
  await revealFilm(page);
  await film(page).getByRole('button', { name: 'Try video again' }).focus(); await page.keyboard.press('Enter');
  await playing(page); await expect(film(page).getByRole('alert')).toHaveCount(0);
  await expect(film(page).getByRole('button', { name: 'Pause video' })).toBeFocused();
});

test('inline WebM fallback plays when MP4 is unavailable', async ({ page, context, browserName }) => {
  skipWindowsMedia(browserName);
  await context.route('**/landing/film/*.mp4', r => r.abort());
  await page.goto('/'); await revealFilm(page); await playing(page);
  await expect(media(page)).toHaveAttribute('src', /\.webm$/);
  await expect.poll(() => media(page).evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(.1);
  expect(await media(page).evaluate((v: HTMLVideoElement) => v.getVideoPlaybackQuality().totalVideoFrames)).toBeGreaterThan(0);
});

test('background tabs pause and changing to reduced motion stops automatic playback', async ({ page, browserName }) => {
  skipWindowsMedia(browserName);
  await page.goto('/'); await revealFilm(page); await playing(page);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(() => media(page).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await playing(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => media(page).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await page.evaluate(() => scrollTo(0, 0)); await revealFilm(page);
  expect(await media(page).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  await film(page).getByRole('button', { name: 'Play video', exact: true }).click(); await playing(page);
});

test('blocked autoplay offers manual Play and recovers without a dialog', async ({ page, browserName }) => {
  skipWindowsMedia(browserName);
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!this.dataset.autoplayAttempted) { this.dataset.autoplayAttempted = 'true'; return Promise.reject(new DOMException('Blocked by browser policy', 'NotAllowedError')); }
      return original.call(this);
    };
  });
  await page.goto('/'); await revealFilm(page);
  await expect(film(page).getByRole('status')).toHaveText('Press Play to start the introduction.');
  await film(page).getByRole('button', { name: 'Play video', exact: true }).focus(); await page.keyboard.press('Enter');
  await playing(page); await expect(film(page).getByRole('dialog')).toHaveCount(0);
});

test('switching appearance changes the actual film while preserving progress and pause', async ({ page, browserName }) => {
  skipWindowsMedia(browserName);
  await page.addInitScript(() => localStorage.setItem('krama-theme', 'light'));
  await page.goto('/'); await revealFilm(page); await playing(page);
  await expect(media(page)).toHaveAttribute('src', /-landscape-light\.(mp4|webm)$/);
  const lightBackground = await media(page).evaluate(v => getComputedStyle(v).backgroundColor);
  await film(page).getByRole('button', { name: 'Pause video' }).click();
  await media(page).evaluate((v: HTMLVideoElement) => { v.currentTime = 12; });
  await expect.poll(() => media(page).evaluate((v: HTMLVideoElement) => v.seeking)).toBe(false);
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(media(page)).toHaveAttribute('src', /-landscape\.(mp4|webm)$/);
  expect(await media(page).evaluate((v: HTMLVideoElement) => v.playbackRate)).toBe(1);
  await expect.poll(() => media(page).evaluate((v: HTMLVideoElement) => v.currentTime)).toBeCloseTo(12, 0);
  expect(await media(page).evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  expect(await media(page).evaluate(v => getComputedStyle(v).backgroundColor)).not.toBe(lightBackground);
  await film(page).getByRole('button', { name: 'Play video', exact: true }).click(); await playing(page);
  await expect.poll(() => media(page).evaluate((v: HTMLVideoElement) => v.getVideoPlaybackQuality().totalVideoFrames)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(media(page)).toHaveAttribute('src', /-landscape-light\.(mp4|webm)$/);
  await playing(page);
  expect(await media(page).evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThanOrEqual(12);
  await expect.poll(() => media(page).evaluate((v: HTMLVideoElement) => v.getVideoPlaybackQuality().totalVideoFrames)).toBeGreaterThan(0);
});

test('leaving the route releases inline media', async ({ page }) => {
  await page.goto('/'); await revealFilm(page);
  const retainedVideo = await media(page).elementHandle();
  await page.getByRole('link', { name: 'Open KRAMA', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await retainedVideo!.evaluate((v: HTMLVideoElement) => ({ paused: v.paused, source: v.getAttribute('src') }))).toEqual({ paused: true, source: null });
});
