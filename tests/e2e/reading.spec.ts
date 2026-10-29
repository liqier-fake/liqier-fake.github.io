import { expect, test } from '@playwright/test';

test('renders selectable Markdown inside the world', async ({ page }) => {
  await page.goto('/articles/after-the-long-night/');
  await expect(page.locator('[data-reading-state="visible"]')).toBeVisible();
  await expect(page.locator('#world-root')).toHaveAttribute('data-world-view', 'reading');
  await expect(page.locator('.reading-body p').first()).toContainText('夜晚最深的时候');
  await expect(page.locator('[data-pretext-title]')).toHaveAttribute('data-text-state', 'settled');
  expect(await page.locator('.reading-body p').first().evaluate((node) => getComputedStyle(node).userSelect)).not.toBe('none');
});

test('reduced motion and WebGL fallback keep the article readable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
  await page.goto('/thoughts/first-light/');
  await expect(page.locator('[data-pretext-title]')).toHaveAttribute('data-text-state', 'settled');
  await expect(page.locator('article')).toContainText('雨停以后');
  await expect(page.locator('#world-root')).toHaveAttribute('data-world-state', 'fallback');
});

test('returns to the remembered hub position', async ({ page }) => {
  await page.goto('/');
  const range = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await page.evaluate((value) => scrollTo(0, value * 0.84), range);
  const essay = page.locator('[data-entrance-id="essay-pavilion:after-the-long-night"]');
  await essay.click();
  await essay.press('Enter');
  await expect(page).toHaveURL(/\/articles\/after-the-long-night\/?$/);
  await page.locator('[data-return-to-hub]').click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(range * 0.75);
});
