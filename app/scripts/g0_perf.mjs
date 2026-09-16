/**
 * G0 — CHARACTERIZATION ONLY. Mide valores crudos de rendimiento.
 *
 * NO emite juicios («rápido», «aceptable»…): el gate no evalúa rendimiento.
 * Uso: node scripts/g0_perf.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g0/07-perf');
const PORT = 4176;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

async function pickBrowser() {
  for (const channel of ['chrome', 'msedge']) {
    try { return await chromium.launch({ channel, args: ['--disable-gpu'] }); } catch { /* canal no disponible: probar el siguiente */ }
  }
  return await chromium.launch({ args: ['--disable-gpu'] });
}

const results = { note: 'CHARACTERIZATION ONLY — values are raw measurements, not pass/fail.' };

// Artefactos de build
results.build_sha256 = {};
for (const f of ['data/buildings.pmtiles', 'data/metrics_054.json', 'data/metrics_020.json', 'data/metrics_908.json']) {
  try {
    const p = join(BUILD, f);
    const { createHash } = await import('node:crypto');
    results.build_sha256[f] = { bytes: statSync(p).size, sha256: createHash('sha256').update(await readFile(p)).digest('hex') };
  } catch { /* canal no disponible: probar el siguiente */ }
}
results.build_js_bytes = await (async () => {
  const { readdir } = await import('node:fs/promises');
  const dir = join(BUILD, '_app/immutable');
  let total = 0;
  const walk = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.endsWith('.js')) total += statSync(p).size;
    }
  };
  await walk(dir);
  return total;
})();

const browser = await pickBrowser();

async function run(view) {
  const ctx = await browser.newContext({ viewport: { width: view.w, height: view.h }, deviceScaleFactor: view.dsf ?? 1, isMobile: !!view.mobile, hasTouch: !!view.mobile });
  const page = await ctx.newPage();
  const t0 = Date.now();
  let firstTileAt = null;
  page.on('response', (r) => {
    if (firstTileAt === null && (r.url().includes('ORTO_BFA_') || r.url().includes('WMS_ORTOARGAZKIAK')) && r.status() === 200) {
      firstTileAt = Date.now() - t0;
    }
  });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  const domLoaded = Date.now() - t0;
  await page.waitForSelector('#map canvas', { timeout: 30000 });
  const canvasAt = Date.now() - t0;
  await page.waitForTimeout(6000);

  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    const byType = res.reduce((a, r) => { const t = r.initiatorType || 'other'; a[t] = (a[t] || 0) + (r.transferSize || 0); return a; }, {});
    return {
      domContentLoaded_ms: Math.round(n.domContentLoadedEventEnd),
      loadEvent_ms: Math.round(n.loadEventEnd),
      resources: res.length,
      transfer_bytes_by_type: byType,
      total_transfer_bytes: res.reduce((a, r) => a + (r.transferSize || 0), 0),
      js_heap_bytes: performance.memory ? performance.memory.usedJSHeapSize : null
    };
  });

  // latencia de interacción (proxy: cambio de año -> siguiente frame doble)
  const interaction = await page.evaluate(async () => {
    const el = document.querySelector('#year');
    const t = performance.now();
    el.value = '1990';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return Math.round(performance.now() - t);
  });

  const headline = await page.$eval('.headline', (e) => e.textContent.trim().slice(0, 90));
  await ctx.close();
  return {
    viewport: `${view.w}x${view.h}${view.mobile ? ' mobile' : ''}`,
    dom_loaded_ms: domLoaded, canvas_present_ms: canvasAt, first_ortho_tile_ms: firstTileAt,
    navigation: nav, interaction_year_change_ms: interaction, headline_after_change: headline
  };
}

results.desktop = await run({ w: 1440, h: 900, dsf: 1 });
results.mobile = await run({ w: 390, h: 844, dsf: 3, mobile: true });

await browser.close();
server.close();
await writeFile(join(OUT, 'perf-characterization.json'), JSON.stringify(results, null, 1), 'utf8');
console.log(JSON.stringify(results, null, 1));
