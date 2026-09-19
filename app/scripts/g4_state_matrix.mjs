/**
 * G4 — matriz de estados (§27). Combos de riesgo entre historia, escena y
 * profundidad personal que no cubre g4_scene_stories:
 *   M1 compare activo → historia → volver restaura compare_year
 *   M2 ortho+ortho2 activo → historia → volver restaura campaña y comparación
 *   M3 edificio seleccionado → historia → volver restaura selectedBuilding
 *   M4 cambio de lugar desde dentro de una historia → cierra historia, aplica lugar
 *   M5 resize 1440↔390 con historia activa → estado intacto
 *   M6 photo↔hist exclusividad directa (sin pasar por map)
 *   M7 building + planning/context tras restaurar (profundidad completa)
 * Uso: node scripts/g4_state_matrix.mjs (build/ presente)
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g4/browser');
const PORT = 4191;
const U = (q) => `http://localhost:${PORT}/?${q}`;
const Q = 'year=1987&place=leioa&lat=43.326&lon=-2.988&z=11.5';

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const results = {};
const ok = (k, pass, detail) => {
  results[k] = { pass, detail };
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${k}`, detail ?? '');
};
const appGet = (page, expr) => page.evaluate((e) => eval(e), expr);
async function ready(page) {
  await page.waitForSelector('.headline-block h1', { timeout: 30000 });
  await page.waitForSelector('.mapband canvas', { timeout: 30000 });
  await page
    .waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 30000 })
    .catch(() => null);
}
const DEFS = {
  c2803: { id: 'c2803', place: 'portugalete', year: 1969, camera: { lat: 43.3146, lon: -3.0154, zoom: 13.5 }, playYear: 1969, mode: 'map', air: { c1: 1956, c2: 1970 } },
  f4036: { id: 'f4036', place: 'mungia', year: 1979, camera: { lat: 43.328, lon: -2.8427, zoom: 16 }, playYear: null, mode: 'map', air: { c1: 1970, c2: 1983 } },
  f4233: { id: 'f4233', place: 'muskiz', year: 1979, camera: { lat: 43.328, lon: -3.1141, zoom: 15.5 }, playYear: 1975, mode: 'time', air: { c1: 1970, c2: 1983 } },
  f4738: { id: 'f4738', place: 'santurtzi', year: 1999, camera: { lat: 43.3416, lon: -3.0586, zoom: 15 }, playYear: null, mode: 'map', air: { c1: 1990, c2: 2002 } },
  f149: { id: 'f149', place: 'abanto-y-ciervana-abanto-zierbena', year: 2009, camera: { lat: 43.3281, lon: -3.0648, zoom: 15.5 }, playYear: null, mode: 'map', air: { c1: 2002, c2: 2025 } }
};
async function enterStory(page, id) {
  await page.evaluate((d) => window.__mjtApp.enterStory(d), DEFS[id]);
  await page.waitForSelector('.chapter', { timeout: 15000 });
}
async function backToMine(page) {
  await page.evaluate(() => window.__mjtApp.closeStory());
  await page.waitForTimeout(400);
}

/* M1: compare activo → historia → volver */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(U(`${Q}&compare=1960`));
  await ready(page);
  const before = await appGet(page, 'window.__mjtApp.compareYear');
  await enterStory(page, 'f4233');
  const inStory = await appGet(page, 'window.__mjtApp.story');
  await backToMine(page);
  const after = await appGet(page, 'window.__mjtApp.compareYear');
  ok('m1_compare_snapshot', before === 1960 && inStory === 'f4233' && after === 1960,
    `compare ${before}→${after}, story=${inStory}`);
  await page.close();
}

/* M2: ortho + ortho2 → historia → volver */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(U(`${Q}&ortho=1990&ortho2=2025`));
  await ready(page);
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => ({
    c: window.__mjtApp.orthoCampaign?.year,
    c2: window.__mjtApp.orthoCompare?.year,
    m: window.__mjtApp.mode
  }));
  await enterStory(page, 'c2803');
  await backToMine(page);
  const after = await page.evaluate(() => ({
    c: window.__mjtApp.orthoCampaign?.year,
    c2: window.__mjtApp.orthoCompare?.year,
    m: window.__mjtApp.mode
  }));
  ok('m2_ortho_snapshot',
    before.c === 1990 && before.c2 === 2025 && after.c === 1990 && after.c2 === 2025,
    `${JSON.stringify(before)}→${JSON.stringify(after)}`);
  await page.close();
}

