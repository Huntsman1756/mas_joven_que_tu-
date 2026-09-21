/**
 * G1-R — evidencia de los fixes de estado (I-3 place-change, I-5 effect_update_depth_exceeded).
 * Journey: deep-link RESULT → cambiar lugar → headline del nuevo municipio sin salir de RESULT.
 * Se ejecuta con y sin reduced-motion (el ciclo reactivo solo aparecía con duration:0).
 * Uso: node scripts/g1r_state_journey.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g1-remediation/state');
const PORT = 4181;
const BASE = `http://localhost:${PORT}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

let browser;
for (const channel of ['chrome', 'msedge']) {
  try {
    browser = await chromium.launch({ channel, args: ['--disable-gpu'] });
    break;
  } catch {
    /* next */
  }
}
browser ??= await chromium.launch({ args: ['--disable-gpu'] });

const results = {};
for (const reduced of [true, false]) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: reduced ? 'reduce' : 'no-preference'
  });
  const page = await ctx.newPage();
  await installLocalFixtures(page); // NORA → fixture local (VR4)
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
  await page.waitForSelector('.headline-block h1', { timeout: 25000 });
  await page.waitForSelector('.mapband canvas', { timeout: 30000 });

  // cambio de lugar desde RESULT: el formulario no debe desmontarse
  await page.click('.topbar .change');
  await page.waitForSelector('.changeform', { timeout: 10000 });
  await page.fill('.changeform #place-input', 'Bilbao');
  await page.waitForSelector('.changeform #place-listbox button', { timeout: 20000 });
  await page.click('.changeform #place-listbox button >> nth=0');

  const formSurvived = await page
    .waitForFunction(() => !!document.querySelector('.changeform'), null, { timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  await page
    .waitForFunction(
      () => document.querySelector('.headline-block h1')?.textContent?.includes('Bilbao'),
      null,
      { timeout: 25000 }
    )
    .catch(() => null);

  const state = await page.evaluate(() => ({
    headline: document.querySelector('.headline-block h1')?.textContent ?? null,
    changeform: !!document.querySelector('.changeform'),
    hero: !!document.querySelector('button.cta'),
    url: location.search,
    mapCanvas: !!document.querySelector('.mapband canvas')
  }));
  await page.screenshot({ path: join(OUT, `place_change_reduced-${reduced}.png`), fullPage: true });

  results[`reducedMotion=${reduced}`] = { formSurvived, state, pageErrors };
  await ctx.close();
}

await writeFile(join(OUT, 'state-journey.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
await browser.close();
server.close();
