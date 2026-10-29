import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const path of ['/', '/articles/after-the-long-night/']) {
  test(`has no serious accessibility violations at ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  });
}

test('site map exposes every content kind without WebGL', async ({ page }) => {
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
  await page.goto('/sitemap/');
  const nav = page.locator('[data-site-map]');
  await expect(nav.getByRole('link', { name: /感悟/ })).toBeVisible();
  await expect(nav.getByRole('link', { name: /文章/ })).toBeVisible();
  await expect(nav.getByRole('link', { name: /照片/ })).toBeVisible();
  await expect(nav.getByRole('link', { name: /收藏/ })).toBeVisible();
});

test('reduced motion selects fixed world views on mobile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/?diagnostics=1');
  await expect(page.locator('#world-root')).toHaveAttribute('data-motion', 'reduced');
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.__LIQIER_DIAGNOSTICS__?.cameraT)).toBe(0.86);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
