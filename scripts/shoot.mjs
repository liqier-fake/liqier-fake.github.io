// Visual QA: node scripts/shoot.mjs <url> <outPrefix> <fractions> [width] [height]
// Scrolls to each fraction of the page, lets the camera settle, and saves a screenshot.
import { chromium } from '@playwright/test';
const [url, prefix, fractions = '0', width = '1600', height = '900'] = process.argv.slice(2);
const browser = await chromium.launch({ headless: false, args: ['--use-angle=d3d11', '--window-position=-2400,0'] });
const page = await browser.newPage({ viewport: { width: +width, height: +height } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
for (const f of fractions.split(',')) {
  await page.evaluate((v) => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * v, behavior: 'instant' }), +f);
  await page.waitForTimeout(Number(process.env.SHOOT_WAIT ?? 3200));
  await page.screenshot({ path: `${prefix}-${f}.png` });
}
console.log(JSON.stringify({ errors: errors.slice(0, 8), state: await page.evaluate(() => document.querySelector('#world-root')?.dataset.worldState) }));
await browser.close();
