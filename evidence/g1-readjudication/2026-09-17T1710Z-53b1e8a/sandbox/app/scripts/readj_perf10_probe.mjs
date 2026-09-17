/**
 * G1 READJUDICATION — probe de instrumentación PERF10.
 * Verifica: (a) qué eventos sourcedata emite la source 'ortho' y con qué campos;
 * (b) que el primer 'content' de tesela + siguiente 'render' corresponde a
 * píxeles de ortofoto visibles (diff de capturas en la región del mapa);
 * (c) RED: que en ese instante areTilesLoaded() es false (la vieja condición
 * sobre-mide).
 * NO modifica el producto. Uso: node scripts/readj_perf10_probe.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const BUILD = resolve(process.cwd(), 'build');
const OUT = resolve(process.cwd(), '../out/perf10');
const PORT = 4194;
const BASE = `http://localhost:${PORT}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

let browser;
for (const channel of ['chrome', 'msedge']) {
  try { browser = await chromium.launch({ channel, args: ['--disable-gpu'] }); break; } catch { /* next */ }
}
browser ??= await chromium.launch({ args: ['--disable-gpu'] });

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
    return { diff, total: da.length / 4, diffPct: (100 * diff) / (da.length / 4) };
  }, [aBuf.toString('base64'), bBuf.toString('base64')]);
  await ctx.close();
  return r;
}

async function runProbe(profile, rep) {
  const isP2 = profile === 'P2';
  const ctx = await browser.newContext(isP2
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await installLocalFixtures(page);
  if (isP2) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
    });
  }
  await page.goto(`${BASE}/?year=1987&place=leioa`, { waitUntil: 'commit' });
  await page.waitForSelector('.headline-block h1', { timeout: 25000 });
  await page.waitForSelector('.mapband canvas', { timeout: 30000 });
  await page.waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 30000 }).catch(() => null);

  // instrumentación previa al clic
  await page.evaluate(() => {
    const m = window.__mjtMap;
    window.__p10 = { events: [], tileSeen: false, t1: null, allLoadedAtT1: null, firstCoord: null, renderCountAtT1: null };
    m.on('sourcedata', (e) => {
      if (e.sourceId !== 'ortho' && e.sourceId !== 'ortho-compare') return;
      window.__p10.events.push({
        t: performance.now(),
        sourceId: e.sourceId,
        dataType: e.dataType ?? null,
        sourceDataType: e.sourceDataType ?? null,
        coord: e.coord?.canonical ? `${e.coord.canonical.z}/${e.coord.canonical.x}/${e.coord.canonical.y}` : (e.coord ? String(e.coord.key ?? e.coord) : null),
        isSourceLoaded: e.isSourceLoaded ?? null,
        hasTile: !!e.tile,
      });
      // En MapLibre 6.x los eventos por tesela llevan coord/tile pero
      // sourceDataType === null (solo los eventos de nivel-source lo rellenan).
      if (!window.__p10.tileSeen && e.sourceId === 'ortho' && e.coord) {
        window.__p10.tileSeen = true;
        window.__p10.firstCoord = window.__p10.events[window.__p10.events.length - 1].coord;
        m.once('render', () => {
          window.__p10.t1 = performance.now();
          window.__p10.allLoadedAtT1 = m.areTilesLoaded();
        });
      }
    });
  });

  const mapRect = await page.locator('.mapband').boundingBox();
  const before = await page.screenshot({ clip: mapRect });

  const t0 = await page.evaluate(() => performance.now());
  await page.locator('.ortho .btn').first().click();
  const gotT1 = await page.waitForFunction(() => window.__p10.t1 !== null, null, { timeout: 30000 }).then(() => true).catch(() => false);
  const t1shot = gotT1 ? await page.screenshot({ clip: mapRect }) : null;

  const tAll = await page.waitForFunction(() => window.__mjtMap?.areTilesLoaded?.() ? performance.now() : false, null, { timeout: 30000 }).then(async (h) => h.jsonValue()).catch(() => null);

  const p10 = await page.evaluate(() => window.__p10);
  const res = {
    rep, profile,
    t0,
    t_first_visible_ms: gotT1 ? Math.round(p10.t1 - t0) : null,
    all_tiles_loaded_at_t1: p10.allLoadedAtT1,
    t_all_tiles_ms: tAll ? Math.round(tAll - t0) : null,
    first_coord: p10.firstCoord,
    n_ortho_events: p10.events.length,
    first_events: p10.events.slice(0, 8),
  };
  if (gotT1 && t1shot) {
    res.pixel_diff = await diffPngBuffers(before, t1shot);
    await writeFile(join(OUT, `probe-${profile}-${rep}-before.png`), before);
    await writeFile(join(OUT, `probe-${profile}-${rep}-t1.png`), t1shot);
  }
  await ctx.close();
  return res;
}

const results = [];
for (let i = 0; i < 3; i++) results.push(await runProbe('P1', i));
for (let i = 0; i < 3; i++) results.push(await runProbe('P2', i));

await writeFile(join(OUT, 'perf10-probe.json'), JSON.stringify({ meta: { candidate: '53b1e8a', utc: new Date().toISOString() }, results }, null, 1));
console.log(JSON.stringify(results.map((r) => ({ rep: r.rep, profile: r.profile, t_first: r.t_first_visible_ms, allLoadedAtT1: r.all_tiles_loaded_at_t1, t_all: r.t_all_tiles_ms, diffPct: r.pixel_diff?.diffPct, n_events: r.n_ortho_events })), null, 1));
await browser.close();
server.close();
