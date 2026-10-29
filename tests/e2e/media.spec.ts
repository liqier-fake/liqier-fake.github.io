import { expect, test } from '@playwright/test';

test('photography forms a lazy, keyboard-traversable sequence', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/photography/moonlit-water/');
  const image = page.locator('[data-photo-sequence] img').first();
  await expect(image).toHaveAttribute('loading', 'lazy');
  await expect(image).toHaveAttribute('srcset', /768w/);
  const plane = page.locator('[data-photo-plane]').first();
  await plane.focus();
  await expect(plane).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(plane).toHaveAttribute('data-media-state', 'focused');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('every collected image exposes creator, rights, and source', async ({ page }) => {
  await page.goto('/collection/borrowed-light/');
  const figure = page.locator('[data-collected-image]');
  await expect(figure).toBeVisible();
  await expect(figure.locator('[data-image-creator]')).not.toBeEmpty();
  await expect(figure.locator('[data-image-rights]')).not.toBeEmpty();
  await expect(figure.locator('a[rel="external"]')).toHaveAttribute('href', /^https:\/\//);
});
