import { expect, test } from '@playwright/test';

test('keeps the immersive shell semantic without a card menu', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('liqier-fake');
  await expect(page.locator('#world-root')).toHaveCount(1);
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.locator('a[href="#content-root"]')).toHaveText('跳到内容');
  await expect(page.locator('[data-ui="card-menu"]')).toHaveCount(0);
});
