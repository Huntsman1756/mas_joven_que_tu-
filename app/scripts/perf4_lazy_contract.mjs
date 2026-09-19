/**
 * PERF4-R — contrato de red de la remediación lazy (no timing).
 *
 * Prueba que el resultado por defecto NO pide ningún chunk de profundidad
 * y que cada frontera pide exactamente su implementación al dispararse:
 *
 *   default   ?year=1987&place=leioa  → 0 chunks L3/L4 tras ready + 5 s idle
 *   A · MI EDIFICIO  clic «Buscar…»   → chunk AddressSearch
 *   B · building=    deep link        → chunk depth (sin AddressSearch)
 *   C · compare=     deep link        → chunk CompareYear
 *   D · view=photo   deep link        → chunk PhotoPanel
 *   E · histórico    clic «Ver…»      → chunk HistMapControls
 *
 * Los nombres de chunk se resuelven contra .vite/manifest.json del build,
 * nunca se adivinan.
 *
 * Salida: LAZY_OUT o ../evidence/g3/g3d/perf4-remediation/lazy-contract.json
 * Uso: node scripts/perf4_lazy_contract.mjs
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = process.env.LAZY_OUT || join(ROOT, 'evidence/g3/g3d/perf4-remediation');
const PORT = 4189;

await mkdir(OUT, { recursive: true });

// ── mapa src → fichero de chunk desde el manifiesto real ──
const manifest = JSON.parse(
  readFileSync(join('.svelte-kit', 'output', 'client', '.vite', 'manifest.json'), 'utf8')
);
const lazySrcs = {
  address: 'src/lib/components/AddressSearch.svelte',
  compare: 'src/lib/components/CompareYear.svelte',
  histmap: 'src/lib/components/HistMapControls.svelte',
  photo: 'src/lib/components/PhotoPanel.svelte',
  depth: 'src/lib/lazy/depth.ts',
  domain_context: 'src/lib/domain/context.ts',
  domain_planning: 'src/lib/domain/planning.ts'
};
const lazyFiles = {};
for (const [name, src] of Object.entries(lazySrcs)) {
  const e = manifest[src];
  if (!e?.isDynamicEntry) throw new Error(`${src} no es dynamic entry en el manifiesto`);
  lazyFiles[name] = basename(e.file);
}

const server = await createStaticServer(BUILD, PORT);
const BASE = `http://localhost:${PORT}/`;

const results = { utc: new Date().toISOString(), lazyFiles, journeys: {} };

function track(page) {
  const chunks = [];
  const ctxData = [];
  page.on('request', (r) => {
    const u = r.url();
    if (u.includes('/_app/immutable/') && u.endsWith('.js')) chunks.push(basename(u.split('?')[0]));
    if (u.includes('/data/context')) ctxData.push(u);
  });
  return { chunks, ctxData };
}

const hits = (chunks, name) => chunks.filter((f) => f === lazyFiles[name]);
const anyLazy = (chunks) =>
  chunks.filter((f) => Object.values(lazyFiles).includes(f));

async function ready(page) {
  await page.waitForSelector('.headline-block h1', { timeout: 30000 });
}

const browser = await chromium.launch();
try {
  // ── default: resultado municipal, 0 chunks L3/L4 ──
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    const { chunks, ctxData } = track(page);
    await page.goto(`${BASE}?year=1987&place=leioa`, { waitUntil: 'load' });
    await ready(page);
    await page.waitForTimeout(5000);
    results.journeys.default = {
      lazy_requested: anyLazy(chunks),
      context_data_requests: ctxData.length,
      console_errors: errs,
      pass: anyLazy(chunks).length === 0 && ctxData.length === 0 && errs.length === 0
    };
    await page.close();
  }

  // ── A · MI EDIFICIO: clic en la invitación ──
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    const { chunks } = track(page);
    await page.goto(`${BASE}?year=1987&place=leioa`, { waitUntil: 'load' });
    await ready(page);
    chunks.length = 0;
    await page.locator('.invite .start').click();
    await page.waitForSelector('.addr', { timeout: 15000 });
    results.journeys.A_address_cta = {
      address_chunk: hits(chunks, 'address'),
      other_lazy: anyLazy(chunks).filter((f) => f !== lazyFiles.address),
      console_errors: errs,
      pass: hits(chunks, 'address').length === 1 && errs.length === 0
    };
    await page.close();
  }

  // ── B · building= deep link: profundidad sin flujo de dirección ──
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    const { chunks } = track(page);
    await page.goto(
      `${BASE}?year=2024&place=bilbao&lat=43.27513&lon=-2.95964&z=17&building=20-1116-2001-1-2`,
      { waitUntil: 'load' }
    );
    await ready(page);
    await page.waitForFunction(() => window.__mjtApp?.selectedBuilding !== null, {
      timeout: 30000
    });
    await page.waitForTimeout(2000);
    results.journeys.B_building_deeplink = {
      depth_chunk: hits(chunks, 'depth'),
      planning_domain: hits(chunks, 'domain_planning'),
      context_domain: hits(chunks, 'domain_context'),
      address_chunk: hits(chunks, 'address'),
      console_errors: errs,
      pass:
        hits(chunks, 'depth').length === 1 &&
        hits(chunks, 'domain_planning').length === 1 &&
        hits(chunks, 'domain_context').length === 1 &&
        hits(chunks, 'address').length === 0 &&
        errs.length === 0
    };
    await page.close();
  }

  // ── C · compare= deep link ──
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    const { chunks } = track(page);
    await page.goto(`${BASE}?year=1987&place=leioa&compare=1960`, { waitUntil: 'load' });
    await ready(page);
    await page.waitForSelector('.compare table, .compare .facts, .compare ul', {
      timeout: 15000
    });
    results.journeys.C_compare_deeplink = {
      compare_chunk: hits(chunks, 'compare'),
      console_errors: errs,
      pass: hits(chunks, 'compare').length === 1 && errs.length === 0
    };
    await page.close();
  }

  // ── D · view=photo deep link ──
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    const { chunks } = track(page);
    await page.goto(`${BASE}?year=1987&place=leioa&view=photo`, { waitUntil: 'load' });
    await ready(page);
    await page.waitForTimeout(2000);
    results.journeys.D_photo_deeplink = {
      photo_chunk: hits(chunks, 'photo'),
      console_errors: errs,
      pass: hits(chunks, 'photo').length === 1 && errs.length === 0
    };
    await page.close();
  }

  // ── E · histórico: clic en «Ver el mapa histórico» ──
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    const histRaster = [];
    const { chunks } = track(page);
    page.on('request', (r) => {
      if (/1923|1925|histori|hg\.|_hist/i.test(r.url())) histRaster.push(r.url());
    });
    await page.goto(`${BASE}?year=1987&place=leioa`, { waitUntil: 'load' });
    await ready(page);
    chunks.length = 0;
    const preClickHist = [...histRaster];
    await page.locator('.histmap .btn').click();
    await page.waitForSelector('.histmap .btn', { timeout: 15000 });
    await page.waitForTimeout(1500);
    results.journeys.E_histmap_click = {
      hist_chunk: hits(chunks, 'histmap'),
      raster_before_click: preClickHist.length,
      console_errors: errs,
      pass:
        hits(chunks, 'histmap').length === 1 && preClickHist.length === 0 && errs.length === 0
    };
    await page.close();
  }
} finally {
  results.pass = Object.values(results.journeys).every((j) => j.pass);
  await writeFile(join(OUT, 'lazy-contract.json'), JSON.stringify(results, null, 2));
  server.close();
  await browser.close();
}
console.log(JSON.stringify(results, null, 2));
