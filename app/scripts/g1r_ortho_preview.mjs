/**
 * G1-R — regresión del preview ortofoto progresivo (ADR-011).
 * Escenarios sobre el build (`npm run build` previo):
 *   1. p5-zero        — 0 requests de imagen ortográfica (tiles, WMS, previews) antes del opt-in
 *   2. layer-order    — ortho-preview < ortho < munis-fill (raster bajo vectorial) + píxeles reales
 *   3. slow-tiles     — tiles oficiales retrasadas 6 s: el preview pinta antes y sigue visible
 *   4. stale-campaign — preview de la campaña A retrasado; cambio a B: A nunca sustituye a B
 *   5. cleanup-hide   — "Ocultar" elimina source+layer del preview
 *   6. compare        — comparador crea ortho-compare-preview bajo ortho-compare
 * Uso: node scripts/g1r_ortho_preview.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import zlib from 'node:zlib';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g1-remediation/ortho-preview');
const PORT = 4183;
const BASE = `http://localhost:${PORT}`;
// G4: `view=photo` monta el panel FOTO sin pedir imagen; la activación explícita
// ("Comprobar desde el aire") sigue siendo el único opt-in.
const URL_Q = '/?year=1990&place=leioa&view=photo';

/* Imagen ortográfica = teselas oficiales, WMS geoEuskadi o previews first-party. */
const ORTHO_IMG_RE = /ORTO_BFA_|WMS_ORTOARGAZKIAK|ortho-previews\//;

/* ── decodificador PNG mínimo para diff de capturas ── */
function pngPixels(buf) {
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const bpp = buf[25] === 6 ? 4 : 3;
  let pos = 8;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    if (buf.toString('ascii', pos + 4, pos + 8) === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = x >= bpp && prev ? prev[x - bpp] : 0;
      let v = row[x];
      if (ft === 1) v = (v + a) & 0xff;
      else if (ft === 2) v = (v + b) & 0xff;
      else if (ft === 3) v = (v + ((a + b) >> 1)) & 0xff;
      else if (ft === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
      cur[x] = v;
    }
  }
  return { px: out, w, h, bpp };
}
function diffPct(a, b) {
  if (a.w !== b.w || a.h !== b.h) return -1;
  let diff = 0;
  for (let i = 0; i < a.px.length; i += a.bpp) {
    if (Math.abs(a.px[i] - b.px[i]) + Math.abs(a.px[i + 1] - b.px[i + 1]) + Math.abs(a.px[i + 2] - b.px[i + 2]) > 30) diff++;
  }
  return (diff / (a.px.length / a.bpp)) * 100;
}

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

let browser;
for (const channel of ['chrome', 'msedge']) {
  try { browser = await chromium.launch({ channel, args: ['--disable-gpu'] }); break; } catch { /* next */ }
}
browser ??= await chromium.launch({ args: ['--disable-gpu'] });

