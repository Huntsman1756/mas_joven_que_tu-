/**
 * Volcado del árbol de accesibilidad (Playwright ariaSnapshot) para los
 * estados del recorrido NVDA. Alimenta la columna «esperado» de
 * evidence/g5/nvda/CASES.md — nombres/roles/estados observados en el
 * build congelado, no supuestos.
 *
 * Uso: node scripts/g5_a11y_dump.mjs
 * Salida: evidence/g5/nvda/a11y-tree/<estado>.yml + index.json
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const ROOT = resolve(process.cwd(), '..');
const OUT = join(ROOT, 'evidence/g5/nvda/a11y-tree');
const PORT = 4197;
const BASE = `http://localhost:${PORT}`;

const server = await createStaticServer(resolve('build'), PORT);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await installLocalFixtures(page);

const index = {};
async function dump(name) {
  const snap = await page.locator('body').ariaSnapshot();
  await writeFile(join(OUT, `${name}.yml`), snap);
  index[name] = {
    title: await page.title(),
    h1: await page
      .locator('h1')
      .first()
      .innerText()
      .catch(() => null)
  };
  console.log(`${name}: ${snap.split('\n').length} líneas`);
}

const ready = () => page.waitForSelector('.headline-block h1', { timeout: 30000 }).catch(() => {});

await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
await dump('01-home');

await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
await ready();
await dump('02-result');

await page
  .locator('.viewswitch .v', { hasText: 'tiempo' })
  .click()
  .catch(() => {});
await page.waitForSelector('.timeband', { timeout: 15000 }).catch(() => {});
await dump('03-time');

await page
  .locator('.viewswitch .v', { hasText: 'fotos' })
  .click()
  .catch(() => {});
await page.waitForSelector('.photo', { timeout: 15000 }).catch(() => {});
await dump('04-photo');

await page
  .locator('.viewswitch .v', { hasText: '1923' })
  .click()
  .catch(() => {});
await page
  .waitForFunction(() => window.__mjtApp?.histMapState !== 'UNKNOWN', { timeout: 30000 })
  .catch(() => {});
await dump('05-hist');

await page
  .locator('.viewswitch .v', { hasText: 'mapa' })
  .click()
  .catch(() => {});
await page.waitForTimeout(500);

// below-fold: el scroll al boundary monta el chunk lazy
await page.evaluate(() => document.querySelector('.below')?.scrollIntoView({ block: 'end' }));
await page.waitForSelector('.stories .item', { timeout: 15000 }).catch(() => {});
await dump('06-below-fold');

// flujo dirección: invitación → campo de calle
await page
  .locator('.invite .start')
  .first()
  .click()
  .catch(() => {});
await page.waitForSelector('#addr-street', { timeout: 10000 }).catch(() => {});
await dump('07-addr');

// historia: primer item → capítulo
await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
await ready();
await page.evaluate(() => document.querySelector('.below')?.scrollIntoView({ block: 'end' }));
await page.waitForSelector('.stories .item', { timeout: 15000 }).catch(() => {});
await page
  .locator('.stories .item')
  .first()
  .click()
  .catch(() => {});
await page.waitForSelector('.chapter', { timeout: 40000 }).catch(() => {});
await dump('08-story');

await writeFile(join(OUT, 'index.json'), JSON.stringify(index, null, 2));
console.log(JSON.stringify(index, null, 2));
await browser.close();
server.close();
