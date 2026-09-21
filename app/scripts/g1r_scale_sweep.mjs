/**
 * G1-R — barrido M1: dominio de zoom total y exclusivo (60 valores, paso 0,25).
 * Para cada z evalúa qué capas primarias son visibles (munis-fill, cells-fill con
 * opacidad>0, b-*-fill) y el nivel que declara scaleLevel(). Debe coincidir con
 * §6.2: z<9 municipio · 9≤z<13,5 celda · z≥13,5 edificio. 0 huecos, 0 solapes.
 * Uso: node scripts/g1r_scale_sweep.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g1-remediation/map');
const PORT = 4182;
const BASE = `http://localhost:${PORT}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

let browser;
for (const channel of ['chrome', 'msedge']) {
  try {
    browser = await chromium.launch({ channel, args: ['--disable-gpu'] });
    break;
  } catch {
    /* next */
  }
}
browser ??= await chromium.launch({ args: ['--disable-gpu'] });

const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(`${BASE}/?year=1987&place=leioa&lat=43.326&lon=-2.988&z=14.6`, {
  waitUntil: 'load'
});
await page.waitForSelector('.mapband canvas', { timeout: 30000 });
await page
  .waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 30000 })
  .catch(() => null);

const sweep = await page.evaluate(() => {
  const m = window.__mjtMap;
  const rows = [];
  const cellsFill = m.getLayer('cells-fill');
  const cellsOpacity = (z) => {
    // opacidad interpolada declarada en el estilo
    const stops = cellsFill?.paint?.['fill-opacity'];
    if (typeof stops === 'number') return stops;
    if (!Array.isArray(stops)) return 1;
    // ['interpolate',['linear'],['zoom'], z1,o1, z2,o2, ...]
    const pts = [];
    for (let i = 3; i < stops.length; i += 2) pts.push([stops[i], stops[i + 1]]);
    if (z <= pts[0][0]) return pts[0][1];
    if (z >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const [z1, o1] = pts[i],
        [z2, o2] = pts[i + 1];
      if (z >= z1 && z <= z2) return o1 + (o2 - o1) * ((z - z1) / (z2 - z1));
    }
    return 1;
  };
  const info = {};
  for (const l of m.getStyle().layers) {
    info[l.id] = { minzoom: l.minzoom ?? 0, maxzoom: l.maxzoom ?? 24 };
  }
  const bFills = m.getStyle().layers.filter((l) => l.id.startsWith('b-') && l.id.endsWith('-fill'));
  const level = (z) => (z < 9 ? 'BIZKAIA' : z < 13.5 ? 'CELDA' : 'EDIFICIO');
  for (let i = 0; i < 60; i++) {
    const z = 7 + i * 0.25;
    const munis =
      z >= (info['munis-fill']?.minzoom ?? 0) && z < (info['munis-fill']?.maxzoom ?? 24);
    const cells =
      z >= (info['cells-fill']?.minzoom ?? 0) &&
      z < (info['cells-fill']?.maxzoom ?? 24) &&
      cellsOpacity(z) > 0;
    const buildings = bFills.length > 0 && z >= (bFills[0].minzoom ?? 13.5);
    const expected = {
      BIZKAIA: [true, false, false],
      CELDA: [false, true, false],
      EDIFICIO: [false, false, true]
    }[level(z)];
    const primaries = [munis, cells, buildings].filter(Boolean).length;
    rows.push({
      z,
      level: level(z),
      munis,
      cells,
      cellsOpacity: Math.round(cellsOpacity(z) * 100) / 100,
      buildings,
      primaries,
      specMatch: munis === expected[0] && cells === expected[1] && buildings === expected[2]
    });
  }
  return { info, bFills: bFills.map((l) => l.id), rows };
});

const gaps = sweep.rows.filter((r) => r.primaries === 0);
const overlaps = sweep.rows.filter((r) => r.primaries > 1);
const mismatches = sweep.rows.filter((r) => !r.specMatch).map((r) => r.z);
const result = {
  layers: sweep.info,
  buildingFills: sweep.bFills,
  gaps: gaps.length,
  overlaps: overlaps.length,
  mismatches,
  rows: sweep.rows
};
await writeFile(join(OUT, 'm1-sweep.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ gaps: gaps.length, overlaps: overlaps.length, mismatches }, null, 2));
await browser.close();
server.close();
