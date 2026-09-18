import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';
const BUILD = resolve(process.cwd(), 'build');
const server = await createStaticServer(BUILD, 4196);
const browser = await chromium.launch({ args: ['--disable-gpu'] });
const page = await (await browser.newContext()).newPage();
await installLocalFixtures(page);
await page.goto('http://localhost:4196/?year=1987&place=leioa', { waitUntil: 'commit' });
await page.waitForSelector('.mapband canvas', { timeout: 30000 });
await page.waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 30000 });
await page.evaluate(() => {
  window.__ev = [];
  window.__mjtMap.on('sourcedata', (e) => {
    if (e.sourceId?.includes('ortho')) window.__ev.push(`${e.sourceId}|${e.sourceDataType}|${!!e.coord}|${performance.now().toFixed(0)}`);
  });
  window.__mjtMap.on('error', (e) => window.__ev.push(`ERROR|${JSON.stringify(e.error?.message ?? e).slice(0,120)}`));
});
await page.locator('.ortho .btn').first().click();
await page.waitForTimeout(9000);
console.log(JSON.stringify(await page.evaluate(() => ({
  ev: window.__ev,
  src: !!window.__mjtMap.getSource('ortho-preview'),
  layer: !!window.__mjtMap.getLayer('ortho-preview'),
  url: window.__mjtMap.getSource('ortho-preview')?.url ?? null,
})), null, 1));
await browser.close(); server.close();
