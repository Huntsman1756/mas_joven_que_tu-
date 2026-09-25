/**
 * G19-R4 CIERRE — las cuatro capturas del gate final, misma cámara.
 *
 * Escenario: Bilbao, año personal 1922, cámara edificio
 *   lat=43.2625 lon=-2.9280 z=14.3
 *
 *   1. c-map-1922.png    — Por antigüedad: clasificación rojo/azul vs 1922
 *   2. c-time-1922.png   — Evolución: solo lo constatado hasta 1922
 *   3. c-time-1945.png   — Evolución: acumulado hasta 1945 (clase única)
 *   4. c-photo-1965.png  — Fotos: ortofoto 1965 con estado raster resuelto
 *      (CONTENT/EMPTY/ERROR declarado en matrix-c.json; nunca blank mudo)
 *
 * Sin stubs: servicios reales. Uso: node scripts/_g19r4b_shots.mjs
 * (cwd = app/ con build/ presente)
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g19r4');
const PORT = 4240;
const BASE = `http://localhost:${PORT}`;
const CAM = 'lat=43.2625&lon=-2.9280&z=14.3';
const YEAR = 1922;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });
const errors = [];
const matrix = {};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));

const shot = (n) => page.screenshot({ path: join(OUT, `${n}.png`) });
const contract = () =>
  page.evaluate(() => {
    const a = window.__mjtApp;
    const m = window.__mjtMap;
    const vis = (id) =>
      !!m?.getLayer(id) && m.getLayoutProperty(id, 'visibility') !== 'none';
    return {
      mode: a.mode,
      urlView: new URL(location.href).searchParams.get('view'),
      urlPlay: new URL(location.href).searchParams.get('play'),
      playYear: a.playYear,
      player: !!document.querySelector('.tc-bar'),
      playerMode: document.querySelector('.tc-bar')?.dataset.playerMode ?? null,
      ortho: !!m?.getLayer('ortho'),
      orthoState: a.orthoState,
      orthoRender: a.orthoRender,
      cellsVisible: vis('cells-fill'),
      legend: (document.querySelector('.legend')?.textContent ?? '')
        .replace(/\s+/g, ' ')
        .slice(0, 200)
    };
  });

async function setMode(m) {
  await page.locator(`.viewswitch [data-mode="${m}"]`).click();
  await page.waitForFunction((mm) => window.__mjtApp?.mode === mm, m, { timeout: 15000 });
  await page.waitForTimeout(400);
}

async function scrubTo(year) {
  await page.evaluate((y) => {
    const s = document.querySelector('.timeband .tc-scrub');
    s.value = String(y);
    s.dispatchEvent(new Event('input', { bubbles: true }));
    s.dispatchEvent(new Event('change', { bubbles: true }));
  }, year);
  await page.waitForFunction((y) => window.__mjtApp?.playYear === y, year, { timeout: 10000 });
  await page.waitForTimeout(800);
}

async function activatePhoto(year) {
  const frac = await page
    .locator(`.photo .epoch[data-year="${year}"]`)
    .evaluate((el) => parseFloat(el.style.left) / 100);
  const box = await page.locator('.photo .tc-scrub').boundingBox();
  await page
    .locator('.photo .tc-scrub')
    .click({ position: { x: Math.min(frac * box.width, box.width - 2), y: box.height / 2 } });
  await page.waitForFunction(
    () =>
      window.__mjtApp?.orthoCampaign?.year &&
      ['AVAILABLE', 'NOT_COVERED', 'SERVICE_ERROR'].includes(window.__mjtApp.orthoState),
    null,
    { timeout: 30000 }
  );
  // readiness real: el raster debe llegar a un estado terminal declarado
  await page
    .waitForFunction(
      () => {
        const a = window.__mjtApp;
        if (!a) return false;
        if (a.orthoState === 'AVAILABLE')
          return a.orthoRender !== 'LOADING' && a.orthoRender !== 'IDLE';
        return a.orthoRender === 'IDLE';
      },
      null,
      { timeout: 45000 }
    )
    .catch(() => errors.push(`orthoRender no resolvió para ${year}`));
  await page.waitForTimeout(500);
}

await page.goto(`${BASE}/?year=${YEAR}&place=bilbao&${CAM}`);
await page.waitForFunction(() => window.__mjtApp?.headline !== null, { timeout: 30000 });
await page.waitForFunction(() => !!window.__mjtMap?.loaded?.(), null, { timeout: 30000 });
await page.waitForTimeout(1200);

// 1. Por antigüedad / 1922 — binaria: todos visibles, clasificados vs 1922
await setMode('map');
matrix['c-map-1922'] = await contract();
await shot('c-map-1922');

// 2. Evolución / 1922 — solo constatados hasta 1922 (cabezal = año del usuario)
await setMode('time');
await page.waitForSelector('.timeband .tc-bar', { timeout: 15000 });
await scrubTo(1922);
matrix['c-time-1922'] = await contract();
await shot('c-time-1922');

// 3. Evolución / 1945 — acumulado; la clase visual es única (no re-codifica vs 1922)
await scrubTo(1945);
matrix['c-time-1945'] = await contract();
await shot('c-time-1945');

// 4. Fotos aéreas / 1965 — raster con estado resuelto (nunca blank mudo)
await setMode('photo');
await page.waitForSelector('.photo .tc-bar', { timeout: 15000 });
await activatePhoto(1965);
matrix['c-photo-1965'] = await contract();
await shot('c-photo-1965');

await writeFile(join(OUT, 'matrix-c.json'), JSON.stringify(matrix, null, 2) + '\n');
console.log(JSON.stringify(matrix, null, 1));
if (errors.length) console.log('ERRORS:', errors);
await browser.close();
server.close();
