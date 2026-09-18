// Probe GA12: «compare_year no añade peticiones» — contar requests de red
// (excl. teselas base) al activar DOS AÑOS y durante la partición.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const BUILD = resolve(process.cwd(), 'build');
const server = await createStaticServer(BUILD, 4182);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const reqs = [];
page.on('request', (r) => reqs.push(r.url()));

await page.goto('http://localhost:4182/?year=1987&place=bilbao', { waitUntil: 'load' });
await page.waitForSelector('.headline-block h1', { timeout: 30000 });
await page.waitForTimeout(4000); // estabilizar: tiles/metrics iniciales

reqs.length = 0;
await page.click('.compare .invite');
await page.fill('#cmp-year', '1960');
await page.click('.cmp-form .go');
await page.waitForSelector('.buckets li', { timeout: 10000 });
await page.waitForTimeout(2500);

const after = reqs.filter(
  (u) => !u.startsWith('data:') && !u.includes('/_app/') && !u.includes('favicon')
);
console.log(JSON.stringify({ total: after.length, urls: after.slice(0, 30) }, null, 2));
await browser.close();
server.close();
