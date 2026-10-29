import { expect, test } from '@playwright/test';

test('world-native entrances focus before confirmation', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('[data-menu-overlay]').count()).toBe(0);
  const entrances = page.locator('[data-world-entrance]');
  await expect(entrances).toHaveCount(5);

  const sizes = await entrances.evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }));
  expect(sizes.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const essay = page.locator('[data-entrance-id="essay-pavilion:after-the-long-night"]');
  await essay.click();
  await expect(essay).toHaveAttribute('data-entrance-state', 'focused');
  await essay.press('Enter');
  await expect(page).toHaveURL(/\/articles\/after-the-long-night\/?$/);
});

test('Escape cancels a focused entrance', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const thought = page.locator('[data-entrance-id="paper-slip:first-light"]');
  await thought.click();
  await expect(thought).toHaveAttribute('data-entrance-state', 'focused');
  await page.keyboard.press('Escape');
  await expect(thought).toHaveAttribute('data-entrance-state', 'near');
});
