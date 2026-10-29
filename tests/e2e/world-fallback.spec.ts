import { expect, test } from '@playwright/test';

test('keeps content usable when WebGL cannot start', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });

  await page.goto('/');

  await expect(page.locator('#world-root')).toHaveAttribute('data-world-state', 'fallback');
  await expect(page.locator('[data-world-poster]')).toBeVisible();
  await expect(page.locator('[data-fallback-destinations] a')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('shows the fallback when a live context is lost', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.goto('/');
  await expect(page.locator('#world-root')).toHaveAttribute('data-world-state', 'ready');

  await page.locator('#world-canvas').dispatchEvent('webglcontextlost');

  await expect(page.locator('#world-root')).toHaveAttribute('data-world-state', 'lost');
  await expect(page.locator('[data-world-poster]')).toBeVisible();
  expect(errors).toEqual([]);
});
