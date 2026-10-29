import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    __testHidden?: boolean;
  }
}

test('caps the mobile rendering budget', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?diagnostics=1');
  const diagnostics = await page.evaluate(() => window.__LIQIER_DIAGNOSTICS__);
  expect(diagnostics).toBeTruthy();
  expect(diagnostics!.pixelRatio).toBeLessThanOrEqual(1.5);
  expect(diagnostics!.particleCount).toBeLessThanOrEqual(700);
  expect(diagnostics!.tier).not.toBe('high');
});

test('stops rendering while the document is hidden', async ({ page }) => {
  await page.addInitScript(() => {
    window.__testHidden = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__testHidden });
  });
  await page.goto('/?diagnostics=1');
  await page.evaluate(() => {
    window.__testHidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => window.__LIQIER_DIAGNOSTICS__?.paused)).toBe(true);
  const count = await page.evaluate(() => window.__LIQIER_DIAGNOSTICS__!.renderCount);
  await page.waitForTimeout(160);
  expect(await page.evaluate(() => window.__LIQIER_DIAGNOSTICS__!.renderCount)).toBe(count);
});
