import { expect, test } from '@playwright/test';
test.setTimeout(60_000);

test('travels from arrival through reading, images, attribution, and the map', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-dragon-companion]')).toContainText('月鲸');
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));

  const essay = page.locator('[data-entrance-id="essay-pavilion:after-the-long-night"]');
  await expect(essay).toHaveAttribute('data-entrance-state', 'near'); // smooth scroll has arrived
  await essay.click();
  await essay.press('Enter');
  await expect(page.locator('.reading-body')).toContainText('夜晚最深的时候');
  await page.locator('[data-return-to-hub]').click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);

  const photography = page.locator('[data-entrance-id="image-corridor:moonlit-water"]');
  await photography.click();
  await photography.press('Enter');
  await expect(page.locator('[data-photo-sequence]')).toBeVisible();
  await page.goto('/collection/borrowed-light/');
  await expect(page.locator('[data-image-rights]')).toBeVisible();
  await page.locator('.site-map-link').click();
  await expect(page.locator('[data-site-map]')).toBeVisible();
});

test('keeps the core journey usable in reduced-motion mobile mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#world-root')).toHaveAttribute('data-motion', 'reduced');
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const about = page.locator('[data-entrance-id="central-platform:about"]');
  await about.click();
  await about.press('Enter');
  await expect(page.locator('#about')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
