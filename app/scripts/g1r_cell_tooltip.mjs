/**
 * G1-R — M6: tooltip de celda. Verifica en navegador que al pasar sobre una
 * celda aparece tooltip con cuota (C-05), denominador (C-02), huella (C-08)
 * y nota small-N solo cuando known<15; y que el relleno es idéntico para
 * celdas con igual cuota e n distinto (share via feature-state).
 * Uso: node scripts/g1r_cell_tooltip.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createStaticServer } from './static-server.mjs';

const ROOT = resolve(process.cwd(), '..');
const BUILD = resolve(process.cwd(), 'build');
const OUT = join(ROOT, 'evidence/g1-remediation/map');
const PORT = 4183;
const BASE = `http://localhost:${PORT}`;

const server = await createStaticServer(BUILD, PORT);
await mkdir(OUT, { recursive: true });

let browser;
for (const channel of ['chrome', 'msedge']) {
  try { browser = await chromium.launch({ channel, args: ['--disable-gpu'] }); break; } catch { /* next */ }
}
browser ??= await chromium.launch({ args: ['--disable-gpu'] });

const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(`${BASE}/?year=1987&place=leioa&lat=43.326&lon=-2.988&z=11.5`, { waitUntil: 'load' });
await page.waitForSelector('.mapband canvas', { timeout: 30000 });
await page.waitForFunction(() => window.__mjtMap?.areTilesLoaded?.(), null, { timeout: 30000 }).catch(() => null);
// Las series por año viven en data/cells/<mun>.json (fuera de la tesela desde
// 5027ca0) y se precargan en 'idle': esperar a que lleguen antes de sondear.
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);

// elige una celda normal y otra small-N dentro de las renderizadas
const cells = await page.evaluate(() => {
  const m = window.__mjtMap;
  const feats = m.queryRenderedFeatures(undefined, { layers: ['cells-fill'] });
  const norm = feats.find((f) => (f.properties.known ?? 0) >= 15);
  const small = feats.find((f) => (f.properties.known ?? 0) > 0 && f.properties.known < 15);
  const center = (f) => {
    // centroide aproximado del bbox
    const xs = [], ys = [];
    for (const ring of f.geometry.coordinates.flat(1)) { xs.push(ring[0]); ys.push(ring[1]); }
    const c = [ (Math.min(...xs)+Math.max(...xs))/2, (Math.min(...ys)+Math.max(...ys))/2 ];
    const p = m.project(c);
    return { x: p.x, y: p.y, props: { known: f.properties.known, ys: f.properties.ys, ya: f.properties.ya, fid: f.properties.fid } };
  };
  return { norm: norm ? center(norm) : null, small: small ? center(small) : null, n: feats.length };
});

const out = { renderedCells: cells.n, normal: null, small: null };
for (const [k, cell] of [['normal', cells.norm], ['small', cells.small]]) {
  if (!cell) continue;
  const canvas = await page.locator('.mapband canvas').boundingBox();
  await page.mouse.move(canvas.x + cell.x, canvas.y + cell.y);
  await page.waitForSelector('.cell-tip', { timeout: 5000 });
  out[k] = {
    props: cell.props,
    text: await page.locator('.cell-tip').innerText(),
    warnShown: !!(await page.$('.cell-tip .tip-warn')),
  };
  await page.screenshot({ path: join(OUT, `m6-cell-tooltip-${k}.png`) });
}

// contraste M6: relleno idéntico para igual cuota — las capas no filtran por known
const fillExpr = await page.evaluate(() => {
  const l = window.__mjtMap.getLayer('cells-fill');
  return { fillColor: l.paint['fill-color'], fillOpacity: l.paint['fill-opacity'] };
});
out.fillPaint = fillExpr;
out.m6 = {
  smallN_shows_note: out.small ? out.small.warnShown === true : 'no small cell rendered',
  normalN_no_note: out.normal ? out.normal.warnShown === false : 'no normal cell rendered',
  fill_has_no_smalln_branch: !JSON.stringify(fillExpr).includes('known'),
};
await writeFile(join(OUT, 'm6-cell-tooltip.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
server.close();
