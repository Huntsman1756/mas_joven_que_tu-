/**
 * RT-12 — coste real del hero: bytes que descarga el navegador por viewport
 * con las variantes responsive, comparado con el tamaño de los dos JPEG
 * originales (HEAD: 574.728 + 734.707 = 1.309.435 bytes, medido también por
 * la auditoría en `first-visit-performance.json`).
 *
 * Condiciones de medición (fijadas ANTES de mirar el número):
 *   - servidor local, contexto nuevo por viewport, caché del contexto vacía;
 *   - sin red externa: los hero son estáticos del propio dominio;
 *   - se mide el cuerpo real de cada respuesta /data/hero/*.jpg;
 *   - se registra además `currentSrc` y el ancho renderizado (para que el
 *     tamaño elegido no sea una suposición del atributo `sizes`).
 *
 * Uso: node scripts/rt12_hero_bytes.mjs   (cwd = app/, build/ presente)
 * Salida: ../evidence/red-team-2026/rt12-hero.json
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/red-team-2026');
const PORT = 4335;
const BASE = `http://localhost:${PORT}`;

await mkdir(OUT, { recursive: true });
const server = await createStaticServer(BUILD, PORT);
const browser = await chromium.launch();

const VIEWPORTS = [
  { id: 'desktop-dpr1', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  {
    id: 'desktop-dpr2',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  },
  {
    id: 'mobile-dpr2',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  }
];

const report = {
  utc: new Date().toISOString(),
  note: 'Medición local comparable: contexto nuevo por viewport, cuerpo real de cada respuesta.',
  before_head: {
    source: 'git show HEAD:app/static/data/hero/*.jpg',
    bytes: {
      'bilbao-1956.jpg': 574728,
      'bilbao-2025.jpg': 734707
    },
    total: 1309435,
    behavior: 'sin srcset: el navegador descarga el JPEG completo en cualquier viewport'
  },
  viewports: {}
};

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ ...vp });
  const page = await ctx.newPage();
  const heroBytes = {};
  page.on('response', async (r) => {
    const u = r.url();
    if (!/\/data\/hero\/.+\.jpg$/.test(u)) return;
    try {
      const body = await r.body();
      heroBytes[u.split('/').pop()] = body.length;
    } catch {
      /* respuesta no legible: no se contabiliza */
    }
  });
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForSelector('.hero img', { timeout: 20000 });
  await page
    .waitForFunction(
      () => [...document.querySelectorAll('.hero img')].every((i) => i.complete && i.naturalWidth > 0),
      null,
      { timeout: 20000 }
    )
    .catch(() => null);
  await page.waitForTimeout(800);
  const imgs = await page.evaluate(() =>
    [...document.querySelectorAll('.hero img')].map((i) => ({
      cls: i.className,
      rendered_w: Math.round(i.getBoundingClientRect().width),
      currentSrc: (i.currentSrc || '').split('/').pop(),
      natural: `${i.naturalWidth}x${i.naturalHeight}`
    }))
  );
  const total = Object.values(heroBytes).reduce((a, b) => a + b, 0);
  report.viewports[vp.id] = {
    ...vp,
    hero_bytes: heroBytes,
    hero_total: total,
    saved_vs_head: 1309435 - total,
    imgs
  };
  console.log(
    `${vp.id}: ${total} bytes (${Object.entries(heroBytes).map(([k, v]) => `${k}=${v}`).join(', ')}) — antes 1309435`
  );
  await ctx.close();
}

await browser.close();
server.close();
await writeFile(join(OUT, 'rt12-hero.json'), JSON.stringify(report, null, 2));
console.log('→ evidence/red-team-2026/rt12-hero.json');
