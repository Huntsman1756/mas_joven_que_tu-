/**
 * G1 READJUDICATION — barrido M1 corregido (método del run 1340Z):
 * jumpTo REAL por 60 valores objetivo de z (7..21.75 paso 0,25); el nivel y la
 * visibilidad de capas se evalúan sobre el zoom EFECTIVO (tras clamp por
 * maxBounds) y tras dejar que las capas lazy (munis z<9) se creen.
 * specMatch: level(actual_z) coincide con la única capa primaria visible.
 * Uso: node scripts/readj_m1_sweep.mjs   (cwd = sandbox/app)
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';
import { installLocalFixtures } from './fixtures.mjs';

const BUILD = resolve(process.cwd(), 'build');
const OUT = resolve(process.cwd(), '../out/map');
const PORT = 4191;
const BASE = `http://localhost:${PORT}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

let browser;
for (const channel of ['chrome', 'msedge']) {
  try { browser = await chromium.launch({ channel, args: ['--disable-gpu'] }); break; } catch { /* next */ }
}
browser ??= await chromium.launch({ args: ['--disable-gpu'] });

const LEVEL = (z) => (z < 9 ? 'BIZKAIA' : z < 13.5 ? 'CELDA' : 'EDIFICIO');

async function sweep(profile, viewport) {
  const ctx = await browser.newContext({ viewport, ...(profile.includes('mobile') ? { deviceScaleFactor: 3, isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage();
  await installLocalFixtures(page);
  await page.goto(`${BASE}/?year=1987&place=leioa&lat=43.326&lon=-2.988&z=14.6`, { waitUntil: 'load' });
  await page.waitForSelector('.mapband canvas', { timeout: 30000 });
  await page.waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 30000 }).catch(() => null);

  const rows = [];
  for (let i = 0; i < 60; i++) {
    const zTarget = 7 + i * 0.25;
    const row = await page.evaluate(async (zt) => {
      const m = window.__mjtMap;
      m.jumpTo({ zoom: zt });
      // esperar idle con capas lazy creadas
      await new Promise((r) => {
        let n = 0;
        const t = setInterval(() => {
          if ((m.areTilesLoaded?.() && !m.isMoving?.()) || ++n > 60) { clearInterval(t); r(); }
        }, 100);
      });
      const az = m.getZoom();
      const primInfo = { munis: false, cells: false, buildings: false };
      let munisPresent = false, cellsPresent = false;
      for (const l of m.getStyle().layers) {
        const vis = l.layout?.visibility !== 'none' && az >= (l.minzoom ?? 0) && az < (l.maxzoom ?? 24);
        if (!vis) continue;
        if (l.source === 'municipalities' && l.type === 'fill') { primInfo.munis = true; }
        if (l.id === 'cells-fill') {
          const op = m.getPaintProperty('cells-fill', 'fill-opacity');
          // opacidad efectiva: número o interpolación por zoom
          let eff = 1;
          if (typeof op === 'number') eff = op;
          else if (Array.isArray(op) && op[0] === 'interpolate') {
            const pts = [];
            for (let j = 3; j < op.length; j += 2) pts.push([op[j], op[j + 1]]);
            eff = az <= pts[0][0] ? pts[0][1] : az >= pts[pts.length - 1][0] ? pts[pts.length - 1][1]
              : pts.find((p, j) => j < pts.length - 1 && az >= p[0] && az <= pts[j + 1][0])
                ? pts.find((p, j) => j < pts.length - 1 && az >= p[0] && az <= pts[j + 1][0])[1] : 1;
          }
          primInfo.cells = eff > 0;
        }
        if (/^b-.+-fill$/.test(l.id)) primInfo.buildings = true;
      }
      munisPresent = m.getStyle().layers.some((l) => l.source === 'municipalities');
      cellsPresent = !!m.getLayer('cells-fill');
      const rendered = {};
      for (const f of m.queryRenderedFeatures()) {
        const s = f.source ?? 'unknown';
        rendered[s] = (rendered[s] ?? 0) + 1;
      }
      const legend = document.querySelector('.legend-title')?.textContent?.slice(0, 60) ?? null;
      const primaries = ['munis', 'cells', 'buildings'].filter((k) => primInfo[k]);
      const level = az < 9 ? 'BIZKAIA' : az < 13.5 ? 'CELDA' : 'EDIFICIO';
      const expected = { BIZKAIA: 'munis', CELDA: 'cells', EDIFICIO: 'buildings' }[level];
      return {
        requested_z: Math.round(zt * 100) / 100,
        actual_z: Math.round(az * 1000) / 1000,
        level, primaries: primaries.length,
        munis: primInfo.munis, cells: primInfo.cells, buildings: primInfo.buildings,
        munis_present: munisPresent, cells_present: cellsPresent,
        legend, rendered,
        specMatch: primaries.length === 1 && primaries[0] === expected,
      };
    }, zTarget);
    rows.push(row);
  }
  await ctx.close();

  const seen = new Set();
  const gapRows = [], overlapRows = [], mismatches = [];
  for (const r of rows) {
    if (r.primaries === 0) gapRows.push(r.requested_z);
    if (r.primaries > 1) overlapRows.push(r.requested_z);
    if (!r.specMatch) mismatches.push(r.requested_z);
    seen.add(r.actual_z);
  }
  return {
    meta: { candidate: '53b1e8a', profile, utc: new Date().toISOString(), method: 'live jumpTo sweep; level evaluated on ACTUAL (clamped) zoom', spec: 'G1-TU-BIZKAIA §6.2 / G1.md M1' },
    effective_min_zoom: Math.min(...rows.map((r) => r.actual_z)),
    gaps: gapRows.length, gapRows,
    overlaps: overlapRows.length, overlapRows,
    mismatches, rows,
  };
}

const desk = await sweep('desktop-1440x900', { width: 1440, height: 900 });
await writeFile(join(OUT, 'm1-live-sweep-desktop.json'), JSON.stringify(desk, null, 1));
const mob = await sweep('mobile-390x844', { width: 390, height: 844 });
await writeFile(join(OUT, 'm1-live-sweep-mobile.json'), JSON.stringify(mob, null, 1));
console.log(JSON.stringify({ desktop: { gaps: desk.gaps, overlaps: desk.overlaps, mismatches: desk.mismatches, minz: desk.effective_min_zoom }, mobile: { gaps: mob.gaps, overlaps: mob.overlaps, mismatches: mob.mismatches, minz: mob.effective_min_zoom } }, null, 1));
await browser.close();
server.close();