const results = {};
const ok = (name, pass, detail) => {
  results[name] = { pass, ...detail };
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}`, JSON.stringify(detail).slice(0, 300));
};

async function newPage(routes = []) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const orthoReqs = [];
  page.on('request', (r) => { if (ORTHO_IMG_RE.test(r.url())) orthoReqs.push(r.url()); });
  for (const [re, fn] of routes) await page.route(re, fn);
  await page.goto(`${BASE}${URL_Q}`, { waitUntil: 'load' });
  await page.waitForSelector('.photo button.btn', { timeout: 30000 });
  return { ctx, page, orthoReqs };
}

async function clickVerFoto(page) {
  await page.evaluate(() => {
    [...document.querySelectorAll('.photo button')].find((b) => /Comprobar desde el aire/.test(b.textContent ?? ''))?.click();
  });
}
const layerOrder = (page) => page.evaluate(() => {
  const ids = window.__mjtMap.getStyle().layers.map((l) => l.id);
  const ix = (id) => ids.indexOf(id);
  return {
    preview: ix('ortho-preview'), ortho: ix('ortho'),
    cmpPreview: ix('ortho-compare-preview'), cmp: ix('ortho-compare'),
    munis: ix('munis-fill'), cells: ix('cells-fill'), sel: ix('sel-muni-outline'),
  };
});

/* 1 — P5: 0 requests de imagen ortográfica antes del opt-in */
{
  const { ctx, page, orthoReqs } = await newPage();
  await page.waitForTimeout(3000);
  ok('p5-zero', orthoReqs.length === 0, { preClickRequests: orthoReqs.length, urls: orthoReqs.slice(0, 5) });
  await ctx.close();
}

/* 2 — orden de capas tras opt-in + imagen real pintada */
{
  const { ctx, page } = await newPage();
  const before = pngPixels(await page.screenshot());
  await clickVerFoto(page);
  await page.waitForFunction(() => window.__mjtMap?.getSource('ortho-preview') && window.__mjtMap.getLayer('ortho'), { timeout: 20000 });
  await page.waitForTimeout(6000);
  const order = await layerOrder(page);
  const diff = diffPct(before, pngPixels(await page.screenshot()));
  // raster bajo vectorial: munis-fill solo existe a zoom<9; a zoom municipal
  // la referencia es cells-fill (siempre encima del raster).
  const vectorBelow = order.munis >= 0 ? order.munis : order.cells;
  const pass = order.preview >= 0 && order.preview < order.ortho && order.ortho < vectorBelow && diff > 1;
  ok('layer-order', pass, { order, diffPct: diff });
  await page.screenshot({ path: join(OUT, 'layer-order.png') });
  await ctx.close();
}

/* 3 — tiles lentas (6 s): el preview pinta antes y permanece visible */
{
  const { ctx, page } = await newPage([
    [/ORTO_BFA_/, async (route) => {
      await new Promise((r) => setTimeout(r, 6000));
      await route.continue();
    }],
  ]);
  await clickVerFoto(page);
  await page.waitForFunction(() => window.__mjtMap?.getSource('ortho-preview'), { timeout: 15000 });
  // durante la espera de los tiles: ¿preview cargado y capa visible?
  await page.waitForTimeout(2500);
  const state = await page.evaluate(() => {
    const m = window.__mjtMap;
    return {
      srcLoaded: m.getSource('ortho-preview')?.loaded?.() ?? null,
      layerVisible: !!m.getLayer('ortho-preview'),
      tilesPending: !m.getSource('ortho') || !m.areTilesLoaded(),
    };
  });
  ok('slow-tiles', state.layerVisible && (state.srcLoaded === true || state.srcLoaded === null) && state.tilesPending, state);
  await page.screenshot({ path: join(OUT, 'slow-tiles.png') });
  await ctx.close();
}

/* 4 — stale: preview de A (1990) retrasado; opt-in a B (1975) antes de que A resuelva */
{
  const { ctx, page } = await newPage([
    [/ortho-previews\/1990\.jpg/, async (route) => {
      await new Promise((r) => setTimeout(r, 5000));
      await route.continue();
    }],
  ]);
  await clickVerFoto(page); // campaña 1990
  await page.waitForTimeout(400); // preview A en vuelo
  // ocultar (retira source+layer de A aunque la request siga en vuelo) y
  // navegar a la campaña siguiente — G4: el cambio de campaña es la nav
  // explícita del panel (la campaña activada persiste sobre el año personal)
  await page.evaluate(() => {
    [...document.querySelectorAll('.photo button')].find((b) => /Ocultar/.test(b.textContent ?? ''))?.click();
  });
  await page.waitForTimeout(300);
  const navYear = await page.evaluate(() => {
    const nav = [...document.querySelectorAll('.photo .nav')].find((b) => !b.disabled);
    if (!nav) return null;
    const y = nav.textContent?.replace(/[^0-9]/g, '') ?? null;
    nav.click();
    return y;
  });
  await page.waitForTimeout(8000); // el preview A tardío ya resolvió en segundo plano
  const state = await page.evaluate(() => {
    const m = window.__mjtMap;
    const s = m.getSource('ortho-preview');
    return { hasLayer: !!m.getLayer('ortho-preview'), url: s ? (s.url ?? s._options?.url ?? null) : null };
  });
  const pass =
    state.hasLayer &&
    typeof state.url === 'string' &&
    navYear !== null &&
    state.url.includes(navYear) &&
    !state.url.includes('1990');
  ok('stale-campaign', pass, { previewUrl: state.url, hasLayer: state.hasLayer, navYear });
  await ctx.close();
}

/* 5 — cleanup al ocultar */
{
  const { ctx, page } = await newPage();
  await clickVerFoto(page);
  await page.waitForFunction(() => window.__mjtMap?.getSource('ortho-preview'), { timeout: 20000 });
  await page.evaluate(() => {
    [...document.querySelectorAll('.photo button')].find((b) => /Ocultar/.test(b.textContent ?? ''))?.click();
  });
  await page.waitForTimeout(800);
  const gone = await page.evaluate(() => {
    const m = window.__mjtMap;
    return !m.getSource('ortho-preview') && !m.getLayer('ortho-preview') && !m.getLayer('ortho');
  });
  ok('cleanup-hide', gone === true, { removed: gone });
  await ctx.close();
}

/* 6 — comparador: preview del lado compare bajo ortho-compare */
{
  const { ctx, page } = await newPage();
  await clickVerFoto(page);
  // esperar a que la sonda resuelva AVAILABLE (aparece el botón Comparar)
  await page.waitForFunction(() => {
    return [...document.querySelectorAll('.photo button')].some((b) => /Comparar/i.test(b.textContent ?? ''));
  }, { timeout: 30000 });
  await page.evaluate(() => {
    [...document.querySelectorAll('.photo button')].find((b) => /Comparar/i.test(b.textContent ?? ''))?.click();
  });
  await page.waitForTimeout(3000);
  const order = await layerOrder(page);
  const pass = order.cmpPreview >= 0 && order.cmp >= 0 && order.cmpPreview < order.cmp;
  ok('compare', pass, { order });
  await page.screenshot({ path: join(OUT, 'compare.png') });
  await ctx.close();
}

await writeFile(join(OUT, 'ortho-preview-regression.json'), JSON.stringify(results, null, 2));
const failed = Object.entries(results).filter(([, r]) => !r.pass).map(([k]) => k);
console.log(`\n${Object.keys(results).length} escenarios — ${failed.length ? `FAIL: ${failed.join(', ')}` : 'todo PASS'}`);
await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);
