// Dev-mode probe: same flow against vite dev server for named stacks.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => {
  console.log('PAGEERROR:', String(e).slice(0, 300));
  if (e.stack) console.log('STACK:', e.stack.split('\n').slice(0, 30).join('\n'));
});
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 400));
});
try {
  await page.goto(`http://localhost:5199/?year=1987&place=bilbao`, { waitUntil: 'load' });
  await page.waitForSelector('.headline-block h1', { timeout: 40000 });
  await page.waitForSelector('.mapband canvas', { timeout: 40000 });
  await page.click('.invite .start');
  await page.waitForSelector('#addr-street', { timeout: 10000 });
  await page.fill('#addr-street', 'Gran Via');
  await page.waitForTimeout(2500);
  await page.fill('#addr-num', '1');
  await page.waitForTimeout(10000);
  const dump = await page.evaluate(() => {
    const a = window.__mjtApp;
    return {
      identity: a?.addressResult?.identity ?? null,
      idResult: a?.identityResult?.identity ?? null,
      sel: a?.selectedBuilding?.id ?? null
    };
  });
  console.log('STATE:', JSON.stringify(dump));
} catch (e) {
  console.log('ERR:', String(e).slice(0, 400));
}
await browser.close();
