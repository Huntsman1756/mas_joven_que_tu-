import { chromium } from 'playwright';
import fs from 'fs';
import { fileURLToPath } from 'url';
const OUT = fileURLToPath(new URL('../../evidence/g11/shots', import.meta.url));
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
async function shot(name, url, w, h, opts = {}) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(opts.wait ?? 2500);
  if (opts.scroll) await p.evaluate((y) => window.scrollTo(0, y), opts.scroll);
  if (opts.scroll) await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: !!opts.full });
  console.log(name, 'ok');
  await p.close();
}
const BASE = 'http://localhost:4173/';
await shot('hero-desktop', BASE, 1440, 900);
await shot('hero-mobile', BASE, 390, 844, { full: true });
await shot('result-desktop', BASE + '?year=1988&place=getxo', 1440, 900, { wait: 4000 });
await shot('result-mobile', BASE + '?year=1988&place=getxo', 390, 844, { wait: 4000 });
await shot('swipe-desktop', BASE + '?year=1988&place=getxo&view=swipe', 1440, 900, { wait: 7000 });
await shot('photo-desktop', BASE + '?year=1988&place=getxo&view=photo', 1440, 900, { wait: 7000 });
await shot('result-desktop-time', BASE + '?year=1988&place=getxo&view=time', 1440, 900, {
  wait: 4500
});
await b.close();
