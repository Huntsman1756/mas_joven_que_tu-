/**
 * G1 — medición de presupuestos PERF1..PERF11 según G1-PERFORMANCE-BUDGETS.md.
 * P1: desktop local, sin throttling, caché fría. P2: 390×844 DSF3, CPU×4, Slow4G (CDP).
 * 20 reps en métricas de percentil · 5 en transferencia/heap. Emite p75/p95/max.
 * static-server.mjs sirve br/gzip (post G1-R): las transferencias reflejan
 * compresión real. Salida: `PERF_OUT` o evidence/g1/08-adjudication.
 * Uso: node scripts/g1_gate_perf.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = process.env.PERF_OUT || join(ROOT, 'evidence/g1/08-adjudication');
const PORT = 4178;
const BASE = `http://localhost:${PORT}`;
const REPS_PCT = 20, REPS_SINGLE = 5;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

async function pickBrowser() {
  for (const channel of ['chrome', 'msedge']) {
    try { return await chromium.launch({ channel, args: ['--disable-gpu'] }); } catch { /* next */ }
  }
  return await chromium.launch({ args: ['--disable-gpu'] });
}
const browser = await pickBrowser();

const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); const i = Math.ceil((p / 100) * s.length) - 1; return s[Math.max(0, i)]; };
const stats = (arr) => arr.length ? { n: arr.length, p75: Math.round(pct(arr, 75)), p95: Math.round(pct(arr, 95)), max: Math.round(Math.max(...arr)) } : null;

async function newPage(profile) {
  const ctx = await browser.newContext(profile === 'P2'
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await installLocalFixtures(page); // NORA → fixture local (VR4)
  if (profile === 'P2') {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
    });
  }
  return { ctx, page };
}

// recursos first-party con encodedBodySize
async function fpTransfer(page) {
  return page.evaluate(() => {
    const host = location.host;
    let sum = 0;
    for (const r of performance.getEntriesByType('resource')) {
      try { if (new URL(r.name).host === host) sum += r.encodedBodySize || 0; } catch { /* skip */ }
    }
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) sum += nav.encodedBodySize || 0;
    return sum;
  });
}

async function tHeroInteractive(page) {
  const t0 = Date.now();
  await page.goto(`${BASE}/`, { waitUntil: 'commit' });
  await page.waitForSelector('#year-input:not([disabled])', { timeout: 20000 });
  return Date.now() - t0;
}

async function tResultReady(page, buildings) {
  const url = `${BASE}/?year=1987&place=leioa` + (buildings ? '&lat=43.326&lon=-2.988&z=14.6' : '');
  await page.goto(url, { waitUntil: 'commit' });
  const t0 = Date.now();
  await page.waitForSelector('.headline-block h1', { timeout: 25000 });
  await page.waitForSelector('.lead2', { timeout: 25000 });
  await page.waitForSelector('.mapband canvas', { timeout: 30000 });
  await page.waitForFunction((bld) => {
    const m = window.__mjtMap;
    if (!m || !m.areTilesLoaded?.()) return false;
    const rf = m.queryRenderedFeatures();
    return bld ? rf.some((f) => f.source?.startsWith('b-')) : rf.some((f) => f.source === 'cells');
  }, buildings, { timeout: 30000 });
  return Date.now() - t0;
}

async function ensureChangeOpen(page) {
  if (!(await page.$('.changeform'))) await page.click('.topbar .change');
  await page.waitForSelector('.changeform', { timeout: 10000 });
}

async function tYearChange(page) {
  await ensureChangeOpen(page);
  // camino real: escribir año nuevo y enviar → medir hasta repintado + headline estable
  const t0 = Date.now();
  await page.fill('.changeform input', '1990');
  await page.click('.changeform button[type=submit]');
  await page.waitForFunction(() => document.querySelector('.legend-title')?.textContent.includes('1990'), null, { timeout: 15000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return Date.now() - t0;
}

async function tPlaceChange(page) {
  await ensureChangeOpen(page);
  await page.fill('.changeform #place-input', 'Bilbao');
  await page.waitForSelector('.changeform #place-listbox button', { timeout: 20000 });
  const t0 = Date.now();
  await page.click('.changeform #place-listbox button >> nth=0');
  // DEFECTO OBSERVADO: selectPlace() pone metrics=null → phase='intro' → el
  // formulario se desmonta antes de poder enviar. Medimos hasta que la UI
  // vuelve a un estado usable (hero con CTA habilitado).
  const completed = await page
    .waitForSelector('.changeform button[type=submit]', { timeout: 4000 })
    .then(async () => {
      await page.click('.changeform button[type=submit]');
      await page.waitForFunction(
        () => document.querySelector('.headline-block h1')?.textContent.includes('Bilbao'),
        null,
        { timeout: 25000 }
      );
      return true;
    })
    .catch(() => false);
  if (!completed) {
    // registrar el estado real al que llegó la UI
    const landed = await page.evaluate(() => ({
      hero: !!document.querySelector('button.cta'),
      headline: document.querySelector('.headline-block h1')?.textContent ?? null,
      placeText: document.querySelector('#year-input') ? 'intro' : 'other',
    }));
    OUT_J.place_change_defect = { landed, elapsed_ms: Date.now() - t0 };
    // recuperar RESULT para seguir midiendo
    await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'load' });
    await page.waitForSelector('.mapband canvas', { timeout: 30000 });
    return -1;
  }
  return Date.now() - t0;
}

