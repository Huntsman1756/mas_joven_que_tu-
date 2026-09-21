/* G10-O — review visual a 7 anchos sobre el build G10.
 * Capturas: home, hero díptico, resultado, histograma, mapa, leyenda play.
 * Uso: node scripts/g10_visual.mjs  (cwd = app/ con build/ presente) */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g10/visual');
const PORT = 4211;
const BASE = `http://localhost:${PORT}`;
const U = (q) => `${BASE}/?${q}`;
const WIDTHS = [320, 360, 390, 768, 1024, 1440, 1920];

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const notes = [];

for (const w of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  page.on('pageerror', (e) => notes.push(`w${w} PAGEERROR ${e.message}`));

  // home + hero díptico
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page
    .waitForSelector('.diptych', { timeout: 20000 })
    .catch(() => notes.push(`w${w} no diptych`));
  await page.screenshot({ path: join(OUT, `home-${w}.png`) });

  // resultado Bilbao 1952: titular + scope + facts
  await page.goto(U('year=1952&place=bilbao&lat=43.263&lon=-2.935&z=13'), {
    waitUntil: 'networkidle'
  });
  await page.waitForSelector('.headline-block h1.lead', { timeout: 30000 });
  await page.screenshot({ path: join(OUT, `bilbao-result-${w}.png`) });

  // histograma (lazy, BelowFold)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page
    .waitForSelector('.dist svg', { timeout: 30000 })
    .catch(() => notes.push(`w${w} no dist`));
  await page
    .locator('.dist')
    .scrollIntoViewIfNeeded()
    .catch(() => null);
  await page
    .locator('.dist')
    .screenshot({ path: join(OUT, `bilbao-dist-${w}.png`) })
    .catch(() => null);

  // mapa con leyenda
  const legend = page.locator('.legend');
  if (await legend.count()) {
    await legend.screenshot({ path: join(OUT, `bilbao-legend-${w}.png`) }).catch(() => null);
  }

  // overflow horizontal
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  if (scrollW > w + 1) notes.push(`w${w} OVERFLOW scrollWidth=${scrollW}`);

  await page.close();
}

// caso extremo: municipio pequeño + año reciente a 320
const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
await page.goto(U('year=1987&place=arakaldo&lat=42.94&lon=-2.5&z=13'), {
  waitUntil: 'networkidle'
});
await page.waitForSelector('.headline-block h1.lead', { timeout: 30000 });
await page.screenshot({ path: join(OUT, 'arakaldo-320.png') });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForSelector('.dist svg', { timeout: 30000 }).catch(() => null);
await page
  .locator('.dist')
  .screenshot({ path: join(OUT, 'arakaldo-dist-320.png') })
  .catch(() => null);
await page.close();

await browser.close();
server.close();
console.log(`shots → ${OUT}`);
for (const n of notes) console.log('  note:', n);
