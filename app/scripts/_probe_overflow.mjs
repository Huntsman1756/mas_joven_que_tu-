// Probe: qué elementos desbordan el viewport de 320px en RESULT + addr abierto.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const BUILD = resolve(process.cwd(), 'build');
const server = await createStaticServer(BUILD, 4181);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 320, height: 844 } });
await page.goto('http://localhost:4181/?year=1987&place=bilbao', { waitUntil: 'load' });
await page.waitForSelector('.headline-block h1', { timeout: 30000 });
await page.click('.invite .start');
await page.waitForSelector('#addr-street', { timeout: 10000 });

const over = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.right > 320.5 || r.left < -0.5) {
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className?.baseVal ?? el.className ?? '').toString().slice(0, 60),
        left: Math.round(r.left),
        right: Math.round(r.right),
        w: Math.round(r.width)
      });
    }
  }
  return { scrollW: document.documentElement.scrollWidth, over: out.slice(0, 40) };
});
console.log(JSON.stringify(over, null, 2));
await browser.close();
server.close();
