import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const baseUrl = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4322/liqier-fake/';
const browser = await chromium.launch({ headless: true });
const consoleErrors = [];

async function inspect(name, viewport) {
  const page = await browser.newPage({ viewport });
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(`${name}: ${message.text()}`); });
  page.on('pageerror', (error) => consoleErrors.push(`${name}: ${error.message}`));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('#world-root').waitFor({ state: 'attached' });
  await page.screenshot({ path: `artifacts/qa-${name}.png`, fullPage: true });
  const state = await page.locator('#world-root').getAttribute('data-world-state');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const dragon = await page.locator('[data-dragon-companion]').textContent();
  if (!['ready', 'fallback'].includes(state ?? '')) throw new Error(`${name}: unexpected world state ${state}`);
  if (overflow > 0) throw new Error(`${name}: horizontal overflow ${overflow}px`);
  if (!dragon?.includes('银龙')) throw new Error(`${name}: companion missing`);
  await page.close();
  return { name, state, overflow };
}

await mkdir('artifacts', { recursive: true });
const results = [
  await inspect('desktop', { width: 1440, height: 900 }),
  await inspect('mobile', { width: 390, height: 844 }),
];
await browser.close();

if (consoleErrors.length) throw new Error(`Browser errors:\n${consoleErrors.join('\n')}`);
console.log(JSON.stringify({ results, consoleErrors }, null, 2));
