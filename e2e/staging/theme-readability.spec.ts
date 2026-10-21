import { test, expect } from '../live/fixtures';
import type { Locator } from '@playwright/test';

async function contrast(scope: Locator) {
  return scope.evaluate(element => {
    const styles = getComputedStyle(element);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    const luminance = (token: string) => {
      const color = styles.getPropertyValue(token).trim();
      if (!CSS.supports('color', color)) throw new Error(`Missing color token ${token}`);
      context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1);
      const rgba = context.getImageData(0, 0, 1, 1).data;
      if (rgba[3] !== 255) throw new Error(`Contrast pair requires a solid color: ${token}`);
      const rgb = [...rgba].slice(0, 3).map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; });
      return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    };
    const rows: { text: string; background: string; ratio: number }[] = [];
    const add = (text: string, background: string) => { const a = luminance(text), b = luminance(background); rows.push({ text, background, ratio: (Math.max(a,b) + .05) / (Math.min(a,b) + .05) }); };
    for (const text of ['--text-primary','--text-secondary','--text-muted']) for (const background of ['--bg-base','--bg-subtle','--surface-1','--surface-2','--surface-3']) add(text, background);
    for (const background of ['--accent','--accent-hover']) add('--text-on-accent',background);
    return rows;
  });
}

for (const theme of ['light','dark']) test(`${theme} theme text palette meets normal-text contrast on solid surfaces`, async ({ page, account }) => {
  await page.addInitScript(value => localStorage.setItem('krama-theme',value),theme);
  await account.signIn(page);
  if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);
  const workspace = await contrast(page.locator('html'));
  await page.goto('/'); await expect(page.locator('.krama-landing')).toBeVisible();
  const landing = await contrast(page.locator('.krama-landing'));
  for (const [name, rows] of [['workspace',workspace],['landing',landing]] as const) {
    await test.info().attach(`${name}-${theme}-contrast`, { body: JSON.stringify(rows,null,2), contentType: 'application/json' });
    for (const row of rows) expect(row.ratio, `${name} ${row.text} on ${row.background}`).toBeGreaterThanOrEqual(4.5);
  }
});
