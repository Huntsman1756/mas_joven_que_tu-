/**
 * G1-R2-D — prototipo de preview progresivo first-party (SPIKE, no producto).
 *
 * Tras el clic «Ver la foto» el producto añade la source 'ortho' (ArcGIS upstream).
 * El spike añade ADEMÁS una ImageSource 'ortho-preview' (JPEG real derivado de la
 * misma campaña ORTO_BFA_1990, servido same-origin) por debajo de 'ortho'.
 *
 * Se mide:
 *   t_preview = clic → sourcedata 'ortho-preview' + siguiente render
 *               (= primera imagen de ortofoto visible, def. congelada)
 *   t_tile    = clic → primera tesela 'ortho' (e.coord) + render  (diagnóstico)
 *   t_all     = clic → areTilesLoaded()                            (diagnóstico)
 * Auditoría: requests a hosts externos de ortofoto ANTES del clic (P5: debe ser 0)
 * y bytes/origen del preview. Validación visual: diff % región mapa antes→t_preview.
 * Uso: node scripts/readj_perf10_preview.mjs   (cwd = sandbox/app)
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const BUILD = resolve(process.cwd(), 'build');
const OUT = resolve(process.cwd(), '../out/perf10');
const PORT = 4198;
const BASE = `http://localhost:${PORT}`;
const REPS = 20;

// bbox real de edificios (EPSG:4326) — ImageSource TL,TR,BR,BL
const PREVIEW_URL = '/_preview_1990_1024.jpg';
const PREVIEW_COORDS = [
  [-3.4478364335747607, 43.45537334104961],
  [-2.4162319078328007, 43.45537334104961],
  [-2.4162319078328007, 42.9821549945039],
  [-3.4478364335747607, 42.9821549945039],
];
const ORTHO_HOSTS = ['geo.bizkaia.eus', 'geo.euskadi.eus'];

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

let browser;
for (const channel of ['chrome', 'msedge']) {
  try { browser = await chromium.launch({ channel, args: ['--disable-gpu'] }); break; } catch { }
}
browser ??= await chromium.launch({ args: ['--disable-gpu'] });

const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); const i = Math.ceil((p / 100) * s.length) - 1; return s[Math.max(0, i)]; };
const stats = (arr) => arr.length ? { n: arr.length, p75: Math.round(pct(arr, 75)), p95: Math.round(pct(arr, 95)), max: Math.round(Math.max(...arr)), raw: arr.map((v) => Math.round(v)) } : null;

async function diffPngBuffers(aBuf, bBuf) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const r = await page.evaluate(async ([a64, b64]) => {
    const load = (b) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b; });
    const [ia, ib] = await Promise.all([load(a64), load(b64)]);
    const c = document.createElement('canvas');
    c.width = ia.width; c.height = ia.height;
    const g = c.getContext('2d');
    g.drawImage(ia, 0, 0);
    const da = g.getImageData(0, 0, c.width, c.height).data;
    g.drawImage(ib, 0, 0);
    const db = g.getImageData(0, 0, c.width, c.height).data;
    let diff = 0;
    for (let i = 0; i < da.length; i += 4) {
      if (Math.abs(da[i] - db[i]) > 8 || Math.abs(da[i + 1] - db[i + 1]) > 8 || Math.abs(da[i + 2] - db[i + 2]) > 8) diff++;
    }
    return { diffPct: (100 * diff) / (da.length / 4) };
  }, [aBuf.toString('base64'), bBuf.toString('base64')]);
  await ctx.close();
  return r;
}

async function newP2() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await installLocalFixtures(page);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
  });
  const externalPreClick = [];
  let clicked = false;
  cdp.on('Network.requestWillBeSent', (e) => {
    if (!clicked && ORTHO_HOSTS.some((h) => e.request.url.includes(h))) externalPreClick.push(e.request.url);
  });
  return { ctx, page, markClick: () => { clicked = true; }, externalPreClick };
}

// — sesión caliente idéntica al harness —
async function tResultReady(page) {
  await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'commit' });
  await page.waitForSelector('.headline-block h1', { timeout: 25000 });
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
  await page.waitForFunction(() => document.querySelector('.headline-block h1')?.textContent.includes('Bilbao'), null, { timeout: 25000 }).catch(() => null);
}

async function measureOrthoPreview(page, markClick) {
  await page.evaluate(([url, coords]) => {
    const m = window.__mjtMap;
    window.__p10 = { tPrev: null, tTile: null, prevEvents: [] };
    m.on('sourcedata', (e) => {
      if (e.sourceId === 'ortho-preview') {
        window.__p10.prevEvents.push({ t: Math.round(performance.now()), sdt: e.sourceDataType ?? null, coord: !!e.coord });
        if (window.__p10.tPrev === null && e.sourceDataType === 'content') {
          m.once('render', () => { window.__p10.tPrev = performance.now(); });
        }
      }
      if (window.__p10.tTile === null && e.sourceId === 'ortho' && e.coord) {
        m.once('render', () => { window.__p10.tTile = performance.now(); });
      }
    });
    // spike: el producto real lo haría dentro de su propio handler; aquí se inyecta
    // tras el clic vía listener posterior (el del producto se registró primero).
    document.querySelector('.ortho .btn').addEventListener('click', () => {
      setTimeout(() => {
        if (!m.getSource('ortho-preview')) {
          m.addSource('ortho-preview', { type: 'image', url, coordinates: coords });
          m.addLayer(
            { id: 'ortho-preview', type: 'raster', source: 'ortho-preview', paint: { 'raster-fade-duration': 0 } },
            m.getLayer('ortho') ? 'ortho' : undefined,
          );
        }
      }, 0);
    });
  }, [PREVIEW_URL, PREVIEW_COORDS]);

  const mapRect = await page.locator('.mapband').boundingBox();
  const before = await page.screenshot({ clip: mapRect });
  const t0 = await page.evaluate(() => performance.now());
  markClick();
  await page.locator('.ortho .btn').first().click();
  const gotPrev = await page.waitForFunction(() => window.__p10.tPrev !== null, null, { timeout: 30000 }).then(() => true).catch(() => false);
  const prevShot = gotPrev ? await page.screenshot({ clip: mapRect }) : null;
  await page.waitForFunction(() => window.__p10.tTile !== null, null, { timeout: 30000 }).catch(() => null);
  const tAll = await page.waitForFunction(() => (window.__mjtMap?.areTilesLoaded?.() ? performance.now() : false), null, { timeout: 30000 }).then((h) => h.jsonValue()).catch(() => null);
  const p10 = await page.evaluate(() => window.__p10);

  const res = {
    t_preview_visible: gotPrev ? Math.round(p10.tPrev - t0) : null,
    t_first_tile: p10.tTile !== null ? Math.round(p10.tTile - t0) : null,
    t_all_tiles: tAll !== null ? Math.round(tAll - t0) : null,
    prev_events: p10.prevEvents.slice(0, 4),
  };
  if (gotPrev && prevShot) res.diff_before_prev = (await diffPngBuffers(before, prevShot)).diffPct;
  return res;
}

const R = { meta: { candidate: '53b1e8a+fix1956+spike-preview', utc: new Date().toISOString(), preview: 'ORTO_BFA_1990 export 1024x645 JPEG 167KB same-origin', invariant: 'preview post-opt-in only; official tiles continue on top' }, batches: {} };

for (const batch of ['P2a', 'P2b']) {
  const rows = [];
  let preClickViolations = 0;
  for (let i = 0; i < REPS; i++) {
    const { ctx, page, markClick, externalPreClick } = await newP2();
    await tResultReady(page);
    await tYearChange(page);
    await page.waitForTimeout(300);
    await tPlaceChange(page);
    await page.waitForTimeout(300);
    rows.push(await measureOrthoPreview(page, markClick));
    if (externalPreClick.length) preClickViolations += externalPreClick.length;
    await ctx.close();
    if (i % 5 === 4) console.log(`${batch} rep${i}: prev=${rows[i].t_preview_visible} tile=${rows[i].t_first_tile} all=${rows[i].t_all_tiles} diff=${rows[i].diff_before_prev?.toFixed?.(1)}`);
  }
  R.batches[batch] = {
    t_preview_visible: stats(rows.map((r) => r.t_preview_visible).filter((v) => v !== null)),
    t_first_tile_diag: stats(rows.map((r) => r.t_first_tile).filter((v) => v !== null)),
    t_all_tiles_diag: stats(rows.map((r) => r.t_all_tiles).filter((v) => v !== null)),
    p5_external_ortho_preclick: preClickViolations,
    mean_diff_pct: Math.round(rows.reduce((a, r) => a + (r.diff_before_prev ?? 0), 0) / rows.length * 10) / 10,
    reps: rows,
  };
  console.log(batch, 'preview:', JSON.stringify(R.batches[batch].t_preview_visible), '| tile diag:', JSON.stringify(R.batches[batch].t_first_tile_diag?.p75));
}

await writeFile(join(OUT, 'perf10-preview-proto.json'), JSON.stringify(R, null, 1));
await browser.close();
server.close();
console.log('DONE');
