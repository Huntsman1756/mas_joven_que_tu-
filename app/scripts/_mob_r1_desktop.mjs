/* MOB-R1 §21 — smoke desktop: composición intacta tras el hardening móvil */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const OUT = join(resolve(process.cwd(), '..'), 'evidence/mobile-physical/mobr1-local');
const server = await createStaticServer('build', 4239);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
const shot = (n) => page.screenshot({ path: join(OUT, `${n}.png`) });
const wait = async () => {
  await page.waitForFunction(() => window.__mjtApp?.headline !== null, null, { timeout: 30000 });
  await page.waitForFunction(() => !!window.__mjtMap?.loaded?.(), null, { timeout: 30000 });
  await page.waitForTimeout(1200);
};

await page.goto(
  'http://localhost:4239/?year=1975&place=getxo&view=time&lat=43.35&lon=-3.01&z=12.2',
  { waitUntil: 'domcontentloaded' }
);
await wait();
await shot('mobr1-desktop-time');
// en desktop la leyenda es la tarjeta superpuesta clásica, no el details móvil
const legendDesktop = await page.locator('div.legend').isVisible();
const legendMobile = await page.locator('details.legend-m').count();

await page.goto('http://localhost:4239/?year=1975&place=getxo&view=swipe&ortho=2017&ortho2=1956', {
  waitUntil: 'domcontentloaded'
});
await wait();
await shot('mobr1-desktop-swipe');
// en desktop el panel de campañas es la tarjeta .swipectl, no el chip
const desktopPanel = await page.locator('.swipectl .sw-picks').isVisible();
const mobileChip = await page.locator('.sw-compact').isVisible();
console.log(JSON.stringify({ desktopPanel, mobileChip, legendDesktop, legendMobile, errors }));
await browser.close();
server.close();
process.exit(
  desktopPanel && !mobileChip && legendDesktop && !legendMobile && !errors.length ? 0 : 1
);