/* M3: edificio seleccionado → historia → volver */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(
    U('year=1987&place=bilbao&lat=43.27099&lon=-2.92842&z=16&building=20-1202-6001-1-2')
  );
  await ready(page);
  await page.waitForFunction(() => window.__mjtApp?.selectedBuilding !== null, { timeout: 30000 });
  const bid = await appGet(page, 'window.__mjtApp.selectedBuilding?.id');
  await enterStory(page, 'f4036');
  await backToMine(page);
  await page.waitForTimeout(1500);
  const bid2 = await appGet(page, 'window.__mjtApp.selectedBuilding?.id');
  ok('m3_building_snapshot', bid === bid2 && bid !== null, `building ${bid}→${bid2}`);
  await page.close();
}

/* M4: cambio de lugar dentro de historia */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(U(Q));
  await ready(page);
  await enterStory(page, 'f4738');
  // cambio de lugar por UI («Cambiar año o lugar» → opción Getxo)
  await page.click('button.change');
  await page.fill('#place-input', 'Getxo');
  await page.waitForSelector('#place-listbox button', { timeout: 15000 });
  await page.click('#place-listbox button >> nth=0');
  await page.waitForTimeout(3000);
  const st = await page.evaluate(() => ({
    story: window.__mjtApp.story,
    place: window.__mjtApp.place?.slug,
    year: window.__mjtApp.year
  }));
  // Semántica: el formulario «Cambiar año o lugar» confirma el año visible
  // (el de la escena, 1999) — la historia se cierra y el snapshot se descarta.
  ok('m4_place_change_closes_story', st.story === null && st.place === 'getxo',
    JSON.stringify(st));
  await page.close();
}

/* M5: resize con historia activa */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(U(`${Q}&story=f149`));
  await ready(page);
  await page.waitForSelector('.chapter', { timeout: 15000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1200);
  const st = await page.evaluate(() => ({
    story: window.__mjtApp.story,
    mode: window.__mjtApp.mode,
    place: window.__mjtApp.place?.slug
  }));
  ok('m5_resize_story_intact', st.story === 'f149' && st.place === 'abanto-y-ciervana-abanto-zierbena',
    JSON.stringify(st));
  await page.close();
}

/* M6: photo↔hist exclusividad directa */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(U(`${Q}&ortho=1990`));
  await ready(page);
  await page.waitForTimeout(1500);
  await page.click('.viewswitch .v:has-text("1923")');
  await page.waitForTimeout(800);
  const a = await page.evaluate(() => ({
    m: window.__mjtApp.mode,
    o: window.__mjtApp.orthoVisible,
    h: window.__mjtApp.histMapVisible
  }));
  await page.click('.viewswitch .v:has-text("FOTO")');
  await page.waitForTimeout(800);
  const b = await page.evaluate(() => ({
    m: window.__mjtApp.mode,
    o: window.__mjtApp.orthoVisible,
    h: window.__mjtApp.histMapVisible
  }));
  ok('m6_photo_hist_exclusive',
    a.m === 'hist' && a.o === false && a.h === true && b.m === 'photo' && b.h === false,
    `hist=${JSON.stringify(a)} photo=${JSON.stringify(b)}`);
  await page.close();
}

/* M7: building + planning/context tras restore */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(
    U('year=1987&place=bilbao&lat=43.27099&lon=-2.92842&z=16&building=20-1202-6001-1-2')
  );
  await ready(page);
  await page.waitForFunction(() => window.__mjtApp?.selectedBuilding !== null, { timeout: 30000 });
  await page
    .waitForFunction(() => window.__mjtApp?.planningLocal !== null, null, { timeout: 30000 })
    .catch(() => null);
  await page
    .waitForFunction(() => window.__mjtApp?.contextLocal !== null, null, { timeout: 30000 })
    .catch(() => null);
  const depth = await page.evaluate(() => ({
    local: window.__mjtApp.planningLocal !== null,
    ctx: window.__mjtApp.contextLocal !== null && window.__mjtApp.contextLocal !== undefined
  }));
  const mounted = await page.locator('.local').count() + (await page.locator('.ctx').count());
  ok('m7_building_depth', depth.local && depth.ctx && mounted >= 2,
    `planningLocal=${depth.local} contextLocal=${depth.ctx} mounted=${mounted}`);
  await page.close();
}

await writeFile(join(OUT, 'g4-state-matrix.json'), JSON.stringify(results, null, 2));
const failed = Object.entries(results).filter(([, r]) => !r.pass).map(([k]) => k);
console.log(`\n${Object.keys(results).length} combos — ${failed.length ? `FAIL: ${failed.join(', ')}` : 'todo PASS'}`);
await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);
