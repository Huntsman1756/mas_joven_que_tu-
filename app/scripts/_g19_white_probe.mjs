/**
 * Sonda G19 — adjudicación del rectángulo blanco en photo-1440-1956.
 *
 * Reproduce la vista exacta de la captura (?year=1952&place=bilbao&view=photo,
 * campaña 1956), registra TODAS las peticiones de teselas al servicio
 * ORTO_BFA_1956 (status, content-type, bytes) y localiza qué tesela(s)
 * cubren la zona del artefacto (~x 90–205, y 228–272 en la captura).
 * Guarda las teselas candidatas en evidence/g19/probe/ para inspección
 * de contenido (blanco ≠ imagen; ausencia ≠ blanco).
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g19/probe');
const PORT = 4229;
const BASE = `http://localhost:${PORT}`;

// Región del artefacto en coords de página (captura 1440×900)
const ART = { x0: 80, y0: 222, x1: 210, y1: 278 };

// slippy: tile z/x/y → bounds lngLat
function tileBounds(z, x, y) {
  const n = 2 ** z;
  const lon = (tx) => (tx / n) * 360 - 180;
  const lat = (ty) =>
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n))) * 180) / Math.PI;
  return { w: lon(x), e: lon(x + 1), n: lat(y), s: lat(y + 1) };
}

const server = await createStaticServer(BUILD, PORT);
await mkdir(join(OUT, 'tiles'), { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const reqs = [];
page.on('response', async (res) => {
  const url = res.url();
  if (!url.includes('geo.bizkaia.eus')) return;
  let size = -1;
  try {
    size = (await res.body()).length;
  } catch {
    /* body no disponible */
  }
  reqs.push({ url, status: res.status(), type: res.headers()['content-type'] ?? '', size });
});
page.on('requestfailed', (r) => {
  if (r.url().includes('geo.bizkaia.eus'))
    reqs.push({ url: r.url(), status: 'FAILED', type: r.failure()?.errorText ?? '', size: 0 });
});

await page.goto(`${BASE}/?year=1952&place=bilbao&view=photo`);
await page.waitForFunction(() => window.__mjtApp?.headline !== null, { timeout: 30000 });
await page.waitForSelector('.photo .tc-rail', { timeout: 60000 });

// activar 1956 por el rail (misma mecánica que g19_temporal_canvas.mjs)
const frac = await page
  .locator('.photo .epoch[data-year="1956"]')
  .evaluate((el) => parseFloat(el.style.left) / 100);
const box = await page.locator('.photo .tc-scrub').boundingBox();
await page
  .locator('.photo .tc-scrub')
  .click({ position: { x: Math.min(frac * box.width, box.width - 2), y: box.height / 2 } });
await page.waitForFunction(
  () => window.__mjtApp?.orthoState && window.__mjtApp.orthoState !== 'UNKNOWN',
  { timeout: 30000 }
);
// esperar a que el mapa quede idle (todas las teselas resueltas)
await page.waitForFunction(() => window.__mjtMap?.loaded() && !window.__mjtMap?.isMoving(), {
  timeout: 30000
});
await page.waitForTimeout(1500);

// estado del mapa + tesela(s) que cubren la zona del artefacto
const info = await page.evaluate((art) => {
  const map = window.__mjtMap;
  const canvas = map.getCanvas().getBoundingClientRect();
  const zoom = map.getZoom();
  const pts = [
    [art.x0 + (art.x1 - art.x0) / 2, art.y0 + (art.y1 - art.y0) / 2],
    [art.x0 + 8, art.y0 + 8],
    [art.x1 - 8, art.y1 - 8]
  ].map(([px, py]) => {
    const ll = map.unproject([px - canvas.x, py - canvas.y]);
    return { page: [px, py], canvas: [px - canvas.x, py - canvas.y], lngLat: [ll.lng, ll.lat] };
  });
  // qué hay renderizado en el centro del artefacto
  const rendered = map.queryRenderedFeatures(pts[0].canvas).map((f) => f.layer?.id);
  return {
    zoom,
    canvas: { x: canvas.x, y: canvas.y, w: canvas.width, h: canvas.height },
    orthoState: window.__mjtApp?.orthoState,
    pts,
    renderedLayersAtCenter: rendered
  };
}, ART);

await writeFile(join(OUT, 'probe.json'), JSON.stringify({ info, reqs }, null, 2));

// candidatas: teselas bizkaia cuya bbox contiene los puntos del artefacto
const cand = [];
for (const p of info.pts) {
  const [lng, lat] = p.lngLat;
  for (const r of reqs) {
    const m = /ORTO_BFA_1956\/MapServer\/tile\/(\d+)\/(\d+)\/(\d+)/.exec(r.url);
    if (!m) continue;
    const [z, y, x] = [+m[1], +m[2], +m[3]];
    const b = tileBounds(z, x, y);
    if (lng >= b.w && lng <= b.e && lat >= b.s && lat <= b.n)
      cand.push({ z, x, y, url: r.url, status: r.status, size: r.size, type: r.type });
  }
}
const uniq = [...new Map(cand.map((c) => [c.url, c])).values()];
await writeFile(join(OUT, 'candidates.json'), JSON.stringify(uniq, null, 2));

// descargar las candidatas para inspección visual
for (const c of uniq) {
  const r = await fetch(c.url);
  const buf = Buffer.from(await r.arrayBuffer());
  await writeFile(join(OUT, 'tiles', `z${c.z}_x${c.x}_y${c.y}.bin`), buf);
  console.log(
    `tile z${c.z}/${c.x}/${c.y} http=${r.status} ct=${r.headers.get('content-type')} bytes=${buf.length}`
  );
}

console.log('\n── resumen ──');
console.log('zoom:', info.zoom.toFixed(2), '| orthoState:', info.orthoState);
console.log('canvas:', JSON.stringify(info.canvas));
console.log('layers renderizados en el centro:', info.renderedLayersAtCenter);
console.log('puntos artefacto:', JSON.stringify(info.pts.map((p) => p.lngLat)));
console.log(`requests bizkaia: ${reqs.length} | no-200: ${reqs.filter((r) => r.status !== 200).length}`);
for (const r of reqs.filter((r) => r.status !== 200)) console.log('  NO200:', r.status, r.url);
console.log('candidatas:', uniq.length);

await browser.close();
server.close();
