/**
 * G1 — CHARACTERIZATION ONLY. Mide valores crudos de rendimiento.
 *
 * NO emite juicios («rápido», «aceptable»…): el gate no evalúa rendimiento.
 * Uso: node scripts/g1_perf.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g1/07-perf');
const PORT = 4176;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

async function pickBrowser() {
  for (const channel of ['chrome', 'msedge']) {
    try {
      return await chromium.launch({ channel, args: ['--disable-gpu'] });
    } catch {
      /* canal no disponible: probar el siguiente */
    }
  }
  return await chromium.launch({ args: ['--disable-gpu'] });
}

const results = { note: 'CHARACTERIZATION ONLY — values are raw measurements, not pass/fail.' };

// Artefactos de build
results.artifacts = {};
for (const f of [
  'data/municipalities.pmtiles',
  'data/cells.pmtiles',
  'data/municipalities.json',
  'data/metrics/leioa.json',
]) {
  try {
    const p = join(BUILD, f);
    results.artifacts[f] = {
      bytes: statSync(p).size,
      sha256: createHash('sha256').update(await readFile(p)).digest('hex'),
    };
  } catch {
    /* artefacto ausente */
  }
}
const { readdirSync } = await import('node:fs');
const bDir = join(BUILD, 'data/buildings');
results.buildings_pmtiles = { count: readdirSync(bDir).filter((f) => f.endsWith('.pmtiles')).length };
results.build_js_bytes = await (async () => {
  let total = 0;
  const walk = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.endsWith('.js') || e.name.endsWith('.mjs')) total += statSync(p).size;
    }
  };
  await walk(join(BUILD, '_app/immutable'));
  return total;
})();

const browser = await pickBrowser();

async function run(view, url) {
  const ctx = await browser.newContext({
    viewport: { width: view.w, height: view.h },
    deviceScaleFactor: view.dsf ?? 1,
    isMobile: !!view.mobile,
    hasTouch: !!view.mobile,
  });
  const page = await ctx.newPage();
  const t0 = Date.now();
  let firstPmtilesAt = null;
  let pmtilesRequests = 0;
  let pmtilesBytes = 0;
  page.on('response', (r) => {
    if (r.url().includes('.pmtiles')) {
      pmtilesRequests++;
      if (firstPmtilesAt === null) firstPmtilesAt = Date.now() - t0;
    }
  });
  page.on('response', async (r) => {
    if (r.url().includes('.pmtiles')) {
      const len = r.headers()['content-length'];
      if (len) pmtilesBytes += Number(len);
    }
  });
  await page.goto(url, { waitUntil: 'load' });
  const domLoaded = Date.now() - t0;
  await page.waitForSelector('.mapband canvas', { timeout: 30000 });
  const canvasAt = Date.now() - t0;
  // esperar a que las teselas vectoriales estén cargadas
  await page
    .waitForFunction(() => window.__mjtMap?.areTilesLoaded?.() === true, null, { timeout: 30000 })
    .catch(() => null);
  const tilesLoadedAt = Date.now() - t0;

  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    const byType = res.reduce((a, r) => {
      const t = r.initiatorType || 'other';
      a[t] = (a[t] || 0) + (r.transferSize || 0);
      return a;
    }, {});
    return {
      domContentLoaded_ms: Math.round(n.domContentLoadedEventEnd),
      loadEvent_ms: Math.round(n.loadEventEnd),
      resources: res.length,
      transfer_bytes_by_type: byType,
      total_transfer_bytes: res.reduce((a, r) => a + (r.transferSize || 0), 0),
      js_heap_bytes: performance.memory ? performance.memory.usedJSHeapSize : null,
    };
  });

  // interacción: zoom al nivel edificio y medir hasta teselas cargadas
  const t1 = Date.now();
  await page.evaluate(() => window.__mjtMap?.jumpTo({ center: [-2.986, 43.326], zoom: 15 }));
  await page
    .waitForFunction(() => window.__mjtMap?.areTilesLoaded?.() === true, null, { timeout: 20000 })
    .catch(() => null);
  const buildingTilesAt = Date.now() - t1;

  const rendered = await page.evaluate(() => window.__mjtMap?.queryRenderedFeatures().length ?? null);
  await ctx.close();
  return {
    viewport: `${view.w}x${view.h}${view.mobile ? ' mobile' : ''}`,
    dom_loaded_ms: domLoaded,
    canvas_present_ms: canvasAt,
    tiles_loaded_ms: tilesLoadedAt,
    building_zoom_tiles_ms: buildingTilesAt,
    pmtiles_requests: pmtilesRequests,
    pmtiles_response_bytes: pmtilesBytes,
    rendered_features: rendered,
    navigation: nav,
  };
}

const resultUrl = `http://localhost:${PORT}/?year=1987&place=leioa`;
results.desktop = await run({ w: 1440, h: 900, dsf: 1 }, resultUrl);
results.mobile = await run({ w: 390, h: 844, dsf: 3, mobile: true }, resultUrl);

await browser.close();
server.close();
await writeFile(join(OUT, 'perf-characterization.json'), JSON.stringify(results, null, 1), 'utf8');
console.log(JSON.stringify(results, null, 1));
