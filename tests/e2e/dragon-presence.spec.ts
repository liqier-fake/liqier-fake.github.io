import { expect, test } from '@playwright/test';

test('the moon whale remains a named companion through the journey', async ({ page }) => {
  await page.goto('/');
  const companion = page.locator('[data-dragon-companion]');
  await expect(companion).toHaveCount(1);
  await expect(companion).toContainText('月鲸');
  await expect(companion).toHaveAttribute('data-dragon-mode', 'lead');

  await page.evaluate(() => {
    const range = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, range * 0.55);
  });
  await expect(companion).toHaveAttribute('data-dragon-mode', 'idle');

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(companion).toHaveAttribute('data-dragon-mode', 'indicate');
});

test('the companion remains described when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto('/');
  await expect(page.locator('[data-dragon-companion]')).toBeVisible();
  await expect(page.locator('[data-dragon-companion]')).toContainText('月鲸');
});
