/**
 * G1 — PERF10 con instrumentación corregida (definición preregistrada):
 *   t_ortho_visible = clic «Ver la foto» → PRIMERA imagen de ortofoto visible.
 *   t1 = primer evento sourcedata de tile de la source 'ortho' (e.coord) +
 *        siguiente 'render' del mapa.
 * Diagnóstico sin efecto en el gate:
 *   t_ortho_all_viewport_tiles_loaded = clic → map.areTilesLoaded() (semántica
 *   anterior del harness; incluye TODAS las teselas de TODAS las sources).
 * Sesión caliente idéntica al harness: result → year change → place change →
 * clic orto. P1: 20 reps · P2: 2×20 reps. Sin outliers descartados.
 * Uso: node scripts/readj_perf10.mjs   (cwd = sandbox/app o app)
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const BUILD = resolve(process.cwd(), 'build');
const OUT = process.env.PERF_OUT || resolve(process.cwd(), '../out/perf10');
const PORT = 4195;
const BASE = `http://localhost:${PORT}`;
const REPS = 20;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

let browser;
for (const channel of ['chrome', 'msedge']) {
  try { browser = await chromium.launch({ channel, args: ['--disable-gpu'] }); break; } catch { /* next */ }
}
browser ??= await chromium.launch({ args: ['--disable-gpu'] });

const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); const i = Math.ceil((p / 100) * s.length) - 1; return s[Math.max(0, i)]; };
const stats = (arr) => arr.length ? { n: arr.length, p75: Math.round(pct(arr, 75)), p95: Math.round(pct(arr, 95)), max: Math.round(Math.max(...arr)), raw: arr.map((v) => Math.round(v)) } : null;

async function newPage(profile) {
  const ctx = await browser.newContext(profile === 'P2'
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await installLocalFixtures(page); // NORA → fixture local (idéntico al harness)
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

// — pasos de sesión caliente, idénticos a g1_gate_perf.mjs —
async function tResultReady(page) {
  await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'commit' });
  await page.waitForSelector('.headline-block h1', { timeout: 25000 });
  await page.waitForSelector('.lead2', { timeout: 25000 });
  await page.waitForSelector('.mapband canvas', { timeout: 30000 });
  await page.waitForFunction(() => {
    const m = window.__mjtMap;
    return m && m.areTilesLoaded?.() && m.queryRenderedFeatures().some((f) => f.source === 'cells');
  }, null, { timeout: 30000 });
}

async function ensureChangeOpen(page) {
  if (!(await page.$('.changeform'))) await page.click('.topbar .change');
  await page.waitForSelector('.changeform', { timeout: 10000 });
}

async function tYearChange(page) {
  await ensureChangeOpen(page);
  await page.fill('.changeform input', '1990');
  await page.click('.changeform button[type=submit]');
  await page.waitForFunction(() => document.querySelector('.legend-title')?.textContent.includes('1990'), null, { timeout: 15000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

async function tPlaceChange(page) {
  await ensureChangeOpen(page);
  await page.fill('.changeform #place-input', 'Bilbao');
  await page.waitForSelector('.changeform #place-listbox button', { timeout: 20000 });
  await page.click('.changeform #place-listbox button >> nth=0');
  await page.waitForSelector('.changeform button[type=submit]', { timeout: 4000 }).then((b) => b.click()).catch(() => null);
  await page.waitForFunction(
    () => document.querySelector('.headline-block h1')?.textContent.includes('Bilbao'),
    null, { timeout: 25000 },
  ).catch(() => null);
}

// — medición PERF10 corregida + diagnóstico —
async function measureOrtho(page) {
  await page.evaluate(() => {
    const m = window.__mjtMap;
    window.__p10 = { tileSeen: false, t1: null, allLoadedAtT1: null, firstCoord: null };
    m.on('sourcedata', (e) => {
      if (window.__p10.tileSeen) return;
      // evento por tesela raster: coord presente (sourceDataType null en ML6)
      if (e.sourceId === 'ortho' && e.coord) {
        window.__p10.tileSeen = true;
        window.__p10.firstCoord = e.coord?.canonical
          ? `${e.coord.canonical.z}/${e.coord.canonical.x}/${e.coord.canonical.y}` : 'coord';
        m.once('render', () => {
          window.__p10.t1 = performance.now();
          window.__p10.allLoadedAtT1 = m.areTilesLoaded();
        });
      }
    });
  });
  const t0 = await page.evaluate(() => performance.now());
  await page.locator('.ortho .btn').first().click();
  const r = await page.waitForFunction(
    () => (window.__p10?.t1 !== null ? { t1: window.__p10.t1, all: window.__p10.allLoadedAtT1, coord: window.__p10.firstCoord } : false),
    null, { timeout: 30000 },
  ).then((h) => h.jsonValue()).catch(() => null);
  const tAll = await page.waitForFunction(
    () => (window.__mjtMap?.areTilesLoaded?.() ? performance.now() : false), null, { timeout: 30000 },
  ).then((h) => h.jsonValue()).catch(() => null);
  return {
    t_ortho_visible: r ? Math.round(r.t1 - t0) : null,
    all_tiles_loaded_at_t1: r ? r.all : null,
    first_coord: r ? r.coord : null,
    t_ortho_all_viewport_tiles_loaded: tAll !== null ? Math.round(tAll - t0) : 'timeout>30s',
  };
}

const R = { meta: { candidate: '53b1e8a', utc: new Date().toISOString(), metric: 't_ortho_visible = click -> first ortho tile rendered (frozen def)', diagnostic: 't_ortho_all_viewport_tiles_loaded = click -> areTilesLoaded() (old semantics, no threshold)' }, profiles: {} };

for (const profile of ['P1', 'P2a', 'P2b']) {
  const p = profile.startsWith('P2') ? 'P2' : 'P1';
  const rows = [];
  for (let i = 0; i < REPS; i++) {
    const { ctx, page } = await newPage(p);
    await tResultReady(page);
    await tYearChange(page);
    await page.waitForTimeout(300);
    await tPlaceChange(page);
    await page.waitForTimeout(300);
    rows.push(await measureOrtho(page));
    await ctx.close();
  }
  R.profiles[profile] = {
    t_ortho_visible: stats(rows.map((r) => r.t_ortho_visible).filter((v) => v !== null)),
    t_ortho_all_viewport_tiles_loaded_diag: stats(rows.map((r) => r.t_ortho_all_viewport_tiles_loaded).filter((v) => typeof v === 'number')),
    all_loaded_at_t1_count: rows.filter((r) => r.all_tiles_loaded_at_t1 === true).length,
    reps: rows,
  };
  console.log(profile, JSON.stringify(R.profiles[profile].t_ortho_visible));
}

await writeFile(join(OUT, 'perf10-corrected.json'), JSON.stringify(R, null, 1));
await browser.close();
server.close();