async function tOrthoVisible(page) {
  const t0 = Date.now();
  await page.locator('.ortho .btn').first().click();
  await page.waitForFunction(() => {
    const m = window.__mjtMap;
    return m?.getLayer('ortho') && m.areTilesLoaded();
  }, null, { timeout: 30000 });
  return Date.now() - t0;
}

const OUT_J = { profile: {}, legend: 'P1=local-desktop 1440x900 · P2=mobile 390x844 DSF3 CPUx4 Slow4G' };

for (const profile of ['P1', 'P2']) {
  const r = { t_hero_interactive: [], t_result_ready: [], t_result_ready_buildings: [], t_year_change: [], t_place_change: [], t_ortho_visible: [], transfer_hero: [], transfer_result: [], transfer_result_buildings: [], heap: [] };

  // transfer_hero + t_hero_interactive (frío)
  for (let i = 0; i < REPS_PCT; i++) {
    const { ctx, page } = await newPage(profile);
    r.t_hero_interactive.push(await tHeroInteractive(page));
    if (i < REPS_SINGLE) r.transfer_hero.push(await fpTransfer(page));
    await ctx.close();
  }
  // t_result_ready + transfer_result
  for (let i = 0; i < REPS_PCT; i++) {
    const { ctx, page } = await newPage(profile);
    r.t_result_ready.push(await tResultReady(page, false));
    if (i < REPS_SINGLE) r.transfer_result.push(await fpTransfer(page));
    await ctx.close();
  }
  // t_result_ready_buildings + transfer
  for (let i = 0; i < REPS_PCT; i++) {
    const { ctx, page } = await newPage(profile);
    r.t_result_ready_buildings.push(await tResultReady(page, true));
    if (i < REPS_SINGLE) r.transfer_result_buildings.push(await fpTransfer(page));
    await ctx.close();
  }
  // t_year_change / t_place_change / t_ortho_visible / heap — sesiones calientes
  for (let i = 0; i < REPS_PCT; i++) {
    const { ctx, page } = await newPage(profile);
    await tResultReady(page, false);
    r.t_year_change.push(await tYearChange(page));
    await page.waitForTimeout(300);
    r.t_place_change.push(await tPlaceChange(page));
    await page.waitForTimeout(300);
    r.t_ortho_visible.push(await tOrthoVisible(page));
    if (i < REPS_SINGLE) r.heap.push(await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null));
    await ctx.close();
  }

  OUT_J.profile[profile] = {
    t_hero_interactive: stats(r.t_hero_interactive),
    t_result_ready: stats(r.t_result_ready),
    t_result_ready_buildings: stats(r.t_result_ready_buildings),
    t_year_change: stats(r.t_year_change),
    t_place_change: stats(r.t_place_change),
    t_ortho_visible: stats(r.t_ortho_visible),
    transfer_hero_kb: r.transfer_hero.map((b) => Math.round(b / 1024)),
    transfer_result_kb: r.transfer_result.map((b) => Math.round(b / 1024)),
    transfer_result_buildings_kb: r.transfer_result_buildings.map((b) => Math.round(b / 1024)),
    heap_mb: r.heap.map((b) => Math.round(b / 1048576)),
  };
}

// build_js_raw: suma real de _app/immutable/**/*.js (sin comprimir)
async function dirSize(dir) {
  let sum = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) sum += await dirSize(p);
    else if (e.name.endsWith('.js')) sum += (await stat(p)).size;
  }
  return sum;
}
OUT_J.build_js_raw = await dirSize(join(BUILD, '_app/immutable'));
OUT_J.note = 'transferencias medidas CON compresión (br/gzip en static-server).';

await browser.close();
server.close();
await writeFile(join(OUT, 'perf-budgets.json'), JSON.stringify(OUT_J, null, 1));
console.log(JSON.stringify(OUT_J, null, 1));
